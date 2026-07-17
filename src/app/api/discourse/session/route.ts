import { NextResponse } from 'next/server';
import { ssoSync } from '@/lib/discourseSSO';
import { getCommunitySession } from '@/lib/communitySession';
import { sameOriginOk } from '@/lib/rateLimit';

const debug = process.env.APP_DEBUG === 'true';

/**
 * Keep a wallet's Discourse account/session in step with the connected wallet.
 * Called by DiscourseHandshake on wallet connect / disconnect / switch.
 *
 * Modern Discourse blocks the old hidden-iframe SSO trick (X-Frame-Options
 * SAMEORIGIN + CSP frame-ancestors 'self' + SameSite cookies), so we use the
 * documented DiscourseConnect server-to-server endpoints instead:
 *
 *   action: 'login'  → POST /admin/users/sync_sso  (provision/activate the
 *                       wallet's Discourse user so it can chat/post). The in-app
 *                       chat posts as `Api-Username: <wallet>`, so the account
 *                       must exist and be active.
 *   action: 'logout' → POST /admin/users/{id}/log_out  (terminate the wallet's
 *                       Discourse sessions).
 *
 * Username == lowercased wallet == DiscourseConnect external_id.
 */
export async function POST(req: Request) {
  if (!sameOriginOk(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    // Identity is the VERIFIED session, not the body. Provisioning (`login`) and
    // session teardown (`logout`) are privileged Discourse actions; trusting a
    // body-supplied wallet let anyone force-log-out or provision arbitrary
    // accounts. On a wallet switch/disconnect the caller still holds the previous
    // wallet's session cookie (the teardown fetch and the cookie-clear fire in the
    // same tick), so the target resolves to that wallet as intended.
    const sessionWallet = getCommunitySession(req);
    if (!sessionWallet) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    const { wallet: bodyWallet, action } = await req.json();
    if (bodyWallet && typeof bodyWallet === 'string' && bodyWallet.toLowerCase() !== sessionWallet) {
      return NextResponse.json({ error: 'wallet mismatch' }, { status: 403 });
    }
    const wallet = sessionWallet;
    const act: 'login' | 'logout' = action === 'login' ? 'login' : 'logout';

    const url = process.env.NEXT_PUBLIC_DISCOURSE_URL;
    const apiKey = process.env.DISCOURSE_API_KEY;
    const ssoSecret = process.env.DISCOURSE_SSO_SECRET;
    if (!url || !apiKey || !ssoSecret) {
      return NextResponse.json({ error: 'Discourse env vars missing' }, { status: 500 });
    }

    const headers = { 'Api-Key': apiKey, 'Api-Username': 'system' };
    const username = wallet.toLowerCase();

    // ---- LOGIN: provision/activate the wallet's Discourse account ----
    if (act === 'login') {
      const ok = await ssoSync(url, { ...headers }, ssoSecret, username, { maxRetries: 3, baseBackoffMs: 500 });
      if (debug) console.log(`[discourse/session] login(sync_sso) ${username} -> ${ok}`);
      return NextResponse.json({ success: ok });
    }

    // ---- LOGOUT: terminate the wallet's Discourse session(s) ----
    const userRes = await fetch(`${url}/u/${username}.json`, { headers });
    if (userRes.status === 404) {
      // Wallet never had a Discourse account — nothing to terminate.
      return NextResponse.json({ success: true, loggedOut: false });
    }
    if (!userRes.ok) {
      return NextResponse.json({ error: `user lookup failed (${userRes.status})` }, { status: 502 });
    }
    const userId = (await userRes.json())?.user?.id;
    if (!userId) return NextResponse.json({ success: true, loggedOut: false });

    const logoutRes = await fetch(`${url}/admin/users/${userId}/log_out`, { method: 'POST', headers });
    if (debug) console.log(`[discourse/session] logout ${username} (#${userId}) -> ${logoutRes.status}`);
    return NextResponse.json({ success: true, loggedOut: logoutRes.ok });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    console.error('[discourse/session] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
