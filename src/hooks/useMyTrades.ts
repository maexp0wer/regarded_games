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
      .map((t) => ({
        id: t.id,
        isBuy: t.buyer.toLowerCase() === user,
        fimAmount: Number(formatUnits(BigInt(t.fimAmount), 18)),
        usdcAmount: Number(formatUnits(BigInt(t.usdcAmount), 6)),
        timestamp: Number(t.timestamp),
      }))
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [seasonAddress, userAddress, allTrades]);

  return { data, isLoading };
}
