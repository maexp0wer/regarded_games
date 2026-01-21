'use client';

import { useSeasonGini } from "@/hooks/useSeasonGini";

export function TradingGiniDisplay({ 
  seasonAddress, 
  gInitial = 4500, // You can fetch this via useReadContract
  threshold = 2500 
}: { 
  seasonAddress: string;
  gInitial?: number;
  threshold?: number;
}) {
  const { data } = useSeasonGini(seasonAddress);
  const gCurrent = data?.gini || 0;

  // Logic from Spec v5.0: (G_curr - G_init) / (10000 - G_init)
  const diff = gCurrent - gInitial;
  const progressBps = diff > 0 
    ? (diff * 10000) / (10000 - gInitial) 
    : 0;
  
  const victoryProgress = (Number(progressBps) / threshold) * 100;

  return (
    <div className="p-6 rounded-xl border border-border" style={{ backgroundColor: 'var(--color-card)' }}>
      <h3 className="font-display text-xl mb-6">Market Distribution</h3>
      
      {/* Live Gini Number */}
      <div className="mb-8">
        <p className="text-sm uppercase text-text2 mb-1">Current Gini Index</p>
        <p className="text-5xl font-bold text-primary tracking-tighter">
          {gCurrent.toLocaleString()} <span className="text-xl">BPS</span>
        </p>
      </div>

      {/* Victory Progress Bar */}
      <div>
        <div className="flex justify-between text-xs mb-2 uppercase font-bold">
          <span className="text-text2">Capitalist Victory Progress</span>
          <span className="text-primary">{victoryProgress.toFixed(1)}%</span>
        </div>
        <div className="w-full h-4 bg-card2 rounded-full border border-border overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-1000" 
            style={{ width: `${Math.min(victoryProgress, 100)}%` }} 
          />
        </div>
        <p className="text-[10px] text-text2 mt-2 uppercase">
          Target: +{threshold} BPS shift from initial ({gInitial})
        </p>
      </div>
    </div>
  );
}