'use client';

import { formatUnits } from 'viem';
import { useMemo } from 'react';
import { useSeasonProjectedPnl } from './useSeasonProjectedPnl';

export interface LeaderboardEntry {
  address: string;   // lowercased wallet
  value: number;     // category metric (USDC, or % for relative P&L)
}

const TOP_N = 10;

export interface SeasonLeaderboardData {
  absolute: LeaderboardEntry[];
  relative: LeaderboardEntry[];
  volume: LeaderboardEntry[];
  fees: LeaderboardEntry[];
  allAbsolute: LeaderboardEntry[];
  allRelative: LeaderboardEntry[];
  allVolume: LeaderboardEntry[];
  allFees: LeaderboardEntry[];
  totalPlayers: number;
  loading: boolean;
}

/**
 * Whole-season leaderboard: the top performers across the entire player set —
 * NOT scoped to the connected wallet. Derives from the same shared projection as
 * usePlayerRank (useSeasonProjectedPnl), so the figures here match each player's
 * own Season Stats rails exactly. Only contributing players (netContribution > 0)
 * are ranked, mirroring usePlayerRank's eligibility filter.
 */
export function useSeasonLeaderboard(seasonAddress: string | undefined): SeasonLeaderboardData {
  const { projectedPnlByAddr, players, loading } = useSeasonProjectedPnl(seasonAddress);

  const board = useMemo(() => {
    if (!players) {
      return {
        absolute: [], relative: [], volume: [], fees: [],
        allAbsolute: [], allRelative: [], allVolume: [], allFees: [],
        totalPlayers: 0,
      };
    }

    const base = players
      .filter((stat) => {
        try { return BigInt(stat.netContribution || '0') > 0n; } catch { return false; }
      })
      .map((stat) => {
        const addr = stat.playerAddress.toLowerCase();
        const contrib = Number(formatUnits(BigInt(stat.netContribution || '0'), 6));
        const pnl = projectedPnlByAddr.get(addr) ?? -contrib;
        const efficiency = contrib > 0 ? (pnl / contrib) * 100 : -Infinity;
        const fees = Number(formatUnits(BigInt(stat.totalFeesPaid || '0'), 6));
        return { addr, pnl, efficiency, contrib, fees };
      });

    const sorted = (
      sort: (a: typeof base[number], b: typeof base[number]) => number,
      value: (p: typeof base[number]) => number,
    ): LeaderboardEntry[] =>
      [...base].sort(sort).map((p) => ({ address: p.addr, value: value(p) }));

    const allAbsolute = sorted((a, b) => b.pnl - a.pnl, (p) => p.pnl);
    const allRelative = sorted((a, b) => b.efficiency - a.efficiency, (p) => p.efficiency);
    const allVolume   = sorted((a, b) => b.contrib - a.contrib, (p) => p.contrib);
    const allFees     = sorted((a, b) => b.fees - a.fees, (p) => p.fees);

    return {
      absolute:    allAbsolute.slice(0, TOP_N),
      relative:    allRelative.slice(0, TOP_N),
      volume:      allVolume.slice(0, TOP_N),
      fees:        allFees.slice(0, TOP_N),
      allAbsolute,
      allRelative,
      allVolume,
      allFees,
      totalPlayers: base.length,
    };
  }, [players, projectedPnlByAddr]);

  return { ...board, loading };
}
