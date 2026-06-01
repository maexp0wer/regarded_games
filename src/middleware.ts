// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

const PROD_ROOT_DOMAIN = 'yourdomain.com';
const DEV_ROOT_DOMAIN = 'localhost:3000';

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host')!;
  const path = url.pathname;

  // 1. DOCS SUBDOMAIN — docs.localhost:3000 OR docs.yourdomain.com
  if (hostname === `docs.${PROD_ROOT_DOMAIN}` || hostname === `docs.${DEV_ROOT_DOMAIN}`) {
    return NextResponse.rewrite(new URL(`/docsproxy${path}`, req.url));
  }

  // 2. APP.SEPOLIA SUBDOMAIN — must be checked BEFORE app.* (prefix match)
  if (
    hostname === `app.sepolia.${PROD_ROOT_DOMAIN}` ||
    hostname === `app.sepolia.${DEV_ROOT_DOMAIN}`
  ) {
    const res = NextResponse.rewrite(new URL(`/app${path}`, req.url));
    res.headers.set('x-tenant', 'sepolia');
    res.headers.set('x-app-path', path);
    return res;
  }

  // 3. APP SUBDOMAIN (mainnet tenant) — app.localhost:3000 OR app.yourdomain.com
  if (hostname === `app.${PROD_ROOT_DOMAIN}` || hostname === `app.${DEV_ROOT_DOMAIN}`) {
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
