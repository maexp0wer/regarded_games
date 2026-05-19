'use client';

import React, { useState } from 'react';
import { formatUnits } from 'viem';
import { useYieldTotals } from '@/hooks/useYieldTotals';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

interface SeasonDetailsProps {
  tradingStart: number;
  seasonEnd: number;
  M_dynamic: number;
  config: {
    auctionStartTime: number;
    victoryThresholdBps: number;
    baseBeta: number;
    buybackBps: number;
    liquidityBps: number;
    reinvestBps: number;
    daoBps: number;
  } | null;
  seasonAddress: string;
  fimAddress?: string;
  auctionAddress?: string;
  exchangeAddress?: string;
  isAuction?: boolean;
  xlWeighted?: boolean;
}

const truncateAddress = (addr: string) =>
  addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '—';

const formatDate = (ts: number) =>
  ts
    ? new Date(ts * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'TBD';

const formatUSDC = (val: string) => {
  try {
    return parseFloat(formatUnits(BigInt(val || '0'), 6)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch { return '0.00'; }
};

const DIST_COLORS = ['var(--color-gold)', 'var(--color-pink)', 'var(--color-blue)', 'var(--color-green)'];

export function SeasonDetails({ tradingStart, seasonEnd, M_dynamic, config, seasonAddress, fimAddress, auctionAddress, exchangeAddress, isAuction, xlWeighted }: SeasonDetailsProps) {
  const { data: yieldTotals } = useYieldTotals(seasonAddress);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);

  // 1. Filter out 0 values and sort descending (largest % first)
  const economicItems = config ? [
    { label: 'Buyback',           value: config.buybackBps,    amt: yieldTotals?.buyback },
    { label: 'Liquidity',         value: config.liquidityBps,  amt: yieldTotals?.liquidity },
    { label: 'Prize Pool Bonus',  value: config.reinvestBps,   amt: yieldTotals?.reinvest },
    { label: 'DAO Treasury',      value: config.daoBps,        amt: yieldTotals?.dao },
  ]
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value) 
  : [];

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-2 h-full${xlWeighted ? ' xl:grid-cols-7' : ''}`}>

      {/* ── Schedule ── */}
      <div className={`card-app flex flex-col gap-3${xlWeighted ? ' xl:col-span-2' : ''}`} style={{ borderColor: 'var(--color-border-bright)' }}>
        <p className="section-label pb-2" style={{ borderBottom: '1px solid var(--color-border)' }}>Schedule</p>
        {[
          { label: 'Season Start',   value: formatDate(config?.auctionStartTime || 0) },
          { label: 'Trading Start',  value: formatDate(tradingStart) },
          { label: 'Season End',     value: formatDate(seasonEnd) },
        ].map(({ label, value }) => (
          <div key={label} className="kv-row">
            <span className="font-mono text-[11px] text-text2">{label}</span>
            <span className="font-mono text-[12px] font-semibold text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* ── Policy ── */}
      <div className={`card-app flex flex-col gap-3${xlWeighted ? ' xl:col-span-2' : ''}`} style={{ borderColor: 'var(--color-border-bright)' }}>
        <p className="section-label pb-2" style={{ borderBottom: '1px solid var(--color-border)' }}>Policy</p>
        <div className="kv-row">
          <span className="font-mono text-[11px] text-text2">Current Multiplier (M)</span>
          <span className="font-mono text-[13px] font-bold" style={{ color: 'var(--color-gold)', fontVariantNumeric: 'tabular-nums' }}>
            {M_dynamic.toFixed(3)}×
          </span>
        </div>
        <div className="kv-row">
          <span className="font-mono text-[11px] text-text2">Base Multiplier (Beta)</span>
          <span className="font-mono text-[12px] font-semibold text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {((config?.baseBeta || 0) / 10000).toFixed(2)}×
          </span>
        </div>
        <div className="kv-row">
          <span className="font-mono text-[11px] text-text2">Victory Threshold</span>
          <span className="font-mono text-[12px] font-semibold text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {((config?.victoryThresholdBps || 0) / 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* ── Lending Distribution ── */}
      <div className={`card-app flex flex-col gap-3${xlWeighted ? ' xl:col-span-3' : ''}`} style={{ borderColor: 'var(--color-border-bright)' }}>
        <p className="section-label pb-2" style={{ borderBottom: '1px solid var(--color-border)' }}>Lending Distribution</p>

        {economicItems.length === 0 ? (
          <p className="section-label opacity-30 text-center pt-4">No active distribution</p>
        ) : (() => {
          
          const chartData = [
            economicItems.reduce((acc, item) => {
              acc[item.label] = item.value;
              return acc;
            }, { name: 'Distribution' } as Record<string, any>)
          ];

          return (
            <div className="flex flex-col gap-4 mt-1" onMouseLeave={() => setHoveredLabel(null)}>
              {/* Stacked Horizontal Bar Container */}
              <div className="h-8 w-full rounded-md overflow-hidden bg-surface">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" hide />
                    {economicItems.map((item, i) => {
                      const isFaded = hoveredLabel && hoveredLabel !== item.label;
                      return (
                        <Bar
                          key={item.label}
                          dataKey={item.label}
                          stackId="a"
                          fill={DIST_COLORS[i % DIST_COLORS.length]}
                          isAnimationActive={false}
                          onMouseEnter={() => setHoveredLabel(item.label)}
                          onMouseLeave={() => setHoveredLabel(null)}
                          style={{
                            opacity: isFaded ? 0.3 : 1, // Dims other bars for emphasis
                            transition: 'opacity 0.2s ease',
                            cursor: 'pointer'
                          }}
                        />
                      );
                    })}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Legend List */}
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
                        transform: isHovered ? 'scale(1.03)' : 'scale(1)', // Enlarges on hover
                        transformOrigin: 'left center',
                        opacity: isFaded ? 0.5 : 1, // Dims non-hovered legend items
                        cursor: 'pointer'
                      }}
                      onMouseEnter={() => setHoveredLabel(item.label)}
                    >
                      <span className="flex items-center gap-1.5 font-mono text-[11px] text-text2">
                        {/* Slightly enlarges the colored dot to match */}
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
          );
        })()}
      </div>
      {/* ── Protocol References ── */}
      {(fimAddress || auctionAddress || exchangeAddress) && (
        <div className={`card-app flex flex-col gap-3${xlWeighted ? ' xl:col-span-2' : ''}`} style={{ borderColor: 'var(--color-border-bright)' }}>
          <p className="section-label pb-2" style={{ borderBottom: '1px solid var(--color-border)' }}>Protocol</p>
          {[
            { label: 'Season', addr: seasonAddress },
            { label: 'FIM Token', addr: fimAddress },
            { label: isAuction ? 'Auction' : 'Exchange', addr: isAuction ? auctionAddress : exchangeAddress },
          ].filter(r => r.addr).map(({ label, addr }) => (
            <div key={label} className="kv-row">
              <span className="font-mono text-[11px] text-text2">{label}</span>
              <code
                className="font-mono text-[11px] bg-surface px-2 py-0.5 rounded text-text2 border border-border select-all"
                title={addr}
              >
                {truncateAddress(addr!)}
              </code>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}