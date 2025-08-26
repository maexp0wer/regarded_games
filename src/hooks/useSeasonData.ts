// src/hooks/useSeasonData.ts
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { contractAddresses, gameControllerABI, treasuryABI } from '@/lib/contracts';
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

  const isLoading = isLoadingTotal || isLoadingStatuses || isLoadingPrizePool || isLoadingManifest;

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
  };
}