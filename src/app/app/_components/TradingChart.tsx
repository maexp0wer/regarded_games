'use client';

import { useRef, useEffect } from 'react';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineStyle,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type UTCTimestamp,
  type MouseEventParams,
} from 'lightweight-charts';
import { CandleData } from '@/utils/chartData';
import { useTheme } from '@/context/ThemeContext';

export type Timeframe = '5m' | '1h' | '4h' | '1d';

interface TradingChartProps {
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

// Every pane's axis lives on the RIGHT (price, gini, volume), so all three scales
// align down the right edge and the left side stays clean. Built-in id 'right' is
// per-pane, so the three panes get independent right scales that don't conflict.
const VOL_SCALE = 'right';
const GINI_SCALE = 'right';

// Height of the separator the library draws between stacked panes, used to offset
// each pane legend to its pane's top.
const PANE_SEPARATOR_PX = 1;

interface ChartColors {
  gridColor: string;
  grid2Color: string;
  card3Color: string;
  text1Color: string; // --color-text (headings) — gini up-candles
  textColor: string;  // --color-text2 (muted) — gini down-candles + layout text
  upColor: string;
  downColor: string;
  upColor2: string;
  downColor2: string;
  capColor: string;
  socColor: string;
}

/** Read the live theme colors from CSS variables (light/dark resolved by `.dark`). */
function readColors(): ChartColors {
  const s = getComputedStyle(document.documentElement);
  const v = (n: string) => s.getPropertyValue(n).trim();
  return {
    gridColor:  v('--color-border')  || '#251F3D',
    grid2Color: v('--color-border2') || '#4C3F7A',
    card3Color: v('--color-card3')   || '#2B2544',
    text1Color: v('--color-text')    || '#FFFFFF',
    textColor:  v('--color-text2')   || '#9E97BD',
    upColor:    v('--color-green')   || '#00F5A0',
    downColor:  v('--color-red')     || '#FF3B69',
    upColor2:    v('--color-text')   || '#00F5A0',
    downColor2:  v('--color-border2')     || '#FF3B69',
    capColor:   v('--color-gold')    || '#FFC300',
    socColor:   v('--color-purple')  || '#9D4EDD',
  };
}

const volFormatter = (val: number) => {
  const abs = Math.abs(val);
  return abs >= 1000 ? `${Math.round(abs / 1000)}k` : String(Math.round(abs));
};

// Gini axis in bps -> k-style labels, matching the GiniCard rail ticks
// (e.g. 5000 -> "5k", 5500 -> "5.5k").
const giniFormatter = (val: number) => {
  if (val % 1000 === 0) return `${val / 1000}k`;
  return `${(val / 1000).toFixed(1)}k`;
};

export function TradingChart({
  candles,
  timeframe,
  onTimeframeChange,
  onCandleClick,
  selectedRange,
  capTargetBps,
  socTargetBps,
}: TradingChartProps) {
  const { darkMode } = useTheme();

  const containerRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);

  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const capSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const socSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const giniSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const capLineRef = useRef<IPriceLine | null>(null);
  const socLineRef = useRef<IPriceLine | null>(null);

  // Per-pane legend overlay nodes (price / gini / volume). JSX-owned divs in the
  // chart container; positioned at each pane's top imperatively (positionLegends).
  const priceLegendRef = useRef<HTMLDivElement | null>(null);
  const giniLegendRef = useRef<HTMLDivElement | null>(null);
  const volLegendRef = useRef<HTMLDivElement | null>(null);

  // time(seconds) -> candle, for the legends and click lookups.
  const dataMapRef = useRef<Map<number, CandleData>>(new Map());
  const latestCandleRef = useRef<CandleData | null>(null);
  const themeRef = useRef<ChartColors | null>(null);
  const didFitRef = useRef(false);
  // The band reposition fn, called from the visible-range subscription + resize.
  const repositionBandRef = useRef<() => void>(() => {});
  // Render all three pane legends for a candle (the hovered one, or latest).
  const renderLegendsRef = useRef<(c: CandleData | null) => void>(() => {});
  // Position the legends at their panes' tops (called on resize / range change).
  const positionLegendsRef = useRef<() => void>(() => {});

