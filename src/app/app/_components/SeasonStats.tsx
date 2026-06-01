'use client';

import React from 'react';
import { usePlayerRank } from '@/hooks/usePlayerRank';
import { useBatchPlayerPercentiles } from '@/hooks/useBatchPlayerPercentiles';

interface SeasonStatsProps {
  seasonAddress: string;
  userAddress: string | undefined;
  exchangeAddress: string;
}

export const SeasonStats: React.FC<SeasonStatsProps> = ({ seasonAddress, userAddress, exchangeAddress }) => {
  const {
    rank, totalPlayers,
    efficiencyRank, efficiencyPercent,
    userPnl, userNetContribution, growthPercent,
    loading: rankLoading,
  } = usePlayerRank(seasonAddress, userAddress);

  const { data: percentilesMap, isLoading: percentileLoading } =
    useBatchPlayerPercentiles(seasonAddress, userAddress ? [userAddress] : [], exchangeAddress);
  const percentileData = userAddress ? percentilesMap?.[userAddress.toLowerCase()] ?? null : null;

  const loading = rankLoading || percentileLoading;

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
        {[1, 2, 3].map(i => (
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

  const pnlSign = userPnl >= 0 ? '+' : '';
  const growthSign = growthPercent >= 0 ? '+' : '';
  const pnlColor = userPnl >= 0 ? 'var(--color-green)' : 'var(--color-red)';

  return (
    <div className="terminal-pane gap-4 pb-2">
      <p className="section-label pb-3 border-b border-border">Season Stats</p>

      {/* TRACK 1: FACTION IDEOLOGY SPECTRUM */}
      <div className="stat-rail-card">
        <div className="font-mono text-[10px] font-bold text-text2 uppercase tracking-wide">
          <span>Rank</span>
        </div>

        {/* Ideology rail */}
        <div className="rank-track-chassis">
          {/* Purple → Gold gradient fill */}
          <div style={{
            height: '100%',
            background: 'linear-gradient(90deg, var(--color-purple) 0%, var(--color-gold) 100%)',
            position: 'relative',
          }}>
            {/* Position marker pin */}
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
          <div className="progress-rail-overlay-text">
            <span>{factionPercentile.toFixed(1)}%</span>
            <span className="opacity-40 mx-1.5">·</span>
            <span>{isCapitalist ? 'BOURGEOISIE' : 'PROLETARIAT'}</span>
          </div>
        </div>
      </div>

      {/* TRACK 2: ABSOLUTE PNL RANK */}
      <div className="stat-rail-card">
        <div className="flex justify-between items-baseline font-mono text-[10px] uppercase tracking-wide">
          <span className="font-bold text-text2">Absolute P&amp;L</span>
          <span className="font-black" style={{ color: pnlColor }}>
            {pnlSign}${userPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC Net Return
          </span>
        </div>

        <div className="rank-track-chassis">
          <div style={{
            height: '100%',
            width: barFill(absoluteTopPercent),
            background: 'linear-gradient(90deg, var(--color-green), var(--color-green-70))',
            transition: 'width 0.5s ease-out',
          }} />
          <div className="progress-rail-overlay-text">
            <span>TOP {absoluteTopPercent < 1 ? '<1' : absoluteTopPercent.toFixed(1)}%</span>
            <span className="opacity-40 mx-1.5">-</span>
            <span>RANK {rank} OF {totalPlayers}</span>
          </div>
        </div>
      </div>

      {/* TRACK 3: RELATIVE GROWTH RANK */}
      <div className="stat-rail-card">
        <div className="flex justify-between items-baseline font-mono text-[10px] uppercase tracking-wide">
          <span className="font-bold text-text2">Relative P&amp;L</span>
          <span className="font-black text-purple">
            {growthSign}{growthPercent.toFixed(1)}% Capital Growth
          </span>
        </div>

        <div className="rank-track-chassis">
          <div style={{
            height: '100%',
            width: barFill(relativeTopPercent),
            background: 'linear-gradient(90deg, var(--color-purple), var(--color-purple-70))',
            transition: 'width 0.5s ease-out',
          }} />
          <div className="progress-rail-overlay-text">
            <span>TOP {relativeTopPercent < 1 ? '<1' : relativeTopPercent.toFixed(1)}%</span>
            <span className="opacity-40 mx-1.5">-</span>
            <span>RANK {efficiencyRank} OF {totalPlayers}</span>
          </div>
        </div>
      </div>

      {/* TRACK 4: TRADE VOLUME */}
      <div className="stat-rail-card">
        <div className="flex justify-between items-baseline font-mono text-[10px] uppercase tracking-wide">
          <span className="font-bold text-text2">Net USDC Trade Volume</span>
          <span className="font-black text-text">
            {userNetContribution >= 0 ? '+' : ''}$
            {userNetContribution.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
          </span>
        </div>
      </div>

    </div>
  );
};
