'use client';

import { useState, useEffect, useRef } from 'react';
import { useSeasonAuction } from './useSeasonAuction';
import { Timeframe } from '@/app/app/_components/TradingChart';

const TWO_DAYS_S = 2 * 24 * 60 * 60;

/**
 * Owns the AuctionChart's timeframe state and feeds it the bucketed auction
 * series. Mirrors useSeasonChart so the auction-phase chart reads as a sibling
 * of the trading-phase price chart.
 *
 * Defaults to '1h' but auto-switches to '5m' on first data load when the
 * season has less than 2 days of history — so early-season charts aren't
 * stretched across too-wide bars.
 */
export function useSeasonAuctionChart(seasonAddress: string | undefined) {
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const autoDefaultedRef = useRef(false);
  const { data: points = [] } = useSeasonAuction(seasonAddress, timeframe);

  useEffect(() => {
    if (autoDefaultedRef.current || points.length < 2) return;
    autoDefaultedRef.current = true;
    const span = points[points.length - 1].time - points[0].time;
    if (span < TWO_DAYS_S) setTimeframe('5m');
  }, [points]);

  return {
    points,
    timeframe,
    onTimeframeChange: setTimeframe,
  };
}
