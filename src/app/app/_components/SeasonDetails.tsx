'use client';

import React from 'react';
import { formatUnits } from 'viem';
import { useYieldTotals } from '@/hooks/useYieldTotals';
import { PieChart, Pie, Tooltip } from 'recharts';

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
  xlWeighted?: boolean;
}

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

export function SeasonDetails({ tradingStart, seasonEnd, M_dynamic, config, seasonAddress, xlWeighted }: SeasonDetailsProps) {
  const { data: yieldTotals } = useYieldTotals(seasonAddress);

  const economicItems = config ? [
    { label: 'Buyback',           value: config.buybackBps,    amt: yieldTotals.buyback },
    { label: 'Liquidity',         value: config.liquidityBps,  amt: yieldTotals.liquidity },
    { label: 'Prize Pool Bonus',  value: config.reinvestBps,   amt: yieldTotals.reinvest },
    { label: 'DAO Treasury',      value: config.daoBps,        amt: yieldTotals.dao },
  ].filter(item => item.value > 0) : [];

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 h-full${xlWeighted ? ' xl:grid-cols-7' : ''}`}>

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
          const pieData = economicItems.map((item, i) => ({
            name: item.label,
            value: item.value,
            amt: item.amt,
            fill: DIST_COLORS[i % DIST_COLORS.length],
          }));

          return (
            <div className="flex flex-row items-center md:flex-col lg:flex-row gap-3">
              <div className="shrink-0">
                <PieChart width={160} height={140} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={62}
                    paddingAngle={2}
                    strokeWidth={0}
                    isAnimationActive={false}
                  />
                  <Tooltip
                    formatter={(_val, name, entry) => {
                      const bps = entry.payload.value as number;
                      const hasAmount = BigInt(entry.payload.amt || '0') > 0n;
                      return [
                        hasAmount ? `$${formatUSDC(entry.payload.amt)}` : `${bps / 100}%`,
                        name,
                      ];
                    }}
                    contentStyle={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 6,
                      fontSize: 11,
                      fontFamily: 'monospace',
                    }}
                    itemStyle={{ color: 'var(--color-text)' }}
                    labelStyle={{ display: 'none' }}
                  />
                </PieChart>
              </div>

              <div className="flex flex-col gap-1 flex-1 min-w-0 md:flex-none md:w-40 lg:flex-1 lg:w-auto">
                {pieData.map((item) => {
                  const hasAmount = BigInt(item.amt || '0') > 0n;
                  return (
                    <div key={item.name} className="kv-row">
                      <span className="flex items-center gap-1.5 font-mono text-[11px] text-text2">
                        <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: item.fill }} />
                        {item.name}
                      </span>
                      <span className="font-mono text-[12px] font-semibold" style={{ color: item.fill, fontVariantNumeric: 'tabular-nums' }}>
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
    </div>
  );
}
