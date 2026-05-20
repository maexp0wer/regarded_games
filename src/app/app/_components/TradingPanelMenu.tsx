'use client';

import React, { useState } from 'react';
import { Order } from '@/hooks/useOrderBook';
import { SeasonTrade } from '@/hooks/useSeasonTrades';
import { OrderBook } from './OrderBook';
import { ChordDiagram } from './ChordDiagram';
import { FactionChat } from './FactionChat';
import { TradingActivityFeed } from './TradingActivityFeed';

type PanelId = 'orderbook' | 'chord' | 'chat' | 'activity';

interface TradingPanelMenuProps {
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
}

const PANEL_BUTTONS: { id: PanelId; label: string }[] = [
  { id: 'orderbook', label: 'Order Book' },
  { id: 'chord',    label: 'Trade Flows' },
  { id: 'chat',     label: 'Chat' },
  { id: 'activity', label: 'Activity' },
];

const SECONDARY: PanelId[] = ['chord', 'chat', 'activity'];

// Panel area pixel widths
const W_ORDERBOOK = 400;
const W_SINGLE    = 360;

export function TradingPanelMenu(props: TradingPanelMenuProps) {
  const [open, setOpen] = useState<Set<PanelId>>(new Set());

  const toggle = (id: PanelId) => {
    setOpen(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      if (id === 'orderbook') {
        return new Set<PanelId>(['orderbook']);
      }
      next.delete('orderbook');
      next.add(id);
      
      // Enforce max 2 secondary panels, chat is lowest priority
      if (next.has('chord') && next.has('activity') && next.has('chat')) {
        next.delete('chat');
      }

      return next;
    });
  };

  const secondaryOpen = SECONDARY.filter(id => open.has(id));
  const showOrderBook = open.has('orderbook');
  const hasAnyOpen = open.size > 0;

  let panelWidth: number;
  if (!hasAnyOpen) panelWidth = 0;
  else if (showOrderBook) panelWidth = W_ORDERBOOK;
  else panelWidth = W_SINGLE;

  const renderPanel = (id: PanelId) => {
    switch (id) {
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
      case 'activity':
        return <TradingActivityFeed seasonAddress={props.seasonAddress} className="h-full" />;
    }
  };

  const renderPanelArea = () => {
    if (showOrderBook) {
      return <div className="h-full">{renderPanel('orderbook')}</div>;
    }
    if (secondaryOpen.length === 1) {
      return <div className="h-full">{renderPanel(secondaryOpen[0])}</div>;
    }
    if (secondaryOpen.length === 2) {
      return (
        <div className="flex flex-col gap-1 h-full">
          {secondaryOpen.map(id => (
            <div key={id} className="flex-1 min-h-0">{renderPanel(id)}</div>
          ))}
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="flex gap-1 self-stretch">
      {/* Panel area */}
      {hasAnyOpen && (
        <div
          className="shrink-0 transition-[width] duration-200"
          style={{ width: panelWidth }}
        >
          {renderPanelArea()}
        </div>
      )}

      {/* Vertical menu bar */}
      <div
        className="flex flex-col shrink-0 rounded-lg gap-1 overflow-hidden border-1-solid"
        style={{
          width: 36,
          background: 'transparent',
          border: '0px solid var(--color-border)',
        }}
      >
        {PANEL_BUTTONS.map(({ id, label }) => {
          const isActive = open.has(id);
          return (
            <button
              key={id}
              onClick={() => toggle(id)}
              className={`
                rounded-lg flex-1 flex items-center justify-center font-mono font-semibold uppercase tracking-widest transition-all [writing-mode:vertical-rl] border
                ${isActive 
                  ? 'text-[var(--color-text2)] bg-[var(--color-gold-a10)] border-[var(--color-gold-a25)]' 
                  : 'text-[var(--color-text2)] bg-[var(--color-card2)] border-[var(--color-border)] hover:bg-[var(--color-card)] hover:text-[var(--color-text)]]'
                }
              `}
              style={{
                fontSize: 11,
                letterSpacing: '0.1em',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}