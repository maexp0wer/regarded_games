'use client';

import { useMemo } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import type { Abi } from 'viem';

import StakingAbiRaw from '@/deployments/abis/Staking.json';
import ExchangeAbiRaw from '@/deployments/abis/Exchange.json';
import { useTenantDeployment, useTenantChainId } from '@/context/TenantContext';
import {
  collateralCheck,
  headroomFor,
  maxBuyableFim,
  netFimToReceive,
  type CollateralCheck,
} from '@/utils/collateral';

const StakingAbi = StakingAbiRaw as Abi;
const ExchangeAbi = ExchangeAbiRaw as Abi;

export interface UseCollateralResult {
  /** RGD wei the connected wallet has staked. */
  staked: bigint;
  /** Cross-season high-water-mark lock (what `unstake` checks against). */
  required: bigint;
  /** This season's lock specifically (== this season's FIM × rate). */
  seasonLock: bigint;
  /** RGD wei locked per WHOLE FIM (per-season constant, read from the Exchange). */
  rate: bigint;
  /** Free collateral = staked − required (RGD wei). */
  headroom: bigint;
  /** Extra FIM the wallet can still acquire with current headroom. */
  maxBuyableFim: bigint;
  /** True once staked/required/rate have all resolved. */
  isReady: boolean;
  /**
   * Gate a FIM-acquiring action. Pass the FIM the wallet will *receive* — for a
   * mixed `fillBatch` that's the NET (`netFimToReceive(buyRaw, sellRaw)`), since
   * sell-legs-first ordering makes the chain check NET too.
   */
  checkBuy: (fimToReceive: bigint) => CollateralCheck;
  /** Force a re-read of the staking values (call after a trade/stake). */
  refetch: () => void;
}

/**
 * Live collateral reads for the connected wallet, plus the pure-math gate.
 * `staked`/`required`/`seasonLock` come from the `Staking` contract;
 * `rate` (`rgdLockedPerFim`) comes from the per-season contract.
 *
 * `rateSource` is the contract exposing `rgdLockedPerFim()` — the season's
 * `Exchange` for trading, or the `Auction` for the auction (both expose the
 * identical getter and return the same value). `seasonAddress` keys the
 * `seasonLocks(user, season)` read.
 */
export function useCollateral(
  seasonAddress: string | undefined,
  rateSource: string | undefined,
): UseCollateralResult {
  const { address } = useAccount();
  const chainId = useTenantChainId();
  const core = useTenantDeployment();
  const stakingAddr = core.Staking as `0x${string}`;

  const enabledUser = !!address;

  const { data: stakedRaw, refetch: refetchStaked } = useReadContract({
    address: stakingAddr, abi: StakingAbi, functionName: 'stakedBalances',
    args: address ? [address] : undefined, chainId,
    query: { enabled: enabledUser, refetchInterval: 5000 },
  });

  const { data: requiredRaw, refetch: refetchRequired } = useReadContract({
    address: stakingAddr, abi: StakingAbi, functionName: 'requiredRegStake',
    args: address ? [address] : undefined, chainId,
    query: { enabled: enabledUser, refetchInterval: 5000 },
  });

  const { data: seasonLockRaw, refetch: refetchSeasonLock } = useReadContract({
    address: stakingAddr, abi: StakingAbi, functionName: 'seasonLocks',
    args: address && seasonAddress ? [address, seasonAddress as `0x${string}`] : undefined,
    chainId,
    query: { enabled: enabledUser && !!seasonAddress, refetchInterval: 5000 },
  });

  // The rate is immutable per season — read once. The `rgdLockedPerFim()` getter
  // is identical on the Exchange and the Auction, so the Exchange ABI resolves
  // either contract.
  const { data: rateRaw } = useReadContract({
    address: rateSource as `0x${string}`, abi: ExchangeAbi, functionName: 'rgdLockedPerFim',
    chainId,
    query: { enabled: !!rateSource, staleTime: Infinity },
  });

  const staked = (stakedRaw as bigint | undefined) ?? 0n;
  const required = (requiredRaw as bigint | undefined) ?? 0n;
  const seasonLock = (seasonLockRaw as bigint | undefined) ?? 0n;
  const rate = (rateRaw as bigint | undefined) ?? 0n;

  const headroom = useMemo(() => headroomFor(staked, required), [staked, required]);
  const maxFim = useMemo(() => maxBuyableFim(headroom, rate), [headroom, rate]);

  const isReady =
    stakedRaw !== undefined && requiredRaw !== undefined && rateRaw !== undefined;

  const checkBuy = useMemo(
    () => (fimToReceive: bigint) => collateralCheck(fimToReceive, staked, required, rate),
    [staked, required, rate],
  );

  const refetch = () => {
    refetchStaked();
    refetchRequired();
    refetchSeasonLock();
  };

  return {
    staked,
    required,
    seasonLock,
    rate,
    headroom,
    maxBuyableFim: maxFim,
    isReady,
    checkBuy,
    refetch,
  };
}

// Re-export so callers can build a NET fill amount without a second import.
export { netFimToReceive };
