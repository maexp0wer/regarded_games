'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { contractAddresses, gameControllerABI } from '@/lib/contracts';
import { SeasonDisplay } from './SeasonDisplay';

export function ActiveSeasonDisplay() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const [activeSeasonId, setActiveSeasonId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { chain } = useAccount();
  const addresses = chain ? contractAddresses[chain.id as keyof typeof contractAddresses] : undefined;
  const gameControllerAddress = addresses?.gameController;
  const treasuryAddress = addresses?.treasury; // Get the treasury address to pass down

  // STEP 1: Fetch the total number of seasons.
  const { data: totalSeasonsData } = useReadContract({
    address: gameControllerAddress,
    abi: gameControllerABI,
    functionName: 'getTotalSeasons',
    query: { enabled: !!gameControllerAddress },
  });
  const totalSeasons = totalSeasonsData ? Number(totalSeasonsData) : 0;

  // STEP 2: Prepare a batch of calls to get the status of each season.
  const seasonStatusContracts = useMemo(() => {
    if (!gameControllerAddress || totalSeasons === 0) return [];
    return Array.from({ length: totalSeasons }, (_, i) => ({
      address: gameControllerAddress,
      abi: gameControllerABI,
      functionName: 'getSeason',
      args: [BigInt(i)],
    }));
  }, [gameControllerAddress, totalSeasons]);

  const { data: seasonStatuses, isFetched } = useReadContracts({
    contracts: seasonStatusContracts,
    query: { enabled: totalSeasons > 0 },
  });

  // STEP 3: Process the results to find the first active season.
  useEffect(() => {
    if (!isFetched) return;

    if (seasonStatuses) {
      const firstActiveIndex = seasonStatuses.findIndex(
        (season) => season.status === 'success' && season.result?.[0] === true
      );

      if (firstActiveIndex !== -1) {
        setActiveSeasonId(firstActiveIndex);
      } else {
        setActiveSeasonId(null);
      }
    }
    setIsLoading(false);
  }, [seasonStatuses, isFetched]);
  
  if (!isMounted) return null;

  if (isLoading) {
    return <div className="p-4 text-center text-gray-500 mt-8">Searching for active season...</div>;
  }

  // STEP 4: Render the detail view if we found an ID and have the treasury address.
  if (activeSeasonId !== null && treasuryAddress) {
    return <SeasonDisplay seasonId={activeSeasonId} treasuryAddress={treasuryAddress} />;
  }

  return <div className="p-4 text-center text-gray-500 mt-8">No active season found.</div>;
}