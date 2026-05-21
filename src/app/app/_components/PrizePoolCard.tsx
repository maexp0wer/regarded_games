'use client';

import React from 'react';
import { formatUnits } from 'viem';
import { useYieldTotals } from '@/hooks/useYieldTotals';

export function PrizePoolCard({
  seasonAddress,
  prizePool,
  currentPhase,
  variant = 'card',
}: {
  seasonAddress: string;
  prizePool: number;
  currentPhase: string | null;
  variant?: 'card' | 'sidebar';
}) {
  const isPayout = currentPhase === 'PAYOUT' || currentPhase === 'DISTRIBUTION';
  const { data: yieldTotals } = useYieldTotals(seasonAddress, currentPhase);
  const rawReinvest = BigInt(yieldTotals?.reinvest || '0');
  const hasYield = isPayout && rawReinvest > 0n;
  
  const reinvestFormatted = parseFloat(formatUnits(rawReinvest, 6)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  const prizePoolWithYield = prizePool + (hasYield ? parseFloat(formatUnits(rawReinvest, 6)) : 0);

  if (variant === 'sidebar') {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text2 font-semibold">
            {hasYield ? 'Prize Pool + Yield' : 'Prize Pool'}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span
            className="font-mono text-lg"
            style={{ color: 'var(--color-gold)', opacity: 0.85 }}
          >$</span>
          <span
            className="font-mono font-semibold leading-none tracking-tight"
            style={{
              fontSize: '2.125rem',
              color: 'var(--color-gold)',
              textShadow: '0 0 20px var(--color-gold-35)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {prizePoolWithYield.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        {hasYield && (
          <p className="font-mono text-[10px] text-text2 m-0">
            Yield Bonus <b className="text-green ml-1 font-semibold">${reinvestFormatted}</b>
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className="card-app relative flex flex-col justify-between text-center overflow-hidden"
      style={{
        background: 'radial-gradient(400px 200px at 50% 100%, var(--color-gold-15), transparent 60%), linear-gradient(180deg, var(--color-card2), var(--color-card))',
        borderColor: 'var(--color-border2)',
      }}
    >
      <div className="relative section-label justify-center">
        <span className="tick" />
        {hasYield ? 'Total Prize Pool + Yield Bonus' : 'Total Prize Pool'}
      </div>

      <p
        className="relative font-display font-extrabold leading-none tracking-[-0.04em] text-gold m-0 text-display-prize"
        style={{ textShadow: '0 0 40px var(--color-gold-35)', fontVariantNumeric: 'tabular-nums' }}
      >
        <span style={{ fontSize: '0.5em', verticalAlign: '0.4em', color: 'var(--color-gold)', marginRight: 4 }}>$</span>
        {prizePoolWithYield.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>

      {hasYield ? (
        <p className="relative font-mono text-[12px] text-text2 m-0">
          Yield Bonus <b className="text-green ml-1 font-semibold">${reinvestFormatted}</b>
        </p>
      ) : <div />}
    </div>
  );
}