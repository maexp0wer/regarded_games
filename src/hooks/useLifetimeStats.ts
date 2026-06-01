'use client';

import { useQuery } from '@tanstack/react-query';
import { formatUnits } from 'viem';
import { fetchAllPonderItems } from '@/lib/ponder';
import { useTenantPonderUrl } from '@/context/TenantContext';

interface PlayerStatRow {
  seasonAddress: string;
  totalPotentialPayout: string;
  netContribution: string;
}

interface SeasonPlayerRow {
  playerAddress: string;
  totalPotentialPayout: string;
  netContribution: string;
}

export interface LifetimeStatsData {
  lifetimePnl: number;
  bestGlobalRank: number;
  bestTotalPlayers: number;
  bestRelativePercent: number;
  loading: boolean;
}

const PLAYER_QUERY = `
  query GetPlayerStats($addr: String!, $after: String, $limit: Int!) {
    playerSeasonStatss(where: { playerAddress_contains: $addr }, after: $after, limit: $limit) {
      items { seasonAddress totalPotentialPayout netContribution }
      pageInfo { endCursor hasNextPage }
    }
  }
`;

const SEASON_QUERY = `
  query GetSeasonStats($season: String!, $after: String, $limit: Int!) {
    playerSeasonStatss(where: { seasonAddress_contains: $season }, after: $after, limit: $limit) {
      items { playerAddress totalPotentialPayout netContribution }
      pageInfo { endCursor hasNextPage }
    }
  }
`;

export function useLifetimeStats(playerAddress: string | undefined): LifetimeStatsData {
  const PONDER_URL = useTenantPonderUrl();

  const { data, isLoading } = useQuery({
    queryKey: ['lifetimeStats', playerAddress, PONDER_URL],
    queryFn: async () => {
      const addr = playerAddress!.toLowerCase();

      const playerStats = await fetchAllPonderItems<PlayerStatRow>(
        PONDER_URL, PLAYER_QUERY, { addr },
        (d) => d.playerSeasonStatss
      );

      if (playerStats.length === 0) return null;

      // Only count finalized seasons (totalPotentialPayout is set by PlayerSeasonStatsFinalized
      // on-chain event; it stays 0 during auction/trading phase).
      const finalizedStats = playerStats.filter(s => {
        try { return BigInt(s.totalPotentialPayout || '0') > 0n; } catch { return false; }
      });

      const lifetimePnlRaw = finalizedStats.reduce((sum, s) => {
        try {
          return sum + BigInt(s.totalPotentialPayout || '0') - BigInt(s.netContribution || '0');
        } catch { return sum; }
      }, 0n);

      const uniqueSeasons = [...new Set(finalizedStats.map(s => s.seasonAddress))];

      const allSeasonPlayers = await Promise.all(
        uniqueSeasons.map(season =>
          fetchAllPonderItems<SeasonPlayerRow>(
            PONDER_URL, SEASON_QUERY, { season: season.toLowerCase() },
            (d) => d.playerSeasonStatss
          )
        )
      );

      let bestGlobalRank = -1;
      let bestTotalPlayers = 0;

      for (const seasonPlayers of allSeasonPlayers) {
        const base = seasonPlayers
          .filter(s => {
            try {
              return BigInt(s.netContribution || '0') > 0n && BigInt(s.totalPotentialPayout || '0') > 0n;
            } catch { return false; }
          })
          .map(s => ({
            addr: s.playerAddress.toLowerCase(),
            pnl: Number(BigInt(s.totalPotentialPayout || '0') - BigInt(s.netContribution || '0')),
          }))
          .sort((a, b) => b.pnl - a.pnl);

        const idx = base.findIndex(p => p.addr === addr);
        if (idx === -1) continue;
        const rank = idx + 1;
        const total = base.length;
        if (bestGlobalRank === -1 || rank < bestGlobalRank) {
          bestGlobalRank = rank;
          bestTotalPlayers = total;
        }
      }

      const bestRelativePercent =
        bestGlobalRank > 0 && bestTotalPlayers > 1
          ? (1 - (bestGlobalRank - 1) / (bestTotalPlayers - 1)) * 100
          : bestGlobalRank === 1 ? 100 : 0;

      return {
        lifetimePnlRaw,
        bestGlobalRank,
        bestTotalPlayers,
        bestRelativePercent,
      };
    },
    enabled: !!playerAddress,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || !data) {
    return { lifetimePnl: 0, bestGlobalRank: -1, bestTotalPlayers: 0, bestRelativePercent: 0, loading: isLoading };
  }

  return {
    lifetimePnl: Number(formatUnits(data.lifetimePnlRaw, 6)),
    bestGlobalRank: data.bestGlobalRank,
    bestTotalPlayers: data.bestTotalPlayers,
    bestRelativePercent: data.bestRelativePercent,
    loading: false,
  };
}
