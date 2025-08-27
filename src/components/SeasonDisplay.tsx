// src/components/SeasonDisplay.tsx
'use client';

import { useSeasonDataContext } from '@/context/SeasonDataContext';

export function SeasonDisplay() {
  const { isMounted, isLoading, activeSeasonId, isActive, prizePool, gameSeasonAddress, AuctionAddress, manifest, phase } = useSeasonDataContext();

  if (!isMounted) return <div className="p-4 border rounded-lg bg-gray-200 animate-pulse h-48 w-full max-w-2xl mt-8" />;
  
  if (isLoading) return <div className="p-4 text-center mt-8">Loading Season Data...</div>;

  if (activeSeasonId === null) return <div className="p-4 text-center mt-8">No Active Season Found.</div>;

  const getPhaseBadgeColor = () => {
    switch (phase) {
      case 'Auction':
        return 'bg-blue-100 text-blue-800';
      case 'TRADING':
        return 'bg-yellow-100 text-yellow-800';
      case 'ENDED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 rounded-lg bg-card shadow-sm text-left w-full max-w-2xl mt-8 text-text">
      <div className="space-y-2 font-mono">
        <div className="flex justify-between items-center">
          <h3 className='text-3xl pb-2'><strong>Season {activeSeasonId}</strong> </h3>
          <strong><span className={`px-4 p-2 rounded-full text-sm ${isActive ? 'bg-success text-bg' : 'bg-danger text-bg'}`}>
            {isActive ? `LIVE - ${phase}` : 'FINISHED'}
          </span></strong>
        </div>
        <p className="text-xl font-bold py-5">Prize Pool:<span className="font-bold text-primary p-5 m-2">${prizePool} USDC</span></p>
        
        <p><strong>GameSeason Contract:</strong> <code className="bg-card2 p-1 rounded text-xs">{gameSeasonAddress}</code></p>
        <p><strong>Auction Contract:</strong> <code className="bg-card2 p-1 rounded text-xs">{AuctionAddress}</code></p>
        
        <div className="pt-4 mt-4 border-t">
          <h3 className="text-lg font-semibold mb-2 text-text">Treasury Allocations</h3>
          {manifest && manifest.yieldVenues.length > 0 ? (
            <ul className="list-disc list-inside mt-1 pl-2">
              {manifest.yieldVenues.map((venue, index) => (
                <li key={venue}>
                  <code className="bg-card2 p-1 rounded text-xs">{venue}</code>
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