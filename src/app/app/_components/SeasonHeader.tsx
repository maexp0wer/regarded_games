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

  const dotColor =
    showBootstrapWarning || isAuction ? 'bg-warning' : isPayout ? 'bg-blue' : 'bg-green';
  const dotGlow =
    showBootstrapWarning || isAuction
      ? '0 0 8px var(--color-warning)'
      : isPayout
      ? '0 0 8px var(--color-blue)'
      : '0 0 8px var(--color-green)';
  const phaseTextColor =
    showBootstrapWarning || isAuction ? 'text-warning' : isPayout ? 'text-blue' : 'text-green';

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
        className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[12px] uppercase tracking-[0.04em]"
        style={{ color: 'var(--color-muted)' }}
      >
        <div>
          Participants
          <b className="block font-mono text-[16px] font-semibold normal-case tracking-normal mt-1 text-text">
            {playerCount.toLocaleString()}
          </b>
        </div>
        <div>
          Phase
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-[pill-pulse_2s_ease-in-out_infinite] shrink-0`}
              style={{ boxShadow: dotGlow }}
            />
            <b className={`font-mono text-[16px] font-semibold normal-case tracking-normal ${phaseTextColor}`}>
              {phaseLabel}
            </b>
          </div>
        </div>
      </div>
    </div>
  );
}
