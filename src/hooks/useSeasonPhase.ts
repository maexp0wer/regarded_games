'use client';

import { useEffect, useMemo, useState } from 'react';
import { useReadContract } from 'wagmi';
import { Address } from 'viem';

import GameSeasonAbi from '@/deployments/abis/GameSeason.json';
import { useTenantChainId } from '@/context/TenantContext';

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
  isPayout: boolean;

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
    abi: GameSeasonAbi as any,
    functionName: 'getPhase',
    chainId,
    query: { enabled, refetchInterval: 3000 },
  });

  const { data: isActiveRaw } = useReadContract({
    address: seasonAddress as Address,
    abi: GameSeasonAbi as any,
    functionName: 'isActive',
    chainId,
    query: { enabled, refetchInterval: 3000 },
  });

  const { data: tradingStartTimeRaw } = useReadContract({
    address: seasonAddress as Address,
    abi: GameSeasonAbi as any,
    functionName: 'tradingStartTime',
    chainId,
    query: { enabled, refetchInterval: 3000 },
  });

  const { data: rawConfig, isLoading: isConfigLoading } = useReadContract({
    address: seasonAddress as Address,
    abi: GameSeasonAbi as any,
    functionName: 'getConfig',
    chainId,
    query: { enabled, staleTime: Infinity },
  });

  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const config = useMemo<SeasonConfig | null>(() => {
    if (!rawConfig) return null;
    const r = rawConfig as any;
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
  const isPayout  = currentPhase === 'PAYOUT' || currentPhase === 'DISTRIBUTION';

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
    isPayout,
    tradingStart,
    seasonEnd,
    isTradingTimeExpired,
    config,
    isLoading: isPhaseLoading || isConfigLoading,
  };
}
