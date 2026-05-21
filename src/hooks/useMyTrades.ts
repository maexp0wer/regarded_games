'use client';

import { useQuery } from '@tanstack/react-query';
import { formatUnits } from 'viem';
import { fetchAllPonderItems } from '@/lib/ponder';

const PONDER_URL = 'http://127.0.0.1:42069/graphql';

export interface MyTrade {
  id: string;
  isBuy: boolean;
  fimAmount: number;
  usdcAmount: number;
  timestamp: number;
}

const BUYER_QUERY = `
  query GetMyBuyTrades($season: String!, $user: String!, $after: String, $limit: Int!) {
    tradess(
      where: { seasonAddress: $season, buyer: $user }
      orderBy: "timestamp"
      orderDirection: "desc"
      after: $after
      limit: $limit
    ) {
      items { id fimAmount usdcAmount timestamp }
      pageInfo { endCursor hasNextPage }
    }
  }
`;

const SELLER_QUERY = `
  query GetMySellTrades($season: String!, $user: String!, $after: String, $limit: Int!) {
    tradess(
      where: { seasonAddress: $season, seller: $user }
      orderBy: "timestamp"
      orderDirection: "desc"
      after: $after
      limit: $limit
    ) {
      items { id fimAmount usdcAmount timestamp }
      pageInfo { endCursor hasNextPage }
    }
  }
`;

function mapTrade(raw: any, isBuy: boolean): MyTrade {
  return {
    id: raw.id,
    isBuy,
    fimAmount: Number(formatUnits(BigInt(raw.fimAmount), 18)),
    usdcAmount: Number(formatUnits(BigInt(raw.usdcAmount), 6)),
    timestamp: Number(raw.timestamp),
  };
}

export function useMyTrades(
  seasonAddress: string | undefined,
  userAddress: string | undefined,
) {
  return useQuery({
    queryKey: ['myTrades', seasonAddress?.toLowerCase(), userAddress?.toLowerCase()],
    queryFn: async () => {
      const season = seasonAddress!.toLowerCase();
      const user = userAddress!.toLowerCase();
      const vars = { season, user };

      const [buyRaw, sellRaw] = await Promise.all([
        fetchAllPonderItems<any>(PONDER_URL, BUYER_QUERY, vars, (d) => d.tradess),
        fetchAllPonderItems<any>(PONDER_URL, SELLER_QUERY, vars, (d) => d.tradess),
      ]);

      return [
        ...buyRaw.map((t) => mapTrade(t, true)),
        ...sellRaw.map((t) => mapTrade(t, false)),
      ].sort((a, b) => b.timestamp - a.timestamp);
    },
    enabled: !!seasonAddress && !!userAddress,
    refetchInterval: 5000,
  });
}
