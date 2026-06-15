'use client';

import { useEffect, useRef, useState } from 'react';
import { useSeasonFimDistribution } from '@/hooks/useSeasonFimDistribution';
import { useTheme } from '@/context/ThemeContext';

interface FimDistributionChartProps {
  seasonAddress: string;
  exchangeAddress?: string;
}

function getCSSVar(name: string): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '');
  if (clean.length < 6) return null;
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

interface ColorStops {
  purple: { r: number; g: number; b: number };
  magenta: { r: number; g: number; b: number };
  orange: { r: number; g: number; b: number };
  gold: { r: number; g: number; b: number };
}

function readColorStops(): ColorStops | null {
  const purple = hexToRgb(getCSSVar('--color-purple'));
  const magenta = hexToRgb(getCSSVar('--color-magenta'));
  const orange = hexToRgb(getCSSVar('--color-orange'));
  const gold = hexToRgb(getCSSVar('--color-gold'));
  if (!purple || !magenta || !orange || !gold) return null;
  return { purple, magenta, orange, gold };
}

function interpolateSunset(stops: ColorStops, t: number): string {
  const tc = Math.max(0, Math.min(1, t));
  const segments = [
    { pos: 0,    c: stops.purple  },
    { pos: 0.45, c: stops.magenta },
    { pos: 0.75, c: stops.orange  },
    { pos: 1,    c: stops.gold    },
  ];
  for (let i = 0; i < segments.length - 1; i++) {
    const s0 = segments[i];
    const s1 = segments[i + 1];
    if (tc <= s1.pos) {
      const span = s1.pos - s0.pos;
      const u = span > 0 ? (tc - s0.pos) / span : 0;
      const r = Math.round(s0.c.r + u * (s1.c.r - s0.c.r));
      const g = Math.round(s0.c.g + u * (s1.c.g - s0.c.g));
      const b = Math.round(s0.c.b + u * (s1.c.b - s0.c.b));
      return `rgba(${r},${g},${b},0.8)`;
    }
  }
  const last = segments[segments.length - 1];
  return `rgba(${last.c.r},${last.c.g},${last.c.b},0.8)`;
}

const fmtFim = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(0);
};

export function FimDistributionChart({ seasonAddress, exchangeAddress }: FimDistributionChartProps) {
  const { darkMode } = useTheme();
  const { bars, isLoading } = useSeasonFimDistribution(seasonAddress, exchangeAddress);
  const [hoveredBucket, setHoveredBucket] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const colorsRef = useRef<ColorStops | null>(null);
  const [, forceUpdate] = useState(0);

  // Read CSS vars on mount and when dark mode changes
  useEffect(() => {
    colorsRef.current = readColorStops();
    forceUpdate((n) => n + 1);
  }, [darkMode]);

  const getBarColor = (bucket: number): string => {
    const t = bucket / 39;
    if (!colorsRef.current) return `rgba(128,128,128,0.5)`;
    return interpolateSunset(colorsRef.current, t);
  };

  const maxFim = Math.max(...bars.map((b) => b.fimAmount), 1);
  const hoveredBar = hoveredBucket !== null ? bars[hoveredBucket] : null;

  return (
    <div className="terminal-pane terminal-pane--flush h-full overflow-hidden flex flex-col">
      <div className="terminal-pane-header">
        <span className="terminal-pane-title">FIM DISTRIBUTION</span>
        <span className="w-1.5 h-1.5 rounded-full bg-[--color-green] animate-pulse" />
      </div>

      {isLoading ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 animate-pulse px-4">
          <div className="flex items-end gap-px h-24 w-full">
            {Array.from({ length: 40 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-border"
                style={{ height: `${20 + Math.random() * 60}%` }}
              />
            ))}
          </div>
          <span className="text-text2 font-mono text-[11px] uppercase tracking-widest">Reading Ledger...</span>
        </div>
      ) : (
        <div className="flex flex-1 flex-col min-h-0 px-3 pt-2 pb-1 relative">
          {/* Tooltip */}
          {hoveredBar && (
            <div
              className="pointer-events-none absolute z-50 rounded bg-card3 border border-border2 px-2 py-1.5 font-mono text-[11px] leading-tight whitespace-nowrap shadow-lg"
              style={{ left: tooltipPos.x, top: tooltipPos.y, transform: 'translate(-50%, -110%)' }}
            >
              <div className="text-text2">
                {hoveredBar.isCapitalist
                  ? `Cap ${(hoveredBar.bucket - 20) * 5}–${(hoveredBar.bucket - 19) * 5}%`
                  : `Soc ${(19 - hoveredBar.bucket) * 5}–${(20 - hoveredBar.bucket) * 5}%`}
              </div>
              <div className="text-text font-bold">{fmtFim(hoveredBar.fimAmount)} FIM</div>
            </div>
          )}

          {/* Bar area */}
          <div className="flex flex-1 items-end gap-px min-h-0">
            {bars.map((bar) => {
              const heightPct = (bar.fimAmount / maxFim) * 100;
              const color = getBarColor(bar.bucket);
              const isHovered = hoveredBucket === bar.bucket;
              return (
                <div
                  key={bar.bucket}
                  className="flex-1 min-w-0 rounded-t-sm cursor-crosshair transition-opacity duration-100"
                  style={{
                    height: `${Math.max(heightPct, 1)}%`,
                    backgroundColor: color,
                    opacity: hoveredBucket !== null && !isHovered ? 0.55 : 1,
                    outline: isHovered ? '1px solid rgba(255,255,255,0.3)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    setHoveredBucket(bar.bucket);
                    const rect = e.currentTarget.getBoundingClientRect();
                    const parentRect = e.currentTarget.closest('.relative')?.getBoundingClientRect();
                    if (parentRect) {
                      setTooltipPos({
                        x: rect.left - parentRect.left + rect.width / 2,
                        y: rect.top - parentRect.top,
                      });
                    }
                  }}
                  onMouseLeave={() => setHoveredBucket(null)}
                />
              );
            })}
          </div>

          {/* X-axis labels */}
          <div className="flex justify-between pt-1 pb-0.5">
            <span className="mask-label text-text2">SOC 100%</span>
            <span className="mask-label text-text2">50%</span>
            <span className="mask-label text-text2">CAP 100%</span>
          </div>
        </div>
      )}
    </div>
  );
}