  // Prop-mirror refs: the click/crosshair handlers are registered once (in the
  // mount effect) but must read the latest props. Sync every render.
  const timeframeRef = useRef(timeframe);
  const onCandleClickRef = useRef(onCandleClick);
  const capTargetBpsRef = useRef(capTargetBps);
  const socTargetBpsRef = useRef(socTargetBps);
  timeframeRef.current = timeframe;
  onCandleClickRef.current = onCandleClick;
  capTargetBpsRef.current = capTargetBps;
  socTargetBpsRef.current = socTargetBps;

  // ── Create the chart once on mount ───────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const c = readColors();
    themeRef.current = c;

    const chart = createChart(el, {
      width: el.clientWidth,
      height: el.clientHeight,
      autoSize: false,
      layout: {
        background: { color: 'transparent' },
        textColor: c.textColor,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 11,
        attributionLogo: false,
        panes: { separatorColor: c.grid2Color, separatorHoverColor: c.grid2Color },
      },
      grid: {
        // Faint, dotted horizontal lines so the grid recedes behind the bold
        // faction target lines; vertical lines kept as the solid time grid.
        vertLines: { color: c.gridColor },
        horzLines: { color: hexToRgba(c.gridColor, 0.4), style: LineStyle.Dotted },
      },
      rightPriceScale: { borderColor: c.gridColor },
      leftPriceScale: { visible: false },
      timeScale: { borderColor: c.gridColor, timeVisible: true, secondsVisible: false },
      crosshair: { mode: CrosshairMode.Normal },
    });
    chartRef.current = chart;

