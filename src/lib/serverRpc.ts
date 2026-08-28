/* Server-side viem clients, per tenant.
 *
 * WHY THIS EXISTS: TENANTS[t].rpcUrl is NOT usable on the server. In `mainnet`
 * env it is the relative string "/api/rpc/mainnet" — a browser-only proxy path
 * that keeps the Alchemy key out of the bundle. Fetching it from a server
 * component resolves against nothing and fails. In `fork` env it happens to be
 * a real Anvil URL, so the mistake passes locally and only breaks in
 * production.
 *
 * So this module resolves the upstream directly (the same URL the proxy route
 * builds) and, critically, THROWS on a relative URL rather than letting that
 * failure mode reach production silently. */

import { createPublicClient, http, defineChain, type PublicClient } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { TENANTS, APP_ENV, type TenantKey } from '@/config/tenants';

const isFork = APP_ENV !== 'mainnet';

const ALCHEMY_HOST: Record<TenantKey, string> = {
  mainnet: 'https://base-mainnet.g.alchemy.com/v2',
  sepolia: 'https://base-sepolia.g.alchemy.com/v2',
};

/** Anvil forks aren't in viem/chains; mint them here so the client has a chain. */
const forkChain = (id: number, name: string, rpc: string) =>
  defineChain({
    id,
    name,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [rpc] } },
  });

export function serverRpcUrl(tenant: TenantKey): string {
  if (isFork) {
    const url = TENANTS[tenant].rpcUrl;
    if (url.startsWith('/')) {
      throw new Error(
        `serverRpcUrl(${tenant}): got the relative proxy path "${url}". ` +
          'The browser RPC proxy cannot be called from the server.',
      );
    }
    return url;
  }

  const key = process.env.ALCHEMY_API_KEY;
  if (!key) {
    throw new Error(
      `serverRpcUrl(${tenant}): ALCHEMY_API_KEY is not set. Server-side reads ` +
        'go direct to Alchemy, not through /api/rpc/*.',
    );
  }
  return `${ALCHEMY_HOST[tenant]}/${key}`;
}

export function serverPublicClient(tenant: TenantKey): PublicClient {
  const url = serverRpcUrl(tenant);
  const t = TENANTS[tenant];
  const chain = isFork
    ? forkChain(t.activeChainId, `${tenant} fork`, url)
    : tenant === 'mainnet'
      ? base
      : baseSepolia;

  return createPublicClient({ chain, transport: http(url) }) as PublicClient;
}
