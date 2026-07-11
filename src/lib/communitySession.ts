// Server-side community session: a stateless, HMAC-signed token stored in an
// HttpOnly cookie. Establishes a *verified* wallet identity after the user signs
// the sign-in message once (see `src/app/api/auth/community-session/route.ts`).
//
// Token format:  base64url(JSON{addr,exp}) + "." + HMAC-SHA256(payload) hex
// Signed/verified with COMMUNITY_SESSION_SECRET. No server-side storage, so it is
// immune to the in-memory-cache reset caveat (CLAUDE.md known issue #1).

import crypto from 'crypto';

export const COMMUNITY_SESSION_COOKIE = 'rg_community';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const SESSION_TTL_SECONDS = Math.floor(SESSION_TTL_MS / 1000);

interface SessionPayload {
  addr: string; // lowercased wallet
  exp: number;  // ms epoch
}

function getSecret(): string {
  const secret = process.env.COMMUNITY_SESSION_SECRET;
  if (!secret) throw new Error('COMMUNITY_SESSION_SECRET is not set');
  return secret;
}

function sign(payloadB64: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payloadB64).digest('hex');
}

/** Mint a signed session token for a wallet. Throws if the secret is missing. */
export function createSessionToken(address: string): string {
  const secret = getSecret();
  const payload: SessionPayload = {
    addr: address.toLowerCase(),
    exp: Date.now() + SESSION_TTL_MS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${payloadB64}.${sign(payloadB64, secret)}`;
}

/** Verify a token and return the wallet address, or null if invalid/expired. Never throws. */
export function verifySessionToken(token: string | undefined | null): string | null {
  if (!token) return null;
  try {
    const secret = getSecret();
    const dot = token.lastIndexOf('.');
    if (dot <= 0) return null;
    const payloadB64 = token.slice(0, dot);
    const providedSig = token.slice(dot + 1);
    const expectedSig = sign(payloadB64, secret);

    const a = Buffer.from(providedSig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as SessionPayload;
    if (!payload?.addr || typeof payload.exp !== 'number' || Date.now() >= payload.exp) return null;
    return payload.addr.toLowerCase();
  } catch {
    return null;
  }
}

// ── SSO login confirmation token ──────────────────────────────────────────
// Binds "the connected wallet has been confirmed present for THIS SSO attempt"
// to a specific wallet + Discourse nonce, so the SSO endpoint can trust a
// pre-existing session cookie only when /community-login vouches that the cookie
// belongs to the wallet currently driving the browser. Prevents a stale/foreign
// cookie from logging its owner in as the person actually at the keyboard.
// Short-lived and single-attempt-scoped (bound to the one-time SSO nonce).

const CONFIRM_TTL_MS = 5 * 60 * 1000; // 5 minutes — one SSO round-trip

/** Mint a confirmation that `wallet` is present for the SSO attempt with `nonce`. */
export function createSsoConfirmToken(wallet: string, nonce: string): string {
  const secret = getSecret();
  const exp = Date.now() + CONFIRM_TTL_MS;
  const payloadB64 = Buffer.from(
    JSON.stringify({ addr: wallet.toLowerCase(), nonce, exp }),
    'utf8',
  ).toString('base64url');
  return `${payloadB64}.${sign(payloadB64, secret)}`;
}

/**
 * Verify a confirmation token against the wallet and nonce it must be bound to.
 * Returns true only if the signature is valid, unexpired, and both fields match.
 */
export function verifySsoConfirmToken(
  token: string | undefined | null,
  wallet: string,
  nonce: string,
): boolean {
  if (!token) return false;
  try {
    const secret = getSecret();
    const dot = token.lastIndexOf('.');
    if (dot <= 0) return false;
    const payloadB64 = token.slice(0, dot);
    const providedSig = token.slice(dot + 1);
    const expectedSig = sign(payloadB64, secret);
    const a = Buffer.from(providedSig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as {
      addr?: string;
      nonce?: string;
      exp?: number;
    };
    if (typeof payload.exp !== 'number' || Date.now() >= payload.exp) return false;
    if (payload.addr !== wallet.toLowerCase()) return false;
    if (payload.nonce !== nonce) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Read the verified wallet address from the request's session cookie, or null.
 * This is the single function every protected route calls to learn *who* is
 * making the request — never trust a wallet address from the body/query again.
 */
export function getCommunitySession(req: Request): string | null {
  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    if (name === COMMUNITY_SESSION_COOKIE) {
      return verifySessionToken(decodeURIComponent(part.slice(eq + 1).trim()));
    }
  }
  return null;
}