    // Pane 0 — price candles.
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: c.upColor,
      downColor: c.downColor,
      borderUpColor: c.upColor,
      borderDownColor: c.downColor,
      wickUpColor: c.upColor,
      wickDownColor: c.downColor,
    }, 0);
    candleSeriesRef.current = candleSeries;

    // Pane 1 — Gini candlesticks on the RIGHT scale, so the bps axis reads down
    // the right edge in line with the price axis above. up = --color-text,
    // down = --color-text2 (neutral, distinct from the green/red price candles).
    const giniSeries = chart.addSeries(CandlestickSeries, {
      upColor: c.upColor2,
      downColor: c.downColor2,
      borderUpColor: c.upColor2,
      borderDownColor: c.downColor2,
      wickUpColor: c.upColor2,
      wickDownColor: c.downColor2,
      priceScaleId: GINI_SCALE,
      lastValueVisible: true,   // tag the live Gini on the right axis, like price above
      priceLineVisible: false,
      priceFormat: { type: 'custom', minMove: 1, formatter: giniFormatter },
    }, 1);
    giniSeriesRef.current = giniSeries;

    // Pane 2 — cap buyer volume (positive, gold) on the RIGHT scale. The `k`
    // formatter lives on the series priceFormat; abs() so the negative soc bars
    // also read positive.
    const capSeries = chart.addSeries(HistogramSeries, {
      color: hexToRgba(c.capColor, 0.75),
      priceScaleId: VOL_SCALE,
      base: 0,
      priceFormat: { type: 'custom', minMove: 1, formatter: volFormatter },
    }, 2);
    capSeriesRef.current = capSeries;

    // Pane 2 — soc buyer volume (negative, purple), same shared RIGHT scale.
    const socSeries = chart.addSeries(HistogramSeries, {
      color: hexToRgba(c.socColor, 0.75),
      priceScaleId: VOL_SCALE,
      base: 0,
    }, 2);
    socSeriesRef.current = socSeries;

    // Gini bps axis (pane 1) and volume `k` axis (pane 2), both on the right.
    giniSeries.priceScale().applyOptions({
      visible: true,
      borderColor: c.gridColor,
      scaleMargins: { top: 0.1, bottom: 0.1 },
    });
    capSeries.priceScale().applyOptions({
      visible: true,
      borderColor: c.gridColor,
      scaleMargins: { top: 0.1, bottom: 0.1 },
    });

    // Pane heights price : gini : volume ≈ 3 : 2 : 1.5 (price dominant, gini
    // readable, volume compact). Panes exist only once their series are added.
    const panes = chart.panes();
    if (panes.length > 2) {
      panes[0].setStretchFactor(3);
      panes[1].setStretchFactor(2);
      panes[2].setStretchFactor(1.5);
    }

    // TradingView-style per-pane legend overlays: a small info line top-left of
    // each pane. The legend divs live in our own (position:relative) container
    // (see JSX); we position each at its pane's top using cumulative pane heights,
    // which is robust regardless of the library's internal pane DOM. Updated on
    // crosshair hover (and defaults to the latest candle).
    const positionLegends = () => {
      const ps = chart.panes();
      const els = [priceLegendRef.current, giniLegendRef.current, volLegendRef.current];
      let top = 0;
      for (let i = 0; i < els.length; i++) {
        const el = els[i];
        const h = ps[i]?.getHeight() ?? 0;
        if (el) el.style.top = `${top + 6}px`;
        top += h + PANE_SEPARATOR_PX; // panes are stacked with a 1px separator
      }
    };
    positionLegendsRef.current = positionLegends;

    const renderLegends = (c: CandleData | null) => {
      const colors = themeRef.current;
      if (!colors) return;
      const priceEl = priceLegendRef.current;
      const giniEl = giniLegendRef.current;
      const volEl = volLegendRef.current;
      if (priceEl) priceEl.innerHTML = c ? priceLegendHtml(c, colors, timeframeRef.current) : '';
      if (giniEl) giniEl.innerHTML = c ? giniLegendHtml(c, colors) : '';
      if (volEl) volEl.innerHTML = c ? volLegendHtml(c, colors) : '';
      positionLegends();
    };
    renderLegendsRef.current = renderLegends;

    // Click a candle -> select its period; empty space -> clear. param.time is the
    // candle's series time in seconds, == candle.time, so start === candle.time*1000.
    const handleClick = (param: MouseEventParams) => {
      const onClick = onCandleClickRef.current;
      const t = param.time as number | undefined;
      if (t == null || !dataMapRef.current.has(t)) {
        onClick(null);
        return;
      }
      const start = t * 1000;
      onClick({ start, end: start + TIMEFRAME_MS[timeframeRef.current] });
    };
    chart.subscribeClick(handleClick);

    // Hover updates all three legends to the crosshair candle; off the chart they
    // fall back to the latest candle (TradingView's resting-legend behaviour).
    const handleCrosshair = (param: MouseEventParams) => {
      const t = param.time as number | undefined;
      const hovered = t != null ? dataMapRef.current.get(t) : undefined;
      renderLegendsRef.current((hovered ?? latestCandleRef.current) ?? null);
    };
    chart.subscribeCrosshairMove(handleCrosshair);

    // Seed + position the legends (data may not be in yet; the data effect will
    // re-render once it loads).
    renderLegends(latestCandleRef.current);
    positionLegends();

    // Keep the selection band aligned while panning/zooming the time scale.
    chart.timeScale().subscribeVisibleTimeRangeChange(() => repositionBandRef.current());

    return () => {
      chart.unsubscribeClick(handleClick);
      chart.unsubscribeCrosshairMove(handleCrosshair);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      capSeriesRef.current = null;
      socSeriesRef.current = null;
      giniSeriesRef.current = null;
      capLineRef.current = null;
      socLineRef.current = null;
      // Legend nodes are JSX-owned (in our container), so React manages them — do
      // not null them here.
      didFitRef.current = false;
    };
  }, []);

  // ── Push data on candle / timeframe change ───────────────────────────────
  useEffect(() => {
    const chart = chartRef.current;
    const colors = themeRef.current;
    if (!chart || !colors) return;

    const candleData = candles.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    const capData = candles.map((c) => ({
      time: c.time as UTCTimestamp,
      value: c.capBuyerVolume,
      color: hexToRgba(colors.capColor, 0.75),
    }));
    const socData = candles.map((c) => ({
      time: c.time as UTCTimestamp,
      value: -c.socBuyerVolume,
      color: hexToRgba(colors.socColor, 0.75),
    }));
    // Gini candles: only buckets with a real sample (giniBps>0) get a body; no-sample
    // buckets are omitted → gaps, mirroring the price candles. giniBps is the close.
    const giniData = candles
      .filter((c) => c.giniBps > 0)
      .map((c) => ({
        time: c.time as UTCTimestamp,
        open: c.giniOpen,
        high: c.giniHigh,
        low: c.giniLow,
        close: c.giniBps,
      }));

    dataMapRef.current = new Map(candles.map((c) => [c.time, c]));
    latestCandleRef.current = candles.length > 0 ? candles[candles.length - 1] : null;

    candleSeriesRef.current?.setData(candleData);
    capSeriesRef.current?.setData(capData);
    socSeriesRef.current?.setData(socData);
    giniSeriesRef.current?.setData(giniData);

    // Frame the data once; never on the 5s refetch, which would yank the viewport.
    if (!didFitRef.current && candles.length > 0) {
      chart.timeScale().fitContent();
      didFitRef.current = true;
    }
    repositionBandRef.current();
    renderLegendsRef.current(latestCandleRef.current); // refresh the resting legends
  }, [candles, timeframe]);

  // ── Cap/Soc target price lines (recolor with theme too) ──────────────────
  // Reads colors fresh (not themeRef) so it doesn't depend on the theme effect,
  // defined later, having run first on a dark-mode flip.
  useEffect(() => {
    const gini = giniSeriesRef.current;
    if (!chartRef.current || !gini) return;
    const colors = readColors();

    if (capLineRef.current) { gini.removePriceLine(capLineRef.current); capLineRef.current = null; }
    if (socLineRef.current) { gini.removePriceLine(socLineRef.current); socLineRef.current = null; }

    if (capTargetBps > 0 && socTargetBps > 0) {
      // Solid, full-color target lines with their value labelled on the right axis.
      capLineRef.current = gini.createPriceLine({
        price: capTargetBps,
        color: colors.capColor,
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        axisLabelColor: colors.capColor,
        axisLabelTextColor: colors.card3Color,
      });
      socLineRef.current = gini.createPriceLine({
        price: socTargetBps,
        color: colors.socColor,
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        axisLabelColor: colors.socColor,
        axisLabelTextColor: colors.card3Color,
      });
    }
  }, [capTargetBps, socTargetBps, darkMode]);

  // ── Re-apply theme colors when dark mode flips ───────────────────────────
  // ThemeContext toggles the `.dark` class synchronously before this effect runs,
  // so getComputedStyle here reads the new palette.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const c = readColors();
    themeRef.current = c;

    chart.applyOptions({
      layout: { textColor: c.textColor, panes: { separatorColor: c.grid2Color, separatorHoverColor: c.grid2Color } },
      grid: {
        vertLines: { color: c.gridColor },
        horzLines: { color: hexToRgba(c.gridColor, 0.4), style: LineStyle.Dotted },
      },
      rightPriceScale: { borderColor: c.gridColor },
      timeScale: { borderColor: c.gridColor },
    });
    candleSeriesRef.current?.applyOptions({
      upColor: c.upColor,
      downColor: c.downColor,
      borderUpColor: c.upColor,
      borderDownColor: c.downColor,
      wickUpColor: c.upColor,
      wickDownColor: c.downColor,
    });
    capSeriesRef.current?.applyOptions({ color: hexToRgba(c.capColor, 0.75) });
    socSeriesRef.current?.applyOptions({ color: hexToRgba(c.socColor, 0.75) });
    giniSeriesRef.current?.applyOptions({
      upColor: c.upColor2,
      downColor: c.downColor2,
      borderUpColor: c.upColor2,
      borderDownColor: c.downColor2,
      wickUpColor: c.upColor2,
      wickDownColor: c.downColor2,
    });
    capSeriesRef.current?.priceScale().applyOptions({ borderColor: c.gridColor });
    giniSeriesRef.current?.priceScale().applyOptions({ borderColor: c.gridColor });
    repositionBandRef.current(); // recolor the selection band with the new palette
    renderLegendsRef.current(latestCandleRef.current); // recolor the legends
  }, [darkMode]);

  // ── Selection band overlay (no native markArea in lightweight-charts) ─────
  useEffect(() => {
    const reposition = () => {
      const band = bandRef.current;
      const chart = chartRef.current;
      if (!band) return;
      if (!chart || !selectedRange) { band.style.display = 'none'; return; }
      const ts = chart.timeScale();
      const startSec = (selectedRange.start / 1000) as UTCTimestamp;
      const endSec = (selectedRange.end / 1000) as UTCTimestamp;
      const x1 = ts.timeToCoordinate(startSec);
      const x2 = ts.timeToCoordinate(endSec);
      if (x1 == null || x2 == null) { band.style.display = 'none'; return; }
      const left = Math.min(x1, x2);
      const width = Math.max(2, Math.abs(x2 - x1));
      const soc = themeRef.current?.socColor ?? '#9D4EDD';
      band.style.left = `${left}px`;
      band.style.width = `${width}px`;
      band.style.background = hexToRgba(soc, 0.1);
      band.style.borderLeft = `1px solid ${hexToRgba(soc, 0.25)}`;
      band.style.borderRight = `1px solid ${hexToRgba(soc, 0.25)}`;
      band.style.display = 'block';
    };
    repositionBandRef.current = reposition;
    reposition();
  }, [selectedRange, timeframe, candles]);

  // ── Smooth responsive resize (the whole point of the rewrite) ────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      chartRef.current?.applyOptions({ width: Math.round(width), height: Math.round(height) });
      repositionBandRef.current();
      positionLegendsRef.current(); // pane heights changed → re-anchor legends
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="flex flex-col bg-card rounded-xl overflow-hidden h-full">
      {/* TradingView-style toolbar strip: timeframe pills top-left, live dot.
          The instrument title lives in the price-pane legend, so it isn't repeated
          here. Thin and borderless so it reads as chart chrome, not a header. */}
      <div className="flex items-center gap-2 px-2 pt-4 pb-2 border-b border-border">
        <TimeframeSelector value={timeframe} onChange={onTimeframeChange} />
        <span className="w-1.5 h-1.5 rounded-full bg-green shadow-[0_0_8px_var(--color-green-35)] animate-pulse" />
      </div>

      {/* Fills the remaining height of the chart card and shrinks with it, so the
          panel stays fully visible when the viewport-locked row compresses. The
          card root is a bounded flex column, so flex-1 resolves; standalone
          callers must give the card a height (see SeasonChart). The chart canvas
          is appended directly into this div by lightweight-charts.
          `data-chrome-scroll-guard="always"`: the chart owns the wheel to zoom/pan,
          so a wheel here must never fold the season-page chrome (see seasonChromeReveal). */}
      <div
        ref={containerRef}
        data-chrome-scroll-guard="always"
        className="relative w-full flex-1 min-h-0 pl-3"
      >
        {/* Selection band: a translucent vertical highlight over the clicked
            candle, positioned imperatively against the time scale. */}
        <div
          ref={bandRef}
          className="absolute top-0 bottom-0 z-10 pointer-events-none"
          style={{ display: 'none' }}
        />
        {/* Per-pane legend overlays. `top` is set imperatively to each pane's top
            (positionLegends); content is set on hover / latest candle. */}
        <div ref={priceLegendRef} className="absolute left-5 z-20 pointer-events-none font-mono text-[11px] leading-snug whitespace-nowrap tabular-nums" />
        <div ref={giniLegendRef}  className="absolute left-5 z-20 pointer-events-none font-mono text-[11px] leading-snug whitespace-nowrap tabular-nums" />
        <div ref={volLegendRef}   className="absolute left-5 z-20 pointer-events-none font-mono text-[11px] leading-snug whitespace-nowrap tabular-nums" />
      </div>
    </div>
  );
}

