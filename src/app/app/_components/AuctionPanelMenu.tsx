'use client';

import React, { useState, useEffect } from 'react';
import { AuctionChart } from './AuctionChart';
import { AuctionActivityFeed } from './AuctionActivityFeed';
import { FactionChat } from './FactionChat';
import { FimDistributionChart } from './FimDistributionChart';
import { GiniCard } from './GiniCard';
import type { Timeframe } from './TradingChart';
import { AuctionPoint } from '@/utils/chartData';

type PanelId = 'chart' | 'transactions' | 'gini' | 'fim-dist' | 'chat';

const BUTTONS: { id: PanelId; label: string }[] = [
  { id: 'chart',        label: 'Chart' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'gini',         label: 'Gini Score' },
  { id: 'fim-dist',     label: 'Distribution' },
  { id: 'chat',         label: 'Chat' },
];

const PRIORITY: PanelId[] = ['chart', 'transactions', 'gini', 'fim-dist', 'chat'];

const chunk = <T,>(arr: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

export interface AuctionPanelMenuProps {
  seasonAddress: string;
  exchangeAddress: string;
  seasonSlug: string;
  isCapitalist?: boolean;
  showBoard?: boolean;
  onToggleBoard?: () => void;
  // Chart
  points: AuctionPoint[];
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  // Auction mask rendered by the parent
  auctionMask: React.ReactNode;
  // 'bundled' (lg+): mask sits in the same grid as the panel.
  // 'detached' (md and below): only the panel renders here; the parent owns the
  // mask in a separate fold rung above it.
  maskMode?: 'bundled' | 'detached';
}

const matchesXl = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches;
const matches2xl = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1536px)').matches;

