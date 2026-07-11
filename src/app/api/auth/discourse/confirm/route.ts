import { NextResponse } from 'next/server';
import {
  getCommunitySession,
  createSsoConfirmToken,
} from '@/lib/communitySession';

/**
 * Mint an SSO confirmation token for the CURRENT session cookie's wallet, bound
 * to a specific Discourse SSO nonce.
 *
 * The security boundary lives at the call site (`/community-login`): it requests
 * this token only once the *connected* wallet equals the session cookie's wallet
 * (`signedIn`). This endpoint therefore always mints for the cookie's own wallet
 * — a stale/foreign cookie can only ever produce a token for that foreign wallet,
 * and /community-login won't request it unless the person present controls it.
 *
 * `/api/auth/discourse` then completes SSO only when it receives a token that is
 * valid, unexpired, and bound to (its session cookie's wallet, this nonce).
 *
 * Query: ?nonce=<discourse-nonce>
 */
export async function GET(req: Request) {
  const wallet = getCommunitySession(req);
  if (!wallet) {
    return NextResponse.json({ error: 'No session' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const nonce = searchParams.get('nonce');
  if (!nonce) {
    return NextResponse.json({ error: 'Missing nonce' }, { status: 400 });
  }

  return NextResponse.json({ confirm: createSsoConfirmToken(wallet, nonce) });
}
