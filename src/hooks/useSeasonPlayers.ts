'use client';

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { fetchAllPonderItems } from '@/lib/ponder';
import { useTenantPonderUrl } from '@/context/TenantContext';

/**
 * Raw `playerSeasonStatss` row for a season. Selects the superset of fields any
 * consumer needs so a single cached fetch serves every derived hook
 * (useSeasonGini, useBatchPlayerPercentiles, useFactionPercentile,
 * usePlayerRank, usePayout, useOrderBook maker balances).
 */
export interface SeasonPlayer {
  playerAddress: string;
  fimBalance: string;
  fimBurned: string;
  totalPotentialPayout: string;
  realizedPayout: string;
  netContribution: string;
  totalFeesPaid: string;
}

const QUERY = `
  query GetSeasonPlayers($season: String!, $after: String, $limit: Int!) {
    playerSeasonStatss(
      where: { seasonAddress: $season }
      after: $after
      limit: $limit
    ) {
      items {
        playerAddress fimBalance fimBurned
        totalPotentialPayout realizedPayout netContribution totalFeesPaid
      }
      pageInfo { endCursor hasNextPage }
    }
  }
`;

/**
 * Single shared fetch of every player's season stats. All player-table consumers
 * subscribe to this stable query key, so React Query fetches the collection once
 * per interval and propagates fresh data to every consumer automatically.
 */
export function useSeasonPlayers(
  seasonAddress: string | undefined,
): UseQueryResult<SeasonPlayer[]> {
  const PONDER_URL = useTenantPonderUrl();
  return useQuery<SeasonPlayer[]>({
    queryKey: ['seasonPlayers', seasonAddress?.toLowerCase(), PONDER_URL],
    enabled: !!seasonAddress,
    queryFn: () =>
      fetchAllPonderItems<SeasonPlayer>(
        PONDER_URL,
        QUERY,
        { season: seasonAddress!.toLowerCase() },
        (d) => d.playerSeasonStatss,
      ),
    refetchInterval: 5000,
    staleTime: 4000,
  });
}
