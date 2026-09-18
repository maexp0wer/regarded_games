'use client';

import { useReadContracts } from 'wagmi';
import type { Abi } from 'abitype';
import TreasuryAbiJson from '@/deployments/abis/Treasury.json';
import { useTenantChainId, useTenantDeployment } from '@/context/TenantContext';

const TreasuryAbi = TreasuryAbiJson as Abi;

/**
 * Live Treasury accrual state for one season: what its principal is earning at
 * the lending venue right now, before any of it has been harvested.
 *
 * This is the other half of `useYieldTotals`, and the two never overlap. Every
 * Treasury harvest attributes the realized surplus across all accruing seasons
 * pro-rata by principal into per-season `accruedYield` buckets; a season drains
 * its bucket at its own single harvest (`harvestAndExecutePolicy`, called by
 * `openDistribution`) and retires from the accrual set. So `accruedYield` is
 * strictly the *un-harvested* remainder, `useYieldTotals` is strictly the
 * harvested-and-split part, and their sum is everything the season has earned.
 */
export interface SeasonAccrual {
  /** Attributed but un-harvested yield, raw USDC (6dp). */
  accruedYield: bigint;
  /** Season principal under Treasury management, raw USDC (6dp). */
  principal: bigint;
  /** True while the season is still in the Treasury's accrual set. */
  isAccruing: boolean;
  /** Pool the Treasury deposits into; undefined until the read lands. */
  poolAddress?: `0x${string}`;
  loading: boolean;
}

export function useSeasonAccrual(seasonAddress: string | undefined): SeasonAccrual {
  const chainId = useTenantChainId();
  const { Treasury } = useTenantDeployment();

  const { data, isLoading } = useReadContracts({
    contracts: [
      { address: Treasury, abi: TreasuryAbi, functionName: 'accruedYield',     args: [seasonAddress!], chainId },
      { address: Treasury, abi: TreasuryAbi, functionName: 'seasonPrincipals', args: [seasonAddress!], chainId },
      { address: Treasury, abi: TreasuryAbi, functionName: 'isAccruing',       args: [seasonAddress!], chainId },
      { address: Treasury, abi: TreasuryAbi, functionName: 'aavePool',                                 chainId },
    ],
    query: {
      enabled: !!seasonAddress && !!Treasury,
      // Yield accrues per block but moves slowly in dollar terms — the 15s
      // cadence the rest of the season detail cards use is plenty.
      refetchInterval: 15_000,
      staleTime: 10_000,
    },
  });

  return {
    accruedYield: (data?.[0]?.result as bigint | undefined) ?? 0n,
    principal:    (data?.[1]?.result as bigint | undefined) ?? 0n,
    isAccruing:   (data?.[2]?.result as boolean | undefined) ?? false,
    poolAddress:   data?.[3]?.result as `0x${string}` | undefined,
    loading: isLoading,
  };
}
