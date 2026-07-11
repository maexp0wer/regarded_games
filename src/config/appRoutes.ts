import type { TenantKey } from './tenants';

export interface AppRoute {
  pattern: string;
  tenants: TenantKey[];
}

export const APP_ROUTES: AppRoute[] = [
  { pattern: '/quests',              tenants: ['sepolia'] },
  { pattern: '/community-login',     tenants: ['mainnet', 'sepolia'] },
  { pattern: '/',                    tenants: ['mainnet', 'sepolia'] },
  { pattern: '/seasons',             tenants: ['mainnet', 'sepolia'] },
  { pattern: '/stake',               tenants: ['mainnet', 'sepolia'] },
  { pattern: '/swap',                tenants: ['mainnet', 'sepolia'] },
  { pattern: '/ico',                 tenants: ['mainnet'] },
  { pattern: '/faucet',              tenants: ['sepolia'] },
  { pattern: '/faucet/[referrer]',   tenants: ['sepolia'] },
  { pattern: '/dashboard/[address]', tenants: ['mainnet', 'sepolia'] },
  { pattern: '/dashboard'          , tenants: ['mainnet', 'sepolia'] },
  { pattern: '/[seasonSlug]',        tenants: ['mainnet', 'sepolia'] },
];

function patternToRegex(pattern: string): RegExp {
  // 1. Stash [param] segments behind a placeholder that survives regex escaping.
  const PARAM = '\x00P\x00';
  const withPlaceholders = pattern.replace(/\[[^\]]+\]/g, PARAM);
  // 2. Escape all regex specials (including [ and ]).
  const escaped = withPlaceholders.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // 3. Restore placeholders as single-segment matchers.
  const finalPattern = escaped.replaceAll(PARAM, '[^/]+');
  return new RegExp(`^${finalPattern}$`);
}

const COMPILED: { regex: RegExp; route: AppRoute }[] = APP_ROUTES.map((r) => ({
  regex: patternToRegex(r.pattern),
  route: r,
}));

export function findRoute(pathInsideApp: string): AppRoute | undefined {
  const normalized = pathInsideApp === '' ? '/' : pathInsideApp;
  const hit = COMPILED.find(({ regex }) => regex.test(normalized));
  return hit?.route;
}

export function isRouteEnabled(pathInsideApp: string, tenant: TenantKey): boolean {
  const route = findRoute(pathInsideApp);
  return !!route && route.tenants.includes(tenant);
}

// Static single-segment app pages (e.g. "seasons", "stake", "faucet") — every
// fixed top-level route that is NOT the dynamic `/[seasonSlug]` catch-all.
// Derived from APP_ROUTES so it can't drift as routes are added/removed; used
// to tell a real season page apart from a known page at `/app/<segment>`.
export const KNOWN_APP_PAGES: ReadonlySet<string> = new Set(
  APP_ROUTES.map((r) => r.pattern)
    .filter((p) => /^\/[^/[]+$/.test(p)) // one segment, no [param]
    .map((p) => p.slice(1)),
);
