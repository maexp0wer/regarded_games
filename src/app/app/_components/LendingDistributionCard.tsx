'use client';

import React, { useState } from 'react';
import { formatUnits } from 'viem';
import { useYieldTotals } from '@/hooks/useYieldTotals';

const formatUSDC = (val: string) => {
  try {
    return parseFloat(formatUnits(BigInt(val || '0'), 6)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch { return '0.00'; }
};

const DIST_COLORS = ['var(--color-purple)', 'var(--color-gold)','var(--color-magenta)', 'var(--color-orange)'];

interface LendingDistributionCardProps {
  seasonAddress: string;
  config: {
    buybackBps: number;
    liquidityBps: number;
    reinvestBps: number;
    daoBps: number;
  } | null;
}

export function LendingDistributionCard({ seasonAddress, config }: LendingDistributionCardProps) {
  const { data: yieldTotals } = useYieldTotals(seasonAddress);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);

  const economicItems = config ? [
    { label: 'Buyback',          value: config.buybackBps,   amt: yieldTotals?.buyback },
    { label: 'Liquidity',        value: config.liquidityBps, amt: yieldTotals?.liquidity },
    { label: 'Prize Pool Bonus', value: config.reinvestBps,  amt: yieldTotals?.reinvest },
    { label: 'DAO Treasury',     value: config.daoBps,       amt: yieldTotals?.dao },
  ].filter(item => item.value > 0).sort((a, b) => b.value - a.value)
  : [];

  return (
    <div className="terminal-pane h-full">
      <div className="terminal-pane-header">
        <span className="terminal-pane-title">Lending Distribution</span>
      </div>

      {economicItems.length === 0 ? (
        <p className="section-label opacity-30 text-center pt-4">No active distribution</p>
      ) : (
        <div className="flex flex-col gap-4 mt-1" onMouseLeave={() => setHoveredLabel(null)}>
          <div className="h-8 w-full rounded-md overflow-hidden flex bg-surface">
            {economicItems.map((item, i) => (
              <div
                key={item.label}
                className="h-full cursor-pointer transition-opacity duration-200"
                style={{
                  flex: item.value,
                  background: DIST_COLORS[i % DIST_COLORS.length],
                  opacity: hoveredLabel && hoveredLabel !== item.label ? 0.3 : 1,
                }}
                onMouseEnter={() => setHoveredLabel(item.label)}
                onMouseLeave={() => setHoveredLabel(null)}
              />
            ))}
          </div>

          <div className="flex flex-col gap-1 w-full">
            {economicItems.map((item, i) => {
              const hasAmount = BigInt(item.amt || '0') > 0n;
              const fill = DIST_COLORS[i % DIST_COLORS.length];
              const isHovered = hoveredLabel === item.label;
              const isFaded = hoveredLabel && !isHovered;
              return (
                <div
                  key={item.label}
                  className="kv-row transition-all duration-200"
                  style={{
                    transform: isHovered ? 'scale(1.03)' : 'scale(1)',
                    transformOrigin: 'left center',
                    opacity: isFaded ? 0.5 : 1,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={() => setHoveredLabel(item.label)}
                >
                  <span className="flex items-center gap-1.5 font-mono text-[11px] text-text2">
                    <span
                      className="inline-block w-2 h-2 rounded-full shrink-0 transition-transform duration-200"
                      style={{ background: fill, transform: isHovered ? 'scale(1.5)' : 'scale(1)' }}
                    />
                    <span style={{ color: isHovered ? 'var(--color-text)' : 'inherit' }}>
                      {item.label}
                    </span>
                  </span>
                  <span className="font-mono text-[12px] font-semibold" style={{ color: fill, fontVariantNumeric: 'tabular-nums' }}>
                    {hasAmount ? `$${formatUSDC(item.amt)}` : `${item.value / 100}%`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
