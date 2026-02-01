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
  buyerBalance: number;  // <--- Added
  sellerBalance: number; // <--- Added
}

export function useRecentTrades(seasonAddress: string | undefined) {
  return useQuery({
    queryKey: ["recentTrades", seasonAddress?.toLowerCase()],
    queryFn: async () => {
      if (!seasonAddress) return [];

      const seasonAddr = seasonAddress.toLowerCase();

      // --- STEP 1: Fetch Recent Trades ---
      const tradesQuery = `
        query GetRecentTrades($season: String!) {
          tradess(
            where: { seasonAddress: $season },
            orderBy: "timestamp",
            orderDirection: "desc",
            limit: 5
          ) {
            items {
              id
              fimAmount
              usdcAmount
              timestamp
              txHash
              buyer
              seller
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

      if (rawTrades.length === 0) return [];

      // --- STEP 2: Collect Unique Addresses ---
      const addresses = new Set<string>();
      rawTrades.forEach((t: any) => {
        addresses.add(t.buyer);
        addresses.add(t.seller);
      });

      // --- STEP 3: Fetch Balances for these addresses ---
      // We use the '_in' filter to get multiple players at once
      const balancesQuery = `
        query GetBalances($season: String!, $addrList: [String!]!) {
          playerSeasonStatss(
            where: { 
              seasonAddress: $season, 
              playerAddress_in: $addrList 
            }
          ) {
            items {
              playerAddress
              fimBalance
            }
          }
        }
      `;

      const balancesResponse = await fetch(PONDER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query: balancesQuery, 
          variables: { 
            season: seasonAddr, 
            addrList: Array.from(addresses) 
          } 
        }),
      });

      const balancesResult = await balancesResponse.json();
      const stats = balancesResult?.data?.playerSeasonStatss?.items || [];

      // Create a Map for O(1) lookup
      const balanceMap = new Map<string, number>();
      stats.forEach((s: any) => {
        // Balance in FIM (18 decimals)
        const bal = Number(formatUnits(BigInt(s.fimBalance), 18));
        balanceMap.set(s.playerAddress.toLowerCase(), bal);
      });

      // --- STEP 4: Merge Data ---
      return rawTrades.map((t: any) => {
        const fim = Number(formatUnits(BigInt(t.fimAmount), 18));
        const usdc = Number(formatUnits(BigInt(t.usdcAmount), 6));
        const price = fim > 0 ? usdc / fim : 0;

        return {
          id: t.id,
          price: price,
          amount: fim,
          timestamp: Number(t.timestamp),
          txHash: t.txHash,
          buyer: t.buyer,
          seller: t.seller,
          // Attach balances (default to 0 if not found)
          buyerBalance: balanceMap.get(t.buyer.toLowerCase()) || 0,
          sellerBalance: balanceMap.get(t.seller.toLowerCase()) || 0,
        };
      }) as Trade[];
    },
    enabled: !!seasonAddress,
    refetchInterval: 3000,
  });
}