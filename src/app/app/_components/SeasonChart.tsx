'use client';

import { useSeasonChart } from '@/hooks/useSeasonChart';
import { TradingChart } from './TradingChart';
import { TradeFlows } from './TradeFlows';

interface SeasonChartProps {
  seasonAddress: string;
}

export function SeasonChart({ seasonAddress }: SeasonChartProps) {
  const chart = useSeasonChart(seasonAddress);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-2">
      {/* Bounded height: the chart card fills its parent (flex-1 inside), so a
          standalone caller must supply one or the chart area collapses. */}
      <div className="xl:col-span-2 min-w-0 h-136">
        <TradingChart
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
        <TradeFlows
          trades={chart.trades}
          timeWindowMs={chart.timeWindowMs}
          timeframe={chart.timeframe}
          selectedRange={chart.selectedRange}
          onClearSelection={chart.onClearSelection}
          isLive={chart.isLive}
        />
      </div>
    </div>
  );
}
