/* Cross-subdomain URL construction.
 *
 * NEXT_PUBLIC_MAIN_DOMAIN is authored as a full URL with protocol
 * (http://localhost:3000 / https://regarded.games), so every sibling surface is
 * reachable by splicing a subdomain in after the scheme — the same trick
 * useDocNavigation and docusaurus.config use to derive the docs host.
 *
 * Pure string work, no env reads: callers pass the domain in. */

export type AppHost = 'mainnet' | 'testnet';

/** Splice a subdomain after the scheme: http://localhost:3000 -> http://app.localhost:3000 */
export function withSubdomain(mainDomain: string, sub: string): string {
  return mainDomain.replace('://', `://${sub}.`);
}

/** Origin of a tenant's app surface. */
export function appOrigin(mainDomain: string, host: AppHost): string {
  return withSubdomain(mainDomain, host === 'testnet' ? 'app.sepolia' : 'app');
}

/** Absolute URL to a path on a tenant's app surface. */
export function appUrl(mainDomain: string, host: AppHost, path: string): string {
  return `${appOrigin(mainDomain, host)}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Origin of the docs surface. */
export function docsOrigin(mainDomain: string): string {
  return withSubdomain(mainDomain, 'docs');
}
