'use client';

import { useAccount, useReadContract } from 'wagmi';
import { contractAddresses, gameControllerABI, treasuryABI } from '@/lib/contracts';
import { formatUnits, Address } from 'viem';

// This component expects to be told which season to display.
interface SeasonDisplayProps {
  seasonId: number;
  treasuryAddress: Address;
}

export function SeasonDisplay({ seasonId, treasuryAddress }: SeasonDisplayProps) {
  const { chain } = useAccount();
  const addresses = chain ? contractAddresses[chain.id as keyof typeof contractAddresses] : undefined;
  const gameControllerAddress = addresses?.gameController;

  // --- Read Hook 1: Fetch basic season info ---
  const { data: seasonData, isLoading: isLoadingSeason } = useReadContract({
    address: gameControllerAddress,
    abi: gameControllerABI,
    functionName: 'getSeason',
    args: [BigInt(seasonId)],
    query: { enabled: !!gameControllerAddress },
  });

  // --- Read Hook 2: Fetch the financial manifest ---
  const { data: manifestData, isLoading: isLoadingManifest } = useReadContract({
    address: gameControllerAddress,
    abi: gameControllerABI,
    functionName: 'getSeasonFinancialManifest',
    args: [BigInt(seasonId)],
    query: { enabled: !!gameControllerAddress },
  });

  // --- Read Hook 3: Fetch the prize pool from the Treasury ---
  const { data: prizePoolData, isLoading: isLoadingPrizePool } = useReadContract({
    address: treasuryAddress, // Uses the address passed in via props
    abi: treasuryABI,
    functionName: 'seasonPrizePool',
    args: [BigInt(seasonId)],
    query: {
      enabled: !!treasuryAddress,
      refetchInterval: 5000, // Refresh every 5 seconds
    },
  });

  const isLoading = isLoadingSeason || isLoadingManifest || isLoadingPrizePool;

  // Destructure the data for easier access, providing default values
  const prizePool = prizePoolData as bigint | undefined;
  const [isActive, gameSeason, auction] = (seasonData as [boolean, Address, Address]) || [false, undefined, undefined];
  const [yieldVenues, allocationBps, harvestGasPriceLimit] = (manifestData as [readonly Address[], readonly bigint[], bigint]) || [[], [], 0n];

  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg shadow-md mt-8 w-full max-w-2xl animate-pulse">
        <h2 className="text-xl font-bold mb-4">Loading Season {seasonId} Details...</h2>
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      </div>
    );
  }

  if (!seasonData || !manifestData) {
    return <div className="p-4 border rounded-lg shadow-md mt-8 w-full max-w-2xl text-red-600">Could not load data for Season {seasonId}.</div>;
  }

  return (
    <div className="p-6 border rounded-lg shadow-md mt-8 w-full max-w-2xl bg-white">
      <h2 className="text-2xl font-bold mb-4">Season {seasonId} Status</h2>
      
      <div className="space-y-2 mb-6">
        <div className="flex justify-between">
          <span className="font-semibold">Status:</span>
          <span className={`px-2 py-1 text-sm rounded-full ${isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{isActive ? 'Active' : 'Inactive'}</span>
        </div>
        <div className="flex justify-between text-lg">
          <span className="font-semibold">Current Prize Pool:</span>
          <span className="font-bold text-green-600">${prizePool !== undefined ? formatUnits(prizePool, 6) : '0.00'} USDC</span>
        </div>
        <div className="flex justify-between items-center pt-2">
          <span className="font-semibold">GameSeason Address:</span>
          <code className="text-sm bg-gray-100 p-1 rounded truncate">{gameSeason}</code>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-semibold">Auction Address:</span>
          <code className="text-sm bg-gray-100 p-1 rounded truncate">{auction}</code>
        </div>
      </div>
      
      <div>
        <h3 className="text-xl font-bold border-t pt-4 mb-2">Financial Manifest</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="font-semibold">Harvest Gas Limit:</span>
            <span>{harvestGasPriceLimit.toString()}</span>
          </div>
          <div>
            <span className="font-semibold">Yield Venues & Allocations:</span>
            {yieldVenues.length > 0 ? (
              <ul className="list-disc list-inside mt-1 pl-2 text-sm">
                {yieldVenues.map((venue, index) => (
                  <li key={venue}>
                    <code className="bg-gray-100 p-1 rounded">{venue}</code>
                    <span className="ml-2">({(Number(allocationBps[index]) / 100).toFixed(2)}%)</span>
                  </li>
                ))}
              </ul>
            ) : (<p className="text-sm text-gray-500">No yield venues configured.</p>)}
          </div>
        </div>
      </div>
    </div>
  );
}