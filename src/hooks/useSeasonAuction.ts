'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAllPonderItems } from '@/lib/ponder';
import { AuctionMint, AuctionPoint, buildAuctionPoints } from '@/utils/chartData';
import { useTenantPonderUrl } from '@/context/TenantContext';

interface RawAuctionMint {
  usdcAmount: string;
  fimAmount: string;
  timestamp: string;
}

const QUERY = `
  query GetSeasonAuctionMints($season: String!, $after: String, $limit: Int!) {
    auctionMintss(
      where: { seasonAddress: $season }
      orderBy: "timestamp"
      orderDirection: "asc"
      after: $after
      limit: $limit
    ) {
      items { usdcAmount fimAmount timestamp }
      pageInfo { endCursor hasNextPage }
    }
  }
`;

// Season-creation timestamp, used to anchor the prize-pool line at 0 from
// deployment (single-item lookup, so a plain fetch rather than paginated).
const CREATED_AT_QUERY = `
  query GetSeasonCreatedAt($season: String!) {
    seasonss(where: { address: $season }) {
      items { createdAt }
    }
  }
`;

/**
 * Auction series for the season, bucketed into the chart's timeframe grid:
 * a cumulative prize-pool line (pane 0) and per-bucket FIM mint volume (pane 1).
 * Shares the same timeframe set as the price chart so the two read side by side.
 */
export function useSeasonAuction(
  seasonAddress: string | undefined,
  timeframe: string,
): { data: AuctionPoint[] } {
  const PONDER_URL = useTenantPonderUrl();
  return useQuery({
    queryKey: ['seasonAuction', seasonAddress?.toLowerCase(), timeframe, PONDER_URL],
    enabled: !!seasonAddress,
    queryFn: async () => {
      const season = seasonAddress!.toLowerCase();
      const [items, createdRes] = await Promise.all([
        fetchAllPonderItems<RawAuctionMint>(
          PONDER_URL,
          QUERY,
          { season },
          (d) => d.auctionMintss,
        ),
        fetch(PONDER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: CREATED_AT_QUERY, variables: { season } }),
        }).then((r) => r.json()),
      ]);
      const createdAtRaw = createdRes?.data?.seasonss?.items?.[0]?.createdAt;
      const seasonCreatedAt = createdAtRaw != null ? Number(BigInt(createdAtRaw)) : undefined;
      const mints: AuctionMint[] = items.map((m) => ({
        timestamp:  Number(BigInt(m.timestamp)),
        usdcAmount: Number(BigInt(m.usdcAmount)) / 1e6,
        fimAmount:  Number(BigInt(m.fimAmount)) / 1e18,
      }));
      return buildAuctionPoints(mints, timeframe, seasonCreatedAt);
    },
    refetchInterval: 5000,
    staleTime: 4000,
  }) as { data: AuctionPoint[] };
}
