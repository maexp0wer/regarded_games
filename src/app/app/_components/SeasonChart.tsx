'use client';

import { useSeasonChart } from '@/hooks/useSeasonChart';
import { CandlestickChart } from './CandlestickChart';
import { ChordDiagram } from './ChordDiagram';

interface SeasonChartProps {
  seasonAddress: string;
}

export function SeasonChart({ seasonAddress }: SeasonChartProps) {
  const chart = useSeasonChart(seasonAddress);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-2">
      <div className="xl:col-span-2 min-w-0">
        <CandlestickChart
          candles={chart.candles}
          timeframe={chart.timeframe}
          onTimeframeChange={chart.onTimeframeChange}
          onCandleClick={chart.onCandleClick}
          selectedRange={chart.selectedRange}
          capTargetBps={chart.capTargetBps}
          socTargetBps={chart.socTargetBps}
        />
      </div>
      <div className="xl:col-span-1">
        <ChordDiagram
          trades={chart.trades}
          timeWindowMs={chart.timeWindowMs}
          selectedRange={chart.selectedRange}
          onClearSelection={chart.onClearSelection}
          isLive={chart.isLive}
        />
      </div>
    </div>
  );
}
