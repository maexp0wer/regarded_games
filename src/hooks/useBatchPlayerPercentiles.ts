// hooks/useBatchPlayerPercentiles.ts

'use client';

import { useMemo } from "react";
import { formatUnits } from "viem";
import { useSeasonPlayers } from './useSeasonPlayers';
import { useSeasonActiveOrders } from './useSeasonActiveOrders';

export interface PercentileData {
  factionPercentile: number;
  isCapitalist: boolean;
  totalInFaction: number;
  factionRank: number;
}

/**
 * Computes faction percentiles for a set of addresses off the shared season
 * primitives (players + active sell orders). Multiple call sites with different
 * address lists all reuse the same two cached fetches; only the per-address
 * derivation differs.
 */
export function useBatchPlayerPercentiles(
  seasonAddress: string | undefined,
  userAddresses: string[],
  exchangeAddress?: string
) {
  const { data: players, isFetched: playersFetched, isLoading: playersLoading } =
    useSeasonPlayers(seasonAddress);
  const { data: activeOrders, isFetched: ordersFetched, isLoading: ordersLoading } =
    useSeasonActiveOrders(seasonAddress);

  // Sort + dedupe addresses, keyed by value (not array identity) so the heavy
  // derivation memo below stays stable across renders when the address set is
  // unchanged — callers pass a fresh array literal every render.
  const addressesKey = [...new Set(userAddresses || [])].sort().join(',');
  const stableAddresses = useMemo(
    () => (addressesKey ? addressesKey.split(',') : []),
    [addressesKey]
  );

  const data = useMemo<Record<string, PercentileData>>(() => {
    if (!seasonAddress || !players || stableAddresses.length === 0) return {};
    if (players.length === 0) return {};

    const sellOrders = (activeOrders ?? []).filter((o) => !o.isBuy);

    // --- ISSUE 1 FIX: ADD LOCKED FIM BACK TO BALANCE + ACCOUNT FOR BURNED FIM ---
    const playerBalances = new Map<string, bigint>();

    for (const p of players) {
      const effectiveBalance = BigInt(p.fimBalance) + BigInt(p.fimBurned || "0");
      playerBalances.set(p.playerAddress.toLowerCase(), effectiveBalance);
    }

    // Refund the FIM locked in "Sell" orders to their effective balance
    for (const o of sellOrders) {
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
  }, [seasonAddress, players, activeOrders, stableAddresses, exchangeAddress]);

  const enabled = !!seasonAddress && stableAddresses.length > 0;
  const isFetched = !enabled ? false : playersFetched && ordersFetched;
  const isLoading = enabled && (playersLoading || ordersLoading);

  return { data, isFetched, isLoading };
}
