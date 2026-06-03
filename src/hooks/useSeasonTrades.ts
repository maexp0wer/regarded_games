'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAllPonderItems } from '@/lib/ponder';
import { useTenantPonderUrl } from '@/context/TenantContext';

export interface SeasonTrade {
  id: string;
  buyer: string;
  seller: string;
  fimAmount: string;
  usdcAmount: string;
  timestamp: string;
  txHash: string;
  buyerBalance: string;
  sellerBalance: string;
  buyerPercentile: number;
  sellerPercentile: number;
  buyerIsCapitalist: boolean;
  sellerIsCapitalist: boolean;
  giniBps: number;
}

const QUERY = `
  query GetSeasonTrades($season: String!, $after: String, $limit: Int!) {
    tradess(
      where: { seasonAddress: $season }
      orderBy: "timestamp"
      orderDirection: "asc"
      after: $after
      limit: $limit
    ) {
      items {
        id buyer seller fimAmount usdcAmount timestamp txHash
        buyerBalance sellerBalance
        buyerPercentile sellerPercentile buyerIsCapitalist sellerIsCapitalist
        giniBps
      }
      pageInfo { endCursor hasNextPage }
    }
  }
`;

export function useSeasonTrades(seasonAddress: string | undefined) {
  const PONDER_URL = useTenantPonderUrl();
  return useQuery<SeasonTrade[]>({
    queryKey: ['seasonTrades', seasonAddress?.toLowerCase(), PONDER_URL],
    enabled: !!seasonAddress,
    queryFn: async () => {
      const items = await fetchAllPonderItems<SeasonTrade>(
        PONDER_URL,
        QUERY,
        { season: seasonAddress!.toLowerCase() },
        (d) => d.tradess
      );
      return items;
    },
    refetchInterval: 5000,
    staleTime: 4000,
  });
}
