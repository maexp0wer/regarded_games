'use client';

import { useEffect, useState } from 'react';
import { useReadContracts } from 'wagmi';
import type { Abi } from 'abitype';

import GameSeasonAbi from '@/deployments/abis/GameSeason.json';
import { useTenantChainId } from '@/context/TenantContext';
import { useSeasonPhase } from './useSeasonPhase';

// Mirrors the contract's hardcoded sweep gate:
// `require(block.timestamp >= distributionStartTime + 365 days)` — no getter.
export const CLAIM_WINDOW_SECONDS = 365 * 24 * 60 * 60;

export interface SeasonEndgameState {
  /** SETTLING: unix deadline for the current settlement starter (0 if unset). */
  settlementDeadline: number;
  /** SETTLING: deadline passed — takeOverSettlement() is callable by anyone. */
  settlementExpired: boolean;
  /** USDC (6 decimals) bond a settlement (or takeover) starter must post. */
  takeoverBondUsdc: bigint;

  /** TRIAGE/INVESTIGATION: unix end of the active review window (0 outside review). */
  reviewWindowEnd: number;
  /** TRIAGE/INVESTIGATION: window lapsed — openDistribution() is callable by anyone. */
  reviewExpired: boolean;
  /**
   * Any Council flag flips this for good: every player's payout is repriced to
   * the draw distribution (computePayout() reflects it; previews must too).
   */
  forcedDraw: boolean;

  /** PAYOUT: unix start of distribution (0 until openDistribution). */
  distributionStartTime: number;
  /** PAYOUT: unix deadline after which the Council may sweep unclaimed payouts. */
  claimDeadline: number;
  /** PAYOUT: unclaimed payouts were swept — claims still succeed but pay $0. */
  swept: boolean;

  isLoading: boolean;
  refetch: () => void;
}

/**
 * Everything the post-trading UI needs from the season contract: the settlement
 * deadman switch (§6), the TRIAGE/INVESTIGATION review windows (§1/§3), and the
 * claim window + sweep state (§5). One multicall, 5s refetch — each value can
 * change under the user's feet exactly once (takeover, suspicion, open, sweep),
 * so slow-poll freshness is enough.
 */
export function useSeasonEndgame(seasonAddress: string | undefined): SeasonEndgameState {
  const chainId = useTenantChainId();
  const { isSettling, isTriage, isInvestigation } = useSeasonPhase(seasonAddress);

  const contract = { address: seasonAddress as `0x${string}`, abi: GameSeasonAbi as Abi, chainId };
  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      { ...contract, functionName: 'settlementDeadline' },
      { ...contract, functionName: 'bondAmountUsdc' },
      { ...contract, functionName: 'reviewPhaseStart' },
      { ...contract, functionName: 'triageWindowSeconds' },
      { ...contract, functionName: 'investigationWindowSeconds' },
      { ...contract, functionName: 'forcedDraw' },
      { ...contract, functionName: 'distributionStartTime' },
      { ...contract, functionName: 'swept' },
    ],
    query: { enabled: !!seasonAddress, refetchInterval: 5000 },
  });

  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const num = (i: number) => (data?.[i]?.result !== undefined ? Number(data[i].result as bigint) : 0);

  const settlementDeadline = num(0);
  const takeoverBondUsdc = (data?.[1]?.result as bigint | undefined) ?? 0n;
  const reviewPhaseStart = num(2);
  const triageWindow = num(3);
  const investigationWindow = num(4);
  const forcedDraw = data?.[5]?.result === true;
  const distributionStartTime = num(6);
  const swept = data?.[7]?.result === true;

  // reviewPhaseStart restarts when TRIAGE escalates to INVESTIGATION, so the
  // active window is always start + the current phase's own duration.
  const reviewWindowEnd =
    isTriage ? reviewPhaseStart + triageWindow
    : isInvestigation ? reviewPhaseStart + investigationWindow
    : 0;

  return {
    settlementDeadline,
    settlementExpired: isSettling && settlementDeadline > 0 && now >= settlementDeadline,
    takeoverBondUsdc,
    reviewWindowEnd,
    reviewExpired: reviewWindowEnd > 0 && now >= reviewWindowEnd,
    forcedDraw,
    distributionStartTime,
    claimDeadline: distributionStartTime > 0 ? distributionStartTime + CLAIM_WINDOW_SECONDS : 0,
    swept,
    isLoading,
    refetch,
  };
}
