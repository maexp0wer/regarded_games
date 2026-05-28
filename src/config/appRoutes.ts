import type { TenantKey } from './tenants';

export interface AppRoute {
  pattern: string;
  tenants: TenantKey[];
}

export const APP_ROUTES: AppRoute[] = [
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
