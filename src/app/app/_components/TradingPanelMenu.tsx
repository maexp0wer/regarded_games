'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Order } from '@/hooks/useOrderBook';
import { SeasonTrade } from '@/hooks/useSeasonTrades';
import { OrderBook } from './OrderBook';
import { ChordDiagram } from './ChordDiagram';
import { FactionChat } from './FactionChat';
import { TradingActivityFeed } from './TradingActivityFeed';
import { CandlestickChart, Timeframe } from './CandlestickChart';
import { Orders } from './Orders';
import { CandleData } from '@/utils/chartData';

type PanelId = 'chart-orders' | 'orderbook' | 'trades' | 'chord' | 'chat';

const BUTTONS: { id: PanelId; label: string }[] = [
  { id: 'chart-orders', label: 'Chart' },
  { id: 'orderbook',    label: 'Order Book' },
  { id: 'trades',       label: 'Trades' },
  { id: 'chord',        label: 'Trade Flows' },
  { id: 'chat',         label: 'Chat' },
];

const PRIORITY: PanelId[] = ['chart-orders', 'orderbook', 'trades', 'chord', 'chat'];

const W_PANEL = 400;

const chunk = <T,>(arr: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

export interface TradingPanelMenuProps {
  seasonAddress: string;
  isBuy: boolean;
  isMaker: boolean;
  onSelectOrder: (o: Order) => void;
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
  // Trading mask is rendered by the parent and positioned here
  tradingMask: React.ReactNode;
  openOrderBookRef?: { current: () => void };
}

export function TradingPanelMenu(props: TradingPanelMenuProps) {
  const [open, setOpen] = useState<Set<PanelId>>(new Set());
  const [isMd, setIsMd] = useState(false);
  const didInit = useRef(false);

  useEffect(() => {
    const md = window.matchMedia('(min-width: 768px)');
    const matches = md.matches;
    setIsMd(matches);

    if (!didInit.current) {
      didInit.current = true;
      setOpen(
        matches
          ? new Set<PanelId>(['chart-orders', 'orderbook'])
          : new Set<PanelId>(['chart-orders'])
      );
    }

    const mdH = (e: MediaQueryListEvent) => setIsMd(e.matches);
    md.addEventListener('change', mdH);
    return () => md.removeEventListener('change', mdH);
  }, []);

  // Enforce single-panel on small mobile
  useEffect(() => {
    if (!isMd) {
      setOpen(prev => {
        const visible = PRIORITY.filter(p => prev.has(p));
        if (visible.length <= 1) return prev;
        return new Set([visible[0]]);
      });
    }
  }, [isMd]);

  // md+: chart open → max 2 non-chart panels (3 total); chart closed → max 4 non-chart panels
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
      if (!isMd) {
        return new Set<PanelId>([id]);
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
      if (!isMd) return new Set<PanelId>(['chord']);
      const limit = next.has('chart-orders') ? 2 : 4;
      trimNonChart(next, limit - 1);
      next.add('chord');
      return next;
    });
  };

  const handleCandleClick = (range: { start: number; end: number } | null) => {
    props.onCandleClick(range);
    if (range) openChord();
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
            onSelectOrder={props.onSelectOrder}
            selectedOrderIds={props.selectedOrderIds}
          />
        );
      case 'chord':
        return (
          <ChordDiagram
            trades={props.trades}
            timeWindowMs={props.timeWindowMs}
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
        if (!isMd) return new Set<PanelId>(['orderbook']);
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

  return (
    <div className="flex flex-col md:flex-row gap-5 items-stretch">
      {/* Panel area: left on md+, below mask on sm */}
      <div className="w-full md:flex-1 md:min-w-0 order-2 md:order-1">
        <div className="h-full max-h-[95vh] flex flex-col overflow-hidden rounded-lg border border-border bg-card">

          {/* Horizontal tab bar */}
          <div className="shrink-0 overflow-x-auto">
            <div className="terminal-view-selector-bar">
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
          </div>

          {/* Panel content */}
          {hasAnyOpen && (
            <div className="flex-1 min-h-0 flex flex-row">
              {chartOpen && (
                <div className="flex-1 min-w-0 overflow-hidden">
                  {renderPanel('chart-orders')}
                </div>
              )}
              {otherPanels.length > 0 && (
                chartOpen ? (
                  /* Chart visible: others stack vertically in fixed-width column */
                  <div className="shrink-0 flex flex-col border-l border-border" style={{ width: W_PANEL }}>
                    {otherPanels.map((id, i) => (
                      <div key={id} className={`flex-1 min-h-0 overflow-hidden${i > 0 ? ' border-t border-border' : ''}`}>
                        {renderPanel(id)}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* No chart: grid — horizontal first, then vertical (rows of 2) */
                  <div className="flex-1 min-w-0 flex flex-col">
                    {chunk(otherPanels, 2).map((row, i) => (
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

      {/* Trading mask: above on sm, right on md+ */}
      <div className="w-full md:w-90 md:shrink-0 order-1 md:order-2">
        {props.tradingMask}
      </div>
    </div>
  );
}