// ── Pane legend builders (TradingView-style top-left info line per pane) ──────

const fmtNum = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
const fmtVol = (n: number) => {
  const a = Math.abs(n);
  return a >= 1000 ? `${(a / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k` : fmtNum(a);
};
/** A `Label value` pair; value colored, label muted. */
const legendItem = (label: string, value: string, color: string, muted: string) =>
  `<span style="color:${muted};margin-right:3px">${label}</span><span style="color:${color};font-weight:600">${value}</span>`;
/** The bold pane title prefix. */
const legendTitle = (text: string, color: string) =>
  `<span style="color:${color};font-weight:700;margin-right:8px">${text}</span>`;

/** Price pane: "FIM/USDC · <tf>" + O H L C colored by direction + change. */
function priceLegendHtml(c: CandleData, colors: ChartColors, tf: Timeframe): string {
  const { text1Color, textColor, upColor, downColor } = colors;
  const up = c.close >= c.open;
  const dir = up ? upColor : downColor;
  const chg = c.close - c.open;
  const chgPct = c.open !== 0 ? (chg / c.open) * 100 : 0;
  const sign = chg >= 0 ? '+' : '';
  return (
    legendTitle(`FIM/USDC · ${tf.toUpperCase()}`, text1Color) +
    legendItem('O', fmtNum(c.open), dir, textColor) + ' ' +
    legendItem('H', fmtNum(c.high), dir, textColor) + ' ' +
    legendItem('L', fmtNum(c.low), dir, textColor) + ' ' +
    legendItem('C', fmtNum(c.close), dir, textColor) +
    `<span style="color:${dir};font-weight:600;margin-left:8px">${sign}${fmtNum(chg)} (${sign}${fmtNum(chgPct)}%)</span>`
  );
}

