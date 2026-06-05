'use client';

import { formatUnits } from 'viem';
import { useMemo } from 'react';
import { useSeasonProjectedPnl } from './useSeasonProjectedPnl';

export interface LeaderboardEntry {
  address: string;   // lowercased wallet
  value: number;     // category metric (USDC, or % for relative P&L)
}

export interface SeasonLeaderboardData {
  absolute: LeaderboardEntry[];   // top Season P/L (USDC)
  relative: LeaderboardEntry[];   // top capital growth (%)
  volume: LeaderboardEntry[];     // top net contribution / trade volume (USDC)
  fees: LeaderboardEntry[];       // top trading fees paid (USDC)
  totalPlayers: number;
  loading: boolean;
}

const TOP_N = 3;

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
      return { absolute: [], relative: [], volume: [], fees: [], totalPlayers: 0 };
    }

    const base = players
      .filter((stat) => {
        try { return BigInt(stat.netContribution || '0') > 0n; } catch { return false; }
      })
      .map((stat) => {
        const addr = stat.playerAddress.toLowerCase();
        const contrib = Number(formatUnits(BigInt(stat.netContribution || '0'), 6));
        // Projected Season P/L (payout − contribution); falls back to −contrib (a
        // total loss) before any pool exists, matching usePlayerRank.
        const pnl = projectedPnlByAddr.get(addr) ?? -contrib;
        const efficiency = contrib > 0 ? (pnl / contrib) * 100 : -Infinity;
        const fees = Number(formatUnits(BigInt(stat.totalFeesPaid || '0'), 6));
        return { addr, pnl, efficiency, contrib, fees };
      });

    const top = (
      sort: (a: typeof base[number], b: typeof base[number]) => number,
      value: (p: typeof base[number]) => number,
    ): LeaderboardEntry[] =>
      [...base].sort(sort).slice(0, TOP_N).map((p) => ({ address: p.addr, value: value(p) }));

    return {
      absolute: top((a, b) => b.pnl - a.pnl, (p) => p.pnl),
      relative: top((a, b) => b.efficiency - a.efficiency, (p) => p.efficiency),
      volume: top((a, b) => b.contrib - a.contrib, (p) => p.contrib),
      fees: top((a, b) => b.fees - a.fees, (p) => p.fees),
      totalPlayers: base.length,
    };
  }, [players, projectedPnlByAddr]);

  return { ...board, loading };
}
