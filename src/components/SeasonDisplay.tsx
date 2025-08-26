// src/components/SeasonDisplay.tsx
'use client';

import { useSeasonDataContext } from '@/context/SeasonDataContext';

export function SeasonDisplay() {
  const { isMounted, isLoading, activeSeasonId, isActive, prizePool, gameSeasonAddress, auctionAddress, manifest } = useSeasonDataContext();

  if (!isMounted) return <div className="p-4 border rounded-lg bg-gray-200 animate-pulse h-48 w-full max-w-2xl mt-8" />;
  
  if (isLoading) return <div className="p-4 text-center mt-8">Loading Season Data...</div>;

  if (activeSeasonId === null) return <div className="p-4 text-center mt-8">No Active Season Found.</div>;

  return (
    <div className="p-6 border rounded-lg bg-white shadow-sm text-left w-full max-w-2xl mt-8">
      <h2 className="text-2xl font-semibold mb-4">On-Chain Season Data</h2>
      <div className="space-y-2 font-mono text-sm">
        <p><strong>Active Season ID:</strong> {activeSeasonId}</p>
        <p className="text-lg"><strong>Prize Pool:</strong> <span className="font-bold text-green-600 ml-2">${prizePool} USDC</span></p>
        <p><strong>Is Active:</strong> {isActive ? 'Yes' : 'No'}</p>
        <p><strong>GameSeason Contract:</strong> <code className="text-xs">{gameSeasonAddress}</code></p>
        <p><strong>Auction Contract:</strong> <code className="text-xs">{auctionAddress}</code></p>
        
        <div className="pt-4 mt-4 border-t">
          <h3 className="text-lg font-semibold mb-2 text-gray-800">Treasury Allocations</h3>
          {manifest && manifest.yieldVenues.length > 0 ? (
            <ul className="list-disc list-inside mt-1 pl-2">
              {manifest.yieldVenues.map((venue, index) => (
                <li key={venue}>
                  <code className="bg-gray-100 p-1 rounded text-xs">{venue}</code>
                  <span className="ml-2">({(Number(manifest.allocationBps[index]) / 100).toFixed(2)}%)</span>
                </li>
              ))}
            </ul>
          ) : (<p className="text-xs text-gray-500">No yield venues configured.</p>)}
        </div>
      </div>
    </div>
  );
}