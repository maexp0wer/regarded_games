'use client';

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { fetchAllPonderItems } from '@/lib/ponder';
import { useTenantPonderUrl } from '@/context/TenantContext';

interface FlaggedWalletRow {
  walletAddress: string;
  seasonAddress: string;
  seasonNumber: number;
}

const QUERY = `
  query GetFlaggedWallets($after: String, $limit: Int!) {
    flaggedWalletss(after: $after, limit: $limit) {
      items { walletAddress seasonAddress seasonNumber }
      pageInfo { endCursor hasNextPage }
    }
  }
`;

/**
 * Cross-season flag registry (display only — no protocol enforcement). Maps a
 * lowercased wallet to the season numbers it was flagged in, across ALL seasons.
 * Present flags as neutral, season-scoped history ("Flagged — Season 3"), never
 * as a verdict: the protocol never carries a flag forward, and a wrongly-flagged
 * player keeps trading on equal terms (ADR-0008).
 */
export function useFlaggedWallets(): UseQueryResult<Map<string, number[]>> {
  const PONDER_URL = useTenantPonderUrl();
  return useQuery<Map<string, number[]>>({
    queryKey: ['flaggedWallets', PONDER_URL],
    queryFn: async () => {
      const rows = await fetchAllPonderItems<FlaggedWalletRow>(
        PONDER_URL,
        QUERY,
        {},
        (d) => d.flaggedWalletss,
      );
      const map = new Map<string, number[]>();
      for (const row of rows) {
        const key = row.walletAddress.toLowerCase();
        const seasons = map.get(key) ?? [];
        seasons.push(row.seasonNumber);
        map.set(key, seasons.sort((a, b) => a - b));
      }
      return map;
    },
    // Flags are rare, irreversible events — slow poll is plenty.
    refetchInterval: 15000,
    staleTime: 10000,
  });
}
