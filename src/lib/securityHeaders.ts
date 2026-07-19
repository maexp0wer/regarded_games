// Security response headers (S10), applied to every route via next.config.ts
// `headers()`. Kept dependency-free and free of `@`-alias imports so it can be
// imported from next.config.ts (which is compiled before path aliases resolve).
//
// CSP NOTE: this is a *pragmatic enforced* policy, not strict-nonce. It keeps
// 'unsafe-inline'/'unsafe-eval' (required by Next's inline hydration scripts, by
// RainbowKit's injected styles, and by web3 libs/WASM) and a broad img-src, while
// still locking down default-src, blocking external scripts, and preventing framing
// (anti-clickjacking). Tightening to nonces is a follow-up once validated against
// live wallet connects.
//
// ESCAPE HATCH: if an over-tight directive breaks the app in production, change the
// header name below from 'Content-Security-Policy' to
// 'Content-Security-Policy-Report-Only' — violations are then logged by the browser
// but nothing is blocked. Tune the allowlist, then switch back.
//
// CORS: intentionally NO Access-Control-Allow-Origin. The API is same-origin only;
// browsers already block cross-origin reads, and the community-session cookie is
// SameSite=Lax while admin routes use header tokens — so CSRF is already covered.

/** Extract the `scheme://host[:port]` origin from a URL string, or null. */
function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * Build the CSP string.
 *
 * - `nonce` omitted → the pragmatic *enforced* policy: keeps 'unsafe-inline' /
 *   'unsafe-eval' on script-src (required by Next hydration + web3 libs). This is
 *   what next.config.ts ships on every route today.
 * - `nonce` provided → the *strict* policy used for the Report-Only rollout
 *   (L6): script-src drops 'unsafe-inline'/'unsafe-eval' and trusts only the
 *   per-request nonce (+ 'strict-dynamic' so nonced scripts may load chunks, +
 *   'wasm-unsafe-eval' so web3 WASM still compiles without full eval). style-src
 *   keeps 'unsafe-inline' deliberately: RainbowKit/wagmi inject styles at runtime
 *   which can't be nonced, and inline *styles* can't execute JS — the XSS win is
 *   on script-src. See middleware.ts for how the nonce is minted and reported.
 *
 *   'unsafe-eval' in the strict policy is DEV-ONLY: the Turbopack dev module
 *   system and its eval-based sourcemaps call eval()/new Function() at runtime.
 *   The PRODUCTION bundle contains no eval/new Function at all (verified by
 *   grepping .next/static/chunks after `next build` — zero hits), so prod runs
 *   the fully strict policy. Allowing it in dev only keeps the Report-Only signal
 *   free of dev-tooling false positives without weakening the shipped policy.
 */
export function buildCsp(isDev: boolean, nonce?: string): string {
  const discourse = originOf(process.env.NEXT_PUBLIC_DISCOURSE_URL);
  const ponderMainnet = originOf(process.env.NEXT_PUBLIC_PONDER_URL_MAINNET);
  const ponderSepolia = originOf(process.env.NEXT_PUBLIC_PONDER_URL_SEPOLIA);

  // WalletConnect + Coinbase relay/RPC/verify endpoints used by RainbowKit/wagmi.
  // web3modal.org / reown.com: RainbowKit's connector is built on Reown AppKit
  // (WalletConnect v2's successor), which fetches remote project config from
  // api.web3modal.org on init — confirmed via a live wallet-connect CSP violation
  // (fails soft without it, but silently loses remote config/feature flags).
  const wallet = [
    'https://*.walletconnect.com',
    'https://*.walletconnect.org',
    'wss://*.walletconnect.com',
    'wss://*.walletconnect.org',
    'https://pulse.walletconnect.org',
    'https://*.web3modal.org',
    'https://*.reown.com',
    'https://*.coinbase.com',
    'wss://*.coinbase.com',
  ];

  // Local Anvil RPC, Ponder, and HMR/turbopack websocket (dev only).
  const devLocal = isDev
    ? [
        'http://localhost:*',
        'http://127.0.0.1:*',
        'http://*.localhost:*',
        'ws://localhost:*',
        'ws://127.0.0.1:*',
        'ws://*.localhost:*',
      ]
    : [];

  const connectSrc = [
    "'self'",
    ...wallet,
    ...[discourse, ponderMainnet, ponderSepolia].filter((o): o is string => !!o),
    ...devLocal,
  ];

  // Discourse images render inside "cooked" forum HTML; in prod they're https
  // (covered by `https:`), in dev they come from http://community.localhost.
  const imgSrc = ["'self'", 'data:', 'blob:', 'https:', ...(isDev ? ['http://*.localhost:*', 'http://localhost:*'] : [])];

  // Strict (nonce present) vs. pragmatic (nonce absent) script-src.
  // 'unsafe-eval' is added to the strict list ONLY in dev — Turbopack's dev
  // runtime needs it; the prod bundle has no eval, so prod stays fully strict.
  const scriptSrc = nonce
    ? [
        "'self'",
        `'nonce-${nonce}'`,
        "'strict-dynamic'",
        "'wasm-unsafe-eval'",
        'blob:',
        ...(isDev ? ["'unsafe-eval'"] : []),
      ]
    : ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'blob:'];

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'base-uri': ["'self'"],
    'object-src': ["'none'"],
    'frame-ancestors': ["'self'"],
    'form-action': ["'self'", ...(discourse ? [discourse] : [])],
    'script-src': scriptSrc,
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': imgSrc,
    'font-src': ["'self'", 'data:'],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    'connect-src': connectSrc,
    'frame-src': ["'self'", 'https://*.walletconnect.com', 'https://*.walletconnect.org', 'https://*.coinbase.com'],
  };

  return Object.entries(directives)
    .map(([k, v]) => `${k} ${v.join(' ')}`)
    .join('; ');
}

export function securityHeaders(): { key: string; value: string }[] {
  const isDev = process.env.NODE_ENV !== 'production';

  const headers: { key: string; value: string }[] = [
    // CSP is emitted here (statically, for every route) ONLY in dev, where it is
    // the pragmatic loose policy so HMR / Turbopack's inline dev scripts work.
    //
    // In PRODUCTION the enforced CSP is the strict *nonce* policy, which must be
    // minted per-request — so it is set by middleware.ts, not here. A static
    // header can't carry a per-request nonce, and shipping a second enforced CSP
    // from here would intersect with middleware's and break the app. Non-page
    // routes (API/static) that middleware doesn't cover simply carry no CSP in
    // prod, which is fine: they return JSON/assets, not script-executing HTML,
    // and X-Frame-Options below still covers framing.
    ...(isDev ? [{ key: 'Content-Security-Policy', value: buildCsp(true) }] : []),
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  ];

  // HSTS only in production (ignored over http, but avoids surprises in local dev).
  if (!isDev) {
    headers.push({ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' });
  }

  return headers;
}
