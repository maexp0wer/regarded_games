'use client';

import { useMemo } from 'react';
import { formatUnits } from 'viem';
import { useSeasonPlayers } from './useSeasonPlayers';
import { useSeasonActiveOrders } from './useSeasonActiveOrders';

export interface FimDistributionBar {
  bucket: number;       // 0–39 (0 = poorest socialist, 39 = richest capitalist)
  fimAmount: number;    // total effective FIM held in this 5-percentile bracket
  isCapitalist: boolean;
}

/**
 * Computes FIM distribution across 40 rank buckets (5-percentile intervals).
 * Buckets 0–19 are socialist (poorest→closest to threshold),
 * buckets 20–39 are capitalist (just above threshold→richest).
 *
 * Reuses the shared useSeasonPlayers + useSeasonActiveOrders fetches — no new
 * network calls. Effective balance mirrors useBatchPlayerPercentiles:
 *   effectiveBalance = fimBalance + fimBurned + locked FIM in active sell orders
 */
export function useSeasonFimDistribution(
  seasonAddress: string | undefined,
  exchangeAddress?: string,
) {
  const { data: players, isLoading: playersLoading, isFetched: playersFetched } =
    useSeasonPlayers(seasonAddress);
  const { data: activeOrders, isLoading: ordersLoading, isFetched: ordersFetched } =
    useSeasonActiveOrders(seasonAddress);

  const bars = useMemo<FimDistributionBar[]>(() => {
    const empty: FimDistributionBar[] = Array.from({ length: 40 }, (_, i) => ({
      bucket: i,
      fimAmount: 0,
      isCapitalist: i >= 20,
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

    // Sorted ascending for threshold calculation
    const economy = Array.from(playerBalances.entries())
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

    const socialists = economy.filter((p) => Number(formatUnits(p.balanceRaw, 18)) <= thresholdNum);
    const capitalists = economy.filter((p) => Number(formatUnits(p.balanceRaw, 18)) > thresholdNum);

    const result: FimDistributionBar[] = Array.from({ length: 40 }, (_, i) => ({
      bucket: i,
      fimAmount: 0,
      isCapitalist: i >= 20,
    }));

    const totalSoc = socialists.length;
    const totalCap = capitalists.length;

    // Socialists: sorted ascending (index 0 = poorest). Bucket 0–19.
    // Divide by (totalSoc - 1) so the last player lands exactly in bucket 19.
    socialists.forEach((p, idx) => {
      const bucket = totalSoc > 1 ? Math.min(19, Math.floor((idx / (totalSoc - 1)) * 19)) : 0;
      result[bucket].fimAmount += Number(formatUnits(p.balanceRaw, 18));
    });

    // Capitalists: sorted ascending (index 0 = closest to threshold). Bucket 20–39.
    // Divide by (totalCap - 1) so the last player lands exactly in bucket 39.
    capitalists.forEach((p, idx) => {
      const bucket = totalCap > 1 ? Math.min(39, 20 + Math.floor((idx / (totalCap - 1)) * 19)) : 20;
      result[bucket].fimAmount += Number(formatUnits(p.balanceRaw, 18));
    });

    return result;
  }, [players, activeOrders, exchangeAddress]);

  const isLoading = playersLoading || ordersLoading;
  const isFetched = !!seasonAddress ? playersFetched && ordersFetched : false;

  return { bars, isLoading, isFetched };
}
