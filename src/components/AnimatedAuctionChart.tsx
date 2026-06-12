'use client';

import { useEffect, useRef } from 'react';
import {
  createChart,
  AreaSeries,
  HistogramSeries,
  LineType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';

/** One decorative bucket — no live data, generated in-component. */
interface DecorativePoint {
  time: number;        // Unix seconds, bucket start
  prizePool: number;   // cumulative pool (decorative)
  mintVolume: number;  // per-bucket volume (decorative)
}

interface AnimatedAuctionChartProps {
  isHovered: boolean;
}

interface ChartColors {
  text1Color: string;
  volColor: string;
}

function hexToRgba(hex: string, alpha: number): string {
  if (!hex.startsWith('#') || hex.length < 7) return `rgba(255,255,255,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const DARK_COLORS: ChartColors = {
  text1Color: '#FFFFFF',
  volColor:   '#00F5A0',
};

const STEP = 3600; // 1h buckets
const TOTAL_POINTS = 60;

function buildRestingPoints(progress: number, seed: number[]): DecorativePoint[] {
  const baseTime = Math.floor(Date.now() / 1000) - TOTAL_POINTS * STEP;
  const mid = Math.floor(TOTAL_POINTS / 2);
  const revealCount = Math.round(progress * TOTAL_POINTS);

  const points: DecorativePoint[] = [];
  let pool = 0;
  for (let i = 0; i < TOTAL_POINTS; i++) {
    if (i >= mid) {
      pool += seed[i] * 1500 + 300;
    }
    const revealed = i < revealCount;
    points.push({
      time: baseTime + i * STEP,
      prizePool: revealed ? pool : 0,
      mintVolume: revealed && i >= mid ? Math.floor(seed[i] * 4000) + 800 : 0,
    });
  }
  return points;
}

export default function AnimatedAuctionChart({ isHovered }: AnimatedAuctionChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const poolSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const mintSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const seedRef = useRef<number[]>([]);
  const pointsRef = useRef<DecorativePoint[]>([]);

  // ── Create the chart once on mount ───────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const c = DARK_COLORS;

    const chart = createChart(el, {
      width: el.clientWidth,
      height: el.clientHeight,
      autoSize: false,
      layout: {
        background: { color: 'transparent' },
        textColor: 'transparent',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 11,
        attributionLogo: false,
        panes: { separatorColor: 'transparent', separatorHoverColor: 'transparent' },
      },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: { visible: false },
      leftPriceScale: { visible: false },
      timeScale: { visible: false, barSpacing: 3 },
      crosshair: { mode: CrosshairMode.Normal, vertLine: { visible: false }, horzLine: { visible: false } },
      handleScroll: false,
      handleScale: false,
    });
    chartRef.current = chart;

    const poolSeries = chart.addSeries(AreaSeries, {
      lineColor: c.text1Color,
      lineWidth: 2,
      lineType: LineType.Curved,
      topColor: hexToRgba(c.text1Color, 0.4),
      bottomColor: hexToRgba(c.text1Color, 0.02),
      priceLineVisible: false,
      lastValueVisible: false,
    }, 0);
    poolSeriesRef.current = poolSeries;

    const mintSeries = chart.addSeries(HistogramSeries, {
      color: c.volColor,
      priceScaleId: 'right',
      base: 0,
      lastValueVisible: false,
    }, 1);
    mintSeriesRef.current = mintSeries;

    poolSeries.priceScale().applyOptions({ visible: false, scaleMargins: { top: 0.12, bottom: 0 } });
    mintSeries.priceScale().applyOptions({ visible: false, scaleMargins: { top: 0.1, bottom: 0.1 } });

    const panes = chart.panes();
    if (panes.length > 1) {
      panes[0].setStretchFactor(3);
      panes[1].setStretchFactor(1.5);
    }

    return () => {
      chart.remove();
      chartRef.current = null;
      poolSeriesRef.current = null;
      mintSeriesRef.current = null;
    };
  }, []);

  // ── Push the current points to the series ────────────────────────────────
  const pushPoints = (points: DecorativePoint[]) => {
    poolSeriesRef.current?.setData(
      points.map((p) => ({ time: p.time as UTCTimestamp, value: p.prizePool })),
    );
    mintSeriesRef.current?.setData(
      points.map((p) => ({
        time: p.time as UTCTimestamp,
        value: p.mintVolume,
        color: hexToRgba(DARK_COLORS.volColor, 0.75),
      })),
    );
    pointsRef.current = points;
    chartRef.current?.timeScale().fitContent();
  };

  // ── Intro draw: reveal the resting curve left→right over ~3.2s ─────
  useEffect(() => {
    seedRef.current = Array.from({ length: TOTAL_POINTS }, () => Math.random());
    const seed = seedRef.current;

    const DURATION = 3200;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / DURATION);
      pushPoints(buildRestingPoints(progress, seed));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── Hover: gently advance the line; freezes on unhover ───────────────────
  useEffect(() => {
    if (!isHovered) return;

    let points =
      pointsRef.current.length > 0
        ? [...pointsRef.current]
        : buildRestingPoints(1, seedRef.current);

    const interval = setInterval(() => {
      const last = points[points.length - 1];
      const nextPool = last.prizePool + Math.random() * 1500 + 300;
      const nextVolume = Math.floor(Math.random() * 4000) + 800;
      points = [
        ...points.slice(1),
        { time: last.time + STEP, prizePool: nextPool, mintVolume: nextVolume },
      ];
      pushPoints(points);
    }, 600);

    return () => clearInterval(interval);
  }, [isHovered]);

  // ── Smooth responsive resize ─────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      chartRef.current?.applyOptions({ width: Math.round(width), height: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
}
