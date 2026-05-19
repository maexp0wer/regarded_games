'use client';

import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Order, useOrderBook } from '@/hooks/useOrderBook';
import { useBatchPlayerPercentiles } from '@/hooks/useBatchPlayerPercentiles';
import { PercentileCircle } from './PercentileCircle';

interface OrderBookProps {
  seasonAddress: string;
  isBuy: boolean;
  isMaker: boolean;
  onSelectOrder: (o: Order) => void;
  selectedOrderIds?: string[];
}

type AggregatedOrder = Order & { subOrders: Order[] };
type FactionFilter = 'ALL' | 'BOURGEOISIE' | 'PROLETARIAT';

export function OrderBook({
  seasonAddress, isBuy, isMaker, onSelectOrder, selectedOrderIds = [],
}: OrderBookProps) {
  const { data } = useOrderBook(seasonAddress);
  
  // Filter states
  const [faction, setFaction] = useState<FactionFilter>('ALL');
  const [rankFilterEnabled, setRankFilterEnabled] = useState<boolean>(false);
  const [minPercentile, setMinPercentile] = useState<number | ''>(0);
  const [maxPercentile, setMaxPercentile] = useState<number | ''>(100);

  // Refs to control precise scrolling to the center target
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const targetRowRef = useRef<HTMLDivElement>(null);

  const uniqueMakers = useMemo(() => {
    if (!data) return [];
    const makers = new Set<string>();
    [...(data.bids || []), ...(data.asks || [])].forEach(o => makers.add(o.maker.toLowerCase()));
    return Array.from(makers);
  }, [data]);

  const { data: percentileMap } = useBatchPlayerPercentiles(seasonAddress, uniqueMakers);

  const priceRows = useMemo(() => {
    const bidsRaw = data?.bids || [];
    const asksRaw = data?.asks || [];

    const aggregateByMaker = (orders: Order[]): AggregatedOrder[] => {
      const map = new Map<string, AggregatedOrder>();
      orders.forEach((o) => {
        const unitPrice = o.pricePerFim.toFixed(4);
        const key = `${o.maker}-${unitPrice}`;
        if (map.has(key)) {
          const ex = map.get(key)!;
          ex.amount += o.amount; ex.price += o.price; ex.subOrders.push(o);
        } else {
          map.set(key, { ...o, subOrders: [o] });
        }
      });
      return Array.from(map.values());
    };

    const aggregatedBids = aggregateByMaker(bidsRaw);
    const aggregatedAsks = aggregateByMaker(asksRaw);
    const levels: Record<string, { asks: AggregatedOrder[]; bids: AggregatedOrder[] }> = {};
    const getPriceKey = (o: Order) => o.pricePerFim.toFixed(4);

    aggregatedAsks.forEach((o) => {
      const k = getPriceKey(o);
      if (!levels[k]) levels[k] = { asks: [], bids: [] };
      levels[k].asks.push(o);
    });
    aggregatedBids.forEach((o) => {
      const k = getPriceKey(o);
      if (!levels[k]) levels[k] = { asks: [], bids: [] };
      levels[k].bids.push(o);
    });

    const rawRows = Object.keys(levels)
      .sort((a, b) => parseFloat(b) - parseFloat(a))
      .flatMap((priceKey) => {
        const lvl = levels[priceKey];
        const count = Math.max(lvl.asks.length, lvl.bids.length);
        return Array.from({ length: count }, (_, i) => ({
          price: priceKey,
          ask: lvl.asks[i] || undefined,
          bid: lvl.bids[i] || undefined,
          uniqueKey: `${priceKey}-${i}`,
        }));
      });

    // Compute active filtering fallback boundaries if inputs are cleared
    const parsedMin = minPercentile === '' ? 0 : minPercentile;
    const parsedMax = maxPercentile === '' ? 100 : maxPercentile;

    return rawRows.filter((row) => {
      const makerAddress = row.ask?.maker || row.bid?.maker;
      if (!makerAddress) return true;

      const stats = percentileMap?.[makerAddress.toLowerCase()];
      if (!stats) return faction === 'ALL';

      // Faction filter
      if (faction === 'BOURGEOISIE' && !stats.isCapitalist) return false;
      if (faction === 'PROLETARIAT' && stats.isCapitalist) return false;

      // Min/Max percentile range filter (only applied if explicitly enabled)
      if (rankFilterEnabled) {
        if (stats.factionPercentile < parsedMin || stats.factionPercentile > parsedMax) return false;
      }

      return true;
    });
  }, [data, percentileMap, faction, rankFilterEnabled, minPercentile, maxPercentile]);

  // Find the unique key of the filtered row closest to $1.000 USD
  const closestRowKey = useMemo(() => {
    if (priceRows.length === 0) return null;
    let closestKey = priceRows[0].uniqueKey;
    let minDistance = Math.abs(parseFloat(priceRows[0].price) - 1.0);

    for (let i = 1; i < priceRows.length; i++) {
      const distance = Math.abs(parseFloat(priceRows[i].price) - 1.0);
      if (distance < minDistance) {
        minDistance = distance;
        closestKey = priceRows[i].uniqueKey;
      }
    }
    return closestKey;
  }, [priceRows]);

  // Adjust container viewport scrolling to line up targets squarely into center layout frame
  useEffect(() => {
    if (scrollContainerRef.current && targetRowRef.current) {
      const container = scrollContainerRef.current;
      const target = targetRowRef.current;

      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const relativeTargetTop = targetRect.top - containerRect.top;

      container.scrollTop += relativeTargetTop - (containerRect.height / 2) + (targetRect.height / 2);
    }
  }, [closestRowKey]);

  const isAskActive = !isMaker && isBuy;
  const isBidActive = !isMaker && !isBuy;

  const handleOrderClick = (order: AggregatedOrder) => order.subOrders.forEach(sub => onSelectOrder(sub));

  // Helper to determine the dynamic faction button background and text colors
  const getFactionStyles = (f: FactionFilter) => {
    if (faction !== f) {
      return { background: 'transparent', color: 'var(--color-text2)' };
    }
    if (f === 'BOURGEOISIE') {
      return { background: 'var(--color-blue)', color: 'var(--color-bg)' };
    }
    if (f === 'PROLETARIAT') {
      return { background: 'var(--color-pink)', color: 'var(--color-bg)' };
    }
    return { background: 'var(--color-border-bright)', color: '#fff' };
  };

  const renderRank = (makerAddress: string, align: 'start' | 'end') => {
    const stats = percentileMap?.[makerAddress.toLowerCase()];
    if (!stats) return (
      <div className={`flex w-full items-center ${align === 'end' ? 'justify-end' : 'justify-start'}`}>
        <span className="font-mono text-[10px] opacity-20 text-text2">—</span>
      </div>
    );
    return (
      <div className={`flex w-full items-center ${align === 'end' ? 'justify-end' : 'justify-start'}`}>
        <span className="sm:hidden">
          <PercentileCircle percentage={stats.factionPercentile} isCapitalist={stats.isCapitalist} size="xxs" />
        </span>
        <span className="hidden sm:inline-flex">
          <PercentileCircle percentage={stats.factionPercentile} isCapitalist={stats.isCapitalist} size="xs" />
        </span>
      </div>
    );
  };

  return (
    <div
      className="card-app flex flex-col flex-1 overflow-hidden"
      style={{ padding: 0, borderColor: 'var(--color-border-bright)', maxHeight: '600px' }}
    >
      {/* Dynamic Style Injection to hide inputs' spin arrows globally */}
      <style dangerouslySetInnerHTML={{__html: `
        .no-spinners::-webkit-outer-spin-button,
        .no-spinners::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .no-spinners {
          -moz-appearance: textfield;
        }
      `}} />

      {/* Header Container stretching elements to full height */}
      <div
        className="px-4 h-9 shrink-0 flex items-stretch justify-between gap-4"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center">
          <p className="section-label">Order Book</p>
        </div>

        {/* Filters Panel Group spanning whole height */}
        <div className="flex items-stretch gap-4 py-1">
          {/* Faction Class Selectors */}
          <div className="flex bg-black bg-opacity-20 rounded border items-stretch" style={{ borderColor: 'var(--color-border)' }}>
            {(['ALL', 'BOURGEOISIE', 'PROLETARIAT'] as FactionFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFaction(f)}
                className="section-label uppercase px-2.5 transition-all tracking-wider flex items-center justify-center rounded-sm font-mono"
                style={{
                  ...getFactionStyles(f),
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                {f.toLowerCase()}
              </button>
            ))}
          </div>

          {/* Rank % Activation Toggle and Inputs Combo */}
          <div className="flex items-stretch gap-2">
            <button
              onClick={() => setRankFilterEnabled(!rankFilterEnabled)}
              className="section-label uppercase tracking-wider font-mono px-2 rounded border transition-colors select-none flex items-center justify-center"
              style={{
                background: rankFilterEnabled ? 'var(--color-border-bright)' : 'rgba(0,0,0,0.2)',
                borderColor: 'var(--color-border)',
                color: rankFilterEnabled ? '#fff' : 'var(--color-text2)',
                cursor: 'pointer'
              }}
            >
              Rank %
            </button>
            
            <input
              type="number"
              min="0"
              max="100"
              placeholder="0"
              disabled={!rankFilterEnabled}
              value={minPercentile}
              onChange={(e) => {
                const rawValue = e.target.value;
                if (rawValue === '') {
                  setMinPercentile('');
                } else {
                  const val = Math.min(100, Math.max(0, parseInt(rawValue) || 0));
                  setMinPercentile(val);
                }
              }}
              className="w-12 bg-black bg-opacity-40 rounded px-1.5 section-label font-mono text-center border transition-opacity no-spinners"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
                outline: 'none',
                opacity: rankFilterEnabled ? 1 : 0.3,
              }}
            />
            
            <div className="flex items-center">
              <span className="section-label font-mono text-text2 opacity-40">—</span>
            </div>
            
            <input
              type="number"
              min="0"
              max="100"
              placeholder="100"
              disabled={!rankFilterEnabled}
              value={maxPercentile}
              onChange={(e) => {
                const rawValue = e.target.value;
                if (rawValue === '') {
                  setMaxPercentile('');
                } else {
                  const val = Math.min(100, Math.max(0, parseInt(rawValue) || 0));
                  setMaxPercentile(val);
                }
              }}
              className="w-12 bg-black bg-opacity-40 rounded px-1.5 section-label font-mono text-center border transition-opacity no-spinners"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
                outline: 'none',
                opacity: rankFilterEnabled ? 1 : 0.3,
              }}
            />
          </div>
        </div>
      </div>

      {/* Column headers */}
      <div
        className="grid grid-cols-8 px-4 py-2 shrink-0"
        style={{
          background: 'var(--color-card2)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <span className="section-label text-right pr-2">Rank</span>
        <span className="section-label text-right pr-2">Amount</span>
        <span className="section-label text-right pr-2">Total</span>
        <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-right pr-4 flex items-center justify-end" style={{ color: 'var(--color-green)' }}>Ask</span>
        <span className="font-mono text-[10px] font-semibold uppercase tracking-widest pl-4 flex items-center" style={{ color: 'var(--color-pink)' }}>Bid</span>
        <span className="section-label pl-2">Total</span>
        <span className="section-label pl-2">Amount</span>
        <span className="section-label pl-2">Rank</span>
      </div>

      {/* Rows Viewport */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto custom-scrollbar relative"
      >
        {priceRows.length === 0 ? (
          <div className="flex items-center justify-center h-full py-20">
            <p className="section-label opacity-40">No Matching Orders Found</p>
          </div>
        ) : (
          priceRows.map((row) => {
            const askSelected = row.ask?.subOrders.some(o => selectedOrderIds.includes(o.id)) ?? false;
            const bidSelected = row.bid?.subOrders.some(o => selectedOrderIds.includes(o.id)) ?? false;
            const isClosestToOne = row.uniqueKey === closestRowKey;

            return (
              <div
                key={row.uniqueKey}
                ref={isClosestToOne ? targetRowRef : undefined}
                className="grid grid-cols-8 px-4 items-stretch"
                style={{ borderBottom: '1px solid rgba(42,37,32,0.6)' }}
              >
                {/* Ask side */}
                <div
                  onClick={() => isAskActive && row.ask && handleOrderClick(row.ask)}
                  className="col-span-4 grid grid-cols-4 items-center py-2 transition-colors"
                  style={{
                    borderRight: '1px solid var(--color-border)',
                    cursor: isAskActive && row.ask ? 'pointer' : 'default',
                    background: askSelected ? 'rgba(107,203,110,0.08)' : undefined,
                  }}
                  onMouseEnter={(e) => { if (isAskActive && row.ask) (e.currentTarget as HTMLElement).style.background = 'rgba(107,203,110,0.05)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = askSelected ? 'rgba(107,203,110,0.08)' : ''; }}
                >
                  {row.ask ? (
                    <>
                      <div className="flex justify-end pr-2">{renderRank(row.ask.maker, 'end')}</div>
                      <span className="font-mono text-[11px] text-text text-right pr-2" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {row.ask.amount.toLocaleString()}
                      </span>
                      <span className="font-mono font-semibold text-[11px] text-text text-right pr-2" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        ${(row.ask.pricePerFim * row.ask.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className="font-mono font-semibold text-[11px] text-right pr-3" style={{ color: 'var(--color-green)', fontVariantNumeric: 'tabular-nums' }}>
                        ${parseFloat(row.price).toFixed(4)}
                      </span>
                    </>
                  ) : <div className="col-span-4" />}
                </div>

                {/* Bid side */}
                <div
                  onClick={() => isBidActive && row.bid && handleOrderClick(row.bid)}
                  className="col-span-4 grid grid-cols-4 items-center py-2 transition-colors"
                  style={{
                    cursor: isBidActive && row.bid ? 'pointer' : 'default',
                    background: bidSelected ? 'rgba(255,61,138,0.08)' : undefined,
                  }}
                  onMouseEnter={(e) => { if (isBidActive && row.bid) (e.currentTarget as HTMLElement).style.background = 'rgba(255,61,138,0.05)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = bidSelected ? 'rgba(255,61,138,0.08)' : ''; }}
                >
                  {row.bid ? (
                    <>
                      <span className="font-mono font-semibold text-[11px] pl-3" style={{ color: 'var(--color-pink)', fontVariantNumeric: 'tabular-nums' }}>
                        ${parseFloat(row.price).toFixed(4)}
                      </span>
                      <span className="font-mono font-semibold text-[11px] text-text pl-2" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        ${(row.bid.pricePerFim * row.bid.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className="font-mono text-[11px] text-text pl-2" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {row.bid.amount.toLocaleString()}
                      </span>
                      <div className="pl-2">{renderRank(row.bid.maker, 'start')}</div>
                    </>
                  ) : <div className="col-span-4" />}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}