// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host')!;
  const path = url.pathname;

  // --- Define your domains ---
  const PROD_ROOT_DOMAIN = 'yourdomain.com'; // Replace with your actual domain
  const DEV_ROOT_DOMAIN = 'localhost:3000';

  // --- Routing Logic based on EXACT hostname match ---

  // 1. Route the 'app' subdomain to the /app folder
  if (hostname === `app.${PROD_ROOT_DOMAIN}` || hostname === `app.${DEV_ROOT_DOMAIN}`) {
    return NextResponse.rewrite(new URL(`/app${path}`, req.url));
  }

  // 2. Route the root domain to the /main folder
  if (hostname === PROD_ROOT_DOMAIN || hostname === `www.${PROD_ROOT_DOMAIN}` || hostname === DEV_ROOT_DOMAIN) {
    return NextResponse.rewrite(new URL(`/main${path}`, req.url));
  }

  // 3. Allow other requests to pass through (e.g., for unhandled domains)
  return NextResponse.next();
}