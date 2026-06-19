// hooks/useBatchPlayerClass.ts

'use client';

import { useMemo } from "react";
import { formatUnits } from "viem";
import type { Abi } from "viem";
import { useReadContract } from 'wagmi';
import GameSeasonAbiJson from '@/deployments/abis/GameSeason.json';
import { useTenantChainId } from '@/context/TenantContext';
import { useSeasonPlayers } from './useSeasonPlayers';
import { useSeasonActiveOrders } from './useSeasonActiveOrders';

const GameSeasonAbi = GameSeasonAbiJson as Abi;

export interface PlayerClassData {
  classPercentile: number;
  isCapitalist: boolean;
  totalInClass: number;
  classRank: number;
}

/**
 * Computes each player's class (Capitalist/Oligarchy vs Socialist/Masses) off the
 * shared season primitives (players + active sell orders). The class boundary is the
 * live supply-share Masses/Oligarchy cut — the largest set of poorest holders whose
 * balances sum to ≤50% of total FIM *supply* (NOT a population percentile). Multiple
 * call sites with different address lists all reuse the same two cached fetches; only
 * the per-address derivation differs.
 */
export function useBatchPlayerClass(
  seasonAddress: string | undefined,
  userAddresses: string[],
  exchangeAddress?: string
) {
  const chainId = useTenantChainId();
  const { data: existentialThresholdRaw } = useReadContract({
    address: seasonAddress as `0x${string}`,
    abi: GameSeasonAbi,
    functionName: 'existentialThresholdFim',
    chainId,
    query: { enabled: !!seasonAddress },
  });
  const existentialThreshold = existentialThresholdRaw
    ? BigInt(existentialThresholdRaw.toString())
    : 0n;

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

  const data = useMemo<Record<string, PlayerClassData>>(() => {
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
    // double-counting in the economy / class boundary calculation.
    if (exchangeAddress) {
      playerBalances.delete(exchangeAddress.toLowerCase());
    }

    // Drop sub-threshold (dust) holders before ranking — mirrors gini.ts and the
    // contract's `bal >= existentialThresholdFim`. The eligible population alone
    // defines the supply-share Masses/Oligarchy cut and class membership; a dust
    // wallet can never consume a rank index or get a percentile. Raw-wei compare;
    // never float-convert before filtering. Threshold 0n still drops empty wallets.
    const economy = Array.from(playerBalances.entries())
      .filter(([, bal]) => bal >= existentialThreshold && bal > 0n)
      .map(([address, bal]) => ({
        address,
        balanceRaw: bal,
        balanceNum: Number(formatUnits(bal, 18))
      }));

    // --- ISSUE 3 FIX: LIVE SUPPLY-SHARE MASSES/OLIGARCHY CUT (50% OF SUPPLY, NOT
    // POPULATION), COMPUTED OFF-CHAIN IN RAW WEI ---
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

    const massThresholdNum = Number(formatUnits(liveMassThresholdRaw, 18));

    // --- PREPARE CLASSES & BOUNDARIES ---
    // Class membership is decided in RAW WEI against the supply-share cut, mirroring
    // the indexer (index.ts) and the player-class API route — so a balance sitting
    // within a wei of the cut classifies identically everywhere. The float
    // `massThresholdNum` below is used ONLY for the display distance metric.
    const capitalists = economy.filter(p => p.balanceRaw > liveMassThresholdRaw);
    const socialists = economy.filter(p => p.balanceRaw <= liveMassThresholdRaw);

    capitalists.sort((a, b) => b.balanceNum - a.balanceNum);
    socialists.sort((a, b) => b.balanceNum - a.balanceNum);

    // Find the absolute Richest Capitalist and Poorest Socialist for the scale
    const maxCapBalance = capitalists.length > 0 ? capitalists[0].balanceNum : massThresholdNum;
    const minSocBalance = socialists.length > 0 ? socialists[socialists.length - 1].balanceNum : 0;

    const resultsMap: Record<string, PlayerClassData> = {};

    // --- ISSUE 2 FIX: CALCULATE DISTANCE-BASED PERCENTILES ---
    for (const addr of stableAddresses) {
      const uAddr = addr.toLowerCase();
      const user = economy.find(p => p.address === uAddr);

      if (!user || user.balanceRaw === 0n) {
        continue;
      }

      const userBalanceNum = user.balanceNum;
      const isCapitalist = user.balanceRaw > liveMassThresholdRaw;
      let percentile = 0;

      if (isCapitalist) {
        // Capitalist Distance: 0% (At Threshold) to 100% (Richest Player)
        const range = maxCapBalance - massThresholdNum;
        percentile = range > 0 ? ((userBalanceNum - massThresholdNum) / range) * 100 : 100;
      } else {
        // Socialist Distance: 0% (At Threshold) to 100% (Poorest Player)
        const range = massThresholdNum - minSocBalance;
        percentile = range > 0 ? ((massThresholdNum - userBalanceNum) / range) * 100 : 100;
      }

      // Cap strictly between 0 and 100
      percentile = Math.max(0, Math.min(100, percentile));

      const classMembers = isCapitalist ? capitalists : socialists;
      const rankIndex = classMembers.findIndex(p => p.address === uAddr);

      const data: PlayerClassData = {
        classPercentile: percentile,
        isCapitalist,
        totalInClass: classMembers.length,
        classRank: rankIndex === -1 ? 0 : rankIndex + 1,
      };

      // Save identically for both casing formats to prevent undefined lookup crashes in UI
      resultsMap[addr] = data;
      resultsMap[uAddr] = data;
    }

    return resultsMap;
  }, [seasonAddress, players, activeOrders, stableAddresses, exchangeAddress, existentialThreshold]);

  const enabled = !!seasonAddress && stableAddresses.length > 0;
  const isFetched = !enabled ? false : playersFetched && ordersFetched;
  const isLoading = enabled && (playersLoading || ordersLoading);

  return { data, isFetched, isLoading };
}
