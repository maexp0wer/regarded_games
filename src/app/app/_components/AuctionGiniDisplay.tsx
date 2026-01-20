'use client';

import { useSeasonGini } from "@/hooks/useSeasonGini";

export function AuctionGiniDisplay({ seasonAddress }: { seasonAddress: string }) {
  const { data, isLoading } = useSeasonGini(seasonAddress);
  
  if (isLoading) return (
    <div className="p-6 rounded-xl border border-border animate-pulse" style={{ backgroundColor: 'var(--color-card)' }}>
      <div className="h-4 w-32 bg-card2 rounded mb-4"></div>
      <div className="h-10 w-24 bg-card2 rounded"></div>
    </div>
  );

  const gCurrent = data?.gini || 0;

  // Determine concentration label based on Gini value
  const getConcentrationLabel = (gini: number) => {
    if (gini < 2000) return { text: "Ultra Distributed", color: "var(--color-success)" };
    if (gini < 4500) return { text: "Balanced", color: "var(--color-info)" };
    if (gini < 7000) return { text: "Concentrated", color: "var(--color-warning)" };
    return { text: "Highly Oligarchic", color: "var(--color-danger)" };
  };

  const status = getConcentrationLabel(gCurrent);

  return (
    <div className="p-6 rounded-xl border border-border shadow-sm" style={{ backgroundColor: 'var(--color-card)' }}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-text2 px-2 py-0.5 rounded bg-card2 border border-border">
            Phase: Initial Distribution
          </span>
          <h3 className="font-display text-xl mt-2">Auction Gini</h3>
        </div>
        <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-text2">Participant Count</p>
            <p className="text-lg font-bold text-text">{data?.playerCount || 0}</p>
        </div>
      </div>
      
      {/* Large Gini Readout */}
      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          <p className="text-5xl font-extrabold text-text tracking-tighter">
            {gCurrent.toLocaleString()}
          </p>
          <span className="text-sm font-bold text-text2 uppercase">BPS</span>
        </div>
        <p className="text-sm font-medium mt-1" style={{ color: status.color }}>
           Current State: {status.text}
        </p>
      </div>

      {/* Concentration Meter (0 to 10k) */}
      <div className="space-y-2">
        <div className="flex justify-between text-[9px] uppercase font-bold text-text2 px-1">
          <span>Perfect Equality</span>
          <span>Max Inequality</span>
        </div>
        <div className="w-full h-2 bg-card2 rounded-full border border-border relative overflow-hidden">
            {/* Background segments for visual guide */}
            <div className="absolute inset-0 flex">
                <div className="h-full w-1/4 border-r border-border/20"></div>
                <div className="h-full w-1/4 border-r border-border/20"></div>
                <div className="h-full w-1/4 border-r border-border/20"></div>
            </div>
            {/* The Indicator */}
            <div 
                className="h-full transition-all duration-1000 ease-in-out" 
                style={{ 
                    width: `${(gCurrent / 10000) * 100}%`,
                    backgroundColor: status.color
                }} 
            />
        </div>
      </div>

      <div className="mt-6 p-3 rounded-lg bg-card2 border border-border">
        <p className="text-[11px] text-text2 leading-relaxed italic">
          This value represents the <strong>Potential $G_$</strong>. When the auction ends, this number will be locked as the starting line for the Socialist/Capitalist race.
        </p>
      </div>
    </div>
  );
}