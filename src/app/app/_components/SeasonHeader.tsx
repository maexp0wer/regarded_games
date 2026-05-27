'use client';

import React from 'react';

import { useSeasonVictory } from '@/hooks/useSeasonVictory';
import { SeasonPhasePills } from './SeasonPhasePills';

interface SeasonHeaderProps {
  seasonAddress: string;
  seasonName: string;
  playerCount: number;
  currentPhase: string | null;
  isBootstrap?: boolean;
  isPayout?: boolean;
  variant?: 'card' | 'sidebar';
}

export function SeasonHeader({
  seasonAddress,
  seasonName,
  playerCount,
  currentPhase,
  variant = 'card',
}: SeasonHeaderProps) {
  const { effectiveVictoryPending } = useSeasonVictory(seasonAddress);

  const num = seasonName.match(/\d+/)?.[0] ?? '–';

  if (variant === 'sidebar') {
    return (
      <div className="flex flex-col gap-3">
        <p
          className="font-display font-extrabold leading-none tracking-[-0.04em] text-text"
          style={{ fontSize: '3.5rem' }}
        >
          S
          <em className="not-italic font-medium" style={{ color: 'var(--color-text2)' }}>
            {num.padStart(2, '0')}
          </em>
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <SeasonPhasePills
            phase={currentPhase ?? 'UNKNOWN'}
            isVictoryPending={effectiveVictoryPending}
            className="flex flex-wrap gap-2"
          />
          <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-text2 whitespace-nowrap">
            <b className="font-mono text-[13px] font-semibold normal-case tracking-normal text-text mr-1">
              {playerCount.toLocaleString()}
            </b>
            Players
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="card-app p-6 w-full flex flex-row md:flex-col lg:flex-row items-start justify-between gap-4"
      style={{
        background: 'linear-gradient(180deg, var(--color-card2) 0%, var(--color-card) 100%)',
        borderColor: 'var(--color-border2)',
      }}
    >
      <p
        className="font-display font-extrabold leading-[0.85] tracking-[-0.04em] text-text text-display-hero flex-shrink-0"
      >
        S
        <em className="not-italic font-medium" style={{ color: 'var(--color-text2)' }}>
          {num.padStart(2, '0')}
        </em>
      </p>

      <div className="flex flex-col md:flex-row lg:flex-col md:flex-wrap items-end md:items-center lg:items-end gap-2 min-w-0 md:w-full lg:w-auto">
        <SeasonPhasePills
          phase={currentPhase ?? 'UNKNOWN'}
          isVictoryPending={effectiveVictoryPending}
          className="flex flex-wrap justify-end md:justify-start lg:justify-end gap-2"
        />
        <div className="font-mono text-[12px] uppercase tracking-[0.04em] text-text2 text-right md:text-left lg:text-right whitespace-nowrap">
          <b className="font-mono text-[16px] font-semibold normal-case tracking-normal text-text mr-1">
            {playerCount.toLocaleString()}
          </b>
          Players
        </div>
      </div>
    </div>
  );
}