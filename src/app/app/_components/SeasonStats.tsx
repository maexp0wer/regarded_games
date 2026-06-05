'use client';

import React from 'react';
import { usePlayerRank } from '@/hooks/usePlayerRank';
import { useBatchPlayerPercentiles } from '@/hooks/useBatchPlayerPercentiles';
import { usePayout } from '@/hooks/usePayout';

interface SeasonStatsProps {
  seasonAddress: string;
  userAddress: string | undefined;
  exchangeAddress: string;
}

export const SeasonStats: React.FC<SeasonStatsProps> = ({ seasonAddress, userAddress, exchangeAddress }) => {
  const {
    rank, totalPlayers,
    efficiencyPercent,
    userNetContribution, growthPercent,
    volumeTopPercent,
    feesTopPercent, userTotalFees,
    loading: rankLoading,
  } = usePlayerRank(seasonAddress, userAddress);

  const { data: percentilesMap, isLoading: percentileLoading } =
    useBatchPlayerPercentiles(seasonAddress, userAddress ? [userAddress] : [], exchangeAddress);
  const percentileData = userAddress ? percentilesMap?.[userAddress.toLowerCase()] ?? null : null;

  // Same source as PayoutMask — authoritative Season P/L for the current user.
  const { pnl: seasonPnl, userNetContrib, loading: payoutLoading } = usePayout(seasonAddress, userAddress);

  const loading = rankLoading || percentileLoading || payoutLoading;

  const absoluteTopPercent = totalPlayers > 1 ? ((rank - 1) / (totalPlayers - 1)) * 100 : 0;
  const relativeTopPercent = efficiencyPercent;
  const barFill = (topPct: number) => `${Math.max(0, 100 - topPct)}%`;

  let pointerPos = 50;
  let factionPercentile = 0;
  let isCapitalist = false;

  if (percentileData) {
    factionPercentile = percentileData.factionPercentile;
    isCapitalist = percentileData.isCapitalist;
    if (percentileData.isCapitalist) {
      pointerPos = 50 + (factionPercentile / 2);
    } else {
      pointerPos = 50 - (factionPercentile / 2);
    }
  }

  if (loading) {
    return (
      <div className="card-app flex flex-col gap-4 border border-border2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="stat-rail-card animate-pulse">
            <div className="h-3 w-40 rounded bg-border" />
            <div className="h-5 w-full rounded bg-border" />
          </div>
        ))}
        <p className="text-center text-xs text-text2 font-mono">Reading Ledger...</p>
      </div>
    );
  }

  if (!userAddress || rank === -1 || totalPlayers < 1 || !percentileData) return null;

  const pnlSign = seasonPnl >= 0 ? '+' : '-';
  const displayGrowthPercent = userNetContrib > 0 ? (seasonPnl / userNetContrib) * 100 : growthPercent;
  const growthSign = displayGrowthPercent >= 0 ? '+' : '';
  const pnlColor = seasonPnl >= 0 ? 'var(--color-green)' : 'var(--color-red)';

  return (
    <div className="terminal-pane pb-2 w-full h-full">
      <p className="terminal-pane-title pb-3 border-b border-border">Season Stats</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="pt-5">
        {/* ROW 1: RANK SPANNING FULL WIDTH */}
        <div style={{ gridColumn: '1 / -1' }} className="stat-rail-card">
          <div className="flex items-baseline font-mono text-[10px] uppercase tracking-wide">
            <span className="font-bold text-text2">Rank</span>
            <span className="flex-1 text-center font-bold text-text">{factionPercentile.toFixed(2)}% within faction</span>
            <span className="font-bold text-text">{isCapitalist ? 'BOURGEOISIE' : 'PROLETARIAT'}</span>
          </div>
          <div className="rank-track-chassis">
            <div style={{ height: '100%', background: 'var(--sunset)', position: 'relative' }}>
              <div style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: 5,
                left: `${pointerPos}%`,
                backgroundColor: 'var(--color-text)',
                border: '1px solid var(--color-bg)',
                boxShadow: '0 0 6px var(--color-text)',
                transform: 'translateX(-50%)',
                zIndex: 10,
              }} />
            </div>
          </div>
        </div>

        {/* ROW 2, COL 1: ABSOLUTE AND RELATIVE P&L */}
        <div className="flex flex-col gap-3">
          <div className="stat-rail-card">
            <div className="flex items-baseline font-mono text-[10px] uppercase tracking-wide">
              <span className="font-bold text-text2">Absolute P&amp;L</span>
              <span className="flex-1 text-center font-bold text-text">TOP {absoluteTopPercent < 1 ? '<1' : absoluteTopPercent.toFixed(2)}%</span>
              <span className="font-black" style={{ color: pnlColor }}>
                {pnlSign}${Math.abs(seasonPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="rank-track-chassis">
              <div style={{
                height: '100%',
                width: barFill(absoluteTopPercent),
                background: 'var(--color-green)',
                transition: 'width 0.5s ease-out',
              }} />
            </div>
          </div>

          <div className="stat-rail-card">
            <div className="flex items-baseline font-mono text-[10px] uppercase tracking-wide">
              <span className="font-bold text-text2">Relative P&amp;L</span>
              <span className="flex-1 text-center font-bold text-text">TOP {relativeTopPercent < 1 ? '<1' : relativeTopPercent.toFixed(2)}%</span>
              <span className="font-black text-purple">
                {growthSign}{displayGrowthPercent.toFixed(2)}%
              </span>
            </div>
            <div className="rank-track-chassis">
              <div style={{
                height: '100%',
                width: barFill(relativeTopPercent),
                background: 'var(--color-purple)',
                transition: 'width 0.5s ease-out',
              }} />
            </div>
          </div>
        </div>

        {/* ROW 2, COL 2: TRADE VOLUME AND TRADING FEES */}
        <div className="flex flex-col gap-3">
          <div className="stat-rail-card">
            <div className="flex items-baseline font-mono text-[10px] uppercase tracking-wide">
              <span className="font-bold text-text2">Trade Volume</span>
              <span className="flex-1 text-center font-bold text-text">TOP {volumeTopPercent < 1 ? '<1' : volumeTopPercent.toFixed(2)}%</span>
              <span className="font-black" style={{ color: 'var(--color-gold)' }}>
                {userNetContribution >= 0 ? '+' : ''}$
                {userNetContribution.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="rank-track-chassis">
              <div style={{
                height: '100%',
                width: barFill(volumeTopPercent),
                background: 'var(--color-gold)',
                transition: 'width 0.5s ease-out',
              }} />
            </div>
          </div>

          <div className="stat-rail-card">
            <div className="flex items-baseline font-mono text-[10px] uppercase tracking-wide">
              <span className="font-bold text-text2">Trading Fees</span>
              <span className="flex-1 text-center font-bold text-text">TOP {feesTopPercent < 1 ? '<1' : feesTopPercent.toFixed(2)}%</span>
              <span className="font-black" style={{ color: 'var(--color-red)' }}>
                ${userTotalFees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="rank-track-chassis">
              <div style={{
                height: '100%',
                width: barFill(feesTopPercent),
                background: 'var(--color-red)',
                transition: 'width 0.5s ease-out',
              }} />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
