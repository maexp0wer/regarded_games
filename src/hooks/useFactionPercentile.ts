// hooks/useFactionPercentile.ts

'use client';

import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { fetchAllPonderItems } from '@/lib/ponder';
import { useTenantPonderUrl } from '@/context/TenantContext';

export interface FactionData {
  factionPercentile: number;
  isCapitalist: boolean;
  totalInFaction: number;
  factionRank: number;
}

export function useFactionPercentile(seasonAddress: string | undefined, userAddress: string | undefined) {
  const PONDER_URL = useTenantPonderUrl();

  return useQuery<FactionData | null>({
    // Cleaned up queryKey: No longer depends on the stale contract threshold
    queryKey: ["playerFactionStanding", seasonAddress, userAddress, PONDER_URL],
    
    // Starts fetching immediately once we have the addresses
    enabled: !!seasonAddress && !!userAddress,
    
    queryFn: async () => {
      if (!userAddress || !seasonAddress) return null;

      const sAddr = seasonAddress.toLowerCase();
      const uAddr = userAddress.toLowerCase();

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

      const ordersQuery = `
        query GetOrders($season: String!, $after: String, $limit: Int!) {
          orderss(
            where: { seasonAddress: $season, active: true, isBuy: false },
            limit: $limit,
            after: $after
          ) {
            items { maker, remainingAmount }
            pageInfo { endCursor, hasNextPage }
          }
        }
      `;

      try {
        const [playersData, openOrdersData] = await Promise.all([
          fetchAllPonderItems<{ playerAddress: string; fimBalance: string }>(
            PONDER_URL, playersQuery, { season: sAddr }, (d) => d.playerSeasonStatss
          ),
          fetchAllPonderItems<{ maker: string; remainingAmount: string }>(
            PONDER_URL, ordersQuery, { season: sAddr }, (d) => d.orderss
          ),
        ]);

        if (playersData.length === 0) return null;

        // --- 1. CALCULATE EFFECTIVE BALANCES (Raw Balance + Locked in Orders) ---
        const playerBalances = new Map<string, bigint>();

        for (const p of playersData) {
          playerBalances.set(p.playerAddress.toLowerCase(), BigInt(p.fimBalance));
        }

        for (const o of openOrdersData) {
          const maker = o.maker.toLowerCase();
          const lockedFim = BigInt(o.remainingAmount);
          const currentBal = playerBalances.get(maker) || 0n;
          playerBalances.set(maker, currentBal + lockedFim);
        }

        const economy = Array.from(playerBalances.entries()).map(([address, bal]) => ({
          address,
          balanceRaw: bal,
          balanceNum: Number(formatUnits(bal, 18))
        }));

        // --- 2. CALCULATE LIVE MASS THRESHOLD OFF-CHAIN ---
        economy.sort((a, b) => (a.balanceRaw < b.balanceRaw ? -1 : a.balanceRaw > b.balanceRaw ? 1 : 0));

        const totalSupply = economy.reduce((sum, p) => sum + p.balanceRaw, 0n);
        const halfSupply = totalSupply / 2n;

        let accumulatedSupply = 0n;
        let liveMassThresholdRaw = 0n;

        for (const p of economy) {
          accumulatedSupply += p.balanceRaw;
          if (accumulatedSupply <= halfSupply) {
            liveMassThresholdRaw = p.balanceRaw;
          } else {
            break;
          }
        }

        const liveThresholdNum = Number(formatUnits(liveMassThresholdRaw, 18));

        // --- 3. DETERMINE USER STATE & FACTIONS ---
        const user = economy.find(p => p.address === uAddr);
        const userBalanceNum = user ? user.balanceNum : 0;
        
        const isCapitalist = userBalanceNum > liveThresholdNum; 

        const capitalists = economy.filter(p => p.balanceNum > liveThresholdNum);
        const socialists = economy.filter(p => p.balanceNum <= liveThresholdNum);

        capitalists.sort((a, b) => b.balanceNum - a.balanceNum);
        socialists.sort((a, b) => b.balanceNum - a.balanceNum);

        const maxCapBalance = capitalists.length > 0 ? capitalists[0].balanceNum : liveThresholdNum;
        const minSocBalance = socialists.length > 0 ? socialists[socialists.length - 1].balanceNum : 0;

        // --- 4. CALCULATE DISTANCE-BASED PERCENTILES ---
        let percentile = 0;

        if (isCapitalist) {
          const range = maxCapBalance - liveThresholdNum;
          percentile = range > 0 ? ((userBalanceNum - liveThresholdNum) / range) * 100 : 100;
        } else {
          const range = liveThresholdNum - minSocBalance;
          percentile = range > 0 ? ((liveThresholdNum - userBalanceNum) / range) * 100 : 100;
        }

        percentile = Math.max(0, Math.min(100, percentile));

        const factionMembers = isCapitalist ? capitalists : socialists;
        const rankIndex = factionMembers.findIndex(p => p.address === uAddr);

        return {
          factionPercentile: percentile,
          isCapitalist,
          totalInFaction: factionMembers.length,
          factionRank: rankIndex === -1 ? 0 : rankIndex + 1
        };

      } catch (e) {
        console.error("Faction Hook Error:", e);
        return null;
      }
    },
    refetchInterval: 5000, 
  });
}