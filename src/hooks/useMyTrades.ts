'use client';

import { useMemo } from 'react';
import { formatUnits } from 'viem';
import { useSeasonTrades } from './useSeasonTrades';

export interface MyTrade {
  id: string;
  isBuy: boolean;
  fimAmount: number;
  usdcAmount: number;
  timestamp: number;
  // The fee for this fill is always paid by the taker. feePaid is the user's
  // actual cost: the fill's fee when the user was the taker, 0 when they were the maker.
  feePaid: number;
}

/**
 * A player's trades (buy + sell sides) derived from the shared useSeasonTrades
 * cache. No dedicated fetch.
 */
export function useMyTrades(
  seasonAddress: string | undefined,
  userAddress: string | undefined,
) {
  const { data: allTrades, isLoading } = useSeasonTrades(seasonAddress);

  const data = useMemo<MyTrade[]>(() => {
    if (!seasonAddress || !userAddress || !allTrades) return [];
    const user = userAddress.toLowerCase();

    return allTrades
      .filter((t) => t.buyer.toLowerCase() === user || t.seller.toLowerCase() === user)
      .map((t) => {
        const isBuy = t.buyer.toLowerCase() === user;
        // The taker pays the fee regardless of side; the maker pays nothing.
        const isTaker = t.taker?.toLowerCase() === user;
        return {
          id: t.id,
          isBuy,
          fimAmount: Number(formatUnits(BigInt(t.fimAmount), 18)),
          usdcAmount: Number(formatUnits(BigInt(t.usdcAmount), 6)),
          timestamp: Number(t.timestamp),
          feePaid: isTaker ? Number(formatUnits(BigInt(t.feePaid ?? '0'), 6)) : 0,
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [seasonAddress, userAddress, allTrades]);

  return { data, isLoading };
}
