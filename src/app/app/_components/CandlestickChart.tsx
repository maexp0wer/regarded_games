'use client';

import { useEffect, useRef, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  IPriceLine,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  LineStyle,
  LineType,
  CrosshairMode,
  Time,
} from 'lightweight-charts';
import { CandleData } from '@/utils/chartData';

export type Timeframe = '1h' | '4h' | '1d';

interface CandlestickChartProps {
  candles: CandleData[];
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  onCandleClick: (range: { start: number; end: number } | null) => void;
  selectedRange: { start: number; end: number } | null;
  capTargetBps: number;
  socTargetBps: number;
}

const TIMEFRAMES: Timeframe[] = ['1h', '4h', '1d'];
const TIMEFRAME_MS: Record<Timeframe, number> = {
  '1h': 3_600_000,
  '4h': 14_400_000,
  '1d': 86_400_000,
};

// Fallback hex values — overridden at init time by getCSSVar
const CAP_COLOR_FALLBACK = '#4d9fff62';
const SOC_COLOR_FALLBACK = '#e7282862';

export function CandlestickChart({
  candles,
  timeframe,
  onTimeframeChange,
  onCandleClick,
  selectedRange,
  capTargetBps,
  socTargetBps,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const capVolSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const socVolSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const giniSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const capGoalLineRef = useRef<IPriceLine | null>(null);
  const socGoalLineRef = useRef<IPriceLine | null>(null);
  const capColorRef = useRef(CAP_COLOR_FALLBACK);
  const socColorRef = useRef(SOC_COLOR_FALLBACK);
  const timeframeRef = useRef(timeframe);

  const getCSSVar = useCallback((name: string) => {
    if (typeof window === 'undefined') return '#ffffff';
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#ffffff';
  }, []);

  // Keep timeframeRef current so the stale click-handler closure can read it
  useEffect(() => { timeframeRef.current = timeframe; }, [timeframe]);

  // Initialise chart once
  useEffect(() => {
    if (!containerRef.current) return;

    // Resolve CSS variables to actual hex strings (lightweight-charts can't read CSS vars)
    const bgColor     = getCSSVar('--color-card')   || '#15120f';
    const gridColor   = getCSSVar('--color-border') || '#2a2520';
    const textColor   = getCSSVar('--color-text2')  || '#8a8378';
    const upColor     = getCSSVar('--color-green')  || '#6bcb6e';
    const downColor   = getCSSVar('--color-red')    || '#ff5454';
    const capColor    = getCSSVar('--color-blue-a50')   || CAP_COLOR_FALLBACK;
    const socColor    = getCSSVar('--color-pink-a50')   || SOC_COLOR_FALLBACK;
    const giniColor   = getCSSVar('--color-gold') || '#CC4713';

    capColorRef.current = capColor;
    socColorRef.current = socColor;

    const { offsetWidth: w, offsetHeight: h } = containerRef.current;
    const chart = createChart(containerRef.current, {
      width: w,
      height: h,
      layout: {
        background: { color: bgColor },
        textColor,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: gridColor },
      leftPriceScale: { borderColor: gridColor, visible: true },
      timeScale: { borderColor: gridColor, timeVisible: true, rightBarStaysOnScroll: true },
      handleScroll: true,
      handleScale: true,
    });

    // Price pane — candlesticks (pane 0)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor,
      downColor,
      borderUpColor: upColor,
      borderDownColor: downColor,
      wickUpColor: upColor,
      wickDownColor: downColor,
    });

    // Volume pane — capitalist buyers (positive, pane 1)
    const capVolSeries = chart.addSeries(HistogramSeries, {
      color: capColor,
      priceFormat: { type: 'volume' },
    }, 1);
    capVolSeries.priceScale().applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } });

    // Volume pane — socialist buyers (negative, same pane)
    const socVolSeries = chart.addSeries(HistogramSeries, {
      color: socColor,
      priceFormat: { type: 'volume' },
    }, 1);

    // Gini line — overlaid on volume pane, left scale
    const giniSeries = chart.addSeries(LineSeries, {
      color: giniColor,
      lineWidth: 2,
      lineType: LineType.Curved,
      priceScaleId: 'left',
      priceFormat: { type: 'price', precision: 0, minMove: 1 },
      title: 'Gini BPS',
      lastValueVisible: true,
    }, 1);
    giniSeries.priceScale().applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } });

    chartRef.current = chart;
    giniSeriesRef.current = giniSeries;
    candleSeriesRef.current = candleSeries;
    capVolSeriesRef.current = capVolSeries;
    socVolSeriesRef.current = socVolSeries;

    // Candle click → derive time range from timeframe
    chart.subscribeClick((param) => {
      if (!param.time) {
        onCandleClick(null);
        return;
      }
      const t = (param.time as number) * 1000;
      const tfMs = TIMEFRAME_MS[timeframeRef.current];
      const bucketStart = Math.floor(t / tfMs) * tfMs;
      onCandleClick({ start: bucketStart, end: bucketStart + tfMs });
    });

    const ro = new ResizeObserver(() => {
      if (!containerRef.current) return;
      chart.resize(containerRef.current.offsetWidth, containerRef.current.offsetHeight);
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update series data when candles change
  useEffect(() => {
    if (!candleSeriesRef.current || !capVolSeriesRef.current || !socVolSeriesRef.current || !giniSeriesRef.current) return;
    if (candles.length === 0) return;

    candleSeriesRef.current.setData(
      candles.map((c) => ({
        time: c.time as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    capVolSeriesRef.current.setData(
      candles.map((c) => ({ time: c.time as Time, value: c.capBuyerVolume, color: capColorRef.current }))
    );

    socVolSeriesRef.current.setData(
      candles.map((c) => ({ time: c.time as Time, value: -c.socBuyerVolume, color: socColorRef.current }))
    );

    giniSeriesRef.current.setData(
      candles
        .filter((c) => c.giniBps > 0)
        .map((c) => ({ time: c.time as Time, value: c.giniBps }))
    );
  }, [candles]);

  // Goal lines + fixed scale — re-runs when on-chain targets arrive or change
  useEffect(() => {
    const series = giniSeriesRef.current;
    if (!series || capTargetBps <= 0 || socTargetBps <= 0) return;

    if (capGoalLineRef.current) { series.removePriceLine(capGoalLineRef.current); capGoalLineRef.current = null; }
    if (socGoalLineRef.current) { series.removePriceLine(socGoalLineRef.current); socGoalLineRef.current = null; }

    capGoalLineRef.current = series.createPriceLine({
      price: capTargetBps,
      color: capColorRef.current,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'Bourgeois Goal',
    });
    socGoalLineRef.current = series.createPriceLine({
      price: socTargetBps,
      color: socColorRef.current,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'Proletariat Goal',
    });

    series.applyOptions({
      autoscaleInfoProvider: () => ({
        priceRange: { minValue: socTargetBps - 100, maxValue: capTargetBps + 100 },
      }),
    });
  }, [capTargetBps, socTargetBps]);

  // Highlight selected candle
  useEffect(() => {
    if (!chartRef.current || !selectedRange) return;
    chartRef.current.timeScale().scrollToPosition(0, false);
  }, [selectedRange]);

  return (
    <div className="card-app flex flex-col gap-2 min-w-0 overflow-hidden h-full "
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="h4-app">Price Chart</span>
          {candles.length > 0 && (
            <div className="flex items-center gap-2 text-xs font-mono text-text2">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-sm" style={{ background: 'var(--color-blue)' }} />
                Cap buying
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-sm" style={{ background: 'var(--color-pink)' }} />
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
      {/* containerRef must always be in the DOM so the chart initialisation effect
          ([] deps) finds it on first mount, before candle data arrives. */}
      <div className="relative w-full h-110">
        <div ref={containerRef} className="w-full h-full pt-5" />
        {candles.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-text2 animate-pulse">
            Reading Ledger…
          </div>
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
