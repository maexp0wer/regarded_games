// src/components/Season/Info.tsx
'use client';
import { useSeasonDataContext } from '@/context/SeasonDataContext';

export function Info() {
  const { activeSeasonId, seasonDetails } = useSeasonDataContext();
  if (!seasonDetails) return null;

  const { isActive, gameSeason, auction } = seasonDetails;

  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold mb-4">Active Season: #{activeSeasonId}</h2>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="font-semibold">Status:</span>
          <span className={`px-2 py-1 text-sm rounded-full ${isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-semibold">GameSeason Address:</span>
          <code className="text-sm bg-gray-100 p-1 rounded truncate">{gameSeason}</code>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-semibold">Auction Address:</span>
          <code className="text-sm bg-gray-100 p-1 rounded truncate">{auction}</code>
        </div>
      </div>
    </div>
  );
}

export function SeasonStatus() {
  const { activeSeasonId, seasonDetails } = useSeasonDataContext();
  if (!seasonDetails) return null;
  const { isActive, gameSeason, auction } = seasonDetails;
  return (
      <p>{activeSeasonId}</p> 
  );
}