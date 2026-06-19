'use client';

import React from 'react';
import { usePlayerRank } from '@/hooks/usePlayerRank';
import { useBatchPlayerClass } from '@/hooks/useBatchPlayerClass';
import { usePayout } from '@/hooks/usePayout';
import { useSeasonVictory } from '@/hooks/useSeasonVictory';

interface SeasonStatsProps {
  seasonAddress: string;
  userAddress: string | undefined;
  exchangeAddress: string;
}

export const SeasonStats: React.FC<SeasonStatsProps> = ({ seasonAddress, userAddress, exchangeAddress }) => {
  const {
    rank, totalPlayers,
    efficiencyRank, efficiencyPercent,
    userNetContribution, growthPercent,
    volumeRank, volumeTopPercent,
    feesRank, feesTopPercent, userTotalFees,
    contributionRank, contributionTopPercent, userContribution,
    loading: rankLoading,
  } = usePlayerRank(seasonAddress, userAddress);

  const { data: classMap, isLoading: classLoading } =
    useBatchPlayerClass(seasonAddress, userAddress ? [userAddress] : [], exchangeAddress);
  const classData = userAddress ? classMap?.[userAddress.toLowerCase()] ?? null : null;

  // Same source as PayoutMask — authoritative Season P/L for the current user.
  const { pnl: seasonPnl, userNetContrib, loading: payoutLoading } = usePayout(seasonAddress, userAddress);
  const { winningSide } = useSeasonVictory(seasonAddress);

  const loading = rankLoading || classLoading || payoutLoading;

  const absoluteTopPercent = totalPlayers > 1 ? ((rank - 1) / (totalPlayers - 1)) * 100 : 0;
  const relativeTopPercent = efficiencyPercent;
  const barFill = (topPct: number) => `${Math.max(0, 100 - topPct)}%`;
  // Header center label: ordinal rank within the field, e.g. "#3 / 47".
  const rankLabel = (r: number) => `#${r} / ${totalPlayers}`;
  // Overlay text inside the bar: relocated "TOP X%" with the sub-1% shortcut.
  const topPctLabel = (topPct: number) => `TOP ${topPct < 1 ? '<1' : topPct.toFixed(2)}%`;
  // Faint dark shadow keeps the relocated label legible over bright fills.
  const overlayShadow = '0 1px 2px rgba(0,0,0,0.6)';

  let pointerPos = 50;
  let classPercentile = 0;
  let isCapitalist = false;

  if (classData) {
    classPercentile = classData.classPercentile;
    isCapitalist = classData.isCapitalist;
    if (classData.isCapitalist) {
      pointerPos = 50 + (classPercentile / 2);
    } else {
      pointerPos = 50 - (classPercentile / 2);
    }
  }

  if (loading) {
    return (
      <div className="card-app flex flex-col gap-4 border border-border2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="terminal-pane p-2.5 gap-2 animate-pulse">
            <div className="h-3 w-40 rounded bg-border" />
            <div className="h-5 w-full rounded bg-border" />
          </div>
        ))}
        <p className="text-center text-xs text-text2 font-mono">Reading Ledger...</p>
      </div>
    );
  }

  if (!userAddress || rank === -1 || totalPlayers < 1 || !classData) return null;

  const pnlSign = seasonPnl >= 0 ? '+' : '-';
  const displayGrowthPercent = userNetContrib > 0 ? (seasonPnl / userNetContrib) * 100 : growthPercent;
  const growthSign = displayGrowthPercent >= 0 ? '+' : '';
  const pnlColor = seasonPnl >= 0 ? 'var(--color-green)' : 'var(--color-red)';

  return (
    <div className="terminal-pane pb-2 w-full h-full">
      <p className="terminal-pane-title pb-3 border-b border-border">Season Stats</p>

      <div className="pt-5 grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4 2xl:grid-cols-1 2xl:gap-3">
        {/* ROW 1: RANK SPANNING FULL WIDTH */}
        <div className="terminal-pane border-none! p-2.5 gap-2 lg:col-span-2 2xl:col-span-1">
          <div className="flex items-baseline font-mono text-xs uppercase tracking-wide">
            <span className="font-bold text-text2">Rank</span>
            <span className="flex-1 text-center font-bold text-text">{classPercentile.toFixed(2)}% {isCapitalist ? 'Capitalist' : 'Proletarian'}</span>
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
        <div className="contents lg:flex lg:flex-col lg:gap-3 2xl:contents">
          <div className="terminal-pane border-none!  p-2.5 gap-2">
            <div className="flex items-baseline font-mono text-xs uppercase tracking-wide">
              <span className="font-bold text-text2">Absolute P&amp;L</span>
              <span className="flex-1 text-center font-bold text-text">{rankLabel(rank)}</span>
              <span className="font-black" style={{ color: pnlColor }}>
                {pnlSign}${Math.abs(seasonPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="rank-track-chassis">
              <div style={{
                height: '100%',
                width: barFill(absoluteTopPercent),
                background: 'var(--color-green-70)',
                transition: 'width 0.5s ease-out',
              }} />
              <span className="progress-rail-overlay-text" style={{ textShadow: overlayShadow }}>{topPctLabel(absoluteTopPercent)}</span>
            </div>
          </div>

          <div className="terminal-pane border-none! p-2.5 gap-2">
            <div className="flex items-baseline font-mono text-xs uppercase tracking-wide">
              <span className="font-bold text-text2">Relative P&amp;L</span>
              <span className="flex-1 text-center font-bold text-text">{rankLabel(efficiencyRank)}</span>
              <span className="font-black text-purple">
                {growthSign}{displayGrowthPercent.toFixed(2)}%
              </span>
            </div>
            <div className="rank-track-chassis">
              <div style={{
                height: '100%',
                width: barFill(relativeTopPercent),
                background: 'var(--color-purple-70)',
                transition: 'width 0.5s ease-out',
              }} />
              <span className="progress-rail-overlay-text" style={{ textShadow: overlayShadow }}>{topPctLabel(relativeTopPercent)}</span>
            </div>
          </div>
        </div>

        {/* ROW 2, COL 2: TRADE VOLUME AND TRADING FEES */}
        <div className="contents lg:flex lg:flex-col lg:gap-3 2xl:contents">
          <div className="terminal-pane border-none! p-2.5 gap-2">
            <div className="flex items-baseline font-mono text-xs uppercase tracking-wide">
              <span className="font-bold text-text2">Trade Volume</span>
              <span className="flex-1 text-center font-bold text-text">{rankLabel(volumeRank)}</span>
              <span className="font-black" style={{ color: 'var(--color-gold)' }}>
                {userNetContribution >= 0 ? '+' : ''}$
                {userNetContribution.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="rank-track-chassis">
              <div style={{
                height: '100%',
                width: barFill(volumeTopPercent),
                background: 'var(--color-gold-70)',
                transition: 'width 0.5s ease-out',
              }} />
              <span className="progress-rail-overlay-text" style={{ textShadow: overlayShadow }}>{topPctLabel(volumeTopPercent)}</span>
            </div>
          </div>

          <div className="terminal-pane border-none! p-2.5 gap-2">
            <div className="flex items-baseline font-mono text-xs uppercase tracking-wide">
              <span className="font-bold text-text2">Trading Fees</span>
              <span className="flex-1 text-center font-bold text-text">{rankLabel(feesRank)}</span>
              <span className="font-black" style={{ color: 'var(--color-red)' }}>
                ${userTotalFees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="rank-track-chassis">
              <div style={{
                height: '100%',
                width: barFill(feesTopPercent),
                background: 'var(--color-red-70)',
                transition: 'width 0.5s ease-out',
              }} />
              <span className="progress-rail-overlay-text" style={{ textShadow: overlayShadow }}>{topPctLabel(feesTopPercent)}</span>
            </div>
          </div>
        </div>

        {/* CONTRIBUTION VIRTUE STAT — anchoring flips with winning faction */}
        {(() => {
          const capsWin = winningSide === 'cap';
          // Capitalists win: lowest contribution score wins → invert the percentile
          // Proletarians win: highest contribution score wins → use as-is (0 = top)
          const virtueTopPercent = capsWin ? 100 - contributionTopPercent : contributionTopPercent;
          // Mirror the rank with the percentile: caps win on the lowest contribution
          // score, so invert the contribution ordinal to match the inverted percentile.
          const virtueRank = capsWin ? totalPlayers - contributionRank + 1 : contributionRank;
          const label = capsWin ? 'Best Extraction' : 'Best Contribution';
          const accentColor = capsWin ? 'var(--color-gold)' : 'var(--color-purple)';
          const barColor = capsWin ? 'var(--color-gold-70)' : 'var(--color-purple-70)';
          return (
            <div className="terminal-pane border-none! p-2.5 gap-2 lg:col-span-2 2xl:col-span-1">
              <div className="flex items-baseline font-mono text-xs uppercase tracking-wide">
                <span className="font-bold text-text2">{label}</span>
                <span className="flex-1 text-center font-bold text-text">{rankLabel(virtueRank)}</span>
                <span className="font-black" style={{ color: accentColor }}>
                  {userContribution >= 0 ? '+' : ''}$
                  {userContribution.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="rank-track-chassis">
                <div style={{
                  height: '100%',
                  width: barFill(virtueTopPercent),
                  background: barColor,
                  transition: 'width 0.5s ease-out',
                }} />
                <span className="progress-rail-overlay-text" style={{ textShadow: overlayShadow }}>{topPctLabel(virtueTopPercent)}</span>
              </div>
            </div>
          );
        })()}
      </div>

    </div>
  );
};
