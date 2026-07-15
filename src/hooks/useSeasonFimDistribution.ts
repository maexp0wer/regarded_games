'use client';

import { useMemo } from 'react';
import { formatUnits } from 'viem';
import type { Abi } from 'viem';
import { useReadContract } from 'wagmi';
import GameSeasonAbiJson from '@/deployments/abis/GameSeason.json';
import { useTenantChainId } from '@/context/TenantContext';
import { useSeasonPlayers } from './useSeasonPlayers';
import { useSeasonActiveOrders } from './useSeasonActiveOrders';

const GameSeasonAbi = GameSeasonAbiJson as Abi;

export interface FimDistributionBar {
  bucket: number;       // 0–19 (0 = poorest proletarian, 19 = richest capitalist)
  fimAmount: number;    // total effective FIM held in this 10-percentile bracket
  playerCount: number;  // number of players in this bracket
  isCapitalist: boolean;
}

/**
 * Computes FIM distribution across 20 rank buckets (10-percentile intervals).
 * Buckets 0–9 are proletarian (poorest→closest to threshold),
 * buckets 10–19 are capitalist (just above threshold→richest).
 *
 * Reuses the shared useSeasonPlayers + useSeasonActiveOrders fetches — no new
 * network calls. Effective balance mirrors useBatchPlayerClass:
 *   effectiveBalance = fimBalance + fimBurned + locked FIM in active sell orders
 */
export function useSeasonFimDistribution(
  seasonAddress: string | undefined,
  exchangeAddress?: string,
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

  const { data: players, isLoading: playersLoading, isFetched: playersFetched } =
    useSeasonPlayers(seasonAddress);
  const { data: activeOrders, isLoading: ordersLoading, isFetched: ordersFetched } =
    useSeasonActiveOrders(seasonAddress);

  const bars = useMemo<FimDistributionBar[]>(() => {
    const empty: FimDistributionBar[] = Array.from({ length: 20 }, (_, i) => ({
      bucket: i,
      fimAmount: 0,
      playerCount: 0,
      isCapitalist: i >= 10,
    }));

    if (!players || players.length === 0) return empty;

    const sellOrders = (activeOrders ?? []).filter((o) => !o.isBuy);

    // Build effective balances (bigint)
    const playerBalances = new Map<string, bigint>();
    for (const p of players) {
      const eff = BigInt(p.fimBalance) + BigInt(p.fimBurned || '0');
      playerBalances.set(p.playerAddress.toLowerCase(), eff);
    }
    for (const o of sellOrders) {
      const maker = o.maker.toLowerCase();
      const locked = BigInt(o.remainingAmount);
      playerBalances.set(maker, (playerBalances.get(maker) ?? 0n) + locked);
    }
    if (exchangeAddress) {
      playerBalances.delete(exchangeAddress.toLowerCase());
    }

    // Drop sub-threshold (dust) holders before ranking — mirrors gini.ts and the
    // contract's `bal >= existentialThresholdFim`, so the population fed into the
    // 50% mass threshold + bucketing is the eligible set only. Raw-wei compare;
    // never float-convert before filtering. When the threshold is 0n, still drop
    // empty wallets so they can't pad the proletarian axis.
    const economy = Array.from(playerBalances.entries())
      .filter(([, balanceRaw]) => balanceRaw >= existentialThreshold && balanceRaw > 0n)
      .map(([address, balanceRaw]) => ({ address, balanceRaw }))
      .sort((a, b) => (a.balanceRaw < b.balanceRaw ? -1 : a.balanceRaw > b.balanceRaw ? 1 : 0));

    const totalSupply = economy.reduce((s, p) => s + p.balanceRaw, 0n);
    const halfSupply = totalSupply / 2n;
    let accumulated = 0n;
    let thresholdRaw = 0n;
    for (const p of economy) {
      accumulated += p.balanceRaw;
      if (accumulated <= halfSupply) thresholdRaw = p.balanceRaw;
      else break;
    }
    const thresholdNum = Number(formatUnits(thresholdRaw, 18));

    const proletarians = economy.filter((p) => Number(formatUnits(p.balanceRaw, 18)) <= thresholdNum);
    const capitalists = economy.filter((p) => Number(formatUnits(p.balanceRaw, 18)) > thresholdNum);

    const result: FimDistributionBar[] = Array.from({ length: 20 }, (_, i) => ({
      bucket: i,
      fimAmount: 0,
      playerCount: 0,
      isCapitalist: i >= 10,
    }));

    const totalProl = proletarians.length;
    const totalCap = capitalists.length;

    // Proletarians: sorted ascending (index 0 = poorest). Bucket 0–9.
    // Divide by (totalProl - 1) so the last player lands exactly in bucket 9.
    // A lone proletarian falls in the poorest bucket (0, "PROL 100%"), matching the
    // "Expected Class Rank" percentile, which also resolves the single-member case
    // to 100% (furthest into the Masses).
    proletarians.forEach((p, idx) => {
      const bucket = totalProl > 1 ? Math.min(9, Math.floor((idx / (totalProl - 1)) * 9)) : 0;
      result[bucket].fimAmount += Number(formatUnits(p.balanceRaw, 18));
      result[bucket].playerCount += 1;
    });

    // Capitalists: sorted ascending (index 0 = closest to threshold). Bucket 10–19.
    // Divide by (totalCap - 1) so the last player lands exactly in bucket 19.
    // A lone capitalist is BOTH the poorest and richest of the class; place it in
    // the richest bucket (19) so it matches the "Expected Class Rank" percentile,
    // which resolves the same single-member degenerate case to 100% (richest).
    capitalists.forEach((p, idx) => {
      const bucket = totalCap > 1 ? Math.min(19, 10 + Math.floor((idx / (totalCap - 1)) * 9)) : 19;
      result[bucket].fimAmount += Number(formatUnits(p.balanceRaw, 18));
      result[bucket].playerCount += 1;
    });

    return result;
  }, [players, activeOrders, exchangeAddress, existentialThreshold]);

  const isLoading = playersLoading || ordersLoading;
  const isFetched = !!seasonAddress ? playersFetched && ordersFetched : false;

  return { bars, isLoading, isFetched };
}