/** Gini pane: "Gini" + O H L C in bps + change/percentage (neutral coloring). */
function giniLegendHtml(c: CandleData, colors: ChartColors): string {
  const { text1Color, textColor } = colors;
  if (c.giniBps <= 0) {
    return legendTitle('Gini', text1Color) + `<span style="color:${textColor}">—</span>`;
  }
  const dir = c.giniBps >= c.giniOpen ? text1Color : textColor;
  const chg = c.giniBps - c.giniOpen;
  const chgPct = c.giniOpen !== 0 ? (chg / c.giniOpen) * 100 : 0;
  const sign = chg >= 0 ? '+' : '';
  return (
    legendTitle('Gini', text1Color) +
    legendItem('O', fmtNum(c.giniOpen), dir, textColor) + ' ' +
    legendItem('H', fmtNum(c.giniHigh), dir, textColor) + ' ' +
    legendItem('L', fmtNum(c.giniLow), dir, textColor) + ' ' +
    legendItem('C', fmtNum(c.giniBps), dir, textColor) +
    `<span style="color:${textColor};margin-left:4px">bps</span>` +
    `<span style="color:${dir};font-weight:600;margin-left:8px">${sign}${fmtNum(chg)} (${sign}${fmtNum(chgPct)}%)</span>`
  );
}

/** Volume pane: "Volume" + total, then (capitalist · proletarian) in faction colors. */
function volLegendHtml(c: CandleData, colors: ChartColors): string {
  const { text1Color, textColor, capColor, socColor } = colors;
  const total = c.capBuyerVolume + c.socBuyerVolume;
  return (
    legendTitle('Volume', text1Color) +
    `<span style="color:${text1Color};font-weight:600">${fmtVol(total)}</span>` +
    `<span style="color:${textColor};margin-left:6px">(</span>` +
    `<span style="color:${capColor};font-weight:600">${fmtVol(c.capBuyerVolume)}</span>` +
    `<span style="color:${textColor};margin:0 4px">·</span>` +
    `<span style="color:${socColor};font-weight:600">${fmtVol(c.socBuyerVolume)}</span>` +
    `<span style="color:${textColor}">)</span>`
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
    <div className="flex items-center gap-0.5">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf}
          onClick={() => onChange(tf)}
          className={`px-2 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wide rounded transition-colors duration-150 ${
            value === tf
              ? 'bg-card3 text-text'
              : 'text-text2 hover:bg-card2 hover:text-text'
          }`}
        >
          {tf}
        </button>
      ))}
    </div>
  );
}
