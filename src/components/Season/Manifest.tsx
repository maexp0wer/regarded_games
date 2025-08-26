// src/components/Season/Manifest.tsx
'use client';
import { useSeasonDataContext } from '@/context/SeasonDataContext';

export function Manifest() {
  const { manifestDetails } = useSeasonDataContext();
  if (!manifestDetails) return null;

  const { yieldVenues, allocationBps, harvestGasPriceLimit } = manifestDetails;

  return (
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
          ) : (
            <p className="text-sm text-gray-500">No yield venues configured.</p>
          )}
        </div>
      </div>
    </div>
  );
}