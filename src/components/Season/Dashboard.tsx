// src/components/Season/Dashboard.tsx
'use client';
import { useSeasonDataContext } from '@/context/SeasonDataContext';
import { Info } from './Info';
import { Manifest } from './Manifest';

export function Dashboard() {
  const { isMounted, isLoading, activeSeasonId } = useSeasonDataContext();

  if (!isMounted) {
    // Return a static skeleton for SSR to prevent hydration errors
    return <div className="p-4 border rounded-lg shadow-md mt-8 w-full max-w-2xl h-64 bg-gray-200 animate-pulse" />;
  }

  if (isLoading) {
    return <div className="p-4 text-center text-gray-500 mt-8">Searching for active season...</div>;
  }

  if (activeSeasonId === null) {
    return <div className="p-4 text-center text-gray-500 mt-8">No active season found.</div>;
  }

  // If we have data, render the detailed child components
  return (
    <div className="p-6 border rounded-lg shadow-md mt-8 w-full max-w-2xl bg-white">
      <Info />
      <div className="p-4 text-center text-gray-500 mt-8">somesing.</div>;
      <Manifest />
    </div>
  );
}