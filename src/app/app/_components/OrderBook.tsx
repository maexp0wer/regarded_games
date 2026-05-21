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

const BTN_BASE = 'bg-card2 flex items-center justify-center font-mono font-semibold uppercase tracking-widest transition-all px-3';
const BTN_H = 28;
const BTN_FONT = 11;

function FilterBtn({ label, active, onClick, className = '', activeBg, activeBorder }: { label: string; active: boolean; onClick: () => void; className?: string; activeBg?: string; activeBorder?: string }) {
  const defaultActiveBg = activeBg || 'var(--color-gold-15)';
  const defaultActiveBorder = activeBorder || 'var(--color-gold-35)';

  return (
    <button
      onClick={onClick}
      className={`${BTN_BASE} ${className} ${
        !active ? 'bg-card hover:bg-border transition-colors' : ''
      }`}
      style={{
        fontSize: BTN_FONT,
        letterSpacing: '0.1em',
        height: BTN_H,
        color: active ? 'var(--color-text)' : 'var(--color-text2)',
        background: active ? defaultActiveBg : undefined,
        border: `1px solid ${active ? defaultActiveBorder : 'var(--color-border)'}`,
      }}
    >
      {label}
    </button>
  );
}

export function OrderBook({
  seasonAddress, isBuy, isMaker, onSelectOrder, selectedOrderIds = [],
}: OrderBookProps) {
  const { data } = useOrderBook(seasonAddress);

  const [showAsks, setShowAsks] = useState(false);
  const [showBids, setShowBids] = useState(false);
  const [showBourgeoisie, setShowBourgeoisie] = useState(false);
  const [showProletariat, setShowProletariat] = useState(false);
  const [rankFilterEnabled, setRankFilterEnabled] = useState(false);
  const [minPercentile, setMinPercentile] = useState<number | ''>(0);
  const [maxPercentile, setMaxPercentile] = useState<number | ''>(100);

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

    const parsedMin = minPercentile === '' ? 0 : minPercentile;
    const parsedMax = maxPercentile === '' ? 100 : maxPercentile;
    const sideFiltering = showAsks !== showBids;
    const factionFiltering = showBourgeoisie !== showProletariat;

    return rawRows.filter((row) => {
      // Side filter — only when exactly one side is toggled off
      if (sideFiltering) {
        if (!showAsks && row.ask && !row.bid) return false;
        if (!showBids && row.bid && !row.ask) return false;
      }

      const makerAddress = row.ask?.maker || row.bid?.maker;
      if (!makerAddress) return true;

      const stats = percentileMap?.[makerAddress.toLowerCase()];

      // Faction filter — only when exactly one faction is toggled off
      if (factionFiltering) {
        if (!stats) return false;
        if (!showBourgeoisie && stats.isCapitalist) return false;
        if (!showProletariat && !stats.isCapitalist) return false;
      }

      // Rank range filter
      if (rankFilterEnabled && stats) {
        if (stats.factionPercentile < parsedMin || stats.factionPercentile > parsedMax) return false;
      }

      return true;
    });
  }, [data, percentileMap, showAsks, showBids, showBourgeoisie, showProletariat, rankFilterEnabled, minPercentile, maxPercentile]);

  const closestRowKey = useMemo(() => {
    if (priceRows.length === 0) return null;
    let closestKey = priceRows[0].uniqueKey;
    let minDistance = Math.abs(parseFloat(priceRows[0].price) - 1.0);
    for (let i = 1; i < priceRows.length; i++) {
      const distance = Math.abs(parseFloat(priceRows[i].price) - 1.0);
      if (distance < minDistance) { minDistance = distance; closestKey = priceRows[i].uniqueKey; }
    }
    return closestKey;
  }, [priceRows]);

  useEffect(() => {
    if (scrollContainerRef.current && targetRowRef.current) {
      const container = scrollContainerRef.current;
      const target = targetRowRef.current;
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      container.scrollTop += (targetRect.top - containerRect.top) - (containerRect.height / 2) + (targetRect.height / 2);
    }
  }, [closestRowKey]);

  const isAskActive = !isMaker && isBuy;
  const isBidActive = !isMaker && !isBuy;
  const handleOrderClick = (order: AggregatedOrder) => order.subOrders.forEach(sub => onSelectOrder(sub));

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
          <PercentileCircle percentage={stats.factionPercentile} isCapitalist={stats.isCapitalist} size="xxs" />
        </span>
      </div>
    );
  };

  // Determine which sides to display (both off = show both)
  const bothSidesOff = !showAsks && !showBids;
  const displayAsks = showAsks || bothSidesOff;
  const displayBids = showBids || bothSidesOff;
  const showBoth = displayAsks && displayBids;
  const gridColsClass = showBoth ? 'grid-cols-6' : 'grid-cols-4';

  const rankInputStyle = (active: boolean): React.CSSProperties => ({
    fontSize: BTN_FONT,
    height: 28,
    width: 44,
    background: 'var(--color-card2)',
    borderColor: active ? 'var(--color-gold-35)' : 'var(--color-border)',
    color: active ? 'var(--color-text)' : 'var(--color-text2)',
    opacity: active ? 1 : 0.45,
    outline: 'none',
    letterSpacing: '0.05em',
  });

  return (
    <div className="flex flex-col h-full">
      {/* Dynamic Style Injection to hide inputs' spin arrows globally */}
      <style dangerouslySetInnerHTML={{__html: `
        .no-spinners::-webkit-outer-spin-button,
        .no-spinners::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .no-spinners { -moz-appearance: textfield; }
      `}} />

      {/* Order book card */}
      <div
        className="card-app flex flex-col flex-1 min-h-0 overflow-hidden max-h-200 border-border2 p-0"
      >
        {/* Column headers */}
        <div
          className={`grid ${gridColsClass} px-4 py-2 shrink-0`}
          style={{ background: 'var(--color-card3)', borderBottom: '1px solid var(--color-border)' }}
        >
          {displayAsks && (showBoth ? (
            <>
              <span className="section-label text-right pr-2">Rank</span>
              <span className="section-label text-right pr-2">Amount</span>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-right pr-4 flex items-center justify-end" style={{ color: 'var(--color-red)' }}>Ask</span>
            </>
          ) : (
            <>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-widest pl-4 flex items-center" style={{ color: 'var(--color-red)' }}>Ask</span>
              <span className="section-label pl-2">Total</span>
              <span className="section-label pl-2">Amount</span>
              <span className="section-label pl-2">Rank</span>
            </>
          ))}
          {displayBids && (showBoth ? (
            <>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-widest pl-4 flex items-center" style={{ color: 'var(--color-green)' }}>Bid</span>
              <span className="section-label pl-2">Amount</span>
              <span className="section-label pl-2">Rank</span>
            </>
          ) : (
            <>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-widest pl-4 flex items-center" style={{ color: 'var(--color-green)' }}>Bid</span>
              <span className="section-label pl-2">Total</span>
              <span className="section-label pl-2">Amount</span>
              <span className="section-label pl-2">Rank</span>
            </>
          ))}
        </div>

        {/* Rows viewport */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar relative">
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
                  className={`grid ${gridColsClass} px-4 items-stretch`}
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                  {displayAsks && (
                    <div
                      onClick={() => isAskActive && row.ask && handleOrderClick(row.ask)}
                      className={`${showBoth ? 'col-span-3 grid grid-cols-3' : 'col-span-4 grid grid-cols-4'} items-center py-2 transition-colors`}
                      style={{
                        borderRight: displayBids ? '1px solid var(--color-border)' : undefined,
                        cursor: isAskActive && row.ask ? 'pointer' : 'default',
                        background: askSelected ? 'var(--color-green-15)' : undefined,
                      }}
                      onMouseEnter={(e) => { if (isAskActive && row.ask) (e.currentTarget as HTMLElement).style.background = 'var(--color-green-15)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = askSelected ? 'var(--color-green-15)' : ''; }}
                    >
                      {row.ask ? (showBoth ? (
                        <>
                          <div className="flex justify-end pr-2">{renderRank(row.ask.maker, 'end')}</div>
                          <span className="font-mono text-[11px] text-text text-right pr-2" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {row.ask.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="font-mono font-semibold text-[11px] text-right pr-3" style={{ color: 'var(--color-red)', fontVariantNumeric: 'tabular-nums' }}>
                            ${parseFloat(row.price).toFixed(4)}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="font-mono font-semibold text-[11px] pl-3" style={{ color: 'var(--color-red)', fontVariantNumeric: 'tabular-nums' }}>
                            ${parseFloat(row.price).toFixed(4)}
                          </span>
                          <span className="font-mono font-semibold text-[11px] text-text pl-2" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            ${(parseFloat(row.price) * row.ask.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="font-mono text-[11px] text-text pl-2" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {row.ask.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <div className="pl-2">{renderRank(row.ask.maker, 'start')}</div>
                        </>
                      )) : <div className={showBoth ? 'col-span-3' : 'col-span-4'} />}
                    </div>
                  )}

                  {displayBids && (
                    <div
                      onClick={() => isBidActive && row.bid && handleOrderClick(row.bid)}
                      className={`${showBoth ? 'col-span-3 grid grid-cols-3' : 'col-span-4 grid grid-cols-4'} items-center py-2 transition-colors`}
                      style={{
                        cursor: isBidActive && row.bid ? 'pointer' : 'default',
                        background: bidSelected ? 'var(--color-red-15)' : undefined,
                      }}
                      onMouseEnter={(e) => { if (isBidActive && row.bid) (e.currentTarget as HTMLElement).style.background = 'var(--color-red-15)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = bidSelected ? 'var(--color-red-15)' : ''; }}
                    >
                      {row.bid ? (showBoth ? (
                        <>
                          <span className="font-mono font-semibold text-[11px] pl-3" style={{ color: 'var(--color-green)', fontVariantNumeric: 'tabular-nums' }}>
                            ${parseFloat(row.price).toFixed(4)}
                          </span>
                          <span className="font-mono text-[11px] text-text pl-2" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {row.bid.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <div className="pl-2">{renderRank(row.bid.maker, 'start')}</div>
                        </>
                      ) : (
                        <>
                          <span className="font-mono font-semibold text-[11px] pl-3" style={{ color: 'var(--color-green)', fontVariantNumeric: 'tabular-nums' }}>
                            ${parseFloat(row.price).toFixed(4)}
                          </span>
                          <span className="font-mono font-semibold text-[11px] text-text pl-2" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            ${(parseFloat(row.price) * row.bid.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="font-mono text-[11px] text-text pl-2" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {row.bid.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <div className="pl-2">{renderRank(row.bid.maker, 'start')}</div>
                        </>
                      )) : <div className={showBoth ? 'col-span-3' : 'col-span-4'} />}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Filter rows at the bottom of the card */}
        <div className="flex flex-col gap- p-0 shrink-0 bg-card2">
          {/* Row 1: Side */}
          <div className="flex gap-0 w-full">
            <FilterBtn label="Ask" active={showAsks} onClick={() => setShowAsks(v => !v)} className="flex-1" activeBg="var(--color-red-15)" activeBorder="var(--color-red-35)" />
            <FilterBtn label="Bid" active={showBids} onClick={() => setShowBids(v => !v)} className="flex-1" activeBg="var(--color-green-15)" activeBorder="var(--color-green-35)" />
          </div>
          {/* Row 2: Faction */}
          <div className="flex gap-0 w-full">
            <FilterBtn label="Bourgeoisie" active={showBourgeoisie} onClick={() => setShowBourgeoisie(v => !v)} className="flex-1" activeBg="var(--color-gold-15)" activeBorder="var(--color-gold-35)" />
            <FilterBtn label="Proletariat" active={showProletariat} onClick={() => setShowProletariat(v => !v)} className="flex-1" activeBg="var(--color-purple-15)" activeBorder="var(--color-purple-35)" />
          </div>
          {/* Row 3: Rank range */}
          <div className="flex items-center gap-0 w-full">
            <FilterBtn label="Rank %" active={rankFilterEnabled} onClick={() => setRankFilterEnabled(v => !v)} className="flex-1" />
            <input
              type="number" min="0" max="100" placeholder="0"
              disabled={!rankFilterEnabled}
              value={minPercentile}
              onChange={(e) => {
                const raw = e.target.value;
                setMinPercentile(raw === '' ? '' : Math.min(100, Math.max(0, parseInt(raw) || 0)));
              }}
              className="  font-mono font-semibold text-center border transition-all no-spinners"
              style={rankInputStyle(rankFilterEnabled)}
            />
            <span className="font-mono opacity-40" style={{ fontSize: BTN_FONT, color: 'var(--color-text2)' }}>—</span>
            <input
              type="number" min="0" max="100" placeholder="100"
              disabled={!rankFilterEnabled}
              value={maxPercentile}
              onChange={(e) => {
                const raw = e.target.value;
                setMaxPercentile(raw === '' ? '' : Math.min(100, Math.max(0, parseInt(raw) || 0)));
              }}
              className=" font-mono font-semibold text-center border transition-all no-spinners"
              style={rankInputStyle(rankFilterEnabled)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
