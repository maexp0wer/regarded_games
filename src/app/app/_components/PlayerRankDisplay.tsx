'use client';

import React from 'react';
import { usePlayerRank } from '@/hooks/usePlayerRank';

interface PlayerRankDisplayProps {
  seasonAddress: string;
  userAddress: string | undefined;
}

const PlayerRankDisplay: React.FC<PlayerRankDisplayProps> = ({
  seasonAddress,
  userAddress,
}) => {
  const {
    rank,
    totalPlayers,
    efficiencyRank,
    efficiencyPercent,
    loading,
  } = usePlayerRank(seasonAddress, userAddress);

  if (loading) {
    return (
      <div className="space-y-4 mb-8">
        <div className="h-8 w-full bg-white/5 animate-pulse rounded" />
        <div className="h-8 w-full bg-white/5 animate-pulse rounded" />
      </div>
    );
  }

  if (!userAddress || rank === -1 || totalPlayers < 1) {
    return null;
  }

  const totalPercent =
    totalPlayers > 1 ? ((rank - 1) / (totalPlayers - 1)) * 100 : 0;

  const relativePercent = efficiencyPercent;

  return (
    <div className="mb-10">
      <div className="bg-card2 border border-border rounded-lg px-4 py-4 space-y-6">
        <h3 className="h3-app text-center">Player Rank</h3>

        {/* TOTAL RANK */}
        <RankBar
          label="Total"
          rank={rank}
          total={totalPlayers}
          percent={totalPercent}
          color="bg-primary"
        />

        {/* RELATIVE RANK */}
        <RankBar
          label="Relative"
          rank={efficiencyRank}
          total={totalPlayers}
          percent={relativePercent}
          color="bg-success"
        />

      </div>
    </div>
  );
};

export default PlayerRankDisplay;


interface RankBarProps {
  label: string;
  rank: number;
  total: number;
  percent: number;
  color: string;
}

const RankBar: React.FC<RankBarProps> = ({
  label,
  rank,
  total,
  percent,
  color,
}) => {
  return (
    <div className="space-y-2">
      
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-text2">
          {label}
        </span>
        <span className="text-[12px] font-black text-text">
          #{rank} <span className="text-text2 font-bold">of {total}</span>
        </span>
      </div>

      {/* BAR */}
      <div className="relative h-3 bg-black/40 rounded-full border border-white/10 overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 ${color}/80 transition-all duration-700 ease-out`}
          style={{ width: `${percent}%` }}
        />

        {/* CENTERED PERCENT */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[10px] font-black text-white drop-shadow">
            {percent.toFixed(1)}%
          </span>
        </div>

        {/* MARKER */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-700 ease-out"
          style={{ left: `${percent}%` }}
        >
          <div
            className={`w-3 h-3 rounded-full ${color} border-2 border-white shadow-[0_0_10px_rgba(255,255,255,0.4)]`}
          />
        </div>
      </div>
    </div>
  );
};
