import { SITE_ORIGIN } from '@/config/seo';

/* Host-aware robots.txt — one Next app serves three hosts via the middleware
   rewrites (bare domain, app., app.sepolia.), so this must be a route handler,
   not the static app/robots.ts convention. The middleware passes /robots.txt
   through the tenant rewrites so it lands here on every host. */

export async function GET(req: Request) {
  const host = req.headers.get('host') ?? '';

  /* Testnet tenant: never indexed — same UI as mainnet (duplicate content)
     pointed at Sepolia. Belt (robots) and braces (X-Robots-Tag header set in
     middleware). */
  if (host.startsWith('app.sepolia.')) {
    return new Response('User-agent: *\nDisallow: /\n', {
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  /* Everything else is deliberately open — INCLUDING AI training crawlers.
     Standing GEO policy (CONTEXT.md "GEO", 2026-07-13): the whitepaper and
     public pages are meant to be trained on and quoted. Do not add blocks
     for GPTBot / ClaudeBot / Google-Extended / CCBot / PerplexityBot. */
  const lines = [
    'User-agent: *',
    'Allow: /',
    '',
    `# AI crawlers welcome — see ${SITE_ORIGIN}/llms.txt`,
  ];

  // Only the bare domain carries the sitemap (app.* has no indexable routes
  // of its own; every URL in the sitemap is absolute to the root origin).
  if (!host.startsWith('app.')) {
    lines.push('', `Sitemap: ${SITE_ORIGIN}/sitemap.xml`);
  }

  return new Response(lines.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/plain' },
  });
}
