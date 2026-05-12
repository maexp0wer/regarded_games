'use client';

import React from 'react';

interface SeasonHeaderProps {
  seasonName: string;
  playerCount: number;
  currentPhase: string | null;
  isBootstrap: boolean;
  isPayout: boolean;
}

export function SeasonHeader({
  seasonName,
  playerCount,
  currentPhase,
  isBootstrap,
  isPayout,
}: SeasonHeaderProps) {
  const isAuction = currentPhase === 'AUCTION';
  const showBootstrapWarning = isBootstrap && !isAuction;

  const phaseLabel = (() => {
    if (showBootstrapWarning) return 'Bootstrap';
    if (isPayout) return 'Payout';
    if (isAuction) return 'Auction';
    if (currentPhase === 'TRADING') return 'Trading';
    return currentPhase ?? 'Unknown';
  })();

  /* Season slug → display number: "season_1" → "1", fallback "–" */
  const num = seasonName.match(/\d+/)?.[0] ?? '–';

  const pillColor = showBootstrapWarning
    ? 'text-warning border-warning/30 bg-warning/8'
    : isPayout
    ? 'text-blue border-blue/30 bg-blue/8'
    : 'text-green border-green/30 bg-green/8';

  const dotColor = showBootstrapWarning ? 'bg-warning' : isPayout ? 'bg-blue' : 'bg-green';
  const dotGlow = showBootstrapWarning
    ? '0 0 8px var(--color-warning)'
    : isPayout
    ? '0 0 8px var(--color-blue)'
    : '0 0 8px var(--color-green)';

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
        className="font-display font-extrabold leading-[0.85] tracking-[-0.04em] text-text m-0"
        style={{ fontSize: 'clamp(48px, 8vw, 84px)' }}
      >
        S
        <em className="not-italic font-medium" style={{ color: 'var(--color-muted2)' }}>
          {num.padStart(2, '0')}
        </em>
      </p>

      {/* Bottom meta strip */}
      <div
        className="flex gap-6 font-mono text-[12px] uppercase tracking-[0.04em]"
        style={{ color: 'var(--color-muted)' }}
      >
        <div>
          Participants
          <b className="block font-mono text-[16px] font-semibold normal-case tracking-normal mt-1 text-text">
            {playerCount.toLocaleString()}
          </b>
        </div>
        <div className={`pill border ${pillColor}`}>
          <span
            className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-[pill-pulse_2s_ease-in-out_infinite]`}
            style={{ boxShadow: dotGlow }}
          />
          {phaseLabel}
        </div>
      </div>
    </div>
  );
}
