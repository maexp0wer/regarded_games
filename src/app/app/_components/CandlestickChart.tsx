'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(600);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const barWidth = 20;
  const nBars = Math.max(5, Math.floor((containerWidth - 48 - 75) / 26));

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

    const tfMs = TIMEFRAME_MS[timeframe];
    const nowMs = Date.now();
    const latestMs = candles.length > 0 ? candles[candles.length - 1].time * 1000 : nowMs;
    const xMax = Math.ceil(latestMs / tfMs) * tfMs + tfMs;
    const xMin = xMax - nBars * tfMs;

    const candleData = candles.map(c => [c.time * 1000, c.open, c.close, c.low, c.high]);
    const capVolData = candles.map(c => [c.time * 1000, c.capBuyerVolume]);
    const socVolData = candles.map(c => [c.time * 1000, -c.socBuyerVolume]);
    const maxVol = candles.reduce((m, c) => Math.max(m, c.capBuyerVolume, c.socBuyerVolume), 1);
    const giniData   = candles.filter(c => c.giniBps > 0).map(c => [c.time * 1000, c.giniBps]);

    return {
      animation: false,
      backgroundColor: bgColor,
      textStyle: { fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: textColor },

      grid: [
        { left: 48, right: 75, top: 20, height: '52%' },
        { left: 48, right: 75, top: '62%', bottom: 30 },
      ],

      xAxis: [
        {
          gridIndex: 0,
          type: 'time',
          min: xMin,
          max: xMax,
          axisLine: { show: true, lineStyle: { color: textColor, width: 1, opacity: 0.5 } },
          axisLabel: { show: false },
          splitLine: { lineStyle: { color: gridColor } },
        },
        {
          gridIndex: 1,
          type: 'time',
          min: xMin,
          max: xMax,
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
          boundaryGap: ['15%', '15%'],
          axisLine: { show: true, lineStyle: { color: gridColor } },
          axisLabel: { color: textColor, fontSize: 10 },
          splitLine: { lineStyle: { color: gridColor } },
        },
        {
          gridIndex: 1,
          position: 'right',
          min: -maxVol * 1.2,
          max: maxVol * 1.2,
          axisLine: { show: true, lineStyle: { color: gridColor } },
          axisLabel: {
            color: textColor,
            fontSize: 10,
            formatter: (v: number) => {
              const abs = Math.abs(v);
              return abs >= 1000 ? `${Math.round(abs / 1000)}k` : String(abs);
            },
          },
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

          let ohlc = { o: '-', c: '-', l: '-', h: '-' };
          let capVol = '-', socVol = '-', gini = '-';

          for (const p of arr) {
            if (p.value == null) continue;
            if (p.seriesType === 'candlestick') {
              const [, o, c, lo, hi] = p.value as number[];
              ohlc = { o: String(o), c: String(c), l: String(lo), h: String(hi) };
            } else if (p.seriesType === 'bar' && p.value[1] != null) {
              const val = Math.abs(Number(p.value[1])).toLocaleString(undefined, { maximumFractionDigits: 2 });
              if (p.seriesName === 'Cap Vol') capVol = val;
              else socVol = val;
            } else if (p.seriesType === 'line' && p.value[1] != null) {
              gini = `${Number(p.value[1]).toLocaleString(undefined, { maximumFractionDigits: 2 })} bps`;
            }
          }

          const dot = (color: string) =>
            `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${color};margin-right:5px;vertical-align:middle"></span>`;
          const row = (label: string, val: string, swatch = '') =>
            `<tr><td style="color:${textColor};opacity:0.6;padding-right:8px">${swatch}${label}</td><td style="color:${textColor}">${val}</td></tr>`;

          const fmt2 = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
          const capGoal = capTargetBps > 0 ? row('Cap goal', `${fmt2(capTargetBps)} bps`, dot(hexToRgba(capColor, 0.35))) : '';
          const socGoal = socTargetBps > 0 ? row('Soc goal', `${fmt2(socTargetBps)} bps`, dot(hexToRgba(socColor, 0.35))) : '';

          const left = `<table>${row('O', ohlc.o)}${row('C', ohlc.c)}${row('H', ohlc.h)}${row('L', ohlc.l)}</table>`;
          const right = `<table>${row('Gini', gini)}${row('Cap vol', capVol, dot(hexToRgba(capColor, 0.75)))}${row('Soc vol', socVol, dot(hexToRgba(socColor, 0.75)))}${capGoal}${socGoal}</table>`;

          return `<div style="font-family:'JetBrains Mono',monospace;font-size:11px">
            <div style="color:${textColor};font-weight:600;margin-bottom:4px">${dateStr}</div>
            <div style="display:flex;gap:16px">${left}${right}</div>
          </div>`;
        },
      },

      series: [
        {
          type: 'candlestick',
          name: 'Price',
          xAxisIndex: 0,
          yAxisIndex: 0,
          data: candleData,
          barWidth,
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
          barWidth,
          barGap: '-100%',
          itemStyle: { color: hexToRgba(capColor, 0.75) },
        },
        {
          type: 'bar',
          name: 'Soc Vol',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: socVolData,
          barWidth,
          barGap: '-100%',
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
                  lineStyle: { color: hexToRgba(capColor, 0.35), type: 'solid', width: 1 },
                  label: { show: false },
                },
                {
                  yAxis: socTargetBps,
                  lineStyle: { color: hexToRgba(socColor, 0.35), type: 'solid', width: 1 },
                  label: { show: false },
                },
              ],
            },
          } : {}),
        },
      ],
    };
  }, [candles, timeframe, selectedRange, capTargetBps, socTargetBps, darkMode, nBars]);

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
        <div />
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
      <div ref={containerRef} className="relative w-full h-110">
        <ReactECharts
          option={option}
          onEvents={onEvents}
          style={{ height: '100%', width: '100%' }}
          notMerge={false}
          lazyUpdate
        />
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
