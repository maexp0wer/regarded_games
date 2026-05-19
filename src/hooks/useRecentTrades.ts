'use client';

import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";

// Use 127.0.0.1 to avoid Windows localhost issues
const PONDER_URL = "http://127.0.0.1:42069/graphql";

export interface Trade {
  id: string;
  price: number;
  amount: number;
  timestamp: number;
  txHash: string;
  buyer: string;
  seller: string;
  buyerBalance: string;
  sellerBalance: string;
  buyerPercentile: number;
  sellerPercentile: number;
  buyerIsCapitalist: boolean;
  sellerIsCapitalist: boolean;
}

export function useRecentTrades(seasonAddress: string | undefined) {
  return useQuery({
    queryKey: ["recentTrades", seasonAddress?.toLowerCase()],
    queryFn: async () => {
      if (!seasonAddress) return [];

      const seasonAddr = seasonAddress.toLowerCase();

      const tradesQuery = `
        query GetRecentTrades($season: String!) {
          tradess(
            where: { seasonAddress: $season },
            orderBy: "timestamp",
            orderDirection: "desc",
            limit: 50
          ) {
            items {
              id
              fimAmount
              usdcAmount
              timestamp
              txHash
              buyer
              seller
              buyerBalance
              sellerBalance
              buyerPercentile
              sellerPercentile
              buyerIsCapitalist
              sellerIsCapitalist
            }
          }
        }
      `;

      const tradesResponse = await fetch(PONDER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: tradesQuery, variables: { season: seasonAddr } }),
      });

      const tradesResult = await tradesResponse.json();
      const rawTrades = tradesResult?.data?.tradess?.items || [];

      return rawTrades.map((t: any) => {
        const fim = Number(formatUnits(BigInt(t.fimAmount), 18));
        const usdc = Number(formatUnits(BigInt(t.usdcAmount), 6));
        const price = fim > 0 ? usdc / fim : 0;

        return {
          id: t.id,
          price,
          amount: fim,
          timestamp: Number(t.timestamp),
          txHash: t.txHash,
          buyer: t.buyer,
          seller: t.seller,
          buyerBalance: t.buyerBalance ?? '0',
          sellerBalance: t.sellerBalance ?? '0',
          buyerPercentile: t.buyerPercentile ?? 50,
          sellerPercentile: t.sellerPercentile ?? 50,
          buyerIsCapitalist: t.buyerIsCapitalist ?? false,
          sellerIsCapitalist: t.sellerIsCapitalist ?? false,
        };
      }) as Trade[];
    },
    enabled: !!seasonAddress,
    refetchInterval: 3000,
  });
}