'use client';

import { useQuery } from "@tanstack/react-query";
import { fetchAllPonderItems } from '@/lib/ponder';

const PONDER_URL = process.env.NEXT_PUBLIC_PONDER_URL || "http://127.0.0.1:42069/graphql";

export interface Order {
  id: string;
  orderId: bigint;
  seasonAddress: string;
  maker: string;
  isBuy: boolean;
  price: number;
  amount: number;
  rawPrice: bigint;
  rawAmount: bigint;
  makerBalance: number; // <--- NEW FIELD
}

export function useOrderBook(seasonAddress: string | undefined) {
  return useQuery({
    queryKey: ["orderBook", seasonAddress?.toLowerCase()],
    queryFn: async () => {
      if (!seasonAddress) return { bids: [], asks: [] };

      const addr = seasonAddress.toLowerCase();

      const ordersQuery = `
        query GetOrders($season: String!, $after: String, $limit: Int!) {
          orderss(
            where: { seasonAddress: $season, active: true },
            orderBy: "price",
            orderDirection: "asc",
            limit: $limit,
            after: $after
          ) {
            items { id, maker, isBuy, price, remainingAmount, active, orderId, seasonAddress }
            pageInfo { endCursor, hasNextPage }
          }
        }
      `;

      const playersQuery = `
        query GetPlayers($season: String!, $after: String, $limit: Int!) {
          playerSeasonStatss(
            where: { seasonAddress: $season },
            limit: $limit,
            after: $after
          ) {
            items { playerAddress, fimBalance }
            pageInfo { endCursor, hasNextPage }
          }
        }
      `;

      try {
        const [orders, players] = await Promise.all([
          fetchAllPonderItems<{ id: string; maker: string; isBuy: boolean; price: string; remainingAmount: string; active: boolean; orderId: string; seasonAddress: string }>(
            PONDER_URL, ordersQuery, { season: addr }, (d) => d.orderss
          ),
          fetchAllPonderItems<{ playerAddress: string; fimBalance: string }>(
            PONDER_URL, playersQuery, { season: addr }, (d) => d.playerSeasonStatss
          ),
        ]);

        // Create a quick lookup map for balances: address -> balance
        const balanceMap = new Map<string, number>();
        players.forEach((p) => {
            const bal = Number(BigInt(p.fimBalance)) / 1e18;
            balanceMap.set(p.playerAddress.toLowerCase(), bal);
        });

        const format = (o: typeof orders[number]): Order => ({
          id: o.id,
          orderId: BigInt(o.orderId),
          seasonAddress: o.seasonAddress,
          maker: o.maker,
          isBuy: o.isBuy,
          price: Number(BigInt(o.price)) / 1_000_000, 
          amount: Number(BigInt(o.remainingAmount)) / 1e18,
          rawPrice: BigInt(o.price),
          rawAmount: BigInt(o.remainingAmount),
          // Lookup balance, default to 0
          makerBalance: balanceMap.get(o.maker.toLowerCase()) || 0 
        });

        const bids = orders.filter((o) => o.isBuy).map(format).sort((a, b) => b.price - a.price);
        const asks = orders.filter((o) => !o.isBuy).map(format).sort((a, b) => a.price - b.price);

        return { bids, asks };
      } catch (e) {
        console.error("OrderBook fetch failed", e);
        return { bids: [], asks: [] };
      }
    },
    enabled: !!seasonAddress,
    refetchInterval: 3000,
  });
}