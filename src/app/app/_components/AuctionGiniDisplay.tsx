'use client';

import React, { useMemo } from 'react';
import { useReadContract } from 'wagmi';
import { useSeasonGini } from "@/hooks/useSeasonGini";
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';
import Ritardo from '@/components/icons/Ritardo.svg';
import Carlo from '@/components/icons/Carlo.svg';


export function AuctionGiniDisplay({ seasonAddress }: { seasonAddress: string }) {
  const { data, isLoading: isGiniLoading } = useSeasonGini(seasonAddress);
  
  const { data: rawConfig, isLoading: isConfigLoading } = useReadContract({
    address: seasonAddress as `0x${string}`,
    abi: GameSeasonAbi as any,
    functionName: 'getConfig',
    query: { enabled: !!seasonAddress, staleTime: Infinity }
  });

  const { data: phase } = useReadContract({
    address: seasonAddress as `0x${string}`,
    abi: GameSeasonAbi as any,
    functionName: 'getPhase',
    query: { enabled: !!seasonAddress }
  });

  const config = useMemo(() => {
    if (!rawConfig) return null;
    const r = rawConfig as any;
    const getVal = (key: string, index: number) => r[key] !== undefined ? Number(r[key]) : Number(r[index]);
    return {
      victoryThresholdBps: getVal('victoryThresholdBps', 3),
      baseBeta: getVal('beta', 4),
    };
  }, [rawConfig]);

  const gCurrent = data?.gini || 0;
  const G = gCurrent / 10000;
  const thresholdBps = config?.victoryThresholdBps || 2500;
  const V = thresholdBps / 10000;
  const rawBeta = (config?.baseBeta || 14000) / 10000;
  
  const M_dynamic = rawBeta + Math.pow(1 - G, 2);
  const capTargetBps = (G + ((1 - G) * V)) * 10000;
  const socTargetBps = (G * (1 - (V / M_dynamic))) * 10000;

  if (isGiniLoading || isConfigLoading) return (
    <div className="w-full h-48 bg-card rounded-3xl animate-pulse flex items-center justify-center">
      <span className="text-text2 uppercase font-black tracking-widest text-xs">Synchronizing...</span>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full items-stretch">
      
      {/* LEFT (1/3): Dashboard */}
      <div className="flex-1 bg-card rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-inner">
        <div className="mb-4 w-full">
          <span className="text-[10px] uppercase font-bold text-text2 tracking-[0.3em] mb-1 block">Total Prize Pool</span>
          <span className="text-4xl lg:text-5xl font-black text-primary tracking-tighter leading-none block">
            ${(data?.prizePool || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="w-full h-px bg-text/5 mb-4" />

        <div className="grid grid-cols-2 w-full divide-x divide-text/5">
          <div className="flex flex-col items-center px-2">
            <span className="text-[9px] uppercase font-bold text-text2 tracking-[0.2em] mb-1">Participants</span>
            <span className="text-xl lg:text-2xl font-black text-text tracking-tight">{(data?.playerCount || 0).toLocaleString()}</span>
          </div>

          <div className="flex flex-col items-center px-2">
            <span className="text-[9px] uppercase font-bold text-text2 tracking-[0.2em] mb-1">Status</span>
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
              <span className="text-sm lg:text-base font-black text-text tracking-tight uppercase font-display italic">
                {phase as string || "AUCTION"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT (2/3): Gauge - Tightened Vertical Profile */}
      <div className="flex-2 bg-card rounded-3xl px-12 lg:px-20 pt-20 pb-16 relative overflow-hidden flex flex-col justify-center min-h-fit">
        <div className="relative w-full h-1.5 bg-card2 rounded-full">
          
          {/* 1. START POINT (ABOVE) */}
          <div 
            className="absolute top-0 -translate-y-full -translate-x-1/2 flex flex-col items-center pb-1"
            style={{ left: `${(gCurrent / 10000) * 100}%` }}
          >
            <span className="text-[8px] lg:text-[10px] font-bold text-text2 uppercase tracking-[0.3em] mb-1 whitespace-nowrap">
                <span className="hidden sm:inline">Initial</span> Gini Coefficient
            </span>
            <span className="text-xl lg:text-3xl font-black text-text font-mono leading-none tracking-tighter">
                {gCurrent.toLocaleString()} BPS
            </span>
            {/* Shorter line */}
            <div className="w-0.5 h-3 lg:h-5 bg-text/20 mt-1"></div>
          </div>

          {/* SOCIALIST GOAL */}
          <div 
            className="absolute bottom-0 translate-y-full -translate-x-1/2 flex flex-col items-center pt-1"
            style={{ left: `${(socTargetBps / 10000) * 100}%` }}
          >
            <div className="w-0.5 h-3 lg:h-5 bg-red-500/20 mb-1"></div>
            <div className="flex items-center gap-1">
              <Carlo className="w-8 h-auto lg:w-6 max-h-30" viewBox="0 0 600 800"/>
              <span className="text-base lg:text-xl font-black text-red-500 font-mono leading-none">
                {socTargetBps.toFixed(0)}
              </span>
            </div>
          </div>

          {/* 3. CAPITALIST GOAL (BELOW) */}
          <div 
            className="absolute bottom-0 translate-y-full -translate-x-1/2 flex flex-col items-center pt-1"
            style={{ left: `${(capTargetBps / 10000) * 100}%` }}
          >
            <div className="w-0.5 h-3 lg:h-5 bg-info/20 mb-1"></div>
            <div className="flex items-center gap-1">
              
              <span className="text-base lg:text-xl font-black text-info font-mono leading-none">
                {capTargetBps.toFixed(0)}
              </span>
              <Ritardo className="w-8 h-auto lg:w-6 max-h-30" viewBox="0 0 600 800"/>
            </div>
          </div>

          {/* Markers */}
          <div className="absolute inset-0 flex items-center">
            <div className="absolute w-4 h-4 bg-text rounded-full border-[3px] border-card z-30 -translate-x-1/2 shadow-lg" style={{ left: `${(gCurrent / 10000) * 100}%` }} />
            <div className="absolute w-3 h-3 bg-red-500 rounded-full border-2 border-card z-20 -translate-x-1/2" style={{ left: `${(socTargetBps / 10000) * 100}%` }} />
            <div className="absolute w-3 h-3 bg-blue-500 rounded-full border-2 border-card z-20 -translate-x-1/2" style={{ left: `${(capTargetBps / 10000) * 100}%` }} />
          </div>
        </div>
      </div>
      
    </div>
  );
}