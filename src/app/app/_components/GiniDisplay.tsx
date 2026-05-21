'use client';

import React from 'react';

import { useSeasonPhase } from '@/hooks/useSeasonPhase';
import { useSeasonVictory } from '@/hooks/useSeasonVictory';
import { GiniBpsBar } from './GiniBpsBar';

interface GiniDisplayProps {
  seasonAddress: string;
  sidebar: React.ReactNode;
}

export function GiniDisplay({ seasonAddress, sidebar }: GiniDisplayProps) {
  const { isAuction, isBootstrap, isPayout } = useSeasonPhase(seasonAddress);
  const {
    gCurrent,
    gInitial,
    capTargetBps,
    socTargetBps,
    winningSide,
    progressPercent,
  } = useSeasonVictory(seasonAddress);

  const isTrading = !isAuction && !isBootstrap && !isPayout;

  return (
    <div className="relative h-full overflow-hidden flex min-h-75 rounded-lg bg-(image:--subtle-glow) flex-col md:flex-row p-0">
      {/* Gini content */}
      <div className="relative flex-1 flex flex-col p-6 min-h-72 md:min-h-0">
        <div className="section-label font-mono font-semibold tracking-widest uppercase text-text2 mb-4">
          Gini BPS · Coefficient of Inequality
        </div>

        <div className="relative flex-1">
          <GiniBpsBar
            gCurrent={gCurrent}
            gInitial={gInitial}
            capTargetBps={capTargetBps}
            socTargetBps={socTargetBps}
            isAuction={isAuction}
            isTrading={isTrading}
            isPayout={isPayout}
            winningSide={winningSide}
            progressPercent={progressPercent}
          />
        </div>
      </div>

      <aside className="order-first md:order-last shrink-0 w-full md:w-91 flex flex-col gap-5.5 p-6 border-b-3 md:border-b-0 md:border-l-3 border-bg">
        {sidebar}
      </aside>
    </div>
  );
}
