// src/hooks/useSeasonData.ts
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { contractAddresses, gameControllerABI, TreasuryABI, gameSeasonABI } from '@/lib/contracts';
import { Address, formatUnits } from 'viem';

export interface SeasonDataState {
  isMounted: boolean;
  isLoading: boolean;
  activeSeasonId: number | null;
  isActive?: boolean;
  gameSeasonAddress?: Address;
  auctionAddress?: Address;
  prizePool: string;
  phase: 'AUCTION' | 'TRADING' | 'ENDED' | 'UNKNOWN';
  manifest?: {
    yieldVenues: readonly Address[];
    allocationBps: readonly bigint[];
  };
}

// Explicit type for the return value of the `getSeason` function
type GetSeasonResult = readonly [boolean, Address, Address];

// Explicit type for the return value of the `getSeasonParameters` function
// NOTE: Adjust the first three types if they are not bigint
type GetParamsResult = readonly [
  bigint,
  bigint,
  bigint,
  readonly Address[],
  readonly bigint[],
  bigint
];

export function useSeasonData(): SeasonDataState {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const [activeSeasonId, setActiveSeasonId] = useState<number | null>(null);

  const { chain } = useAccount();
  const addresses = chain ? contractAddresses[chain.id as keyof typeof contractAddresses] : undefined;
  const gameControllerAddress = addresses?.GameController;

  // STEP 1: Fetch the total number of seasons.
  const { data: totalSeasonsData, isLoading: isLoadingTotal } = useReadContract({
    address: gameControllerAddress,
    abi: gameControllerABI,
    functionName: 'getTotalSeasons',
    query: { enabled: !!gameControllerAddress },
  });
  const totalSeasons = totalSeasonsData ? Number(totalSeasonsData) : 0;

  // STEP 2: Prepare a batch of calls to get the status of all seasons.
  const seasonStatusContracts = useMemo(() => {
    if (!gameControllerAddress || totalSeasons === 0) return [];
    return Array.from({ length: totalSeasons }, (_, i) => ({
      address: gameControllerAddress,
      abi: gameControllerABI,
      functionName: 'getSeason',
      args: [BigInt(i)],
    }));
  }, [gameControllerAddress, totalSeasons]);

  const { data: seasonStatuses, isLoading: isLoadingStatuses } = useReadContracts({
    contracts: seasonStatusContracts,
    query: { enabled: totalSeasons > 0 },
  });

  // STEP 3: Process the results to find the first active season.
  useEffect(() => {
    if (seasonStatuses) {
      const firstActiveIndex = seasonStatuses.findIndex((season) => {
        if (season.status !== 'success') return false;
        const result = season.result as unknown as GetSeasonResult;
        return result[0] === true;
      });
      setActiveSeasonId(firstActiveIndex !== -1 ? firstActiveIndex : null);
    }
  }, [seasonStatuses]);

  // Derive the active season's full data from the already-fetched results
  const activeSeasonData = useMemo(() => {
    if (activeSeasonId === null || !seasonStatuses || !seasonStatuses[activeSeasonId]) {
      return undefined;
    }
    return seasonStatuses[activeSeasonId].result as unknown as GetSeasonResult;
  }, [activeSeasonId, seasonStatuses]);

  const gameSeasonAddress = activeSeasonData?.[1];

  // STEP 4: Fetch detailed data for the active season
  const { data: prizePoolData, isLoading: isLoadingPrizePool } = useReadContract({
    address: addresses?.Treasury,
    abi: TreasuryABI,
    functionName: 'seasonPrizePool',
    args: activeSeasonId !== null ? [BigInt(activeSeasonId)] : undefined,
    query: { enabled: activeSeasonId !== null && !!addresses, refetchInterval: 5000 },
  });

  const { data: manifestData, isLoading: isLoadingManifest } = useReadContract({
    address: gameControllerAddress,
    abi: gameControllerABI,
    functionName: 'getSeasonParameters',
    args: activeSeasonId !== null ? [BigInt(activeSeasonId)] : undefined,
    query: { enabled: activeSeasonId !== null },
  });

  const { data: currentStateData, isLoading: isLoadingCurrentState } = useReadContract({
    address: gameSeasonAddress,
    abi: gameSeasonABI,
    functionName: 'currentState',
    query: { enabled: !!gameSeasonAddress, refetchInterval: 5000 }
  });

  const phase = useMemo(() => {
    const state = currentStateData as number | undefined;
    if (state === 0) return 'AUCTION';
    if (state === 1) return 'TRADING';
    if (state === 2) return 'ENDED';
    return 'UNKNOWN';
  }, [currentStateData]);

  const isLoading = isLoadingTotal || isLoadingStatuses || isLoadingPrizePool || isLoadingManifest || isLoadingCurrentState;

  // STEP 5: Consolidate and return the final state object
  return {
    isMounted,
    isLoading,
    activeSeasonId,
    isActive: activeSeasonData?.[0],
    gameSeasonAddress: activeSeasonData?.[1],
    auctionAddress: activeSeasonData?.[2],
    prizePool: prizePoolData ? formatUnits(prizePoolData, 6) : '0.00',
    phase,
    manifest: manifestData
      ? {
          yieldVenues: (manifestData as unknown as GetParamsResult)[3],
          allocationBps: (manifestData as unknown as GetParamsResult)[4],
        }
      : undefined,
  };
}