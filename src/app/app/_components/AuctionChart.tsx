'use client';

import { useRef, useEffect } from 'react';
import {
  createChart,
  AreaSeries,
  HistogramSeries,
  LineStyle,
  LineType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
  type MouseEventParams,
} from 'lightweight-charts';
import { AuctionPoint } from '@/utils/chartData';
import { useTheme } from '@/context/ThemeContext';
import type { Timeframe } from './TradingChart';

interface AuctionChartProps {
  points: AuctionPoint[];
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
}

const TIMEFRAMES: Timeframe[] = ['5m', '1h', '4h', '1d'];

function hexToRgba(hex: string, alpha: number): string {
  if (!hex.startsWith('#') || hex.length < 7) return `rgba(255,255,255,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Both panes' axes live on the RIGHT so the two scales align down the right edge,
// matching the TradingChart layout. Built-in 'right' is per-pane.
const VOL_SCALE = 'right';

// Height of the separator the library draws between stacked panes, used to offset
// each pane legend to its pane's top.
const PANE_SEPARATOR_PX = 1;

const BAR_SPACING_PX = 20;

interface ChartColors {
  gridColor: string;
  grid2Color: string;
  card3Color: string;
  text1Color: string; // --color-text — prize-pool line + fill
  textColor: string;  // --color-text2 — muted labels / axis text
  volColor: string;   // --color-green — volume bars
  fontFamily: string; // --font-mono — canvas can't read CSS vars, so resolve here
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
    volColor:   v('--color-green')   || '#00F5A0',
    fontFamily: v('--font-mono')     || 'monospace',
  };
}

const volFormatter = (val: number) => {
  const abs = Math.abs(val);
  return abs >= 1000 ? `${Math.round(abs / 1000)}k` : String(Math.round(abs));
};

// Prize pool axis: compact USDC, $-prefixed (e.g. 5200 -> "$5.2k").
const poolFormatter = (val: number) => {
  const abs = Math.abs(val);
  if (abs >= 1000) {
    const k = abs / 1000;
    return `$${k % 1 === 0 ? k : k.toFixed(1)}k`;
  }
  return `$${Math.round(abs)}`;
};

export function AuctionChart({ points, timeframe, onTimeframeChange }: AuctionChartProps) {
  const { darkMode } = useTheme();

  // sizeRef is the pure-layout sizing box; containerRef (the chart mount) is
  // absolutely positioned inside it so the injected canvas never contributes to
  // layout and can't hold the box open when the viewport narrows.
  const sizeRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const chartRef = useRef<IChartApi | null>(null);
  const poolSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const mintSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  // Per-pane legend overlay nodes (prize pool / mints). JSX-owned divs in the
  // chart container; positioned at each pane's top imperatively.
  const poolLegendRef = useRef<HTMLDivElement | null>(null);
  const mintLegendRef = useRef<HTMLDivElement | null>(null);

  // time(seconds) -> point, for the legends.
  const dataMapRef = useRef<Map<number, AuctionPoint>>(new Map());
  const latestPointRef = useRef<AuctionPoint | null>(null);
  const themeRef = useRef<ChartColors | null>(null);
  const didFitRef = useRef(false);
  const renderLegendsRef = useRef<(p: AuctionPoint | null) => void>(() => {});
  const positionLegendsRef = useRef<() => void>(() => {});

  // ── Create the chart once on mount ───────────────────────────────────────
    useEffect(() => {
    const el = containerRef.current;
    const box = sizeRef.current;
    if (!el || !box) return;

    const c = readColors();
    themeRef.current = c;

    const chart = createChart(el, {
      // Size from the layout box, not the (absolutely positioned) mount element.
      width: box.clientWidth,
      height: box.clientHeight,
      autoSize: false,
      layout: {
        background: { color: 'transparent' },
        textColor: c.textColor,
        fontFamily: c.fontFamily,
        fontSize: 11,
        attributionLogo: false,
        panes: {
          separatorColor: c.grid2Color,
          separatorHoverColor: c.grid2Color,
        },
      },
      grid: {
        vertLines: { color: c.gridColor },
        horzLines: { color: hexToRgba(c.gridColor, 0.4), style: LineStyle.Dotted },
      },
      rightPriceScale: { borderColor: c.gridColor },
      leftPriceScale: { visible: false },
      timeScale: {
        borderColor: c.gridColor,
        timeVisible: true,
        secondsVisible: false,
        barSpacing: BAR_SPACING_PX,
        fixLeftEdge: false,
        rightOffset: 0,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
    });
    chartRef.current = chart;

    const poolSeries = chart.addSeries(AreaSeries, {
      lineColor: c.text1Color,
      lineWidth: 2,
      lineType: LineType.Curved,
      topColor: hexToRgba(c.text1Color, 0.4),
      bottomColor: hexToRgba(c.text1Color, 0.02),
      priceLineVisible: false,
      priceFormat: { type: 'custom', minMove: 1, formatter: poolFormatter },
    }, 0);
    poolSeriesRef.current = poolSeries;

    const mintSeries = chart.addSeries(HistogramSeries, {
      color: c.volColor,
      priceScaleId: VOL_SCALE,
      base: 0,
      priceFormat: { type: 'custom', minMove: 1, formatter: volFormatter },
    }, 1);
    mintSeriesRef.current = mintSeries;

    poolSeries.priceScale().applyOptions({
      visible: true,
      borderColor: c.gridColor,
      scaleMargins: { top: 0.12, bottom: 0 }, // fill anchors to the pane floor
    });
    mintSeries.priceScale().applyOptions({
      visible: true,
      borderColor: c.gridColor,
      scaleMargins: { top: 0.1, bottom: 0.1 },
    });

    // Pane heights pool : mints ≈ 3 : 1.5 (pool dominant, volume compact),
    // mirroring the TradingChart price : volume ratio.
    const panes = chart.panes();
    if (panes.length > 1) {
      panes[0].setStretchFactor(3);
      panes[1].setStretchFactor(1.5);
    }

    // Per-pane legend overlays positioned at each pane's top via cumulative
    // pane heights (robust regardless of the library's internal pane DOM).
    const positionLegends = () => {
      const ps = chart.panes();
      const els = [poolLegendRef.current, mintLegendRef.current];
      // Pane 0 legend clears the timeframe selector overlay (≈ top-3 + ~28px height).
      const pane0Offset = 44;
      let top = 0;
      for (let i = 0; i < els.length; i++) {
        const elx = els[i];
        const h = ps[i]?.getHeight() ?? 0;
        if (elx) elx.style.top = `${top + (i === 0 ? pane0Offset : 6)}px`;
        top += h + PANE_SEPARATOR_PX;
      }
    };
    positionLegendsRef.current = positionLegends;

    const renderLegends = (p: AuctionPoint | null) => {
      const colors = themeRef.current;
      if (!colors) return;
      const poolEl = poolLegendRef.current;
      const mintEl = mintLegendRef.current;
      if (poolEl) poolEl.innerHTML = p ? poolLegendHtml(p, colors) : '';
      if (mintEl) mintEl.innerHTML = p ? mintLegendHtml(p, colors) : '';
      positionLegends();
    };
    renderLegendsRef.current = renderLegends;

    // Hover updates the legends to the crosshair bucket; off-chart falls back to
    // the latest bucket (TradingView's resting-legend behaviour).
    const handleCrosshair = (param: MouseEventParams) => {
      const t = param.time as number | undefined;
      const hovered = t != null ? dataMapRef.current.get(t) : undefined;
      renderLegendsRef.current((hovered ?? latestPointRef.current) ?? null);
    };
    chart.subscribeCrosshairMove(handleCrosshair);

    renderLegends(latestPointRef.current);
    positionLegends();

    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshair);
      chart.remove();
      chartRef.current = null;
      poolSeriesRef.current = null;
      mintSeriesRef.current = null;
      didFitRef.current = false;
    };
  }, []);

  // ── Push data on point / timeframe change ────────────────────────────────
 useEffect(() => {
    const chart = chartRef.current;
    // Safely declare 'colors' to avoid compilation issues
    const colors = themeRef.current || readColors(); 
    if (!chart || !colors) return;

    // 1. Map Area Series: Ensure whitespace points ONLY contain the "time" property
    const poolData = points.map((p) => {
      if (p.prizePool === undefined) {
        return { time: p.time as UTCTimestamp }; // Clean whitespace item
      }
      return {
        time: p.time as UTCTimestamp,
        value: p.prizePool,
      };
    });

    // 2. Map Histogram Series: Ensure whitespace points ONLY contain the "time" property
    const mintData = points.map((p) => {
      if (p.mintVolume === undefined) {
        return { time: p.time as UTCTimestamp }; // Clean whitespace item
      }
      return {
        time: p.time as UTCTimestamp,
        value: p.mintVolume,
        color: hexToRgba(colors.volColor, 0.75), // Now 'colors' is guaranteed to exist
      };
    });

    dataMapRef.current = new Map(points.map((p) => [p.time, p]));
    latestPointRef.current = points.length > 0 ? points[points.length - 1] : null;

    poolSeriesRef.current?.setData(poolData);
    mintSeriesRef.current?.setData(mintData);

    // Frame the data once; never on the 5s refetch, which would yank the viewport.
    if (!didFitRef.current && points.length > 0) {
      chart.timeScale().applyOptions({ barSpacing: BAR_SPACING_PX });
      chart.timeScale().scrollToRealTime();
      didFitRef.current = true;
    }
    renderLegendsRef.current(latestPointRef.current);
  }, [points, timeframe]);

  // ── Re-apply theme colors when dark mode flips ───────────────────────────
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
    poolSeriesRef.current?.applyOptions({
      lineColor: c.text1Color,
      topColor: hexToRgba(c.text1Color, 0.4),
      bottomColor: hexToRgba(c.text1Color, 0.02),
    });
    mintSeriesRef.current?.applyOptions({ color: c.volColor });
    poolSeriesRef.current?.priceScale().applyOptions({ borderColor: c.gridColor });
    mintSeriesRef.current?.priceScale().applyOptions({ borderColor: c.gridColor });
    renderLegendsRef.current(latestPointRef.current);
  }, [darkMode]);

  // ── Smooth responsive resize ─────────────────────────────────────────────
  // Observe the pure-layout sizing box. The chart mount (containerRef) is
  // absolutely positioned, so the injected canvas never holds the box open — it
  // shrinks freely with the card and reports the true width as the viewport narrows.
  useEffect(() => {
    const box = sizeRef.current;
    if (!box) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      chartRef.current?.applyOptions({ width: Math.round(width), height: Math.round(height) });
      positionLegendsRef.current();
    });
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="terminal-pane terminal-pane--flush h-full overflow-hidden p-0! flex flex-col">
      {/* Toolbar strip — mirrors TradingChart: timeframe pills left, live dot. */}
      <div className="flex items-center gap-2 pl-5 pr-2 pt-4 pb-2 border-b border-border">
        <TimeframeSelector value={timeframe} onChange={onTimeframeChange} />
        <span className="w-1.5 h-1.5 rounded-full bg-green shadow-[0_0_8px_var(--color-green-35)] animate-pulse" />
      </div>

      {/* Pure-layout sizing box: shrinks with the card. The chart mount is
          absolutely positioned inside it so the injected canvas can't hold it open. */}
      <div ref={sizeRef} className="relative w-full flex-1 min-h-0 min-w-0">
        <div
          ref={containerRef}
          data-chrome-scroll-guard="always"
          className="absolute inset-0"
        >
          {/* Per-pane legend overlays; `top` set imperatively to each pane's top. */}
          <div ref={poolLegendRef} className="absolute left-5 z-20 pointer-events-none font-mono text-[11px] leading-snug whitespace-nowrap tabular-nums" />
          <div ref={mintLegendRef} className="absolute left-5 z-20 pointer-events-none font-mono text-[11px] leading-snug whitespace-nowrap tabular-nums" />
        </div>
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

/** Prize-pool pane: "Prize Pool" label + cumulative total in USDC. */
function poolLegendHtml(p: AuctionPoint, colors: ChartColors): string {
  const { text1Color, textColor } = colors;
  return (
    legendTitle('Prize Pool', text1Color) +
    legendItem('$', fmtNum(p.prizePool), text1Color, textColor)
  );
}

/** Volume pane: "Volume" + FIM minted in the bucket. */
function mintLegendHtml(p: AuctionPoint, colors: ChartColors): string {
  const { text1Color, textColor, volColor } = colors;
  return (
    legendTitle('Volume', text1Color) +
    legendItem('FIM', fmtVol(p.mintVolume), volColor, textColor)
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
