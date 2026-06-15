'use client';

import { useQuery } from '@tanstack/react-query';
import { formatUnits } from 'viem';
import { fetchAllPonderItems } from '@/lib/ponder';
import { useTenantPonderUrl } from '@/context/TenantContext';

interface PlayerStatRow {
  seasonAddress: string;
  realizedPayout: string;
  netContribution: string;
  finalized: boolean;
}

export interface LifetimeStatsData {
  lifetimePnl: number;
  lifetimeVolume: number;
  seasonsPlayed: number;
  /** Seasons the player claimed their payout for (lowercased addresses). The
   *  Career card fans out usePlayerRank over these to surface the best rank. */
  claimedSeasons: string[];
  loading: boolean;
  error: string | null;
}

const PLAYER_QUERY = `
  query GetPlayerStats($addr: String!, $after: String, $limit: Int!) {
    playerSeasonStatss(where: { playerAddress_contains: $addr }, after: $after, limit: $limit) {
      items { seasonAddress realizedPayout netContribution finalized }
      pageInfo { endCursor hasNextPage }
    }
  }
`;

const safeBigInt = (v: string | undefined): bigint => {
  try { return BigInt(v || '0'); } catch { return 0n; }
};

export function useLifetimeStats(playerAddress: string | undefined): LifetimeStatsData {
  const PONDER_URL = useTenantPonderUrl();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['lifetimeStats', playerAddress, PONDER_URL],
    queryFn: async () => {
      const playerStats = await fetchAllPonderItems<PlayerStatRow>(
        PONDER_URL, PLAYER_QUERY, { addr: playerAddress!.toLowerCase() },
        (d) => d.playerSeasonStatss
      );

      // A season counts toward lifetime stats once the player's row is finalized
      // on-chain — including seasons that settled at a $0 payout (a loss).
      // In-progress rows (trading/auction activity only) are excluded.
      const finalizedStats = playerStats.filter(s => s.finalized);

      // Lifetime PnL, realized-only: claiming is voluntary, so only count payout the
      // player has actually withdrawn (realizedPayout). A finalized-but-unclaimed
      // season contributes −netContribution until the player claims.
      const lifetimePnlRaw = finalizedStats.reduce(
        (sum, s) => sum + (safeBigInt(s.realizedPayout) - safeBigInt(s.netContribution)),
        0n,
      );

      // Lifetime Trade Volume mirrors Season Stats' "Trade Volume" — the player's
      // net contribution (USDC) — aggregated across every finalized season.
      const lifetimeVolumeRaw = finalizedStats.reduce(
        (sum, s) => sum + safeBigInt(s.netContribution), 0n,
      );

      const uniqueSeasons = [...new Set(finalizedStats.map(s => s.seasonAddress.toLowerCase()))];

      // Seasons the player actually claimed (realizedPayout > 0). Ranks are only
      // surfaced for these — see the Career card's per-season usePlayerRank fan-out.
      const claimedSeasons = [...new Set(
        finalizedStats
          .filter(s => safeBigInt(s.realizedPayout) > 0n)
          .map(s => s.seasonAddress.toLowerCase()),
      )];

      return {
        lifetimePnlRaw,
        lifetimeVolumeRaw,
        seasonsPlayed: uniqueSeasons.length,
        claimedSeasons,
      };
    },
    enabled: !!playerAddress,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || !data) {
    return { lifetimePnl: 0, lifetimeVolume: 0, seasonsPlayed: 0, claimedSeasons: [], loading: isLoading, error: isError ? 'Failed to load lifetime stats' : null };
  }

  return {
    lifetimePnl: Number(formatUnits(data.lifetimePnlRaw, 6)),
    lifetimeVolume: Number(formatUnits(data.lifetimeVolumeRaw, 6)),
    seasonsPlayed: data.seasonsPlayed,
    claimedSeasons: data.claimedSeasons,
    loading: false,
    error: null,
  };
}
