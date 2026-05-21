'use client';

import React from 'react';
import { usePlayerRank } from '@/hooks/usePlayerRank';
import { usePlayerPercentile } from '@/hooks/usePlayerPercentile';

interface PlayerRankDisplayProps {
  seasonAddress: string;
  userAddress: string | undefined;
}

const PlayerRankDisplay: React.FC<PlayerRankDisplayProps> = ({ seasonAddress, userAddress }) => {
  const { rank, totalPlayers, efficiencyRank, efficiencyPercent, loading: rankLoading } =
    usePlayerRank(seasonAddress, userAddress);
  const { data: percentileData, isLoading: percentileLoading } =
    usePlayerPercentile(seasonAddress, userAddress);

  const loading = rankLoading || percentileLoading;

  const totalPercent = totalPlayers > 1 ? ((rank - 1) / (totalPlayers - 1)) * 100 : 0;
  const relativePercent = efficiencyPercent;

  let pointerPos = 50;
  let displayFactionPercent = 0;
  let factionName = '';
  let factionColor = 'var(--color-text2)';

  if (percentileData) {
    factionName = percentileData.isCapitalist ? 'Bourgeoisie' : 'Proletariat';
    factionColor = percentileData.isCapitalist ? 'var(--color-gold)' : 'var(--color-purple)';
    if (percentileData.isCapitalist) {
      displayFactionPercent = percentileData.factionPercentile;
      pointerPos = 50 + (percentileData.factionPercentile / 2);
    } else {
      displayFactionPercent = 100 - percentileData.factionPercentile;
      pointerPos = (percentileData.factionPercentile / 2);
    }
  }

  if (loading) {
    return (
      <div className="card-app flex flex-col gap-6 border border-border2">
        {[1, 2, 3].map(i => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-24 rounded animate-pulse bg-border" />
            <div className="h-2 w-full rounded-full animate-pulse bg-border" />
          </div>
        ))}
      </div>
    );
  }

  if (!userAddress || rank === -1 || totalPlayers < 1 || !percentileData) return null;

  const knobStyle: React.CSSProperties = {
    width: 16, height: 16, borderRadius: '50%',
    background: 'var(--color-card)', border: '2px solid white',
    boxShadow: '0 0 10px #ffffff4d',
  };

  return (
    <div className="card-app flex flex-col gap-8 pb-10 border border-border2">
      <p className="section-label pb-3 border-b border-border">
        Your Season Stats
      </p>

      {/* 1. Faction bar (purple → gold) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-purple">Proletariat</span>
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-gold">Bourgeoisie</span>
        </div>
        <div className="relative rounded-full overflow-visible h-1.5 bg-card2">
          <div
            className="absolute inset-0 rounded-full overflow-hidden opacity-70"
            style={{ background: 'linear-gradient(90deg, var(--color-purple), var(--color-gold))' }}
          />
          <div className="absolute top-0 bottom-0 left-1/2 w-px opacity-40 bg-white" />
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 transition-all duration-1000"
            style={{ left: `${pointerPos}%` }}
          >
            <div style={knobStyle} />
            <div className="absolute top-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="font-mono text-[10px] font-bold" style={{ color: factionColor }}>
                {displayFactionPercent.toFixed(1)}% {factionName}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Absolute PnL rank */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="section-label">Absolute PnL Rank</span>
          <span className="font-mono text-[12px] font-bold text-text tabular-nums">
            #{rank} <span className="text-text2 font-normal">of {totalPlayers}</span>
          </span>
        </div>
        <div className="relative rounded-full overflow-visible h-1.5 bg-card2">
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 transition-all duration-700"
              style={{
                width: `${100 - totalPercent}%`,
                background: 'linear-gradient(90deg, var(--color-gold-35), var(--color-gold))',
              }}
            />
          </div>
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 transition-all duration-700"
            style={{ left: `${100 - totalPercent}%` }}
          >
            <div style={{ ...knobStyle, borderColor: 'var(--color-gold)', boxShadow: '0 0 10px var(--color-gold-70)' }} />
            <div className="absolute top-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="font-mono text-[10px] font-bold text-gold">
                Top {totalPercent < 1 ? '<1' : totalPercent.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Relative PnL rank */}
      <div className="space-y-2 pb-5">
        <div className="flex items-center justify-between">
          <span className="section-label">Relative PnL Rank</span>
          <span className="font-mono text-[12px] font-bold text-text tabular-nums">
            #{efficiencyRank} <span className="text-text2 font-normal">of {totalPlayers}</span>
          </span>
        </div>
        <div className="relative rounded-full overflow-visible h-1.5 bg-card2">
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 transition-all duration-700"
              style={{
                width: `${100 - relativePercent}%`,
                background: 'linear-gradient(90deg, var(--color-gold-35), var(--color-gold))',
              }}
            />
          </div>
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 transition-all duration-700"
            style={{ left: `${100 - relativePercent}%` }}
          >
            <div style={{ ...knobStyle, borderColor: 'var(--color-gold)', boxShadow: '0 0 10px var(--color-gold-70)' }} />
            <div className="absolute top-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="font-mono text-[10px] font-bold text-gold">
                Top {relativePercent < 1 ? '<1' : relativePercent.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerRankDisplay;
