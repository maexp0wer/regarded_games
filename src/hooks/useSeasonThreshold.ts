'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAllPonderItems } from '@/lib/ponder';
import { useTenantPonderUrl } from '@/context/TenantContext';

const PLAYERS_QUERY = `
  query GetPlayersForThreshold($season: String!, $after: String, $limit: Int!) {
    playerSeasonStatss(where: { seasonAddress: $season }, limit: $limit, after: $after) {
      items { playerAddress fimBalance fimBurned }
      pageInfo { endCursor hasNextPage }
    }
  }
`;

const ORDERS_QUERY = `
  query GetSellOrdersForThreshold($season: String!, $after: String, $limit: Int!) {
    orderss(where: { seasonAddress: $season, active: true, isBuy: false }, limit: $limit, after: $after) {
      items { maker remainingAmount }
      pageInfo { endCursor hasNextPage }
    }
  }
`;

export function useSeasonThreshold(seasonAddress: string | undefined) {
  const PONDER_URL = useTenantPonderUrl();
  return useQuery<bigint>({
    queryKey: ['seasonThreshold', seasonAddress?.toLowerCase(), PONDER_URL],
    enabled: !!seasonAddress,
    queryFn: async () => {
      const sAddr = seasonAddress!.toLowerCase();
      const [players, orders] = await Promise.all([
        fetchAllPonderItems<{ playerAddress: string; fimBalance: string; fimBurned: string }>(
          PONDER_URL, PLAYERS_QUERY, { season: sAddr }, (d) => d.playerSeasonStatss
        ),
        fetchAllPonderItems<{ maker: string; remainingAmount: string }>(
          PONDER_URL, ORDERS_QUERY, { season: sAddr }, (d) => d.orderss
        ),
      ]);

      const balances = new Map<string, bigint>();
      for (const p of players) {
        balances.set(p.playerAddress.toLowerCase(), BigInt(p.fimBalance) + BigInt(p.fimBurned || '0'));
      }
      for (const o of orders) {
        const maker = o.maker.toLowerCase();
        balances.set(maker, (balances.get(maker) || 0n) + BigInt(o.remainingAmount));
      }

      const sorted = Array.from(balances.values()).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      const totalSupply = sorted.reduce((s, v) => s + v, 0n);
      const half = totalSupply / 2n;

      let accumulated = 0n;
      let threshold = 0n;
      for (const bal of sorted) {
        accumulated += bal;
        if (accumulated <= half) threshold = bal;
        else break;
      }
      return threshold;
    },
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
}
