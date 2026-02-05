'use client';

import { useQuery } from "@tanstack/react-query";
import { useReadContract } from 'wagmi';
// import { formatUnits } from "viem"; // Removed, we pass raw BigInts to API to be precise

import GameSeasonAbi from '@/deployments/abis/GameSeason.json';

export interface PercentileData {
  factionPercentile: number;
  isCapitalist: boolean;
  totalInFaction: number;
  factionRank: number;
}

export function usePlayerPercentile(seasonAddress: string | undefined, userAddress: string | undefined) {
  
  // 1. Get the Threshold from the Contract
  const { data: massThresholdRaw } = useReadContract({
    address: seasonAddress as `0x${string}`,
    abi: GameSeasonAbi,
    functionName: 'massThresholdBalance', 
    query: { enabled: !!seasonAddress }
  });
  
  // We keep the threshold as a string to preserve BigInt precision when sending to API
  const massThresholdStr = massThresholdRaw ? massThresholdRaw.toString() : "0";

  return useQuery<PercentileData | null>({
    queryKey: ["playerFactionStanding", seasonAddress, userAddress, massThresholdStr],
    
    // Only fetch if we have all necessary data
    enabled: !!seasonAddress && !!userAddress && !!massThresholdRaw,
    
    queryFn: async () => {
      if (!userAddress || !seasonAddress) return null;

      try {
        const response = await fetch("/api/player-percentile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            seasonAddress, 
            userAddress, 
            massThreshold: massThresholdStr 
          }),
        });

        if (!response.ok) return null;
        
        const data = await response.json();
        if (!data) return null;

        return data as PercentileData;
      } catch (e) {
        console.error("Percentile Hook Error:", e);
        return null;
      }
    },
    refetchInterval: 10000, 
  });
}