export function AuctionPanelMenu(props: AuctionPanelMenuProps) {
  const [isXl, setIsXl] = useState(matchesXl);
  const [is2xl, setIs2xl] = useState(matches2xl);
  const [open, setOpen] = useState<Set<PanelId>>(() =>
    matchesXl()
      ? new Set<PanelId>(['chart', 'transactions'])
      : new Set<PanelId>(['chart'])
  );

  useEffect(() => {
    const xl = window.matchMedia('(min-width: 1280px)');
    const xxl = window.matchMedia('(min-width: 1536px)');
    setIsXl(xl.matches);
    setIs2xl(xxl.matches);

    const xlH = (e: MediaQueryListEvent) => setIsXl(e.matches);
    const xxlH = (e: MediaQueryListEvent) => setIs2xl(e.matches);
    xl.addEventListener('change', xlH);
    xxl.addEventListener('change', xxlH);
    return () => {
      xl.removeEventListener('change', xlH);
      xxl.removeEventListener('change', xxlH);
    };
  }, []);

  // The matchMedia listeners above only fire at the xl/2xl thresholds, so the
  // panel never re-renders while the window is resized *within* a tier. The
  // panel-content columns derive their widths from the live breakpoint flags, so
  // without a re-render they can go stale and the panel can clip at the right edge
  // until a refresh recomputes them. Bump a tick on every resize (rAF-throttled)
  // so the tree re-evaluates at the new width.
  const [, forceTick] = useState(0);
  useEffect(() => {
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => forceTick((n) => n + 1));
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const panelWide = is2xl || isXl;

  // Narrow: chart is mutually exclusive with non-chart panels (up to 2 stacked).
  useEffect(() => {
    if (!panelWide) {
      setOpen(prev => {
        const others = PRIORITY.filter(p => p !== 'chart' && prev.has(p));
        if (prev.has('chart')) {
          if (others.length === 0) return prev;
          return new Set<PanelId>(['chart']);
        }
        if (others.length <= 2) return prev;
        return new Set<PanelId>(others.slice(0, 2));
      });
    }
  }, [panelWide]);

  const NON_CHART = PRIORITY.filter(p => p !== 'chart');

  const trimNonChart = (next: Set<PanelId>, limit: number) => {
    const excess = NON_CHART.filter(p => next.has(p));
    while (excess.length > limit) {
      const toRemove = excess.pop()!;
      next.delete(toRemove);
    }
  };

  const toggle = (id: PanelId) => {
    setOpen(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      if (!panelWide) {
        if (id === 'chart') return new Set<PanelId>(['chart']);
        next.delete('chart');
        trimNonChart(next, 1);
        next.add(id);
        return next;
      }
      if (id === 'chart') {
        // opening chart reduces non-chart limit: 4 at 2xl, 2 at xl
        trimNonChart(next, is2xl ? 4 : 2);
      } else {
        const limit = next.has('chart') ? (is2xl ? 4 : 2) : 4;
        trimNonChart(next, limit - 1);
      }
      next.add(id);
      return next;
    });
  };

  const renderPanel = (id: PanelId) => {
    switch (id) {
      case 'chart':
        return (
          <AuctionChart
            points={props.points}
            timeframe={props.timeframe}
            onTimeframeChange={props.onTimeframeChange}
          />
        );
      case 'transactions':
        return <AuctionActivityFeed seasonAddress={props.seasonAddress} className="h-full" />;
      case 'gini':
        return (
          <GiniCard
            seasonAddress={props.seasonAddress}
            candles={[]}
            timeframe={props.timeframe}
            selectedRange={null}
            onClearSelection={() => {}}
            isLive={true}
          />
        );
      case 'fim-dist':
        return (
          <FimDistributionChart
            seasonAddress={props.seasonAddress}
            exchangeAddress={props.exchangeAddress}
          />
        );
      case 'chat':
        return (
          <FactionChat
            seasonSlug={props.seasonSlug}
            isCapitalist={props.isCapitalist}
            showBoard={props.showBoard}
            onToggleBoard={props.onToggleBoard}
            auctionMode
          />
        );
    }
  };

  const chartOpen = open.has('chart');
  const otherPanels = PRIORITY.filter(id => id !== 'chart' && open.has(id));
  const hasAnyOpen = chartOpen || otherPanels.length > 0;
  const detached = props.maskMode === 'detached';

  // Panel column spans — mirrors TradingPanelMenu bundled layout (no wide-mask variant needed).
  //   lg : 3 cols — panel spans 2, mask 1.
  //   xl : 4 cols — panel spans 3, mask 1.
  //   2xl: 5 cols — panel spans 4, mask 1.
  const panelSpanCls = 'order-2 lg:order-1 lg:col-span-2 xl:col-span-3 2xl:col-span-4';
  const maskSpanCls  = 'order-1 lg:order-2 lg:col-span-1 xl:col-span-1 2xl:col-span-1';

  const panelBox = (
    <div className={`w-full min-w-0 ${panelSpanCls} xl:h-full xl:min-h-0`}>
      <div className="h-[calc(100vh-2.75rem)] xl:h-full flex flex-col overflow-hidden rounded-lg border border-border bg-card">

        {/* Horizontal tab bar */}
        <div className="terminal-view-selector-bar shrink-0">
          {BUTTONS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => toggle(id)}
              className={`terminal-view-btn${open.has(id) ? ' active' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Panel content */}
        {hasAnyOpen && (
          <div className={`flex-1 min-h-0 flex flex-col${panelWide ? ' xl:flex-row' : ''}`}>
            {chartOpen && (
              <div className="flex-1 min-w-0 overflow-hidden">
                {renderPanel('chart')}
              </div>
            )}
            {otherPanels.length > 0 && (
              panelWide && chartOpen ? (
                /* Chart visible: side column beside the chart.
                   xl      : single column, panels stacked (up to 2).
                   2xl, 3p : highest-priority gets its own left column; bottom 2 share the right column.
                   2xl, 4p : 2×2 grid. */
                <div className={`shrink-0 flex border-t xl:border-t-0 xl:border-l border-border xl:w-[calc(100%/3)] 2xl:w-[calc(100%/4)]${is2xl && otherPanels.length >= 3 ? ' 2xl:w-[calc(100%/2)]!' : ''}`}>
                  {is2xl && otherPanels.length >= 3 ? (
                    /* 2-column sub-grid */
                    <>
                      {/* Left sub-column: top item (3p) or top 2 items (4p) */}
                      <div className="flex-1 min-w-0 flex flex-col border-r border-border">
                        {otherPanels.slice(0, otherPanels.length === 3 ? 1 : 2).map((id, i) => (
                          <div key={id} className={`flex-1 min-h-0 overflow-hidden${i > 0 ? ' border-t border-border' : ''}`}>
                            {renderPanel(id)}
                          </div>
                        ))}
                      </div>
                      {/* Right sub-column: bottom 2 items */}
                      <div className="flex-1 min-w-0 flex flex-col">
                        {otherPanels.slice(otherPanels.length === 3 ? 1 : 2).map((id, i) => (
                          <div key={id} className={`flex-1 min-h-0 overflow-hidden${i > 0 ? ' border-t border-border' : ''}`}>
                            {renderPanel(id)}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    /* Single column (xl, or 2xl with ≤2 panels) */
                    <div className="flex-1 flex flex-col">
                      {otherPanels.map((id, i) => (
                        <div key={id} className={`flex-1 min-h-0 overflow-hidden${i > 0 ? ' border-t border-border' : ''}`}>
                          {renderPanel(id)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* No chart: wide packs rows of 2; narrow stacks one per row (up to 2). */
                <div className="flex-1 min-w-0 min-h-0 flex flex-col">
                  {chunk(otherPanels, panelWide ? 2 : 1).map((row, i) => (
                    <div key={i} className={`flex-1 min-h-0 flex flex-row${i > 0 ? ' border-t border-border' : ''}`}>
                      {row.map((id, j) => (
                        <div key={id} className={`flex-1 min-w-0 overflow-hidden${j > 0 ? ' border-l border-border' : ''}`}>
                          {renderPanel(id)}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Detached: only the panel renders; the parent owns the mask in its own rung.
  if (detached) return panelBox;

  return (
    // Bundled grid — panel + mask side by side (matches TradingPhaseLayout lg+).
    //   lg : 3 cols — panel spans 2, mask 1.
    //   xl : 4 cols — panel spans 3, mask 1.
    //   2xl: 5 cols — panel spans 4, mask 1.
    <div className="grid grid-cols-1 gap-5 items-stretch lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 xl:grid-rows-[minmax(0,1fr)] xl:h-full">
      {panelBox}
      <div className={`w-full min-w-0 ${maskSpanCls} xl:h-full xl:min-h-0 xl:overflow-hidden`}>
        {props.auctionMask}
      </div>
    </div>
  );
}
