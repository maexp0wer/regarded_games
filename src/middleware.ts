// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|Regardo_Head.svg).*)'],
};

const PROD_ROOT_DOMAIN = process.env.NEXT_PUBLIC_MAIN_DOMAIN ?? 'yourdomain.com';
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

  // 2. APP.SEPOLIA SUBDOMAIN — must be checked BEFORE app.* (prefix match)
  if (
    hostname === `app.sepolia.${PROD_ROOT_DOMAIN}` ||
    hostname === `app.sepolia.${DEV_ROOT_DOMAIN}`
  ) {
    if (!TESTNET_APP_LIVE) {
      return NextResponse.rewrite(new URL('/coming-soon', req.url));
    }
    const res = NextResponse.rewrite(new URL(`/app${path}`, req.url));
    res.headers.set('x-tenant', 'sepolia');
    res.headers.set('x-app-path', path);
    return res;
  }

  // 3. APP SUBDOMAIN (mainnet tenant) — app.localhost:3000 OR app.yourdomain.com
  if (hostname === `app.${PROD_ROOT_DOMAIN}` || hostname === `app.${DEV_ROOT_DOMAIN}`) {
    if (!APP_LIVE) {
      return NextResponse.rewrite(new URL('/coming-soon', req.url));
    }
    const res = NextResponse.rewrite(new URL(`/app${path}`, req.url));
    res.headers.set('x-tenant', 'mainnet');
    res.headers.set('x-app-path', path);
    return res;
  }

  // 4. ROOT DOMAIN
  if (hostname === PROD_ROOT_DOMAIN || hostname === `www.${PROD_ROOT_DOMAIN}` || hostname === DEV_ROOT_DOMAIN) {
    if (path.startsWith('/docs')) {
      return NextResponse.next();
    }
    return NextResponse.rewrite(new URL(`/main${path}`, req.url));
  }

  return NextResponse.next();
}
