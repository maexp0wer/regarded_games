/**
 * Identifies the lending venue the Treasury deploys season principal into.
 *
 * The Treasury supplies idle season USDC to Aave V3 (`depositPrincipal`) and
 * withdraws only when a payout needs it, so "the venue" is whatever pool
 * `Treasury.aavePool()` points at. On Base mainnet that is the canonical Aave
 * V3 Pool; test deployments point at a MockAavePool instead, and the UI has to
 * say so rather than implying real Aave yield on play money.
 */

/** Aave V3 Pool, Base mainnet (8453). The mainnet-fork tenant inherits it. */
export const AAVE_V3_POOL_BASE = '0xa238dd80c259a72e81d7e4664a9801593f98d1c5';

export interface YieldVenue {
  /** Protocol name for the badge. */
  name: string;
  /** True when the pool is a stand-in (MockAavePool on a test deployment). */
  isMock: boolean;
}

/**
 * Callers should pass an address they already hold synchronously (the tenant
 * manifest's `Aave`) when the live `aavePool()` read is still in flight — an
 * absent address counts as "not the canonical pool" and would otherwise flash
 * a Mock marker on mainnet.
 */
export function identifyYieldVenue(poolAddress: string | undefined | null): YieldVenue {
  return {
    name: 'Aave V3',
    isMock: (poolAddress ?? '').toLowerCase() !== AAVE_V3_POOL_BASE,
  };
}
