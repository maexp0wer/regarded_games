'use client';

import { useMemo } from 'react';
import { useReadContract } from 'wagmi';
import type { Abi } from 'viem';
import GameSeasonAbiJson from '@/deployments/abis/GameSeason.json';
import { useTenantChainId } from '@/context/TenantContext';
import { Order } from './useOrderBook';
import { useSeasonPlayers } from './useSeasonPlayers';
import { useSeasonActiveOrders } from './useSeasonActiveOrders';
import { useSeasonInfo } from './useSeasonInfo';
import { giniPpmFromBalances } from '@/utils/gini';

const GameSeasonAbi = GameSeasonAbiJson as Abi;

export interface TradeGiniImpact {
  /** Live Gini over the current population, in PPM (0-1_000_000 = BPS ×100). */
  currentPpm: number;
  /** Gini after the hypothetical fill, in PPM. */
  projectedPpm: number;
  /** projectedPpm - currentPpm, in PPM. Negative = trade reduces inequality. */
  deltaPpm: number;
  /**
   * projectedPpm - currentPpm expressed in BPS as a float (PPM ÷ 100), so a
   * sub-BPS move that whole-BPS truncation would flatten to 0 is still shown.
   * Negative = trade reduces inequality.
   */
  deltaBps: number;
}

/**
 * Approximate per-trade Gini impact for a taker fill, reusing the exact live
 * population math from useSeasonGini so the delta is consistent with the Gini
 * the rest of the app displays.
 *
 * Wealth model (effective balance = wallet FIM + burned FIM + FIM escrowed in
 * the maker's own SELL orders):
 *   - Buying (filling asks): FIM moves from the maker's sell-order escrow into
 *     the taker's wallet. Escrowed sell FIM is already counted in the maker's
 *     effective wealth, so makers are unchanged and only the taker rises.
 *   - Selling (filling bids): the taker's FIM moves into the maker's wallet.
 *     Buy orders lock USDC (not FIM), so the maker's effective wealth rises by
 *     the FIM received and the taker's falls.
 *
 * The recompute re-applies the existential-threshold filter, so a fill that
 * pushes a wallet across the threshold is reflected in the population too.
 */
export function useGiniImpact(
  seasonAddress: string | undefined,
  takerAddress: string | undefined,
  selectedAsks: Order[],
  selectedBids: Order[],
  buyFimRaw: bigint,
  sellFimRaw: bigint,
): TradeGiniImpact | null {
  const chainId = useTenantChainId();
  const { data: thresholdRaw } = useReadContract({
    address: seasonAddress as `0x${string}`,
    abi: GameSeasonAbi,
    functionName: 'existentialThresholdFim',
    chainId,
    query: { enabled: !!seasonAddress },
  });
  const threshold = thresholdRaw ? BigInt(thresholdRaw.toString()) : 0n;

  const { data: players } = useSeasonPlayers(seasonAddress);
  const { data: activeOrders } = useSeasonActiveOrders(seasonAddress);
  const { data: seasonInfo } = useSeasonInfo(seasonAddress);

  return useMemo<TradeGiniImpact | null>(() => {
    if (!seasonAddress || !players) return null;

    const exchangeAddr = seasonInfo?.exchangeAddress?.toLowerCase();

    // 1. Build the effective-wealth map exactly as useSeasonGini does.
    const wealth = new Map<string, bigint>();
    players.forEach((p) => {
      wealth.set(
        p.playerAddress.toLowerCase(),
        BigInt(p.fimBalance) + BigInt(p.fimBurned || '0'),
      );
    });
    (activeOrders ?? [])
      .filter((o) => !o.isBuy)
      .forEach((o) => {
        const m = o.maker.toLowerCase();
        wealth.set(m, (wealth.get(m) || 0n) + BigInt(o.remainingAmount));
      });

    const toPpm = (w: Map<string, bigint>): number => {
      const balances: bigint[] = [];
      w.forEach((total, player) => {
        if (player !== exchangeAddr) {
          balances.push(total);
        }
      });
      // Raw wei + threshold → contract-exact integer Gini at PPM resolution
      // (BPS ×100; filter happens inside). Sub-BPS moves stay visible.
      return giniPpmFromBalances(balances, threshold);
    };

    const currentPpm = toPpm(wealth);

    // No fill queued → projected equals current.
    if (buyFimRaw === 0n && sellFimRaw === 0n) {
      return { currentPpm, projectedPpm: currentPpm, deltaPpm: 0, deltaBps: 0 };
    }

    // 2. Apply the hypothetical fill to a clone.
    const next = new Map(wealth);
    const bump = (addr: string, delta: bigint) => {
      const k = addr.toLowerCase();
      next.set(k, (next.get(k) || 0n) + delta);
    };

    if (takerAddress) {
      // Taker nets buyFim in, sellFim out.
      bump(takerAddress, buyFimRaw - sellFimRaw);
    }

    // Both legs move FIM between the taker and the makers actually filled, split
    // across each order in proportion to how much of it the fill consumes.
    const distribute = (totalFim: bigint, orders: Order[], sign: 1n | -1n) => {
      if (totalFim <= 0n || orders.length === 0) return;
      let remaining = totalFim;
      for (const o of orders) {
        if (remaining <= 0n) break;
        const take = remaining > o.rawAmount ? o.rawAmount : remaining;
        bump(o.maker, sign * take);
        remaining -= take;
      }
    };

    // Buy leg: FIM leaves each ask maker's sell-order escrow → the taker, so the
    // maker's counted wealth DROPS by the filled amount (the escrow was already
    // counted, so removing it is what lowers them).
    distribute(buyFimRaw, selectedAsks, -1n);
    // Sell leg: the taker's FIM lands in each bid maker's wallet (buy orders lock
    // USDC, not FIM), so the maker's counted wealth RISES.
    distribute(sellFimRaw, selectedBids, 1n);

    const projectedPpm = toPpm(next);
    const deltaPpm = projectedPpm - currentPpm;
    return { currentPpm, projectedPpm, deltaPpm, deltaBps: deltaPpm / 100 };
  }, [
    seasonAddress, players, activeOrders, seasonInfo, threshold,
    takerAddress, selectedAsks, selectedBids, buyFimRaw, sellFimRaw,
  ]);
}
