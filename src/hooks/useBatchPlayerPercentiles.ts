// hooks/useBatchPlayerPercentiles.ts

'use client';

import { useQuery } from "@tanstack/react-query";
import { useReadContract } from 'wagmi';
import { formatUnits } from "viem";
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';
import { fetchAllPonderItems } from '@/lib/ponder';
import { useTenantPonderUrl, useTenantChainId } from '@/context/TenantContext';

export interface PercentileData {
  factionPercentile: number;
  isCapitalist: boolean;
  totalInFaction: number;
  factionRank: number;
}

export function useBatchPlayerPercentiles(
  seasonAddress: string | undefined,
  userAddresses: string[],
  exchangeAddress?: string
) {
  const PONDER_URL = useTenantPonderUrl();
  const chainId = useTenantChainId();

  // 1. Get Threshold from Contract
  // (We keep this to preserve exact hook timing and enabled states for dependent components!)
  const { data: massThresholdRaw } = useReadContract({
    address: seasonAddress as `0x${string}`,
    abi: GameSeasonAbi,
    functionName: 'massThresholdBalance',
    chainId,
    query: { enabled: !!seasonAddress }
  });

  const massThresholdStr = massThresholdRaw ? massThresholdRaw.toString() : "0";

  // Sort addresses to ensure stable query key
  const safeAddresses = userAddresses || [];
  const stableAddresses = [...new Set(safeAddresses)].sort();

  return useQuery<Record<string, PercentileData>>({
    queryKey:["batchPlayerPercentiles", seasonAddress, stableAddresses.join(','), massThresholdStr, PONDER_URL],
    
    // Exact original dependencies preserved to prevent UI breakage
    enabled: !!seasonAddress && stableAddresses.length > 0,
    
    queryFn: async () => {
      if (!seasonAddress || stableAddresses.length === 0) return {};

      const sAddr = seasonAddress.toLowerCase();

      const playersQuery = `
        query GetPlayers($season: String!, $after: String, $limit: Int!) {
          playerSeasonStatss(
            where: { seasonAddress: $season },
            limit: $limit,
            after: $after
          ) {
            items { playerAddress, fimBalance, fimBurned }
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

        if (playersData.length === 0) return {};

        // --- ISSUE 1 FIX: ADD LOCKED FIM BACK TO BALANCE + ACCOUNT FOR BURNED FIM ---
        const playerBalances = new Map<string, bigint>();

        for (const p of playersData) {
          const effectiveBalance = BigInt(p.fimBalance) + BigInt(p.fimBurned || "0");
          playerBalances.set(p.playerAddress.toLowerCase(), effectiveBalance);
        }

        // Refund the FIM locked in "Sell" orders to their effective balance
        for (const o of openOrdersData) {
          const maker = o.maker.toLowerCase();
          const lockedFim = BigInt(o.remainingAmount);
          const currentBal = playerBalances.get(maker) || 0n;
          playerBalances.set(maker, currentBal + lockedFim);
        }

        // The Exchange contract accumulates FIM from sell-order locks and appears
        // in playerSeasonStats as a phantom player. Its balance equals exactly the
        // locked FIM we already added back to makers above — remove it to avoid
        // double-counting in the economy / faction threshold calculation.
        if (exchangeAddress) {
          playerBalances.delete(exchangeAddress.toLowerCase());
        }

        const economy = Array.from(playerBalances.entries()).map(([address, bal]) => ({
          address,
          balanceRaw: bal,
          balanceNum: Number(formatUnits(bal, 18))
        }));

        // --- ISSUE 3 FIX: CALCULATE LIVE 50% MASS THRESHOLD OFF-CHAIN ---
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

        // --- PREPARE FACTIONS & BOUNDARIES ---
        const capitalists = economy.filter(p => p.balanceNum > liveThresholdNum);
        const socialists = economy.filter(p => p.balanceNum <= liveThresholdNum);

        capitalists.sort((a, b) => b.balanceNum - a.balanceNum);
        socialists.sort((a, b) => b.balanceNum - a.balanceNum);

        // Find the absolute Richest Capitalist and Poorest Socialist for the scale
        const maxCapBalance = capitalists.length > 0 ? capitalists[0].balanceNum : liveThresholdNum;
        const minSocBalance = socialists.length > 0 ? socialists[socialists.length - 1].balanceNum : 0;

        const resultsMap: Record<string, PercentileData> = {};

        // --- ISSUE 2 FIX: CALCULATE DISTANCE-BASED PERCENTILES ---
        for (const addr of stableAddresses) {
          const uAddr = addr.toLowerCase();
          const user = economy.find(p => p.address === uAddr);
          const userBalanceNum = user ? user.balanceNum : 0;

          if (userBalanceNum === 0) {
            continue; 
          }
          
          const isCapitalist = userBalanceNum > liveThresholdNum;
          let percentile = 0;

          if (isCapitalist) {
            // Capitalist Distance: 0% (At Threshold) to 100% (Richest Player)
            const range = maxCapBalance - liveThresholdNum;
            percentile = range > 0 ? ((userBalanceNum - liveThresholdNum) / range) * 100 : 100;
          } else {
            // Socialist Distance: 0% (At Threshold) to 100% (Poorest Player)
            const range = liveThresholdNum - minSocBalance;
            percentile = range > 0 ? ((liveThresholdNum - userBalanceNum) / range) * 100 : 100;
          }

          // Cap strictly between 0 and 100
          percentile = Math.max(0, Math.min(100, percentile));

          const factionMembers = isCapitalist ? capitalists : socialists;
          const rankIndex = factionMembers.findIndex(p => p.address === uAddr);

          const data: PercentileData = {
            factionPercentile: percentile,
            isCapitalist,
            totalInFaction: factionMembers.length,
            factionRank: rankIndex === -1 ? 0 : rankIndex + 1,
          };

          // Save identically for both casing formats to prevent undefined lookup crashes in UI
          resultsMap[addr] = data;
          resultsMap[uAddr] = data;
        }

        return resultsMap;

      } catch (e) {
        console.error("Batch Percentile Hook Error:", e);
        return {};
      }
    },
    refetchInterval: 15000, 
  });
}