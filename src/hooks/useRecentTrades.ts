'use client';

import { useMemo } from "react";
import { formatUnits } from "viem";
import { useSeasonTrades } from './useSeasonTrades';

export interface Trade {
  id: string;
  price: number;
  amount: number;
  timestamp: number;
  txHash: string;
  buyer: string;
  seller: string;
  buyerBalance: string;
  sellerBalance: string;
  buyerPercentile: number;
  sellerPercentile: number;
  buyerIsCapitalist: boolean;
  sellerIsCapitalist: boolean;
}

/**
 * Most-recent-50 trades (descending) derived from the shared useSeasonTrades
 * cache. No dedicated fetch.
 */
export function useRecentTrades(seasonAddress: string | undefined) {
  const { data: allTrades, isLoading } = useSeasonTrades(seasonAddress);

  const data = useMemo<Trade[]>(() => {
    if (!seasonAddress || !allTrades) return [];

    return [...allTrades]
      .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
      .slice(0, 50)
      .map((t) => {
        const fim = Number(formatUnits(BigInt(t.fimAmount), 18));
        const usdc = Number(formatUnits(BigInt(t.usdcAmount), 6));
        const price = fim > 0 ? usdc / fim : 0;

        return {
          id: t.id,
          price,
          amount: fim,
          timestamp: Number(t.timestamp),
          txHash: t.txHash,
          buyer: t.buyer,
          seller: t.seller,
          buyerBalance: t.buyerBalance ?? '0',
          sellerBalance: t.sellerBalance ?? '0',
          buyerPercentile: t.buyerPercentile ?? 50,
          sellerPercentile: t.sellerPercentile ?? 50,
          buyerIsCapitalist: t.buyerIsCapitalist ?? false,
          sellerIsCapitalist: t.sellerIsCapitalist ?? false,
        };
      });
  }, [seasonAddress, allTrades]);

  return { data, isLoading };
}
