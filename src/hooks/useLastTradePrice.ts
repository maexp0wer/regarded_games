'use client';

import { useMemo } from 'react';
import { formatUnits } from 'viem';
import { useSeasonTrades } from './useSeasonTrades';

/**
 * Latest trade price for a season, derived from the shared useSeasonTrades
 * cache. No dedicated fetch.
 */
export function useLastTradePrice(seasonAddress: string | undefined) {
  const { data: allTrades, isLoading } = useSeasonTrades(seasonAddress);

  const data = useMemo<number>(() => {
    if (!seasonAddress || !allTrades || allTrades.length === 0) return 0;

    // useSeasonTrades is ordered ascending by timestamp; the latest is the max.
    const latest = allTrades.reduce((acc, t) =>
      Number(t.timestamp) >= Number(acc.timestamp) ? t : acc
    );

    const fim = Number(formatUnits(BigInt(latest.fimAmount), 18));
    const usdc = Number(formatUnits(BigInt(latest.usdcAmount), 6));
    return fim > 0 ? usdc / fim : 0;
  }, [seasonAddress, allTrades]);

  return { data, isLoading };
}
