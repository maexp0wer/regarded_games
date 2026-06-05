import { NextResponse } from 'next/server';
import { isAddress, verifyMessage } from 'viem';
import crypto from 'crypto';
import { buildLoginMessage, LOGIN_FRESHNESS_MS } from '@/utils/communityAuthMessage';
import { cookieDomainFor } from '@/utils/cookieDomain';
import { ssoSync } from '@/lib/discourseSSO';
import {
  COMMUNITY_SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  getCommunitySession,
} from '@/lib/communitySession';
import { query } from '@/lib/db';
import { extractClientIp } from '@/utils/ipHash';

const isProd = process.env.NODE_ENV === 'production';

function cookieOptions(req: Request, maxAge: number) {
  const domain = cookieDomainFor(req.headers.get('host'));
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
    ...(domain ? { domain } : {}),
  };
}

/** GET — report whether the caller already holds a valid session. */
export async function GET(req: Request) {
  return NextResponse.json({ address: getCommunitySession(req) });
}

/**
 * POST — verify a wallet signature and establish the community session.
 * Body: { address, issuedAt, signature }
 */
export async function POST(req: Request) {
  if (!process.env.COMMUNITY_SESSION_SECRET) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  try {
    const { address, issuedAt, signature } = await req.json();

    if (typeof address !== 'string' || !isAddress(address, { strict: false })) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }
    if (typeof issuedAt !== 'number' || typeof signature !== 'string') {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    if (Math.abs(Date.now() - issuedAt) > LOGIN_FRESHNESS_MS) {
      return NextResponse.json({ error: 'Signature expired' }, { status: 401 });
    }

    const message = buildLoginMessage(address, issuedAt);
    const valid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const wallet = address.toLowerCase();

    // Provision/activate the wallet's Discourse account so chat/forum routes can
    // subsequently act AS this user (Api-Username: <wallet>). Non-fatal: a flaky
    // sync shouldn't block establishing the verified session.
    const url = process.env.NEXT_PUBLIC_DISCOURSE_URL;
    const apiKey = process.env.DISCOURSE_API_KEY;
    const ssoSecret = process.env.DISCOURSE_SSO_SECRET;
    if (url && apiKey && ssoSecret) {
      try {
        await ssoSync(url, { 'Api-Key': apiKey, 'Api-Username': 'system' }, ssoSecret, wallet, {
          maxRetries: 3,
          baseBackoffMs: 500,
        });
      } catch (e) {
        console.error('[community-session] ssoSync failed (non-fatal):', e);
      }
    }

    const res = NextResponse.json({ success: true, address: wallet });
    res.cookies.set(COMMUNITY_SESSION_COOKIE, createSessionToken(wallet), cookieOptions(req, SESSION_TTL_SECONDS));

    // Passively record the session IP/UA for TGE sybil clustering. Non-fatal.
    // Skipped in local dev where TURNSTILE_SECRET_KEY is absent (fingerprinting is prod-only).
    if (process.env.TURNSTILE_SECRET_KEY) {
      try {
        const rawIp = extractClientIp(req.headers);
        const rawUa = req.headers.get('user-agent');
        const ipHash = rawIp ? crypto.createHash('sha256').update(rawIp).digest('hex') : null;
        const uaHash = rawUa ? crypto.createHash('sha256').update(rawUa).digest('hex') : null;
        await query(
          `INSERT INTO session_fingerprints (address, ip_hash, user_agent_hash, captcha_verified)
           VALUES ($1, $2, $3, FALSE)`,
          [wallet, ipHash, uaHash],
        );
      } catch (e) {
        console.warn('[community-session] fingerprint insert failed (non-fatal):', e);
      }
    }

    return res;
  } catch (e) {
    console.error('[community-session] POST error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/** DELETE — sign out (clear the session cookie). */
export async function DELETE(req: Request) {
  const res = NextResponse.json({ success: true });
  res.cookies.set(COMMUNITY_SESSION_COOKIE, '', cookieOptions(req, 0));
  return res;
}
