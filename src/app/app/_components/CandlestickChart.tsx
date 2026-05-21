'use client';

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { ECElementEvent } from 'echarts';
import { CandleData } from '@/utils/chartData';
import { useTheme } from '@/context/ThemeContext';

export type Timeframe = '5m' | '1h' | '4h' | '1d';

interface CandlestickChartProps {
  candles: CandleData[];
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  onCandleClick: (range: { start: number; end: number } | null) => void;
  selectedRange: { start: number; end: number } | null;
  capTargetBps: number;
  socTargetBps: number;
}

const TIMEFRAMES: Timeframe[] = ['5m', '1h', '4h', '1d'];
const TIMEFRAME_MS: Record<Timeframe, number> = {
  '5m':    300_000,
  '1h':  3_600_000,
  '4h': 14_400_000,
  '1d': 86_400_000,
};

function hexToRgba(hex: string, alpha: number): string {
  if (!hex.startsWith('#') || hex.length < 7) return `rgba(255,255,255,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function CandlestickChart({
  candles,
  timeframe,
  onTimeframeChange,
  onCandleClick,
  selectedRange,
  capTargetBps,
  socTargetBps,
}: CandlestickChartProps) {
  const { darkMode } = useTheme();
  const option = useMemo(() => {
    if (typeof window === 'undefined') return {};

    const s = getComputedStyle(document.documentElement);
    const v = (n: string) => s.getPropertyValue(n).trim();

    const bgColor   = v('--color-card')      || '#15120f';
    const gridColor = v('--color-border')    || '#2a2520';
    const textColor = v('--color-text2')     || '#8a8378';
    const upColor   = v('--color-green') || '#6bcb6e';
    const downColor = v('--color-red')   || '#ff5454';
    const capColor  = v('--color-gold')      || '#D4AF37';
    const socColor  = v('--color-purple')    || '#9D4EDD';

    const candleData = candles.map(c => [c.time * 1000, c.open, c.close, c.low, c.high]);
    const capVolData = candles.map(c => [c.time * 1000, c.capBuyerVolume]);
    const socVolData = candles.map(c => [c.time * 1000, c.socBuyerVolume]);
    const giniData   = candles.filter(c => c.giniBps > 0).map(c => [c.time * 1000, c.giniBps]);

    return {
      animation: false,
      backgroundColor: bgColor,
      textStyle: { fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: textColor },

      grid: [
        { left: 4, right: 75, top: 20, height: '52%' },
        { left: 4, right: 75, top: '62%', bottom: 30 },
      ],

      xAxis: [
        {
          gridIndex: 0,
          type: 'time',
          axisLine: { show: true, lineStyle: { color: textColor, width: 1, opacity: 0.5 } },
          axisLabel: { show: false },
          splitLine: { lineStyle: { color: gridColor } },
        },
        {
          gridIndex: 1,
          type: 'time',
          axisLine: { lineStyle: { color: gridColor } },
          axisLabel: { color: textColor, fontSize: 10 },
          splitLine: { lineStyle: { color: gridColor } },
        },
      ],

      yAxis: [
        {
          gridIndex: 0,
          scale: true,
          position: 'right',
          axisLine: { show: true, lineStyle: { color: gridColor } },
          axisLabel: { color: textColor, fontSize: 10 },
          splitLine: { lineStyle: { color: gridColor } },
        },
        {
          gridIndex: 1,
          scale: true,
          position: 'right',
          axisLine: { show: true, lineStyle: { color: gridColor } },
          axisLabel: { color: textColor, fontSize: 10 },
          splitLine: { show: false },
        },
        {
          gridIndex: 1,
          show: false,
          scale: true,
          position: 'right',
          ...(capTargetBps > 0 && socTargetBps > 0 ? {
            min: socTargetBps - 300,
            max: capTargetBps + 300,
          } : {}),
        },
      ],

      dataZoom: [
        { type: 'inside', xAxisIndex: [0, 1], filterMode: 'weakFilter' },
      ],

      axisPointer: {
        link: [{ xAxisIndex: 'all' }],
      },

      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: bgColor,
        borderColor: gridColor,
        textStyle: { color: textColor, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 },
        position: () => [8, 8],
        formatter: (params: any) => {
          const arr: any[] = Array.isArray(params) ? params : [params];
          const first = arr.find(p => p.value != null);
          if (!first) return '';
          const ts = Array.isArray(first.value) ? first.value[0] : first.axisValue;
          const d = new Date(typeof ts === 'string' ? parseInt(ts) : ts);
          const dateStr = d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          const lines: string[] = [`<span style="color:${textColor};font-weight:600">${dateStr}</span>`];
          for (const p of arr) {
            if (p.value == null) continue;
            if (p.seriesType === 'candlestick') {
              const [, o, c, lo, hi] = p.value as number[];
              lines.push(`${p.marker} O:${o}&nbsp;&nbsp;C:${c}&nbsp;&nbsp;L:${lo}&nbsp;&nbsp;H:${hi}`);
            } else if (p.seriesType === 'bar' && p.value[1] != null) {
              lines.push(`${p.marker} ${p.seriesName}: ${Number(p.value[1]).toLocaleString()}`);
            } else if (p.seriesType === 'line' && p.value[1] != null) {
              lines.push(`${p.marker} Gini: ${p.value[1]} bps`);
            }
          }
          return `<div style="font-family:'JetBrains Mono',monospace;font-size:11px;line-height:1.8">${lines.join('<br/>')}</div>`;
        },
      },

      series: [
        {
          type: 'candlestick',
          name: 'Price',
          xAxisIndex: 0,
          yAxisIndex: 0,
          data: candleData,
          itemStyle: {
            color: upColor,
            color0: downColor,
            borderColor: upColor,
            borderColor0: downColor,
          },
          ...(selectedRange ? {
            markArea: {
              silent: true,
              itemStyle: { color: 'rgba(255,255,255,0.06)' },
              data: [[{ xAxis: selectedRange.start }, { xAxis: selectedRange.end }]],
            },
          } : {}),
        },
        {
          type: 'bar',
          name: 'Cap Vol',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: capVolData,
          barMaxWidth: 16,
          stack: 'vol',
          itemStyle: { color: hexToRgba(capColor, 0.75) },
        },
        {
          type: 'bar',
          name: 'Soc Vol',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: socVolData,
          barMaxWidth: 16,
          stack: 'vol',
          itemStyle: { color: hexToRgba(socColor, 0.75) },
        },
        {
          type: 'line',
          name: 'Gini',
          xAxisIndex: 1,
          yAxisIndex: 2,
          data: giniData,
          smooth: true,
          symbol: 'none',
          itemStyle: { color: textColor },
          lineStyle: { color: textColor, width: 2 },
          ...(capTargetBps > 0 && socTargetBps > 0 ? {
            markLine: {
              silent: true,
              symbol: ['none', 'none'],
              data: [
                {
                  yAxis: capTargetBps,
                  lineStyle: { color: capColor, type: 'dashed', width: 1 },
                  label: { formatter: 'Bourgeois Goal', color: capColor, fontSize: 10 },
                },
                {
                  yAxis: socTargetBps,
                  lineStyle: { color: socColor, type: 'dashed', width: 1 },
                  label: { formatter: 'Proletariat Goal', color: socColor, fontSize: 10 },
                },
              ],
            },
          } : {}),
        },
      ],
    };
  }, [candles, selectedRange, capTargetBps, socTargetBps, darkMode]);

  const onEvents = useMemo(() => ({
    click: (params: ECElementEvent) => {
      if (params.componentType !== 'series') {
        onCandleClick(null);
        return;
      }
      const tsMs = (params.value as number[])[0];
      if (!tsMs) { onCandleClick(null); return; }
      const tfMs = TIMEFRAME_MS[timeframe];
      const start = Math.floor(tsMs / tfMs) * tfMs;
      onCandleClick({ start, end: start + tfMs });
    },
  }), [timeframe, onCandleClick]);

  return (
    <div className="rounded-lg py-6 flex flex-col overflow-hidden h-full bg-card">
      <div className="flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <span className="h4-app">Price Chart</span>
          {candles.length > 0 && (
            <div className="flex items-center gap-2 text-xs font-mono text-text2">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-sm bg-gold" />
                Cap buying
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-sm bg-purple" />
                Soc buying
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-sm" style={{ background: 'var(--color-gold)' }} />
                Gini BPS
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedRange && (
            <button
              onClick={() => onCandleClick(null)}
              className="text-xs font-mono text-text2 hover:text-text1 transition-colors"
            >
              ✕ clear
            </button>
          )}
          <TimeframeSelector value={timeframe} onChange={onTimeframeChange} />
        </div>
      </div>
      <div className="relative w-full h-110">
        {candles.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-text2 animate-pulse">
            Reading Ledger…
          </div>
        ) : (
          <ReactECharts
            option={option}
            onEvents={onEvents}
            style={{ height: '100%', width: '100%' }}
            notMerge={false}
            lazyUpdate
          />
        )}
      </div>
    </div>
  );
}

function TimeframeSelector({
  value,
  onChange,
}: {
  value: Timeframe;
  onChange: (tf: Timeframe) => void;
}) {
  return (
    <div className="flex gap-1">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf}
          onClick={() => onChange(tf)}
          className={`px-2 py-0.5 text-xs font-mono rounded transition-colors ${
            value === tf
              ? 'bg-primary text-white'
              : 'text-text2 hover:text-text1'
          }`}
        >
          {tf.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
