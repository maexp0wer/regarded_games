'use client';

import { formatUnits } from 'viem';
import { useMemo } from 'react';
import { useSeasonPlayers, SeasonPlayer } from './useSeasonPlayers';

export interface PlayerRankData {
  rank: number;
  totalPlayers: number;

  efficiencyRank: number;
  efficiencyPercent: number;    // 0–100 percentile position (0 = top)
  efficiencyValue: number;      // raw ratio (e.g. 0.16)

  userPnl: number;              // USDC net P&L
  userNetContribution: number;  // USDC net invested (trade volume proxy)
  growthPercent: number;        // % growth relative to contribution

  loading: boolean;
}

const calculateEfficiency = (stat: SeasonPlayer): number => {
  try {
    const pnl = BigInt(stat.totalPotentialPayout || "0")
      - BigInt(stat.netContribution || "0");

    const contrib = BigInt(stat.netContribution || "0");
    if (contrib <= 0n) return -Infinity;

    return Number(pnl) / Number(contrib);
  } catch {
    return -Infinity;
  }
};

// Helper function to calculate PnL based on your request: totalPotentialPayout - netContribution
const calculatePnl = (stat: SeasonPlayer): number => {
  try {
    const totalValueRaw = BigInt(stat.totalPotentialPayout || "0");
    const contribRaw = BigInt(stat.netContribution || "0");

    // Allow negative PnL
    const pnlRaw = totalValueRaw - contribRaw;

    return Number(formatUnits(pnlRaw, 6));
  } catch (e) {
    console.error("Error calculating PnL for stat:", stat, e);
    return 0;
  }
};

/**
 * Determines a player's rank within a season. Derives from the shared
 * useSeasonPlayers cache (no dedicated fetch). Note: rankings now refresh on the
 * shared 5s interval instead of the previous 5min staleTime — live ranks.
 * @param seasonAddress The address of the GameSeason contract.
 * @param userAddress The address of the player whose rank is being sought.
 */
export function usePlayerRank(seasonAddress: string, userAddress: string | undefined): PlayerRankData {
  const { data: allStatsData, isLoading: statsLoading } = useSeasonPlayers(seasonAddress);

  // Calculate Rank using useMemo to prevent recalculation on every render
  const {
  rank,
  totalPlayers,
  efficiencyRank,
  efficiencyPercent,
  efficiencyValue,
  userPnl,
  userNetContribution,
  growthPercent,
} = useMemo(() => {
  if (!allStatsData || !userAddress) {
    return {
      rank: -1,
      totalPlayers: 0,
      efficiencyRank: -1,
      efficiencyPercent: 0,
      efficiencyValue: 0,
      userPnl: 0,
      userNetContribution: 0,
      growthPercent: 0,
    };
  }

  const base = allStatsData
    .filter(stat => {
      try {
        return BigInt(stat.netContribution || "0") > 0n;
      } catch {
        return false;
      }
    })
    .map(stat => ({
      ...stat,
      pnl: calculatePnl(stat),
      efficiency: calculateEfficiency(stat),
      addr: stat.playerAddress.toLowerCase(),
    }));

  const pnlSorted = [...base].sort((a, b) => b.pnl - a.pnl);
  const efficiencySorted = [...base].sort((a, b) => b.efficiency - a.efficiency);

  const addr = userAddress.toLowerCase();

  const pnlIndex = pnlSorted.findIndex(p => p.addr === addr);
  const effIndex = efficiencySorted.findIndex(p => p.addr === addr);
  const userStat = base.find(p => p.addr === addr);

  const total = base.length;

  const efficiencyPercent =
    total > 1 && effIndex !== -1
      ? (effIndex / (total - 1)) * 100
      : 0;

  const rawEfficiency = effIndex === -1 ? 0 : efficiencySorted[effIndex].efficiency;
  const safeGrowthPercent = isFinite(rawEfficiency) ? rawEfficiency * 100 : 0;

  const userNetContrib = userStat
    ? Number(formatUnits(BigInt(userStat.netContribution || "0"), 6))
    : 0;

  return {
    rank: pnlIndex === -1 ? -1 : pnlIndex + 1,
    totalPlayers: total,

    efficiencyRank: effIndex === -1 ? -1 : effIndex + 1,
    efficiencyPercent,
    efficiencyValue: rawEfficiency,

    userPnl: userStat ? userStat.pnl : 0,
    userNetContribution: userNetContrib,
    growthPercent: safeGrowthPercent,
  };
}, [allStatsData, userAddress]);


  return {
    rank,
    totalPlayers,
    efficiencyRank,
    efficiencyPercent,
    efficiencyValue,
    userPnl,
    userNetContribution,
    growthPercent,
    loading: statsLoading,
  };
}
