// hooks/useFactionPercentile.ts

'use client';

import { useMemo } from "react";
import { formatUnits } from "viem";
import { useSeasonPlayers } from './useSeasonPlayers';
import { useSeasonActiveOrders } from './useSeasonActiveOrders';

export interface FactionData {
  factionPercentile: number;
  isCapitalist: boolean;
  totalInFaction: number;
  factionRank: number;
}

/**
 * Single-player faction standing, derived from the shared season primitives.
 * Effective balance is fimBalance + fimBurned (+ FIM locked in active sell
 * orders), matching useBatchPlayerPercentiles so faction standing is consistent
 * across the app.
 */
export function useFactionPercentile(seasonAddress: string | undefined, userAddress: string | undefined) {
  const { data: players, isLoading: playersLoading } = useSeasonPlayers(seasonAddress);
  const { data: activeOrders, isLoading: ordersLoading } = useSeasonActiveOrders(seasonAddress);

  const data = useMemo<FactionData | null>(() => {
    if (!userAddress || !seasonAddress || !players || players.length === 0) return null;

    const uAddr = userAddress.toLowerCase();
    const sellOrders = (activeOrders ?? []).filter((o) => !o.isBuy);

    // --- 1. CALCULATE EFFECTIVE BALANCES (Balance + Burned + Locked in Orders) ---
    const playerBalances = new Map<string, bigint>();

    for (const p of players) {
      const effectiveBalance = BigInt(p.fimBalance) + BigInt(p.fimBurned || "0");
      playerBalances.set(p.playerAddress.toLowerCase(), effectiveBalance);
    }

    for (const o of sellOrders) {
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
  }, [seasonAddress, userAddress, players, activeOrders]);

  const isLoading = !!seasonAddress && !!userAddress && (playersLoading || ordersLoading);

  return { data, isLoading };
}
