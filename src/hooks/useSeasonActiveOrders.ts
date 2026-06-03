'use client';

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { fetchAllPonderItems } from '@/lib/ponder';
import { useTenantPonderUrl } from '@/context/TenantContext';

/**
 * Raw active `orderss` row (both buy and sell) for a season. Consumers that only
 * want one side filter in memory.
 */
export interface SeasonActiveOrder {
  id: string;
  maker: string;
  isBuy: boolean;
  price: string;
  initialAmount: string;
  remainingAmount: string;
  isCancelled: boolean;
  timestamp: string;
  settledAt: string | null;
  active: boolean;
  orderId: string;
  seasonAddress: string;
}

const QUERY = `
  query GetSeasonActiveOrders($season: String!, $after: String, $limit: Int!) {
    orderss(
      where: { seasonAddress: $season, active: true }
      after: $after
      limit: $limit
    ) {
      items {
        id maker isBuy price initialAmount remainingAmount
        isCancelled timestamp settledAt active orderId seasonAddress
      }
      pageInfo { endCursor hasNextPage }
    }
  }
`;

/**
 * Single shared fetch of every active order for a season. Consumed by
 * useOrderBook, useSeasonGini, useBatchPlayerPercentiles, useFactionPercentile
 * (sell side), and useOpenOrders ('open' variant, filtered by maker).
 */
export function useSeasonActiveOrders(
  seasonAddress: string | undefined,
): UseQueryResult<SeasonActiveOrder[]> {
  const PONDER_URL = useTenantPonderUrl();
  return useQuery<SeasonActiveOrder[]>({
    queryKey: ['seasonActiveOrders', seasonAddress?.toLowerCase(), PONDER_URL],
    enabled: !!seasonAddress,
    queryFn: () =>
      fetchAllPonderItems<SeasonActiveOrder>(
        PONDER_URL,
        QUERY,
        { season: seasonAddress!.toLowerCase() },
        (d) => d.orderss,
      ),
    refetchInterval: 3000,
    staleTime: 2000,
  });
}
