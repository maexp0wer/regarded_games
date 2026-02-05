'use client';

import { useQuery } from "@tanstack/react-query";
import { useReadContract } from 'wagmi';
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';

export interface PercentileData {
  factionPercentile: number;
  isCapitalist: boolean;
  totalInFaction: number;
  factionRank: number;
}

export function useBatchPlayerPercentiles(
  seasonAddress: string, 
  userAddresses: string[]
) {
  // 1. Get Threshold
  const { data: massThresholdRaw } = useReadContract({
    address: seasonAddress as `0x${string}`,
    abi: GameSeasonAbi,
    functionName: 'massThresholdBalance', 
    query: { enabled: !!seasonAddress }
  });

  const massThresholdStr = massThresholdRaw ? massThresholdRaw.toString() : "0";
  
  // Sort addresses to ensure stable query key
  const stableAddresses = [...new Set(userAddresses)].sort();

  return useQuery<Record<string, PercentileData>>({
    queryKey: ["batchPlayerPercentiles", seasonAddress, stableAddresses.join(','), massThresholdStr],
    
    enabled: !!seasonAddress && stableAddresses.length > 0 && !!massThresholdRaw,
    
    queryFn: async () => {
      try {
        const response = await fetch("/api/player-percentile/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            seasonAddress, 
            userAddresses: stableAddresses, 
            massThreshold: massThresholdStr 
          }),
        });

        if (!response.ok) return {};
        return await response.json();
      } catch (e) {
        console.error("Batch Percentile Hook Error:", e);
        return {};
      }
    },
    // Refresh often enough to keep percentiles live during active trading
    refetchInterval: 15000, 
  });
}