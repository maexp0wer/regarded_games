'use client';

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useTenantPonderUrl } from '@/context/TenantContext';

/** Per-season scalar fields from the `seasonss` collection. */
export interface SeasonInfo {
  prizePool: string;
  exchangeAddress: string;
}

const QUERY = `
  query GetSeasonInfo($address: String!) {
    seasonss(where: { address: $address }) {
      items { prizePool exchangeAddress }
    }
  }
`;

/**
 * Single shared fetch of a season's scalar fields (prize pool, exchange address).
 * Previously piggy-backed on useSeasonGini's combined query; split out so the
 * player/order primitives stay pure collections.
 */
export function useSeasonInfo(
  seasonAddress: string | undefined,
): UseQueryResult<SeasonInfo | null> {
  const PONDER_URL = useTenantPonderUrl();
  return useQuery<SeasonInfo | null>({
    queryKey: ['seasonInfo', seasonAddress?.toLowerCase(), PONDER_URL],
    enabled: !!seasonAddress,
    queryFn: async () => {
      const res = await fetch(PONDER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: QUERY,
          variables: { address: seasonAddress!.toLowerCase() },
        }),
      });
      const json = await res.json();
      return json?.data?.seasonss?.items?.[0] ?? null;
    },
    refetchInterval: 5000,
    staleTime: 4000,
  });
}
