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
  const PROD_ROOT_DOMAIN = 'yourdomain.com'; 
  const DEV_ROOT_DOMAIN = 'localhost:3000';

  // --- Routing Logic ---

  // 1. DOCS SUBDOMAIN (Move this to the top to ensure it catches 'docs' first)
  //    Matches: docs.localhost:3000 OR docs.yourdomain.com
  if (hostname === `docs.${PROD_ROOT_DOMAIN}` || hostname === `docs.${DEV_ROOT_DOMAIN}`) {
    // FIX: If the path already starts with '/docs', don't add it again.
    // This makes links like /docs/getting-started work on the subdomain.
    if (path.startsWith('/docs/')) {
       return NextResponse.rewrite(new URL(path, req.url));
    }
    
    // Otherwise (e.g. visiting root '/'), prepend /docs
    return NextResponse.rewrite(new URL(`/docs${path}`, req.url));
  }

  // 2. APP SUBDOMAIN
  //    Matches: app.localhost:3000 OR app.yourdomain.com
  if (hostname === `app.${PROD_ROOT_DOMAIN}` || hostname === `app.${DEV_ROOT_DOMAIN}`) {
    return NextResponse.rewrite(new URL(`/app${path}`, req.url));
  }

  // 3. ROOT DOMAIN (localhost:3000 OR yourdomain.com)
  if (hostname === PROD_ROOT_DOMAIN || hostname === `www.${PROD_ROOT_DOMAIN}` || hostname === DEV_ROOT_DOMAIN) {
    
    // --- FIX START: Exception for /docs ---
    // If the user tries to access localhost:3000/docs/..., 
    // we should NOT rewrite to /main. We let it handle naturally (pointing to src/app/docs).
    if (path.startsWith('/docs')) {
      return NextResponse.next();
    }
    // --- FIX END ---

    return NextResponse.rewrite(new URL(`/main${path}`, req.url));
  }

  // 4. Fallback
  return NextResponse.next();
}