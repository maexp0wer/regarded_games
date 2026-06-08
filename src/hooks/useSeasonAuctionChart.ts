'use client';

import { useState } from 'react';
import { useSeasonAuction } from './useSeasonAuction';
import { Timeframe } from '@/app/app/_components/TradingChart';

/**
 * Owns the AuctionChart's timeframe state and feeds it the bucketed auction
 * series. Mirrors useSeasonChart so the auction-phase chart reads as a sibling
 * of the trading-phase price chart.
 */
export function useSeasonAuctionChart(seasonAddress: string | undefined) {
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const { data: points = [] } = useSeasonAuction(seasonAddress, timeframe);

  return {
    points,
    timeframe,
    onTimeframeChange: setTimeframe,
  };
}
