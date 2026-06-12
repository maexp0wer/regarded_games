import { NextResponse } from 'next/server';
import { ssoSync } from '@/lib/discourseSSO';

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
  try {
    const { wallet, action } = await req.json();
    if (!wallet || typeof wallet !== 'string') {
      return NextResponse.json({ error: 'wallet required' }, { status: 400 });
    }
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
