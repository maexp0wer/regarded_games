'use client';

import { useMemo } from 'react';
import { formatUnits } from 'viem';
import { useSeasonTrades } from './useSeasonTrades';

/** USDC/FIM price at auction — the fallback when no secondary trade has set a price yet. */
const AUCTION_PRICE = 1;

/**
 * Latest trade price for a season, derived from the shared useSeasonTrades
 * cache. No dedicated fetch. Falls back to the auction price (1 USDC/FIM) when
 * no trades have occurred yet, since FIM was minted at that price.
 */
export function useLastTradePrice(seasonAddress: string | undefined) {
  const { data: allTrades, isLoading } = useSeasonTrades(seasonAddress);

  const data = useMemo<number>(() => {
    if (!seasonAddress || !allTrades || allTrades.length === 0) return AUCTION_PRICE;

    // useSeasonTrades is ordered ascending by timestamp; the latest is the max.
    const latest = allTrades.reduce((acc, t) =>
      Number(t.timestamp) >= Number(acc.timestamp) ? t : acc
    );

    const fim = Number(formatUnits(BigInt(latest.fimAmount), 18));
    const usdc = Number(formatUnits(BigInt(latest.usdcAmount), 6));
    return fim > 0 ? usdc / fim : AUCTION_PRICE;
  }, [seasonAddress, allTrades]);

  return { data, isLoading };
}
