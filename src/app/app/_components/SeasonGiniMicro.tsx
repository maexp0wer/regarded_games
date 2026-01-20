'use client';

import { useSeasonGini } from "@/hooks/useSeasonGini";

export function SeasonGiniMicro({ seasonAddress, phase }: { seasonAddress: string, phase: string }) {
  const { data, isLoading } = useSeasonGini(seasonAddress);

  if (isLoading) return <span className="text-text2 animate-pulse text-xs">Loading Gini...</span>;

  const gini = data?.gini || 0;
  const count = data?.playerCount || 0;
  const giniCoefficient = (gini/10000).toFixed(4);

  return (
    <div className="flex items-center gap-3 mt-2">
      <div className="flex flex-col">
        <span className="text-[10px] uppercase font-bold text-text2">Live Gini</span>
        <span className="text-[10px] uppercase font-bold text-text2">Coefficient</span>
        <span className="text-sm font-bold text-primary">{giniCoefficient}</span>
      </div>
      <div className="h-6 w-px] bg-border mx-1" />
      <div className="flex flex-col">
        <span className="text-[10px] uppercase font-bold text-text2">Players</span>
        <span className="text-sm font-bold text-text">{count}</span>
      </div>
    </div>
  );
}