// hooks/useFactionPercentile.ts (New file or modify existing)

'use client';

import { useQuery } from "@tanstack/react-query";
import { useReadContract } from 'wagmi';
import { formatUnits } from "viem";
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';

const PONDER_URL = "http://127.0.0.1:42069/graphql";

export interface FactionData {
  factionPercentile: number; // 0% (edge) to 100% (equilibrium center)
  isCapitalist: boolean;
  totalInFaction: number;
  factionRank: number;
}

export function useFactionPercentile(seasonAddress: string | undefined, userAddress: string | undefined) {
  const { data: massThresholdRaw } = useReadContract({
    address: seasonAddress as `0x${string}`,
    abi: GameSeasonAbi,
    functionName: 'massThresholdBalance', 
    query: { enabled: !!seasonAddress }
  });
  
  const massThreshold = massThresholdRaw ? Number(formatUnits(massThresholdRaw as bigint, 18)) : 0;
  
  return useQuery<FactionData | null>({
    queryKey: ["playerFactionStanding", seasonAddress, userAddress, massThreshold],
    queryFn: async () => {
      if (!userAddress || !seasonAddress) return null;

      const sAddr = seasonAddress.toLowerCase();
      const uAddr = userAddress.toLowerCase();

      // IMPORTANT: Using plural 'playerSeasonStatss' because of composite primary key
      const query = `
        query GetStanding($season: String!, $player: String!) {
          userStats: playerSeasonStatss(
            where: { seasonAddress: $season, playerAddress: $player }
          ) {
            items { fimBalance }
          }
          allPlayers: playerSeasonStatss(
            where: { seasonAddress: $season },
            orderBy: "fimBalance",
            orderDirection: "asc",
            limit: 1000
          ) {
            items { playerAddress, fimBalance }
          }
        }
      `;

      try {
        const response = await fetch(PONDER_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, variables: { season: sAddr, player: uAddr } }),
        });

        const result = await response.json();
        const userItem = result?.data?.userStats?.items?.[0];
        const allItems = result?.data?.allPlayers?.items || [];

        if (!userItem || allItems.length === 0) return null;

        const userBalance = Number(formatUnits(BigInt(userItem.fimBalance), 18));
        const isCapitalist = userBalance > massThreshold;

        // Group into faction
        const factionMembers = allItems
            .map((p: any) => ({
                address: p.playerAddress.toLowerCase(),
                balance: Number(formatUnits(BigInt(p.fimBalance), 18))
            }))
            .filter((p: any) => isCapitalist ? p.balance > massThreshold : p.balance <= massThreshold);

        const indexInFaction = factionMembers.findIndex((p: any) => p.address === uAddr);
        const safeIndex = indexInFaction === -1 ? 0 : indexInFaction;

        let factionPercentileValue: number;

        if (factionMembers.length === 1) {
            // If the player is the only member, set percentile to 100%
            factionPercentileValue = 100;
        } else {
            // 0% = Poorest in Faction, 100% = Richest in Faction
            factionPercentileValue = (safeIndex / (factionMembers.length - 1)) * 100;
        }

        return {
          factionPercentile: factionPercentileValue,
          isCapitalist,
          totalInFaction: factionMembers.length,
          factionRank: factionMembers.length - safeIndex
        };
      } catch (e) {
        console.error("Faction Hook Error:", e);
        return null;
      }
    },
    enabled: !!seasonAddress && !!userAddress, 
    refetchInterval: 10000, 
  });
}