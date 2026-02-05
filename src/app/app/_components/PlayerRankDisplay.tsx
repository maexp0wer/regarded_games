'use client';

import React from 'react';
import { usePlayerRank } from '@/hooks/usePlayerRank'; 
import { usePlayerPercentile } from '@/hooks/usePlayerPercentile'; 

interface PlayerRankDisplayProps {
  seasonAddress: string;
  userAddress: string | undefined;
}

const PlayerRankDisplay: React.FC<PlayerRankDisplayProps> = ({
  seasonAddress,
  userAddress,
}) => {
  // 1. Fetch PnL Rank Data
  const {
    rank,
    totalPlayers,
    efficiencyRank,
    efficiencyPercent,
    loading: rankLoading,
  } = usePlayerRank(seasonAddress, userAddress);

  // 2. Fetch Faction Percentile Data
  const {
    data: percentileData,
    isLoading: percentileLoading,
  } = usePlayerPercentile(seasonAddress, userAddress);
  
  const loading = rankLoading || percentileLoading;

  // --- PRE-CALCULATIONS ---
  const totalPercent = totalPlayers > 1 ? ((rank - 1) / (totalPlayers - 1)) * 100 : 0;
  const relativePercent = efficiencyPercent;

  let pointerPos = 50;
  let displayFactionPercent = 0;
  let factionName = "";
  let factionColor = "text-white";
  let factionData = undefined;

  if (percentileData) {
    factionName = percentileData.isCapitalist ? "Capitalist" : "Socialist";
    factionColor = percentileData.isCapitalist ? "text-blue-400" : "text-red-500";

    if (percentileData.isCapitalist) {
      displayFactionPercent = percentileData.factionPercentile;
      pointerPos = 50 + (percentileData.factionPercentile / 2);
    } else {
      displayFactionPercent = 100 - percentileData.factionPercentile;
      pointerPos = (percentileData.factionPercentile / 2);
    }
    factionData = { pointerPos, isCapitalist: percentileData.isCapitalist };
  }
  // --- END PRE-CALCULATIONS ---

  if (loading) {
    return (
      <div className="space-y-4 mb-8">
        <div className="h-6 w-full bg-white/5 animate-pulse rounded" /> 
        <div className="h-12 w-full bg-white/5 animate-pulse rounded" /> 
        <div className="h-8 w-full bg-white/5 animate-pulse rounded" />
        <div className="h-8 w-full bg-white/5 animate-pulse rounded" />
      </div>
    );
  }

  if (!userAddress || rank === -1 || totalPlayers < 1 || !percentileData) {
    return null;
  }

  // Unified Marker Appearance (White/Bordered)
  const markerStyleClasses = "w-3 h-3 rounded-full border-2 border-white shadow-[0_0_10px_rgba(255,255,255,0.4)] bg-white";


  return (

      <div className="bg-card rounded-lg space-y-8 p-6 pb-10">
        <h3 className="h3-app cardline-app">Your Season Stats</h3>
        
        {/* 1. BIPOLAR BAR (Gradient Fill: Red to Blue) */}
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                {/* Modified Header: Factions */}
                <span className="text-[10px] font-bold uppercase tracking-widest text-danger">Socialist</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-info">Capitalist</span>
            </div>
            <div className="relative h-3 bg-card2 rounded-full overflow-visible"> 
                
                {/* Static Gradient Fill */}
                <div className="absolute inset-0 w-full h-full rounded-full overflow-hidden">
                     <div className="w-full h-full bg-linear-to-r from-danger to-info opacity-80" />
                </div>
                
                {/* VERTICAL CENTER LINE */}
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/50 z-10" />
                
                {/* Marker Position */}
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 transition-all duration-1000 ease-out" style={{ left: `${pointerPos}%` }}>
                    
                    {/* The Dot */}
                    <div className={`${markerStyleClasses}`} />

                    {/* Percentage + Faction Name Below */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <span className="text-[10px] font-black text-white drop-shadow-md uppercase">
                            {displayFactionPercent.toFixed(1)}% {factionName}
                        </span>
                    </div>
                </div>
            </div>
        </div>
        
        {/* 2. ABSOLUTE PNL RANK BAR (Solid Primary Fill) */}
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-text2">Absolute PnL</span>
                <span className="text-[12px] font-black text-text">#{rank} <span className="text-text2 font-bold">of {totalPlayers}</span></span>
            </div>
            <div className="relative h-3 bg-card2 rounded-full overflow-visible">
                
                {/* Fill Container */}
                <div className="absolute inset-0 w-full h-full rounded-full overflow-hidden">
                    <div 
                        className="absolute inset-y-0 left-0 bg-linear-to-r from-primary/50 to-primary transition-all duration-700 ease-out" 
                        style={{ width: `${100 - totalPercent}%` }}
                    />
                </div>
                
                {/* Marker Position */}
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 transition-all duration-700 ease-out" style={{ left: `${100 - totalPercent}%` }}>
                    
                    {/* The Dot */}
                    <div className={`${markerStyleClasses}`} />

                    {/* Top % Below */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <span className="text-[10px] font-black text-white drop-shadow-md">
                            Top {totalPercent < 1 ? '<1' : totalPercent.toFixed(1)}%
                        </span>
                    </div>
                </div>
            </div>
        </div>

        {/* 3. RELATIVE PNL RANK BAR (Gradient Fill) */}
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-text2">Relative PnL</span>
                <span className="text-[12px] font-black text-text">#{efficiencyRank} <span className="text-text2 font-bold">of {totalPlayers}</span></span>
            </div>
            <div className="relative h-3 bg-card2 rounded-full overflow-visible">
                
                {/* Fill Container */}
                <div className="absolute inset-0 w-full h-full rounded-full overflow-hidden">
                    <div 
                        className="absolute inset-y-0 left-0 bg-linear-to-r from-primary/50 to-primary transition-all duration-700 ease-out" 
                        style={{ width: `${100 - relativePercent}%` }}
                    />
                </div>
                
                {/* Marker Position */}
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 transition-all duration-700 ease-out" style={{ left: `${100 - relativePercent}%` }}>
                    
                    {/* The Dot */}
                    <div className={`${markerStyleClasses}`} />

                    {/* Top % Below */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <span className="text-[10px] font-black text-white drop-shadow-md">
                            Top {relativePercent < 1 ? '<1' : relativePercent.toFixed(1)}%
                        </span>
                    </div>
                </div>
            </div>
        </div>

      </div>

  );
};

export default PlayerRankDisplay;