'use client';

import { useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { useQuery } from '@tanstack/react-query'; 
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';
import { useMemo } from 'react'; // Import useMemo

const PONDER_URL = "http://127.0.0.1:42069/graphql";

// Interface for the general structure of a player's stat from Ponder
interface PlayerSeasonStat {
  playerAddress: string;
  realizedPayout: string; // Stored as string in GraphQL results
  totalPotentialPayout: string;
  netContribution: string;
}

export interface PlayerRankData {
  rank: number;                 // absolute pnl rank
  totalPlayers: number;

  efficiencyRank: number;       // relative pnl rank
  efficiencyPercent: number;    // 0–100 position
  efficiencyValue: number;      // raw ratio (e.g. 0.16)

  loading: boolean;
}

const calculateEfficiency = (stat: PlayerSeasonStat): number => {
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
const calculatePnl = (stat: PlayerSeasonStat): number => {
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
 * Hook to fetch all player stats for a season, calculate PnL, and determine the rank for a specific user.
 * @param seasonAddress The address of the GameSeason contract.
 * @param userAddress The address of the player whose rank is being sought.
 */
export function usePlayerRank(seasonAddress: string, userAddress: string | undefined): PlayerRankData {
  
  // 1. Fetch ALL Player Stats from Ponder
  const { data: allStatsData, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["seasonRankings", seasonAddress],
    queryFn: async () => {
      if (!seasonAddress) return null;
      
      const query = `
        query GetRankingData($season: String!) {
          playerSeasonStatss(where: { 
            seasonAddress_contains: $season
          }, limit: 1000) {
            items {
              playerAddress
              realizedPayout          
              totalPotentialPayout
              netContribution
            }
          }
        }
      `;
      const res = await fetch(PONDER_URL, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query, 
          // Addresses must be lowercase for Ponder filtering
          variables: { season: seasonAddress.toLowerCase() } 
        })
      });

      const json = await res.json();
      // console.log("Ponder response:", json);

      
      // CRITICAL: Extract the 'items' array.
      return json?.data?.playerSeasonStatss?.items as PlayerSeasonStat[] ?? [];
    },
    enabled: !!seasonAddress,
    // Keep this data around to avoid refetching on every component re-render if not explicitly refetched
    staleTime: 5 * 60 * 1000, // e.g., 5 minutes
  });

  // 2. Calculate Rank using useMemo to prevent recalculation on every render
  const {
  rank,
  totalPlayers,
  efficiencyRank,
  efficiencyPercent,
  efficiencyValue,
} = useMemo(() => {
  if (!allStatsData || !userAddress) {
    return {
      rank: -1,
      totalPlayers: 0,
      efficiencyRank: -1,
      efficiencyPercent: 0,
      efficiencyValue: 0,
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

  // ---- ABSOLUTE PNL RANK ----
  const pnlSorted = [...base].sort((a, b) => b.pnl - a.pnl);

  // ---- EFFICIENCY RANK ----
  const efficiencySorted = [...base].sort(
    (a, b) => b.efficiency - a.efficiency
  );

  const addr = userAddress.toLowerCase();

  const pnlIndex = pnlSorted.findIndex(p => p.addr === addr);
  const effIndex = efficiencySorted.findIndex(p => p.addr === addr);

  const total = base.length;

  const efficiencyPercent =
    total > 1 && effIndex !== -1
      ? (effIndex / (total - 1)) * 100
      : 0;

  return {
    rank: pnlIndex === -1 ? -1 : pnlIndex + 1,
    totalPlayers: total,

    efficiencyRank: effIndex === -1 ? -1 : effIndex + 1,
    efficiencyPercent,
    efficiencyValue:
      effIndex === -1 ? 0 : efficiencySorted[effIndex].efficiency,
  };
}, [allStatsData, userAddress]);


  const loading = statsLoading;
  const refetch = () => { refetchStats(); };

  // Return the determined rank and calculated PnL, along with loading state and refetch function
  return {
  rank,
  totalPlayers,
  efficiencyRank,
  efficiencyPercent,
  efficiencyValue,
  loading,
};
}