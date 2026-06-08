'use client';

import { useState } from 'react';
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

export function useSeasonChart(seasonAddress: string | undefined) {
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);

  const { data: candles = [] } = useSeasonCandles(seasonAddress, timeframe);
  const { data: trades = [] } = useSeasonTrades(seasonAddress);
  const { capTargetBps, socTargetBps } = useSeasonVictory(seasonAddress);

  const timeframeMs = TIMEFRAME_MS[timeframe];

  const handleTimeframeChange = (tf: Timeframe) => {
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
