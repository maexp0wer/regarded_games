'use client';

import { useEffect, useRef, useState } from 'react';
import { useSeasonCandles } from './useSeasonCandles';
import { useSeasonTrades } from './useSeasonTrades';
import { useSeasonVictory } from './useSeasonVictory';
import { Timeframe } from '@/app/app/_components/TradingChart';

const TIMEFRAME_MS: Record<Timeframe, number> = {
  '5m':    300_000,
  '1h':  3_600_000,
  '4h': 14_400_000,
  '1d': 86_400_000,
};

// A season with up to this much price history is too short to read at hourly
// resolution, so we default it to the 5m chart; anything longer defaults to 1h.
const TWO_DAYS_SEC = 2 * 24 * 60 * 60;

// CandleData.time is in seconds, so the span is just last - first.
function candleSpanSec(candles: { time: number }[]): number {
  if (candles.length < 2) return 0;
  return candles[candles.length - 1].time - candles[0].time;
}

export function useSeasonChart(seasonAddress: string | undefined) {
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);

  const { data: candles = [] } = useSeasonCandles(seasonAddress, timeframe);
  const { data: trades = [] } = useSeasonTrades(seasonAddress);
  const { capTargetBps, socTargetBps } = useSeasonVictory(seasonAddress);

  // Pick the initial timeframe from the available history: ≤2 days → 5m, else 1h.
  // Runs once per season, before any manual selection, and never overrides a user
  // choice (userPickedRef latches the moment they tap a timeframe pill). The span
  // is the same regardless of which timeframe's candles are currently loaded, so
  // measuring off the default 1h fetch is fine.
  const userPickedRef = useRef(false);
  const autoPickedForRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (userPickedRef.current) return;
    if (!seasonAddress || candles.length < 2) return;
    if (autoPickedForRef.current === seasonAddress) return;
    autoPickedForRef.current = seasonAddress;
    const span = candleSpanSec(candles);
    setTimeframe(span <= TWO_DAYS_SEC ? '5m' : '1h');
  }, [seasonAddress, candles]);

  const timeframeMs = TIMEFRAME_MS[timeframe];

  const handleTimeframeChange = (tf: Timeframe) => {
    userPickedRef.current = true;
    setTimeframe(tf);
    setSelectedRange(null);
  };

  return {
    // TradingChart props
    candles,
    timeframe,
    onTimeframeChange: handleTimeframeChange,
    selectedRange,
    onCandleClick: setSelectedRange,
    capTargetBps,
    socTargetBps,
    // TradeFlows props
    trades,
    timeWindowMs: timeframeMs,
    onClearSelection: () => setSelectedRange(null),
    isLive: !selectedRange,
  };
}
