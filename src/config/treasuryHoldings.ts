/* What the Treasury holds, per tenant.
 *
 * A CONFIGURED LIST, not on-chain discovery — deliberately. The two interesting
 * holdings can't be found the same way locally and in production:
 *   aToken  — fork uses MockAavePool.supplied(address,address); real Aave needs
 *             getReserveData(USDC).aTokenAddress.
 *   LP      — MockUniswapV2Router exposes lp(); the real UniswapV2Router does
 *             not, so you'd go factory().getPair(RGD, USDC).
 * Discovery would mean two code paths where the production one can never be
 * exercised locally. These addresses are deployment facts like every other
 * address in the per-tenant core.json deployment files, so they live in config.
 *
 * The zero address is a legal placeholder: entries pointing at it are filtered
 * out at fetch time and simply don't appear. That lets the list ship complete
 * before those contracts exist — paste the address in at launch, no code
 * change. */

import { TENANTS, type TenantKey } from './tenants';

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

export interface HoldingToken {
  symbol: string;
  label: string;
  address: `0x${string}`;
  decimals: number;
  /** How the USD equivalent is derived. */
  pricing: 'usd-pegged' | 'rgd-spot' | 'lp-share';
}

export function treasuryHoldings(tenant: TenantKey): HoldingToken[] {
  const d = TENANTS[tenant].deployment;
  return [
    {
      symbol: 'USDC',
      label: 'USDC',
      address: d.USDC,
      decimals: 6,
      pricing: 'usd-pegged',
    },
    {
      /* Aave receipt token: rebases 1:1 with the supplied USDC plus accrued
         interest, so it prices as USDC. */
      symbol: 'aUSDC',
      label: 'Aave USDC',
      address: (process.env.NEXT_PUBLIC_ATOKEN_USDC_ADDRESS as `0x${string}`) ?? ZERO_ADDRESS,
      decimals: 6,
      pricing: 'usd-pegged',
    },
    {
      symbol: 'RGD',
      label: 'Regarded Token',
      address: d.RGD,
      decimals: 18,
      pricing: 'rgd-spot',
    },
    {
      /* UniswapV2 pair token. For a V2 pair the LP token IS the pair contract,
         so this address doubles as the price source for RGD spot. */
      symbol: 'RGD/USDC LP',
      label: 'Liquidity Position',
      address: (process.env.NEXT_PUBLIC_RGD_USDC_PAIR_ADDRESS as `0x${string}`) ?? ZERO_ADDRESS,
      decimals: 18,
      pricing: 'lp-share',
    },
  ];
}

/** The RGD/USDC pair, which prices both RGD and the LP position. Null until deployed. */
export function rgdUsdcPair(tenant: TenantKey): `0x${string}` | null {
  const lp = treasuryHoldings(tenant).find((h) => h.pricing === 'lp-share');
  if (!lp || lp.address === ZERO_ADDRESS) return null;
  return lp.address;
}
