'use client';

import { useQuery } from "@tanstack/react-query";
import { calculateGini } from "@/lib/gini";

const PONDER_URL = "http://127.0.0.1:42069/graphql";

// Define the type so the component recognizes 'prizePool'
export interface SeasonLiveStats {
  gini: number;
  playerCount: number;
  prizePool: number;
}

export function useSeasonGini(seasonAddress: string | undefined) {
  return useQuery<SeasonLiveStats | null>({
    queryKey: ["seasonGini", seasonAddress?.toLowerCase()],
    queryFn: async () => {
      if (!seasonAddress) return null;

      const addr = seasonAddress.toLowerCase();

      // We fetch both players and the season prize pool in one go.
      // Note: 'seasonss' is the plural of the 'seasons' table in Ponder 0.16
      const query = `
        query GetSeasonLiveStats($address: String!) {
          playerSeasonStatss(
            where: { seasonAddress: $address },
            orderBy: "fimBalance",
            orderDirection: "asc"
          ) {
            items {
              fimBalance
            }
          }
          seasonss(where: { address: $address }) {
            items {
              prizePool
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
            variables: { address: addr } 
          }),
        });

        const result = await response.json();
        
        // Use the same extraction logic from your working code
        const playerItems = result?.data?.playerSeasonStatss?.items || [];
        const seasonItems = result?.data?.seasonss?.items || [];
        
        // Extract prize pool from the first item in the seasonss list
        const rawPool = BigInt(seasonItems[0]?.prizePool || "0");
        const prizePoolFormatted = Number(rawPool) / 1_000_000;

        return {
          gini: calculateGini(playerItems),
          playerCount: playerItems.length,
          prizePool: prizePoolFormatted
        };
      } catch (error) {
        console.error("[PONDER ERROR] Fetch failed:", error);
        return { gini: 0, playerCount: 0, prizePool: 0 };
      }
    },
    enabled: !!seasonAddress,
    refetchInterval: 5000,
  });
}

export function useSeasonById(id: string | undefined) {
  return useQuery({
    queryKey: ["seasonById", id],
    queryFn: async () => {
      if (!id) return null;

      // 1. Get the number from the slug (e.g., "season_1" -> "1")
      const slugNumber = id.replace("season_", "");
      
      // 2. Convert to Database ID (Human 1 = DB 0)
      const dbId = (BigInt(slugNumber) - 1n).toString();
      
      const query = `
        query GetSeasonByNumber($id: BigInt!) {
          seasonss(where: { seasonId: $id }) {
            items {
              address
              fimAddress
              exchangeAddress
            }
          }
        }
      `;

      const response = await fetch(PONDER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query, 
          variables: { id: dbId } 
        }),
      });

      const result = await response.json();
      return result?.data?.seasonss?.items[0] || null;
    },
    enabled: !!id,
  });
}