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

function buildCsp(isDev: boolean): string {
  const discourse = originOf(process.env.NEXT_PUBLIC_DISCOURSE_URL);
  const ponderMainnet = originOf(process.env.NEXT_PUBLIC_PONDER_URL_MAINNET);
  const ponderSepolia = originOf(process.env.NEXT_PUBLIC_PONDER_URL_SEPOLIA);

  // WalletConnect + Coinbase relay/RPC/verify endpoints used by RainbowKit/wagmi.
  const wallet = [
    'https://*.walletconnect.com',
    'https://*.walletconnect.org',
    'wss://*.walletconnect.com',
    'wss://*.walletconnect.org',
    'https://pulse.walletconnect.org',
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

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'base-uri': ["'self'"],
    'object-src': ["'none'"],
    'frame-ancestors': ["'self'"],
    'form-action': ["'self'", ...(discourse ? [discourse] : [])],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'blob:'],
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
    { key: 'Content-Security-Policy', value: buildCsp(isDev) },
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
