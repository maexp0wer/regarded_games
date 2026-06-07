'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Order } from '@/hooks/useOrderBook';
import { SeasonTrade } from '@/hooks/useSeasonTrades';
import { OrderBook } from './OrderBook';
import { TradeFlows } from './TradeFlows';
import { FactionChat } from './FactionChat';
import { TradingActivityFeed } from './TradingActivityFeed';
import { CandlestickChart, Timeframe } from './CandlestickChart';
import { Orders } from './Orders';
import { GiniCard } from './GiniCard';
import { CandleData } from '@/utils/chartData';

type PanelId = 'chart-orders' | 'orderbook' | 'trades' | 'gini' | 'chord' | 'chat';

const BUTTONS: { id: PanelId; label: string }[] = [
  { id: 'chart-orders', label: 'Chart' },
  { id: 'orderbook',    label: 'Order Book' },
  { id: 'trades',       label: 'Trades' },
  { id: 'gini',         label: 'Gini Score' },
  { id: 'chord',        label: 'Capital Flow' },
  { id: 'chat',         label: 'Chat' },
];

const PRIORITY: PanelId[] = ['chart-orders', 'orderbook', 'trades', 'gini', 'chord', 'chat'];

const chunk = <T,>(arr: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

export interface TradingPanelMenuProps {
  seasonAddress: string;
  isBuy: boolean;
  isMaker: boolean;
  onSelectOrder: (o: Order) => void;
  onRemoveOrder?: (id: string) => void;
  selectedOrderIds?: string[];
  trades: SeasonTrade[];
  timeWindowMs: number;
  selectedRange: { start: number; end: number } | null;
  onClearSelection: () => void;
  isLive: boolean;
  seasonSlug: string;
  isCapitalist?: boolean;
  showBoard?: boolean;
  onToggleBoard?: () => void;
  // Chart
  candles: CandleData[];
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  onCandleClick: (range: { start: number; end: number } | null) => void;
  capTargetBps: number;
  socTargetBps: number;
  // Orders
  userAddress?: string;
  exchangeAddress: string;
  fimAddress?: string;
  // Trading mask is rendered by the parent and positioned here
  tradingMask: React.ReactNode;
  openOrderBookRef?: { current: () => void };
  // 'bundled' (lg+): mask sits in the same grid as the panel (one fold rung).
  // 'detached' (md and below): only the panel renders here; the parent owns the
  // mask in a separate fold rung above it.
  maskMode?: 'bundled' | 'detached';
  // Mixed taker trade: the mask shows buy/sell queues side by side and claims a
  // second column from the panel in the bundled grid (xl/2xl).
  maskWide?: boolean;
}

export function TradingPanelMenu(props: TradingPanelMenuProps) {
  const [open, setOpen] = useState<Set<PanelId>>(new Set());
  const [isXl, setIsXl] = useState(false);
  const [is2xl, setIs2xl] = useState(false);
  const didInit = useRef(false);
  const tabBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const xl = window.matchMedia('(min-width: 1280px)');
    const xxl = window.matchMedia('(min-width: 1536px)');
    const matches = xl.matches;
    setIsXl(matches);
    setIs2xl(xxl.matches);

    if (!didInit.current) {
      didInit.current = true;
      setOpen(
        matches
          ? new Set<PanelId>(['chart-orders', 'orderbook'])
          : new Set<PanelId>(['chart-orders'])
      );
    }

    const xlH = (e: MediaQueryListEvent) => setIsXl(e.matches);
    const xxlH = (e: MediaQueryListEvent) => setIs2xl(e.matches);
    xl.addEventListener('change', xlH);
    xxl.addEventListener('change', xxlH);
    return () => {
      xl.removeEventListener('change', xlH);
      xxl.removeEventListener('change', xxlH);
    };
  }, []);

  useEffect(() => {
    const el = tabBarRef.current;
    if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, []);

  // The panel layout follows how many grid columns the panel area actually spans,
  // not just the breakpoint. It's "wide" (chart can coexist with a side column of
  // panels) only with 3+ columns: 2xl always, or xl when the mask isn't widened.
  // Mixed mode (maskWide) squeezes the panel to 2 cols at xl / 1 at lg, so it
  // drops to the narrow rules: chart solo, or up to 2 non-chart panels stacked.
  const panelWide = is2xl || (isXl && !props.maskWide);

  // Narrow (1–2 cols): chart is mutually exclusive with the non-chart panels —
  // either the chart alone, or up to 2 non-chart panels stacked in two rows.
  useEffect(() => {
    if (!panelWide) {
      setOpen(prev => {
        const others = PRIORITY.filter(p => p !== 'chart-orders' && prev.has(p));
        // Chart alongside others → collapse to chart only.
        if (prev.has('chart-orders')) {
          if (others.length === 0) return prev;
          return new Set<PanelId>(['chart-orders']);
        }
        // More than 2 non-chart open → keep the two highest-priority.
        if (others.length <= 2) return prev;
        return new Set<PanelId>(others.slice(0, 2));
      });
    }
  }, [panelWide]);

  // Wide: chart open → max 2 non-chart panels (3 total); chart closed → max 4 non-chart panels
  const NON_CHART = PRIORITY.filter(p => p !== 'chart-orders');

  const trimNonChart = (next: Set<PanelId>, limit: number) => {
    const excess = NON_CHART.filter(p => next.has(p));
    // remove lowest-priority first (reverse of PRIORITY = lowest last)
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
        // Narrow (1–2 cols): chart is solo; otherwise up to 2 non-chart panels
        // stacked in two rows.
        if (id === 'chart-orders') return new Set<PanelId>(['chart-orders']);
        next.delete('chart-orders');
        trimNonChart(next, 1); // leave room so this one makes at most 2
        next.add(id);
        return next;
      }
      if (id === 'chart-orders') {
        // opening chart reduces non-chart limit from 4 → 2
        trimNonChart(next, 2);
      } else {
        const limit = next.has('chart-orders') ? 2 : 4;
        trimNonChart(next, limit - 1);
      }
      next.add(id);
      return next;
    });
  };

  const openChord = () => {
    setOpen(prev => {
      if (prev.has('chord')) return prev;
      const next = new Set(prev);
      if (!panelWide) {
        // Narrow: chord joins the stacked non-chart pair; chart steps aside.
        next.delete('chart-orders');
        trimNonChart(next, 1);
        next.add('chord');
        return next;
      }
      const limit = next.has('chart-orders') ? 2 : 4;
      trimNonChart(next, limit - 1);
      next.add('chord');
      return next;
    });
  };

  const handleCandleClick = (range: { start: number; end: number } | null) => {
    props.onCandleClick(range);
    // When wide the chord opens beside the chart; when narrow it would displace
    // the chart you just clicked, so don't auto-open there.
    if (range && panelWide) openChord();
  };

  const renderPanel = (id: PanelId) => {
    switch (id) {
      case 'chart-orders':
        return (
          <div className="flex flex-col h-full">
            <div className="flex-1 min-h-0">
              <CandlestickChart
                candles={props.candles}
                timeframe={props.timeframe}
                onTimeframeChange={props.onTimeframeChange}
                onCandleClick={handleCandleClick}
                selectedRange={props.selectedRange}
                capTargetBps={props.capTargetBps}
                socTargetBps={props.socTargetBps}
              />
            </div>
            {props.userAddress && (
              <div className="shrink-0 border-t border-border">
                <Orders
                  seasonAddress={props.seasonAddress}
                  userAddress={props.userAddress}
                  exchangeAddress={props.exchangeAddress}
                  fimAddress={props.fimAddress}
                />
              </div>
            )}
          </div>
        );
      case 'orderbook':
        return (
          <OrderBook
            seasonAddress={props.seasonAddress}
            isBuy={props.isBuy}
            isMaker={props.isMaker}
            userAddress={props.userAddress}
            onSelectOrder={props.onSelectOrder}
            onRemoveOrder={props.onRemoveOrder}
            selectedOrderIds={props.selectedOrderIds}
          />
        );
      case 'gini':
        return (
          <GiniCard
            seasonAddress={props.seasonAddress}
            candles={props.candles}
            timeframe={props.timeframe}
            selectedRange={props.selectedRange}
            onClearSelection={props.onClearSelection}
            isLive={props.isLive}
          />
        );
      case 'chord':
        return (
          <TradeFlows
            trades={props.trades}
            timeWindowMs={props.timeWindowMs}
            timeframe={props.timeframe}
            selectedRange={props.selectedRange}
            onClearSelection={props.onClearSelection}
            isLive={props.isLive}
          />
        );
      case 'chat':
        return (
          <FactionChat
            seasonSlug={props.seasonSlug}
            isCapitalist={props.isCapitalist}
            showBoard={props.showBoard}
            onToggleBoard={props.onToggleBoard}
          />
        );
      case 'trades':
        return <TradingActivityFeed seasonAddress={props.seasonAddress} className="h-full" />;
    }
  };

  if (props.openOrderBookRef) {
    props.openOrderBookRef.current = () => {
      setOpen(prev => {
        if (prev.has('orderbook')) return prev;
        const next = new Set(prev);
        if (!panelWide) {
          // Narrow: order book joins the stacked non-chart pair; chart steps aside.
          next.delete('chart-orders');
          trimNonChart(next, 1);
          next.add('orderbook');
          return next;
        }
        const limit = next.has('chart-orders') ? 2 : 4;
        trimNonChart(next, limit - 1);
        next.add('orderbook');
        return next;
      });
    };
  }

  const chartOpen = open.has('chart-orders');
  const otherPanels = PRIORITY.filter(id => id !== 'chart-orders' && open.has(id));
  const hasAnyOpen = chartOpen || otherPanels.length > 0;
  const detached = props.maskMode === 'detached';
  const wide = !!props.maskWide;

  // Mixed taker trade widens the mask so its buy/sell legs sit side by side.
  //   lg : the mask takes the full row and the panel drops below it (single
  //        column, mask order 1 / panel order 2) — at lg there isn't room for
  //        both side by side once the mask doubles.
  //   xl : 4 cols, 2 panel + 2 mask, side by side.
  //   2xl: mask col-span-2 / panel col-span-3 (vs the usual 1 / 4).
  // Order utilities live in these variant strings (not the base classes) so the
  // lg stack order doesn't collide. Full literal class strings for Tailwind.
  const gridColsCls = wide
    ? 'lg:grid-cols-1 xl:grid-cols-4 2xl:grid-cols-5'
    : 'lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5';
  const panelSpanCls = wide
    ? 'order-2 lg:order-2 lg:col-span-1 xl:order-1 xl:col-span-2 2xl:col-span-3'
    : 'order-2 lg:order-1 lg:col-span-2 xl:col-span-3 2xl:col-span-4';
  const maskSpanCls = wide
    ? 'order-1 lg:order-1 lg:col-span-2 xl:order-2 xl:col-span-2 2xl:col-span-2'
    : 'order-1 lg:order-2 lg:col-span-1 xl:col-span-1 2xl:col-span-1';

  // The panel box itself — identical in both mask modes.
  const panelBox = (
    <div className={`w-full min-w-0 ${panelSpanCls} xl:h-full xl:min-h-0`}>
      {/* lg: fill the viewport free once the navbar/band fold away (100vh minus
          the shell's pb-6 and this row's pt-5 gap). xl/2xl: the phase is
          viewport-locked, so flex to fill the share the folds leave instead. */}
      <div className="h-[calc(100vh-2.75rem)] xl:h-full flex flex-col overflow-hidden rounded-lg border border-border bg-card">

          {/* Horizontal tab bar */}
          <div ref={tabBarRef} className="terminal-view-selector-bar terminal-view-selector-bar--chat shrink-0">
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
            // Wide: chart beside a side column of panels. Narrow: only one of
            // chart / non-chart panels shows at a time, always column-stacked.
            <div className={`flex-1 min-h-0 flex flex-col${panelWide ? ' xl:flex-row' : ''}`}>
              {chartOpen && (
                <div className="flex-1 min-w-0 overflow-hidden">
                  {renderPanel('chart-orders')}
                </div>
              )}
              {otherPanels.length > 0 && (
                panelWide && chartOpen ? (
                  /* Chart visible: others stack vertically in a fixed-width column */
                  <div className="shrink-0 flex flex-col border-t xl:border-t-0 xl:border-l border-border xl:w-100">
                    {otherPanels.map((id, i) => (
                      <div key={id} className={`flex-1 min-h-0 overflow-hidden${i > 0 ? ' border-t border-border' : ''}`}>
                        {renderPanel(id)}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* No chart: wide packs rows of 2 (2×2); narrow stacks one per
                     row (up to 2 → two rows). */
                  <div className="flex-1 min-w-0 flex flex-col">
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
    // Trading row as an explicit column grid (matching the auction/payout phase
    // layouts): the panel area holds a fixed column share so adding panels never
    // widens it over the mask, and the mask keeps its own rail.
    //   lg : 3 cols — panel spans 2, mask 1.
    //   xl : 4 cols — panel spans 3, mask 1 (matching auction/payout masks).
    //   2xl: 5 cols total — panel spans 4, mask the 5th.
    // xl/2xl: a single full-height row (grid-rows minmax(0,1fr)) so both cells get
    // a definite, shrinkable height — the panel and mask then compress to fit the
    // viewport-locked share instead of overflowing it.
    <div className={`grid grid-cols-1 gap-5 items-stretch ${gridColsCls} xl:grid-rows-[minmax(0,1fr)] xl:h-full`}>
      {panelBox}
      {/* Trading mask: above on md and smaller, right rail on lg+ (full-width
          above the panel at lg when mixed widens it) */}
      <div className={`w-full min-w-0 ${maskSpanCls} xl:h-full xl:min-h-0 xl:overflow-hidden`}>
        {props.tradingMask}
      </div>
    </div>
  );
}
