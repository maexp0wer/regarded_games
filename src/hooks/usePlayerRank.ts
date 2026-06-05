'use client';

import { formatUnits } from 'viem';
import { useMemo } from 'react';
import { useSeasonProjectedPnl } from './useSeasonProjectedPnl';

export interface PlayerRankData {
  rank: number;
  totalPlayers: number;

  efficiencyRank: number;
  efficiencyPercent: number;    // 0–100 percentile position (0 = top)
  efficiencyValue: number;      // raw ratio (e.g. 0.16)

  userNetContribution: number;  // USDC net invested (trade volume proxy)
  growthPercent: number;        // (Season P/L / netContribution) × 100

  volumeRank: number;
  volumeTopPercent: number;     // 0–100 percentile position (0 = top by volume)

  feesRank: number;
  feesTopPercent: number;       // 0–100 percentile position (0 = top by fees paid)
  userTotalFees: number;        // USDC fees paid this season

  loading: boolean;
}

/**
 * Determines a player's rank within a season. Derives from the shared
 * useSeasonPlayers cache (no dedicated fetch). Rankings refresh on the
 * shared 5 s interval — live ranks.
 *
 * P&L-based ranks (Absolute and Relative) are computed from each player's
 * *projected* pool-proportional payout — the same client-side settlement replica
 * `usePayout` displays — NOT the indexer's `totalPotentialPayout` field. That
 * field is only written once a season is finalized, so ranking on it during live
 * play ties every player at the same value and yields meaningless ranks.
 */
export function usePlayerRank(seasonAddress: string, userAddress: string | undefined): PlayerRankData {
  const { projectedPnlByAddr, players: allStatsData, loading: statsLoading } =
    useSeasonProjectedPnl(seasonAddress);

  const {
    rank,
    totalPlayers,
    efficiencyRank,
    efficiencyPercent,
    efficiencyValue,
    userNetContribution,
    growthPercent,
    volumeRank,
    volumeTopPercent,
    feesRank,
    feesTopPercent,
    userTotalFees,
  } = useMemo(() => {
    if (!allStatsData || !userAddress) {
      return {
        rank: -1,
        totalPlayers: 0,
        efficiencyRank: -1,
        efficiencyPercent: 0,
        efficiencyValue: 0,
        userNetContribution: 0,
        growthPercent: 0,
        volumeRank: -1,
        volumeTopPercent: 0,
        feesRank: -1,
        feesTopPercent: 0,
        userTotalFees: 0,
      };
    }

    const base = allStatsData
      .filter(stat => {
        try { return BigInt(stat.netContribution || "0") > 0n; } catch { return false; }
      })
      .map(stat => {
        const addr = stat.playerAddress.toLowerCase();
        const contrib = Number(formatUnits(BigInt(stat.netContribution || "0"), 6));
        // Projected Season P/L (payout − contribution). Falls back to −contrib (a
        // total loss) only before any pool exists, when no payout can be projected.
        const pnl = projectedPnlByAddr.get(addr) ?? -contrib;
        const efficiency = contrib > 0 ? pnl / contrib : -Infinity;
        return { ...stat, pnl, efficiency, addr };
      });

    const pnlSorted = [...base].sort((a, b) => b.pnl - a.pnl);
    const efficiencySorted = [...base].sort((a, b) => b.efficiency - a.efficiency);
    const volumeSorted = [...base].sort((a, b) =>
      Number(BigInt(b.netContribution || "0")) - Number(BigInt(a.netContribution || "0"))
    );
    const feesSorted = [...base].sort((a, b) =>
      Number(BigInt(b.totalFeesPaid || "0")) - Number(BigInt(a.totalFeesPaid || "0"))
    );

    const addr = userAddress.toLowerCase();
    const pnlIndex = pnlSorted.findIndex(p => p.addr === addr);
    const effIndex = efficiencySorted.findIndex(p => p.addr === addr);
    const volIndex = volumeSorted.findIndex(p => p.addr === addr);
    const feesIndex = feesSorted.findIndex(p => p.addr === addr);
    const userStat = base.find(p => p.addr === addr);

    const total = base.length;

    const efficiencyPercent =
      total > 1 && effIndex !== -1 ? (effIndex / (total - 1)) * 100 : 0;

    const volumeTopPercent =
      total > 1 && volIndex !== -1 ? (volIndex / (total - 1)) * 100 : 0;

    const feesTopPercent =
      total > 1 && feesIndex !== -1 ? (feesIndex / (total - 1)) * 100 : 0;

    const rawEfficiency = effIndex === -1 ? 0 : efficiencySorted[effIndex].efficiency;
    const safeGrowthPercent = isFinite(rawEfficiency) ? rawEfficiency * 100 : 0;

    const userNetContrib = userStat
      ? Number(formatUnits(BigInt(userStat.netContribution || "0"), 6))
      : 0;

    const userTotalFees = userStat
      ? Number(formatUnits(BigInt(userStat.totalFeesPaid || "0"), 6))
      : 0;

    return {
      rank: pnlIndex === -1 ? -1 : pnlIndex + 1,
      totalPlayers: total,

      efficiencyRank: effIndex === -1 ? -1 : effIndex + 1,
      efficiencyPercent,
      efficiencyValue: rawEfficiency,

      userNetContribution: userNetContrib,
      growthPercent: safeGrowthPercent,

      volumeRank: volIndex === -1 ? -1 : volIndex + 1,
      volumeTopPercent,

      feesRank: feesIndex === -1 ? -1 : feesIndex + 1,
      feesTopPercent,
      userTotalFees,
    };
  }, [allStatsData, userAddress, projectedPnlByAddr]);

  return {
    rank,
    totalPlayers,
    efficiencyRank,
    efficiencyPercent,
    efficiencyValue,
    userNetContribution,
    growthPercent,
    volumeRank,
    volumeTopPercent,
    feesRank,
    feesTopPercent,
    userTotalFees,
    loading: statsLoading,
  };
}
