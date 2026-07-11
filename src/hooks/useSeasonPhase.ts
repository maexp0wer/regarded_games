'use client';

import { useMemo } from 'react';
import { useReadContract } from 'wagmi';
import { Address } from 'viem';
import type { Abi } from 'abitype';

import GameSeasonAbi from '@/deployments/abis/GameSeason.json';
import { useTenantChainId } from '@/context/TenantContext';
import { useChainTime } from './useChainTime';

export interface SeasonConfig {
  auctionStartTime: number;
  auctionDuration: number;
  tradingDuration: number;
  victoryThresholdBps: number;
  baseMultiplierBps: number;
  buybackBps: number;
  liquidityBps: number;
  prizePoolBps: number;
  daoBps: number;
}

export interface SeasonPhaseState {
  currentPhase: string | null;
  isAuction: boolean;
  isBootstrap: boolean;
  isAuctionOrBootstrap: boolean;
  isTrading: boolean;
  isSettling: boolean;
  isTriage: boolean;
  isInvestigation: boolean;
  /** TRIAGE or INVESTIGATION — the post-settlement review window (ADR-0008). */
  isUnderReview: boolean;
  isPayout: boolean;
  /** Any phase after trading: SETTLING, TRIAGE, INVESTIGATION, or PAYOUT. */
  isPostTrading: boolean;

  tradingStart: number;
  seasonEnd: number;
  isTradingTimeExpired: boolean;

  config: SeasonConfig | null;

  isLoading: boolean;
}

export function useSeasonPhase(seasonAddress: Address | string | undefined): SeasonPhaseState {
  const enabled = !!seasonAddress;
  const chainId = useTenantChainId();

  const { data: phaseRaw, isLoading: isPhaseLoading } = useReadContract({
    address: seasonAddress as Address,
    abi: GameSeasonAbi as Abi,
    functionName: 'getPhase',
    chainId,
    query: { enabled, refetchInterval: 3000 },
  });

  const { data: isActiveRaw } = useReadContract({
    address: seasonAddress as Address,
    abi: GameSeasonAbi as Abi,
    functionName: 'isActive',
    chainId,
    query: { enabled, refetchInterval: 3000 },
  });

  const { data: tradingStartTimeRaw } = useReadContract({
    address: seasonAddress as Address,
    abi: GameSeasonAbi as Abi,
    functionName: 'tradingStartTime',
    chainId,
    query: { enabled, refetchInterval: 3000 },
  });

  const { data: rawConfig, isLoading: isConfigLoading } = useReadContract({
    address: seasonAddress as Address,
    abi: GameSeasonAbi as Abi,
    functionName: 'getConfig',
    chainId,
    query: { enabled, staleTime: Infinity },
  });

  // Chain clock (see useChainTime): the expiry check below compares against the
  // on-chain seasonEnd, which is anchored to block.timestamp. In fork mode the
  // chain lags real time, so a Date.now() comparison would flag trading as
  // expired days early.
  const now = useChainTime();

  const config = useMemo<SeasonConfig | null>(() => {
    if (!rawConfig) return null;
    const r = rawConfig as Record<string | number, unknown>;
    const getVal = (key: string, idx: number) => (r[key] !== undefined ? r[key] : r[idx]);
    return {
      auctionStartTime:    Number(getVal('auctionStartTime', 0)),
      auctionDuration:     Number(getVal('auctionDuration', 1)),
      tradingDuration:     Number(getVal('tradingDuration', 2)),
      victoryThresholdBps: Number(getVal('victoryThresholdBps', 3)),
      baseMultiplierBps:   Number(getVal('baseMultiplierBps', 4)),
      buybackBps:          Number(getVal('buybackBps', 5) || 0),
      liquidityBps:        Number(getVal('liquidityBps', 6) || 0),
      prizePoolBps:        Number(getVal('prizePoolBps', 7) || 0),
      daoBps:              Number(getVal('daoBps', 8) || 0),
    };
  }, [rawConfig]);

  const currentPhase = (phaseRaw as string | undefined) ?? null;
  const isAuction   = currentPhase === 'AUCTION';
  const isBootstrap = currentPhase === 'BOOTSTRAP';
  const isAuctionOrBootstrap = isAuction || isBootstrap;
  const isTrading = currentPhase === 'TRADING';
  // On-chain settlement crank in progress (only true once someone cranks
  // startSettlement). Deliberately NOT the trading-halt driver: the halt uses
  // the earlier predictive `effectiveVictoryPending` (useSeasonVictory), which is
  // the safe choice — the chain already rejects trades on clock expiry before
  // anyone cranks. Exposed for labels / gating completeness only. See CONTEXT.md
  // "effectiveVictoryPending vs. SETTLING".
  const isSettling = currentPhase === 'SETTLING' || currentPhase === 'CALCULATING';
  // Two-stage review between settlement and payout (ADR-0008): TRIAGE (short,
  // automatic) escalates to INVESTIGATION only if the Council raises suspicion.
  // computePayout() returns 0 throughout; distribution opens permissionlessly
  // once the active window lapses.
  const isTriage        = currentPhase === 'TRIAGE';
  const isInvestigation = currentPhase === 'INVESTIGATION';
  const isUnderReview   = isTriage || isInvestigation;
  // `ENDED` was removed — getPhase() never returns it; PAYOUT is terminal.
  const isPayout  = currentPhase === 'PAYOUT' || currentPhase === 'DISTRIBUTION';
  const isPostTrading = isSettling || isUnderReview || isPayout;

  const scheduledTradingStart = (config?.auctionStartTime || 0) + (config?.auctionDuration || 0);
  const actualTradingStart    = tradingStartTimeRaw ? Number(tradingStartTimeRaw) : 0;
  const tradingStart          = actualTradingStart > 0 ? actualTradingStart : scheduledTradingStart;
  const seasonEnd             = tradingStart + (config?.tradingDuration || 0);

  const isTradingTimeExpired =
    isTrading && (isActiveRaw === false || (seasonEnd > 0 && now >= seasonEnd));

  return {
    currentPhase,
    isAuction,
    isBootstrap,
    isAuctionOrBootstrap,
    isTrading,
    isSettling,
    isTriage,
    isInvestigation,
    isUnderReview,
    isPayout,
    isPostTrading,
    tradingStart,
    seasonEnd,
    isTradingTimeExpired,
    config,
    isLoading: isPhaseLoading || isConfigLoading,
  };
}
