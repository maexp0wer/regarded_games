'use client';

import React, { useState, useEffect } from 'react';
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

const DESKTOP_BUTTONS: { id: PanelId; label: string }[] = [
  { id: 'orderbook', label: 'Order Book' },
  { id: 'trades',    label: 'trades' },
  { id: 'chord',     label: 'Trade Flows' },
  { id: 'chat',      label: 'Chat' },
];

const MOBILE_BUTTONS: { id: PanelId; label: string }[] = [
  { id: 'chart-orders', label: 'Chart' },
  ...DESKTOP_BUTTONS,
];

// Highest priority first
const DESKTOP_PRIORITY: PanelId[] = ['orderbook', 'trades', 'chord', 'chat'];
const MOBILE_PRIORITY:  PanelId[] = ['chart-orders', 'orderbook', 'trades', 'chord', 'chat'];

const W_PANEL = 400;

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
}

export function TradingPanelMenu(props: TradingPanelMenuProps) {
  const [open, setOpen] = useState<Set<PanelId>>(new Set(['chart-orders']));
  const [isXl, setIsXl] = useState(false);
  const [isMd, setIsMd] = useState(false);

  useEffect(() => {
    const xl = window.matchMedia('(min-width: 1280px)');
    const md = window.matchMedia('(min-width: 768px)');
    setIsXl(xl.matches);
    setIsMd(md.matches);
    const xlH = (e: MediaQueryListEvent) => setIsXl(e.matches);
    const mdH = (e: MediaQueryListEvent) => setIsMd(e.matches);
    xl.addEventListener('change', xlH);
    md.addEventListener('change', mdH);
    return () => {
      xl.removeEventListener('change', xlH);
      md.removeEventListener('change', mdH);
    };
  }, []);

  // Remove chart-orders when switching to desktop (it's always visible there)
  useEffect(() => {
    if (isXl) {
      setOpen(prev => {
        if (!prev.has('chart-orders')) return prev;
        const next = new Set(prev);
        next.delete('chart-orders');
        return next;
      });
    }
  }, [isXl]);

  // Enforce single-panel on mobile sm
  useEffect(() => {
    if (!isXl && !isMd) {
      setOpen(prev => {
        const visible = MOBILE_PRIORITY.filter(p => prev.has(p));
        if (visible.length <= 1) return prev;
        return new Set([visible[0]]);
      });
    }
  }, [isMd, isXl]);

  const maxPanels = isMd ? 2 : 1;

  const toggle = (id: PanelId) => {
    setOpen(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      if (isXl) {
        if (id === 'chart-orders') return prev;
        if (next.size >= 2) {
          const lowest = [...DESKTOP_PRIORITY].reverse().find(p => next.has(p));
          if (lowest) next.delete(lowest);
        }
      } else {
        if (id === 'chart-orders') return new Set<PanelId>(['chart-orders']);
        next.delete('chart-orders');
        if (next.size >= maxPanels) {
          const lowest = [...MOBILE_PRIORITY].reverse().find(p => next.has(p));
          if (lowest) next.delete(lowest);
        }
      }
      next.add(id);
      return next;
    });
  };

  const openChord = () => {
    setOpen(prev => {
      if (prev.has('chord')) return prev;
      const next = new Set(prev);
      const priority = isXl ? DESKTOP_PRIORITY : MOBILE_PRIORITY;
      const max = isXl ? 2 : maxPanels;
      if (!isXl) next.delete('chart-orders');
      if (next.size >= max) {
        const lowest = [...priority].reverse().find(p => next.has(p));
        if (lowest) next.delete(lowest);
      }
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
          <div className="flex flex-col gap-5 h-full">
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
              <div className="shrink-0">
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

  const btnBase = 'font-mono font-semibold uppercase tracking-widest transition-all';
  const btnActive = 'text-text bg-linear-to-b to-card from-(--color-gold-70) to-20% hover:from-(--color-gold-15) rounded-r-xl';
  const btnInactive = 'rounded-xl text-text2 bg-linear-to-b to-card from-(--color-gold-15) to-10% hover:from-(--color-gold-70) hover:text-text';

  // ─── Desktop layout ───────────────────────────────────────────────────────
  if (isXl) {
    const openPanels = DESKTOP_PRIORITY.filter(id => open.has(id));
    const hasAnyOpen = openPanels.length > 0;
    const totalWidth = hasAnyOpen ? W_PANEL + 36 : 36;

    return (
      <div className="flex gap-5 items-stretch h-200 my-5">
        {/* Chart + Orders */}
        <div className="flex-1 flex flex-col gap-5 min-w-0 h-full">
          <CandlestickChart
            candles={props.candles}
            timeframe={props.timeframe}
            onTimeframeChange={props.onTimeframeChange}
            onCandleClick={handleCandleClick}
            selectedRange={props.selectedRange}
            capTargetBps={props.capTargetBps}
            socTargetBps={props.socTargetBps}
          />
          {props.userAddress && (
            <Orders
              seasonAddress={props.seasonAddress}
              userAddress={props.userAddress}
              exchangeAddress={props.exchangeAddress}
            />
          )}
        </div>

        {/* Vertical panel sidebar */}
        <div
          className="self-stretch relative shrink-0 overflow-hidden transition-[width] duration-200"
          style={{ width: totalWidth }}
        >
          {hasAnyOpen && (
            <div
              className="absolute top-0 bottom-0 right-9 overflow-hidden"
              style={{ width: W_PANEL }}
            >
              {openPanels.length === 1 ? (
                <div className="h-full">{renderPanel(openPanels[0])}</div>
              ) : (
                <div className="flex flex-col gap-5 h-full">
                  {openPanels.map(id => (
                    <div key={id} className="flex-1 min-h-0 overflow-hidden">{renderPanel(id)}</div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="absolute top-0 bottom-0 right-0 flex flex-col gap-5" style={{ width: 36 }}>
            {DESKTOP_BUTTONS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => toggle(id)}
                className={`${btnBase} flex-1 flex items-center justify-center [writing-mode:vertical-rl] ${open.has(id) ? btnActive : btnInactive}`}
                style={{ fontSize: 11, letterSpacing: '0.1em' }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Trading mask */}
        <div className="shrink-0 w-91">{props.tradingMask}</div>
      </div>
    );
  }

  // ─── Mobile layout ────────────────────────────────────────────────────────
  const openPanels = MOBILE_PRIORITY.filter(id => open.has(id));

  return (
    <div className="flex flex-col md:flex-row gap-5 items-stretch">
      {/* Panel area: left on md+, below mask on sm */}
      <div className="w-full md:flex-1 md:min-w-0 order-2 md:order-1">
        <div className="h-full max-h-[95vh] flex flex-col gap-5 overflow-hidden">
          {/* Horizontal tab bar */}
          <div className="shrink-0 flex gap-5">
            {MOBILE_BUTTONS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => toggle(id)}
                className={`${btnBase} flex-1 py-2 ${open.has(id) ? btnActive : btnInactive}`}
                style={{ fontSize: 11, letterSpacing: '0.1em' }}
              >
                {label}
              </button>
            ))}
          </div>
          {openPanels.length > 0 && (
            <div className="flex-1 min-h-0 flex flex-col gap-5">
              {openPanels.length === 1 ? (
                <div className="h-full">{renderPanel(openPanels[0])}</div>
              ) : (
                openPanels.map(id => (
                  <div key={id} className="flex-1 min-h-0 overflow-hidden">{renderPanel(id)}</div>
                ))
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
