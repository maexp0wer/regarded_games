// src/hooks/useSeasonData.ts
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { contractAddresses, gameControllerABI } from '@/lib/contracts';
import { Address } from 'viem';

// Define the shape of the data this hook will provide
export interface SeasonDetails {
  isActive: boolean;
  gameSeason: Address;
  auction: Address;
}

export interface ManifestDetails {
  yieldVenues: readonly Address[];
  allocationBps: readonly bigint[];
  harvestGasPriceLimit: bigint;
}

export interface SeasonDataState {
  isMounted: boolean;
  isLoading: boolean;
  activeSeasonId: number | null;
  seasonDetails?: SeasonDetails;
  manifestDetails?: ManifestDetails;
  error?: string;
}

// Define the explicit return type for our `getSeason` tuple
type GetSeasonResult = readonly [boolean, Address, Address];
// Define the explicit return type for our `getSeasonFinancialManifest` tuple
type GetManifestResult = readonly [readonly Address[], readonly bigint[], bigint];

export function useSeasonData(): SeasonDataState {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const [activeSeasonId, setActiveSeasonId] = useState<number | null>(null);

  const { chain } = useAccount();
  const addresses = chain ? contractAddresses[chain.id as keyof typeof contractAddresses] : undefined;
  const gameControllerAddress = addresses?.gameController;

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

  // STEP 4: Fetch the manifest ONLY for the active season.
  const { data: manifestDetailsData, isLoading: isLoadingManifest } = useReadContract({
    address: gameControllerAddress,
    abi: gameControllerABI,
    functionName: 'getSeasonFinancialManifest',
    // 🔴 THE FIX IS HERE 🔴
    // We pass `undefined` for args when the hook is disabled. This satisfies TypeScript's
    // `readonly [bigint] | undefined` type requirement.
    args: activeSeasonId !== null ? [BigInt(activeSeasonId)] : undefined,
    query: {
      enabled: activeSeasonId !== null,
    },
  });

  // STEP 5: Consolidate and return the final state.
  const isLoading = isLoadingTotal || isLoadingStatuses || isLoadingManifest;
  
  return {
    isMounted,
    isLoading,
    activeSeasonId,
    seasonDetails: activeSeasonData
      ? {
          isActive: activeSeasonData[0],
          gameSeason: activeSeasonData[1],
          auction: activeSeasonData[2],
        }
      : undefined,
    manifestDetails: manifestDetailsData
      ? {
          yieldVenues: (manifestDetailsData as unknown as GetManifestResult)[0],
          allocationBps: (manifestDetailsData as unknown as GetManifestResult)[1],
          harvestGasPriceLimit: (manifestDetailsData as unknown as GetManifestResult)[2],
        }
      : undefined,
  };
}