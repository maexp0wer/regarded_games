'use client';

import { useQuery } from "@tanstack/react-query";

const PONDER_URL = "http://127.0.0.1:42069/graphql";

export interface Order {
  id: string;
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

      // Combined Query: Orders + Player Stats (for balances)
      const query = `
        query GetOrderBookAndPlayers($season: String!) {
          orderss(
            where: { seasonAddress: $season, active: true },
            orderBy: "price",
            orderDirection: "asc",
            limit: 1000
          ) {
            items { 
              id, maker, isBuy, price, remainingAmount, active 
            }
          }
          playerSeasonStatss(where: { seasonAddress: $season }) {
            items {
              playerAddress
              fimBalance
            }
          }
        }
      `;

      try {
        const response = await fetch(PONDER_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            query, 
            variables: { season: addr } 
          }),
        });

        const res = await response.json();
        
        const orders = res.data?.orderss?.items || [];
        const players = res.data?.playerSeasonStatss?.items || [];

        // Create a quick lookup map for balances: address -> balance
        const balanceMap = new Map<string, number>();
        players.forEach((p: any) => {
            const bal = Number(BigInt(p.fimBalance)) / 1e18;
            balanceMap.set(p.playerAddress.toLowerCase(), bal);
        });

        const format = (o: any): Order => ({
          id: o.id,
          maker: o.maker,
          isBuy: o.isBuy,
          price: Number(BigInt(o.price)) / 1_000_000, 
          amount: Number(BigInt(o.remainingAmount)) / 1e18,
          rawPrice: BigInt(o.price),
          rawAmount: BigInt(o.remainingAmount),
          // Lookup balance, default to 0
          makerBalance: balanceMap.get(o.maker.toLowerCase()) || 0 
        });

        const bids = orders.filter((o: any) => o.isBuy).map(format).sort((a: any, b: any) => b.price - a.price);
        const asks = orders.filter((o: any) => !o.isBuy).map(format).sort((a: any, b: any) => a.price - b.price);

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