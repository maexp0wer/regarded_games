// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { buildCsp } from '@/lib/securityHeaders';

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|Regardo_Head.svg).*)'],
};

/* Per-request CSP nonce (Web Crypto — Edge-safe; no Buffer). */
function generateNonce(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  let bin = '';
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin);
}

/* NEXT_PUBLIC_MAIN_DOMAIN is authored as a full URL (e.g. https://regarded.games)
   because most call sites need the protocol (DOCS_URL derivation, auth redirects,
   nav links). Middleware, however, compares against the bare `Host` header, which
   carries no protocol and no trailing path — but DOES carry the port in dev
   (localhost:3000). So normalize to a host[:port] here: strip the scheme and any
   trailing slash/path, but preserve the port. */
const PROD_ROOT_DOMAIN = (process.env.NEXT_PUBLIC_MAIN_DOMAIN ?? 'regarded.games')
  .replace(/^https?:\/\//, '')
  .replace(/\/.*$/, '');
const DEV_ROOT_DOMAIN = 'localhost:3000';

/* Soft-launch gate (server-only, NOT NEXT_PUBLIC_): when a surface is gated,
   every app.* / app.sepolia.* request is rewritten to /coming-soon instead of
   the trading app. This is the real security boundary — defence in depth behind
   not pointing the app.* subdomains at the host at all. Env changes take effect
   only on redeploy (Vercel binds env at build/deploy time).
     (unset)                → app is LIVE (default)
     APP_LIVE=false         → gate the mainnet app (app.*)
     TESTNET_APP_LIVE=false → gate the testnet app (app.sepolia.*) independently
   Anything other than the literal "false" leaves the surface live. */
const APP_LIVE = process.env.APP_LIVE !== 'false';
const TESTNET_APP_LIVE = process.env.TESTNET_APP_LIVE !== 'false';

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host')!;
  const path = url.pathname;

  /* CSP nonce policy (L6). Mint a per-request nonce, forward it on x-nonce so the
     root layout can stamp its inline script, and attach the strict nonce policy to
     the HTML page responses below.

     PROD: the strict policy is ENFORCED. It's also written to the forwarded
     REQUEST headers as `Content-Security-Policy` — Next reads the nonce from there
     and auto-stamps it on its own bootstrap/hydration <script> tags, so they
     aren't blocked. next.config.ts emits no CSP in prod (would double up).

     DEV: the strict policy is Report-Only (observe, never block); the pragmatic
     ENFORCED policy still comes from next.config.ts so HMR/Turbopack are
     untouched. We do NOT hand Next the CSP on the request in dev — its own inline
     dev scripts aren't nonced, and the loose enforced policy allows them.

     Applied only to the HTML page rewrites (rendered by the root layout);
     redirects and SEO-file passthroughs don't execute scripts. */
  const isDev = process.env.NODE_ENV !== 'production';
  const nonce = generateNonce();
  const strictCsp = buildCsp(isDev, nonce);
  const forward = { request: { headers: new Headers(req.headers) } };
  forward.request.headers.set('x-nonce', nonce);
  if (!isDev) forward.request.headers.set('Content-Security-Policy', strictCsp);
  const withReport = (res: NextResponse): NextResponse => {
    res.headers.set(
      isDev ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy',
      strictCsp,
    );
    return res;
  };

  // 1. DOCS SUBDOMAIN (dev only) — docs.localhost:3000 routes through the
  // /docsproxy rewrite to the local Docusaurus server on :3001. In production
  // docs live on a SEPARATE Vercel project reached directly via DNS, so the docs
  // subdomain never hits this app; the proxy rewrite is gated to fork mode (the
  // rewrite itself is also empty outside fork mode — see next.config.ts).
  if (
    process.env.NEXT_PUBLIC_ENVIRONMENT === 'fork' &&
    (hostname === `docs.${PROD_ROOT_DOMAIN}` || hostname === `docs.${DEV_ROOT_DOMAIN}`)
  ) {
    return NextResponse.rewrite(new URL(`/docsproxy${path}`, req.url));
  }

  // 1b. SEO/METADATA FILES — served by host-aware handlers at the app-router
  // root (src/app/robots.txt, sitemap.ts, llms.txt, opengraph-image.tsx).
  // They must escape the tenant rewrites below, which would otherwise send
  // /robots.txt to /main/robots.txt (404) on the bare domain.
  if (
    path === '/robots.txt' ||
    path === '/sitemap.xml' ||
    path === '/llms.txt' ||
    path.startsWith('/opengraph-image') ||
    path.startsWith('/twitter-image')
  ) {
    return NextResponse.next();
  }

  // 1c. www → apex 301 — without it the root-domain branch below serves the
  // same landing on both hosts and search engines index duplicates.
  if (hostname === `www.${PROD_ROOT_DOMAIN}`) {
    const target = new URL(url);
    target.host = PROD_ROOT_DOMAIN;
    return NextResponse.redirect(target, 301);
  }

  // 2. APP.SEPOLIA SUBDOMAIN — must be checked BEFORE app.* (prefix match)
  if (
    hostname === `app.sepolia.${PROD_ROOT_DOMAIN}` ||
    hostname === `app.sepolia.${DEV_ROOT_DOMAIN}`
  ) {
    /* Testnet tenant is never indexed: same UI as mainnet (duplicate content)
       pointed at Sepolia. Header applies to the gated coming-soon rewrite too;
       /robots.txt (handled above) additionally serves Disallow for this host. */
    if (!TESTNET_APP_LIVE) {
      const res = withReport(NextResponse.rewrite(new URL('/coming-soon', req.url), forward));
      res.headers.set('X-Robots-Tag', 'noindex, nofollow');
      return res;
    }
    const res = withReport(NextResponse.rewrite(new URL(`/app${path}`, req.url), forward));
    res.headers.set('x-tenant', 'sepolia');
    res.headers.set('x-app-path', path);
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return res;
  }

  // 3. APP SUBDOMAIN (mainnet tenant) — app.localhost:3000 OR app.yourdomain.com
  if (hostname === `app.${PROD_ROOT_DOMAIN}` || hostname === `app.${DEV_ROOT_DOMAIN}`) {
    if (!APP_LIVE) {
      return withReport(NextResponse.rewrite(new URL('/coming-soon', req.url), forward));
    }
    const res = withReport(NextResponse.rewrite(new URL(`/app${path}`, req.url), forward));
    res.headers.set('x-tenant', 'mainnet');
    res.headers.set('x-app-path', path);
    return res;
  }

  // 4. ROOT DOMAIN
  if (hostname === PROD_ROOT_DOMAIN || hostname === `www.${PROD_ROOT_DOMAIN}` || hostname === DEV_ROOT_DOMAIN) {
    if (path.startsWith('/docs')) {
      return NextResponse.next();
    }
    return withReport(NextResponse.rewrite(new URL(`/main${path}`, req.url), forward));
  }

  return NextResponse.next();
}
