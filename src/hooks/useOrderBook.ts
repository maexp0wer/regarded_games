'use client';

import { useMemo } from "react";
import { useSeasonActiveOrders } from './useSeasonActiveOrders';
import { useSeasonPlayers } from './useSeasonPlayers';

export interface Order {
  id: string;
  orderId: bigint;
  seasonAddress: string;
  maker: string;
  isBuy: boolean;
  price: number;
  amount: number;
  pricePerFim: number;
  rawPrice: bigint;
  rawAmount: bigint;
  rawInitialAmount: bigint;
  makerBalance: number;
}

/**
 * Order book ({ bids, asks }) derived from the shared active-orders + players
 * primitives. No dedicated fetch.
 */
export function useOrderBook(seasonAddress: string | undefined) {
  const { data: orders, isLoading: ordersLoading } = useSeasonActiveOrders(seasonAddress);
  const { data: players, isLoading: playersLoading } = useSeasonPlayers(seasonAddress);

  const data = useMemo<{ bids: Order[]; asks: Order[] }>(() => {
    if (!seasonAddress || !orders) return { bids: [], asks: [] };

    // Create a quick lookup map for balances: address -> balance
    const balanceMap = new Map<string, number>();
    (players ?? []).forEach((p) => {
      // Effective balance (wallet + burned), consistent with the faction hooks.
      const bal = Number(BigInt(p.fimBalance) + BigInt(p.fimBurned || "0")) / 1e18;
      balanceMap.set(p.playerAddress.toLowerCase(), bal);
    });

    const format = (o: typeof orders[number]): Order => {
      const rawPrice = BigInt(o.price);
      const rawInitialAmount = BigInt(o.initialAmount);
      const rawAmount = BigInt(o.remainingAmount);
      const pricePerFim = rawInitialAmount > 0n
        ? (Number(rawPrice) / 1_000_000) / (Number(rawInitialAmount) / 1e18)
        : 0;
      return {
        id: o.id,
        orderId: BigInt(o.orderId),
        seasonAddress: o.seasonAddress,
        maker: o.maker,
        isBuy: o.isBuy,
        price: Number(rawPrice) / 1_000_000,
        amount: Number(rawAmount) / 1e18,
        pricePerFim,
        rawPrice,
        rawAmount,
        rawInitialAmount,
        makerBalance: balanceMap.get(o.maker.toLowerCase()) || 0,
      };
    };

    const bids = orders.filter((o) => o.isBuy).map(format).sort((a, b) => b.price - a.price);
    const asks = orders.filter((o) => !o.isBuy).map(format).sort((a, b) => a.price - b.price);

    return { bids, asks };
  }, [seasonAddress, orders, players]);

  const isLoading = !!seasonAddress && (ordersLoading || playersLoading);

  return { data, isLoading };
}
