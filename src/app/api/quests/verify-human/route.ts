import { NextResponse } from 'next/server';
import { isAddress } from 'viem';
import crypto from 'crypto';
import { getCommunitySession } from '@/lib/communitySession';
import { query } from '@/lib/db';
import { verifyCaptcha } from '@/utils/verifyCaptcha';
import { extractClientIp } from '@/utils/ipHash';

export async function POST(req: Request) {
  try {
    const sessionAddr = getCommunitySession(req);
    if (!sessionAddr) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { address, captchaToken } = body as { address?: string; captchaToken?: string };

    if (!address || !isAddress(address, { strict: false })) {
      return NextResponse.json({ error: 'invalid_address' }, { status: 400 });
    }
    if (typeof captchaToken !== 'string' || !captchaToken) {
      return NextResponse.json({ error: 'missing_captcha_token' }, { status: 400 });
    }
    if (sessionAddr !== address.toLowerCase()) {
      return NextResponse.json({ error: 'address_mismatch' }, { status: 401 });
    }

    const rawIp = extractClientIp(req.headers);
    const rawUa = req.headers.get('user-agent');

    const valid = await verifyCaptcha(captchaToken, rawIp);
    if (!valid) {
      return NextResponse.json({ error: 'captcha_failed' }, { status: 400 });
    }

    const ipHash = rawIp ? crypto.createHash('sha256').update(rawIp).digest('hex') : null;
    const uaHash = rawUa ? crypto.createHash('sha256').update(rawUa).digest('hex') : null;

    await query(
      `INSERT INTO session_fingerprints (address, ip_hash, user_agent_hash, captcha_verified)
       VALUES ($1, $2, $3, TRUE)`,
      [sessionAddr, ipHash, uaHash],
    );

    return NextResponse.json({ success: true, data: null });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[verify-human] error:', msg);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
