'use client';

import React from 'react';

import { useSeasonPhase } from '@/hooks/useSeasonPhase';
import { useSeasonVictory } from '@/hooks/useSeasonVictory';

interface VictoryProgressBarProps {
  seasonAddress: string;
  hideLabels?: boolean;
}

export function VictoryProgressBar({ seasonAddress, hideLabels = false }: VictoryProgressBarProps) {
  const { currentPhase, isAuctionOrBootstrap, isTrading, isPayout } = useSeasonPhase(seasonAddress);
  const { winningSide, progressPercent } = useSeasonVictory(seasonAddress);

  if (isAuctionOrBootstrap) return null;

  if (!isTrading && !isPayout) {
    return (
      <div className="h-42px flex items-center justify-center border border-dashed border-border/10 rounded-lg bg-card2/20">
        <span className="text-[9px] font-black text-text2/40 uppercase tracking-[0.2em]">
          Season Settled
        </span>
      </div>
    );
  }

  const isTie = progressPercent === 0 || winningSide === 'none';
  const sideLabel = winningSide === 'cap' ? 'Bourgeois' : 'Proletarian';
  const suffix = currentPhase === 'PAYOUT' ? 'Win' : 'Progress';

  return (
    <div className="flex flex-col gap-3 w-full items-start text-left">
      {!hideLabels && (
        <span className={`text-[10px] font-bold uppercase tracking-wider leading-none
          ${isTie ? 'text-text2/40' : (winningSide === 'cap' ? 'text-blue' : 'text-pink')}`}
        >
          {isTie ? 'Tie' : `${progressPercent.toFixed(1)}% ${sideLabel} ${suffix}`}
        </span>
      )}

      <div className="w-full h-1.5 bg-card2 rounded-full overflow-hidden border border-border/5">
        <div
          className={`h-full transition-all duration-1000 ease-out
            ${winningSide === 'cap'
              ? 'bg-blue shadow-[0_0_8px_#4d9fff4d]'
              : winningSide === 'soc'
                ? 'bg-pink shadow-[0_0_8px_#ff3d8a4d]'
                : 'bg-transparent'}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
