'use client';

import React, { useMemo } from 'react';
import { useReadContract } from 'wagmi';
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';

interface VictoryProgressBarProps {
  seasonAddress: string; // Required to fetch official settlement data
  gini: number;
  gInitial: number;
  victoryThresholdBps: number;
  baseBeta: number;
  phase: string;
  hideLabels?: boolean;
}

export function VictoryProgressBar({ 
  seasonAddress,
  gini, 
  gInitial, 
  victoryThresholdBps, 
  baseBeta, 
  phase,
  hideLabels = false 
}: VictoryProgressBarProps) {
  
  // --- 1. FETCH OFFICIAL SETTLED DATA ---
  const { data: finalProgressBps } = useReadContract({
    address: seasonAddress as `0x${string}`,
    abi: GameSeasonAbi as any,
    functionName: 'finalProgressBps',
    query: { enabled: !!seasonAddress }
  });

  const { data: isOligarchyWin } = useReadContract({
    address: seasonAddress as `0x${string}`,
    abi: GameSeasonAbi as any,
    functionName: 'isOligarchyWin',
    query: { enabled: !!seasonAddress }
  });

  const progress = useMemo(() => {
    // --- 2. PAYOUT PHASE OVERRIDE ---
    // If the season is over and we have contract data, use it.
    if (phase === 'PAYOUT' && finalProgressBps !== undefined) {
        const bps = Number(finalProgressBps);
        
        // If the contract says 0 BPS, it's a tie
        if (bps === 0) return { prog: 0, side: 'none' };

        return { 
          prog: bps / 100, 
          side: isOligarchyWin ? 'cap' : 'soc' 
        };
    }

    // --- 3. LIVE TRADING MATH (Fallback) ---
    // This runs during TRADING, or while PAYOUT data is still loading
    if (!gInitial) return { prog: 0, side: 'none' };

    const gCurr = gini;
    const gInit = gInitial;
    
    const gI_Norm = gInit / 10000;
    const V = victoryThresholdBps / 10000;
    const rawBeta = baseBeta / 10000;
    const M = rawBeta + Math.pow(1 - gI_Norm, 2);

    const capTarget = (gI_Norm + (V * (1 - gI_Norm))) * 10000;
    const socTarget = (gI_Norm * (1 - (M > 0 ? (V / M) : 0))) * 10000;

    let prog = 0;
    let side = 'none';

    if (gCurr > gInit) {
        side = 'cap';
        const dist = capTarget - gInit;
        const covered = gCurr - gInit;
        prog = dist > 0 ? (covered / dist) * 100 : 0;
    } else if (gCurr < gInit) {
        side = 'soc';
        const dist = gInit - socTarget;
        const covered = gInit - gCurr;
        prog = dist > 0 ? (covered / dist) * 100 : 0;
    }

    return { 
      prog: Math.min(Math.max(prog, 0), 100), 
      side 
    };
  }, [gini, gInitial, victoryThresholdBps, baseBeta, phase, finalProgressBps, isOligarchyWin]);

  // Handle Non-Active Phases
  if (phase !== 'TRADING' && phase !== 'PAYOUT') {
    return (
      <div className="h-[42px] flex items-center justify-center border border-dashed border-border/10 rounded-lg bg-card2/20">
        <span className="text-[9px] font-black text-text2/40 uppercase tracking-[0.2em]">
          {phase === 'AUCTION' || phase === 'BOOTSTRAP' ? 'Market Opening Soon' : 'Season Settled'}
        </span>
      </div>
    );
  }

  const isTie = progress.prog === 0;
  const sideLabel = progress.side === 'cap' ? 'Capitalist' : 'Socialist';
  const suffix = phase === 'PAYOUT' ? 'Win' : 'Progress';

  return (
    <div className="flex flex-col gap-3 w-full items-start text-left">
      {!hideLabels && (
        <span className={`text-[10px] font-bold uppercase tracking-wider leading-none 
          ${isTie ? 'text-text2/40' : (progress.side === 'cap' ? 'text-info' : 'text-danger')}`}
        >
          {isTie ? (
            'Tie'
          ) : (
            `${progress.prog.toFixed(1)}% ${sideLabel} ${suffix}`
          )}
        </span>
      )}
      
      <div className="w-full h-1.5 bg-card2 rounded-full overflow-hidden border border-border/5">
        <div 
          className={`h-full transition-all duration-1000 ease-out 
            ${progress.side === 'cap' 
              ? 'bg-info shadow-[0_0_8px_rgba(0,180,216,0.3)]' 
              : progress.side === 'soc' 
                ? 'bg-danger shadow-[0_0_8px_rgba(255,71,87,0.3)]' 
                : 'bg-transparent'}`}
          style={{ width: `${progress.prog}%` }}
        />
      </div>
    </div>
  );
}