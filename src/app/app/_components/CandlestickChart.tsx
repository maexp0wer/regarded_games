'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import type { ECElementEvent, ECharts } from 'echarts';
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
  const chartRef = useRef<ReactECharts>(null);
  const [containerWidth, setContainerWidth] = useState(600);

  // We drive the resize ourselves (echarts-for-react's built-in autoResize is
  // disabled below) so we can pass an animation config to echarts.resize(); the
  // library calls resize() without one, which snaps the layout into place.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let raf = 0;
    const ro = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      setContainerWidth(width);
      const inst = chartRef.current?.getEchartsInstance() as ECharts | undefined;
      if (!inst) return;
      // Coalesce bursts of resize callbacks into one animated resize per frame.
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        inst.resize({
          width: 'auto',
          height: 'auto',
          animation: { duration: 250, easing: 'cubicOut' },
        });
      });
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  // Plot area width (container minus left/right grid insets). Kept fractional so
  // the x-domain widens continuously as the container resizes instead of snapping
  // by a whole bar each time an integer bar-count tick is crossed.
  const plotWidth = Math.max(1, containerWidth - 48 - 75);
  const nBars = Math.max(5, plotWidth / 26);
  // Candle width scales with the plot so bars don't visually "pop" to a new size
  // when the bar-count changes; clamped to a sensible range.
  const barWidth = Math.max(4, Math.min(15, (plotWidth / nBars) * 0.58));

  const option = useMemo(() => {
    if (typeof window === 'undefined') return {};

    const s = getComputedStyle(document.documentElement);
    const v = (n: string) => s.getPropertyValue(n).trim();

    const gridColor  = v('--color-border')  || '#251F3D';
    const grid2Color = v('--color-border2') || '#4C3F7A';
    const card3Color = v('--color-card3')   || '#2B2544';
    const textColor  = v('--color-text2')   || '#9E97BD';
    const upColor    = v('--color-green')   || '#00F5A0';
    const downColor  = v('--color-red')     || '#FF3B69';
    const capColor   = v('--color-gold')    || '#FFC300';
    const socColor   = v('--color-purple')  || '#9D4EDD';

    const splitNumber = containerWidth < 480 ? 3 : containerWidth < 720 ? 5 : 8;

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
      // Animate layout/geometry updates so a container resize glides the candles,
      // bars and axes to their new positions instead of snapping into place. Only
      // the "update" phase is animated; initial draw stays instant.
      animation: true,
      animationDuration: 0,
      animationDurationUpdate: 250,
      animationEasingUpdate: 'cubicOut',
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: textColor },

      grid: [
        { left: 48, right: 75, top: 16, height: '50%' },
        { left: 48, right: 75, top: '64%', bottom: 28 },
      ],

      graphic: [{
        type: 'line',
        top: '59%',
        left: 48,
        z: 10,
        shape: { x1: 0, y1: 0, x2: containerWidth - 123, y2: 0 },
        style: { stroke: grid2Color, lineWidth: 1 },
      }],

      xAxis: [
        {
          gridIndex: 0,
          type: 'time',
          min: xMin,
          max: xMax,
          splitNumber,
          axisLine: { show: true, lineStyle: { color: gridColor, width: 1 } },
          axisLabel: { show: false },
          axisTick: { show: true, lineStyle: { color: gridColor, opacity: 0.6 }, length: 3 },
          splitLine: { lineStyle: { color: gridColor, opacity: 0.6 } },
        },
        {
          gridIndex: 1,
          type: 'time',
          min: xMin,
          max: xMax,
          splitNumber,
          axisLine: { lineStyle: { color: gridColor } },
          axisLabel: { color: textColor, fontSize: 10, fontFamily: 'JetBrains Mono, monospace' },
          axisTick: { show: true, lineStyle: { color: gridColor, opacity: 0.6 }, length: 4 },
          splitLine: { lineStyle: { color: gridColor, opacity: 0.6 } },
        },
      ],

      yAxis: [
        {
          gridIndex: 0,
          scale: true,
          position: 'right',
          boundaryGap: ['5%', '5%'],
          axisLine: { show: true, lineStyle: { color: gridColor } },
          axisLabel: { color: textColor, fontSize: 10, fontFamily: 'JetBrains Mono, monospace' },
          splitLine: { lineStyle: { color: gridColor, opacity: 0.6 } },
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
            fontFamily: 'JetBrains Mono, monospace',
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
        lineStyle: { color: grid2Color, opacity: 0.8 },
        crossStyle: { color: grid2Color, opacity: 0.6 },
      },

      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: card3Color,
        borderColor: grid2Color,
        borderWidth: 1,
        padding: [10, 12],
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

          const swatch = (color: string) =>
            `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${color};margin-right:6px;vertical-align:middle;flex-shrink:0"></span>`;
          const row = (label: string, val: string, dot = '') =>
            `<tr><td style="padding:2px 10px 2px 0;color:${textColor};opacity:0.65;white-space:nowrap">${dot}${label}</td><td style="color:${textColor};font-weight:600;text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums">${val}</td></tr>`;
          const divider = `<tr><td colspan="2" style="padding:4px 0"><div style="height:1px;background:${hexToRgba(grid2Color, 0.4)}"></div></td></tr>`;

          const fmt2 = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
          const capGoal = capTargetBps > 0 ? row('Cap goal', `${fmt2(capTargetBps)} bps`, swatch(hexToRgba(capColor, 0.5))) : '';
          const socGoal = socTargetBps > 0 ? row('Soc goal', `${fmt2(socTargetBps)} bps`, swatch(hexToRgba(socColor, 0.5))) : '';

          const ohlcRows = `${row('O', ohlc.o)}${row('H', ohlc.h)}${row('L', ohlc.l)}${row('C', ohlc.c)}`;
          const metaRows = `${row('Gini', gini)}${row('Cap vol', capVol, swatch(hexToRgba(capColor, 0.8)))}${row('Soc vol', socVol, swatch(hexToRgba(socColor, 0.8)))}${capGoal}${socGoal}`;

          return `<div style="font-family:'JetBrains Mono',monospace;font-size:11px;min-width:160px">
            <div style="color:${textColor};letter-spacing:0.08em;text-transform:uppercase;font-size:10px;margin-bottom:6px;opacity:0.65">${dateStr}</div>
            <table style="border-collapse:collapse;width:100%">${ohlcRows}${divider}${metaRows}</table>
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
              itemStyle: {
                color: hexToRgba(socColor, 0.10),
                borderColor: hexToRgba(socColor, 0.25),
                borderWidth: 1,
              },
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
          itemStyle: { color: hexToRgba(capColor, 0.75), borderRadius: [2, 2, 0, 0] },
        },
        {
          type: 'bar',
          name: 'Soc Vol',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: socVolData,
          barWidth,
          barGap: '-100%',
          itemStyle: { color: hexToRgba(socColor, 0.75), borderRadius: [0, 0, 2, 2] },
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
          lineStyle: { color: textColor, width: 1.5, opacity: 0.8 },
          ...(capTargetBps > 0 && socTargetBps > 0 ? {
            markLine: {
              silent: true,
              symbol: ['none', 'none'],
              data: [
                {
                  yAxis: capTargetBps,
                  lineStyle: { color: hexToRgba(capColor, 0.4), type: 'dashed', width: 1 },
                  label: { show: false },
                },
                {
                  yAxis: socTargetBps,
                  lineStyle: { color: hexToRgba(socColor, 0.4), type: 'dashed', width: 1 },
                  label: { show: false },
                },
              ],
            },
          } : {}),
        },
      ],
    };
  }, [candles, timeframe, selectedRange, capTargetBps, socTargetBps, darkMode, nBars, containerWidth]);

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
    <div className="flex flex-col bg-card rounded-xl overflow-hidden h-full">
      <div className="flex items-center justify-between pl-12 pr-[75px] py-3.5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <span className="font-display font-black uppercase tracking-tight text-sm text-text">
            FIM / USDC
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-green shadow-[0_0_8px_var(--color-green-35)] animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <TimeframeSelector value={timeframe} onChange={onTimeframeChange} />
        </div>
      </div>

      {/* Fills the remaining height of the chart card and shrinks with it, so the
          panel stays fully visible when the viewport-locked row compresses. The
          card root is a bounded flex column, so flex-1 resolves; standalone
          callers must give the card a height (see SeasonChart). */}
      <div ref={containerRef} className="relative w-full flex-1 min-h-0">
        <ReactECharts
          ref={chartRef}
          option={option}
          onEvents={onEvents}
          style={{ height: '100%', width: '100%' }}
          notMerge={false}
          lazyUpdate
          opts={{ renderer: 'canvas' }}
          autoResize={false}
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
          className={`px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-widest rounded transition-all duration-150 active:scale-[0.98] border ${
            value === tf
              ? 'bg-card3 border-border2 text-text'
              : 'bg-card2 border-border text-text2 hover:border-border2 hover:text-text'
          }`}
        >
          {tf}
        </button>
      ))}
    </div>
  );
}
