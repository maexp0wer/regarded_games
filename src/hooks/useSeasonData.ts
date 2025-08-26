// src/hooks/useSeasonData.ts
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { contractAddresses, gameControllerABI, treasuryABI, gameSeasonABI  } from '@/lib/contracts';
import { Address, formatUnits } from 'viem';

export interface SeasonDataState {
  isMounted: boolean;
  isLoading: boolean;
  activeSeasonId: number | null;
  isActive?: boolean;
  gameSeasonAddress?: Address;
  auctionAddress?: Address;
  prizePool: string;
  manifest?: {
    yieldVenues: readonly Address[];
    allocationBps: readonly bigint[];
  };
  phase: 'AUCTION' | 'TRADING' | 'ENDED' | 'UNKNOWN';
}

type GetSeasonResult = readonly [boolean, Address, Address];
type GetManifestResult = readonly [readonly Address[], readonly bigint[], bigint];

export function useSeasonData(): SeasonDataState {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const [activeSeasonId, setActiveSeasonId] = useState<number | null>(null);
  const { chain } = useAccount();
  const addresses = chain ? contractAddresses[chain.id as keyof typeof contractAddresses] : undefined;

  const { data: totalSeasonsData, isLoading: isLoadingTotal } = useReadContract({
    address: addresses?.gameController,
    abi: gameControllerABI,
    functionName: 'getTotalSeasons',
    query: { enabled: !!addresses },
  });
  const totalSeasons = totalSeasonsData ? Number(totalSeasonsData) : 0;

  const seasonStatusContracts = useMemo(() => {
    if (!addresses || totalSeasons === 0) return [];
    return Array.from({ length: totalSeasons }, (_, i) => ({
      address: addresses.gameController,
      abi: gameControllerABI,
      functionName: 'getSeason',
      args: [BigInt(i)],
    }));
  }, [addresses, totalSeasons]);

  const { data: seasonStatuses, isLoading: isLoadingStatuses } = useReadContracts({
    contracts: seasonStatusContracts,
    query: { enabled: totalSeasons > 0 },
  });

  useEffect(() => {
    if (seasonStatuses) {
      const idx = seasonStatuses.findIndex(s => s.status === 'success' && (s.result as unknown as GetSeasonResult)?.[0] === true);
      setActiveSeasonId(idx !== -1 ? idx : null);
    }
  }, [seasonStatuses]);

  const activeSeasonData = useMemo(() => {
    if (activeSeasonId === null || !seasonStatuses) return undefined;
    return seasonStatuses[activeSeasonId]?.result as unknown as GetSeasonResult | undefined;
  }, [activeSeasonId, seasonStatuses]);

  const { data: prizePoolData, isLoading: isLoadingPrizePool } = useReadContract({
    address: addresses?.treasury,
    abi: treasuryABI,
    functionName: 'seasonPrizePool',
    args: activeSeasonId !== null ? [BigInt(activeSeasonId)] : undefined,
    query: { enabled: activeSeasonId !== null && !!addresses, refetchInterval: 5000 },
  });

  const { data: manifestData, isLoading: isLoadingManifest } = useReadContract({
    address: addresses?.gameController,
    abi: gameControllerABI,
    functionName: 'getSeasonFinancialManifest',
    args: activeSeasonId !== null ? [BigInt(activeSeasonId)] : undefined,
    query: { enabled: activeSeasonId !== null },
  });

  const { data: currentStateData, isLoading: isLoadingCurrentState } = useReadContract({
    address: activeSeasonData?.[1], // The `gameSeasonAddress` is the second element in the tuple
    abi: gameSeasonABI,
    functionName: 'currentState',
    query: {
      // Only run this query if we have found an active season
      enabled: activeSeasonData !== undefined,
      // Keep it live by refetching
      refetchInterval: 5000,
    }
  });

  const isLoading = isLoadingTotal || isLoadingStatuses || isLoadingPrizePool || isLoadingManifest;

  

  const phase = useMemo(() => {
    const state = currentStateData as number | undefined;
    if (state === 0) return 'AUCTION';
    if (state === 1) return 'TRADING';
    if (state === 2) return 'ENDED';
    return 'UNKNOWN';
  }, [currentStateData]);

  return {
    isMounted,
    isLoading,
    activeSeasonId,
    isActive: activeSeasonData?.[0],
    gameSeasonAddress: activeSeasonData?.[1],
    auctionAddress: activeSeasonData?.[2],
    prizePool: prizePoolData ? formatUnits(prizePoolData, 6) : '0.00',
    manifest: manifestData ? {
      yieldVenues: (manifestData as unknown as GetManifestResult)[0],
      allocationBps: (manifestData as unknown as GetManifestResult)[1],
    } : undefined,
    phase
  };
}