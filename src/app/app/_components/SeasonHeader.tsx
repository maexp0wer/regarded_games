'use client';

import React from 'react';
// Import the component we created earlier (adjust path as needed)
import { SeasonPhasePills } from './SeasonPhasePills'; 

interface SeasonHeaderProps {
  seasonName: string;
  playerCount: number;
  currentPhase: string | null;
  // These two might now be redundant since SeasonPhasePills checks the string directly,
  // but keeping them optional ensures we don't break parent components.
  isBootstrap?: boolean; 
  isPayout?: boolean;
  // Added for the new SeasonPhasePills component
  isVictoryPending?: boolean; 
}

export function SeasonHeader({
  seasonName,
  playerCount,
  currentPhase,
  isVictoryPending = false,
}: SeasonHeaderProps) {
  /* Season slug → display number: "season_1" → "1", fallback "–" */
  const num = seasonName.match(/\d+/)?.[0] ?? '–';

  return (
    <div
      className="card-app flex flex-col justify-between gap-3"
      style={{
        background: 'linear-gradient(180deg, var(--color-card2) 0%, var(--color-card) 100%)',
        borderColor: 'var(--color-border-bright)',
      }}
    >
      {/* Big season number */}
      <p
        className="font-display font-extrabold leading-[0.85] tracking-[-0.04em] text-text text-display-hero"
      >
        S
        <em className="not-italic font-medium" style={{ color: 'var(--color-muted2)' }}>
          {num.padStart(2, '0')}
        </em>
      </p>

      {/* Bottom meta strip */}
      <div
        className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[12px] uppercase tracking-[0.04em] -mb-2 text-text2"
      >
        <div>
          Participants
          <b className="block font-mono text-[16px] font-semibold normal-case tracking-normal mt-1 text-text">
            {playerCount.toLocaleString()}
          </b>
        </div>
        
        <div>
          Phase
          {/* Replaced the manual dots and text with the universal component */}
          <SeasonPhasePills phase={currentPhase ?? 'UNKNOWN'} isVictoryPending={isVictoryPending} className="flex items-center flex-wrap gap-2 mt-1" />
        </div>
      </div>
    </div>
  );
}