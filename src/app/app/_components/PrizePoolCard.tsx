'use client';

import React from 'react';
import { formatUnits } from 'viem';
import { useYieldTotals } from '@/hooks/useYieldTotals';

export function PrizePoolCard({
  seasonAddress,
  prizePool,
  currentPhase,
}: {
  seasonAddress: string;
  prizePool: number;
  currentPhase: string | null;
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

  return (
    <div
      className="card-app relative flex flex-col justify-between text-center overflow-hidden"
      style={{
        background: 'radial-gradient(400px 200px at 50% 100%, rgba(245,184,0,0.05), transparent 60%), linear-gradient(180deg, var(--color-card2), var(--color-card))',
        borderColor: 'var(--color-border-bright)',
      }}
    >
      <div className="relative section-label justify-center">
        <span className="tick" />
        {hasYield ? 'Total Prize Pool + Yield Bonus' : 'Total Prize Pool'}
      </div>

      <p
        className="relative font-display font-extrabold leading-none tracking-[-0.04em] text-gold m-0"
        style={{ fontSize: 'clamp(30px, 4vw, 84px)', textShadow: '0 0 40px rgba(245,184,0,0.25)', fontVariantNumeric: 'tabular-nums' }}
      >
        <span style={{ fontSize: '0.5em', verticalAlign: '0.4em', color: 'var(--color-gold-soft)', marginRight: 4 }}>$</span>
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