'use client';

import { useQuery } from "@tanstack/react-query";

// Force IPv4 to avoid Windows localhost issues
const PONDER_URL = "http://127.0.0.1:42069/graphql";

export function usePlayerPercentile(seasonAddress: string, userAddress: string | undefined) {
  return useQuery({
    queryKey: ["playerPercentile", seasonAddress, userAddress],
    queryFn: async () => {
      if (!userAddress || !seasonAddress) return null;

      // Ensure inputs are lowercase
      const sAddr = seasonAddress.toLowerCase();
      const uAddr = userAddress.toLowerCase();

      // Query: Fetch ALL players for this season, sorted by balance
      // Note: 'playerSeasonStatss' is the plural in Ponder 0.16
      const query = `
        query GetRankings($season: String!) {
          playerSeasonStatss(
            where: { seasonAddress: $season },
            orderBy: "fimBalance",
            orderDirection: "asc",
            limit: 1000 
          ) {
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
            variables: { season: sAddr } 
          }),
        });

        const result = await response.json();
        
        // Log errors if Ponder returns them
        if (result.errors) {
            console.error("[Ponder] Percentile Query Error:", result.errors);
            return null;
        }

        const players = result?.data?.playerSeasonStatss?.items || [];

        if (players.length === 0) return null;

        // Find the user in the list
        // index 0 = lowest balance (Poorest)
        // index N = highest balance (Richest)
        const index = players.findIndex((p: any) => p.playerAddress === uAddr);

        if (index === -1) {
            // User not found in list (maybe 0 balance or filtered out)
            return null; 
        }

        // Calculate Percentile (0 to 100)
        // (index + 1) / total
        const percentile = ((index + 1) / players.length) * 100;

        return {
          percentile,
          rank: players.length - index, // 1 = Richest
          totalPlayers: players.length
        };

      } catch (e) {
        console.error("Percentile Hook Failed:", e);
        return null;
      }
    },
    enabled: !!seasonAddress && !!userAddress,
    refetchInterval: 10000, // Not super time sensitive, 10s is fine
  });
}