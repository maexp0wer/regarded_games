'use client';

import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Order, useOrderBook } from '@/hooks/useOrderBook';
import { useBatchPlayerPercentiles } from '@/hooks/useBatchPlayerPercentiles';
import { PercentileCircle } from './PercentileCircle';

interface OrderBookProps {
  seasonAddress: string;
  isBuy: boolean;
  isMaker: boolean;
  userAddress?: string;
  onSelectOrder: (o: Order) => void;
  selectedOrderIds?: string[];
}

type AggregatedOrder = Order & { subOrders: Order[] };


export function OrderBook({
  seasonAddress, isMaker, userAddress, onSelectOrder, selectedOrderIds = [],
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

  const isOwnOrder = (order: AggregatedOrder) =>
    !!userAddress && order.maker.toLowerCase() === userAddress.toLowerCase();
  const isClickable = (order: AggregatedOrder | undefined): order is AggregatedOrder =>
    !isMaker && !!order && !isOwnOrder(order);
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


  return (
    <div className="flex flex-col h-full p-2 bg-card rounded-lg">
      {/* Dynamic Style Injection to hide inputs' spin arrows globally */}
      <style dangerouslySetInnerHTML={{__html: `
        .no-spinners::-webkit-outer-spin-button,
        .no-spinners::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .no-spinners { -moz-appearance: textfield; }
      `}} />

      {/* Order book card */}
      <div
        className="bg-bg flex flex-col flex-1 min-h-0 overflow-hidden max-h-200 border-border2 p-0"
      >
        {/* Filter rows */}
        <div className="flex flex-col shrink-0 bg-card" style={{ borderBottom: '1px solid var(--color-border2)' }}>
          {/* Row 1: Side */}
          <div className="terminal-filter-track w-full p-1.5">
            <button onClick={() => setShowAsks(v => !v)} className={`btn-terminal-filter filter-sell flex-1 bg-bg ${showAsks ? 'active' : ''}`}>Ask</button>
            <button onClick={() => setShowBids(v => !v)} className={`btn-terminal-filter filter-buy flex-1 bg-bg ${showBids ? 'active' : ''}`}>Bid</button>
          </div>
          {/* Row 2: Faction */}
          <div className="terminal-filter-track w-full px-1.5 pb-1.5">
            <button onClick={() => setShowBourgeoisie(v => !v)} className={`btn-terminal-filter filter-gold flex-1 bg-bg ${showBourgeoisie ? 'active' : ''}`}>Bourgeoisie</button>
            <button onClick={() => setShowProletariat(v => !v)} className={`btn-terminal-filter filter-all flex-1 bg-bg ${showProletariat ? 'active' : ''}`}>Proletariat</button>
          </div>
          {/* Row 3: Rank range */}
          <div className="terminal-filter-track w-full px-1.5 pb-1.5">
            <button onClick={() => setRankFilterEnabled(v => !v)} className={`btn-terminal-filter flex-1 bg-bg ${rankFilterEnabled ? 'active filter-gold' : ''}`}>Rank %</button>
            <input
              type="number" min="0" max="100" placeholder="0"
              disabled={!rankFilterEnabled}
              value={minPercentile}
              onChange={(e) => {
                const raw = e.target.value;
                setMinPercentile(raw === '' ? '' : Math.min(100, Math.max(0, parseInt(raw) || 0)));
              }}
              className="terminal-input input-gold no-spinners text-center disabled:opacity-40 flex-1 bg-bg"
            />
            <span className="font-mono opacity-40 shrink-0" style={{ fontSize: 11, color: 'var(--color-text2)' }}>—</span>
            <input
              type="number" min="0" max="100" placeholder="100"
              disabled={!rankFilterEnabled}
              value={maxPercentile}
              onChange={(e) => {
                const raw = e.target.value;
                setMaxPercentile(raw === '' ? '' : Math.min(100, Math.max(0, parseInt(raw) || 0)));
              }}
              className="terminal-input input-gold no-spinners text-center disabled:opacity-40 flex-1 bg-bg"
            />
          </div>
        </div>

        {/* Rows viewport — header is sticky inside so both share the same scrollbar-adjusted width */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scrollbar-on-hover relative">
          <div
            className="ledger-header sticky top-0 z-10"
            style={{ gridTemplateColumns: showBoth ? 'repeat(6, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))' }}
          >
            {displayAsks && (showBoth ? (
              <>
                <div className="text-right">Rank</div>
                <div className="text-right">Amount</div>
                <div className="text-right" style={{ color: 'var(--color-red)' }}>Ask</div>
              </>
            ) : (
              <>
                <div style={{ color: 'var(--color-red)' }}>Ask</div>
                <div>Total</div>
                <div>Amount</div>
                <div>Rank</div>
              </>
            ))}
            {displayBids && (showBoth ? (
              <>
                <div style={{ color: 'var(--color-green)' }}>Bid</div>
                <div>Amount</div>
                <div>Rank</div>
              </>
            ) : (
              <>
                <div style={{ color: 'var(--color-green)' }}>Bid</div>
                <div>Total</div>
                <div>Amount</div>
                <div>Rank</div>
              </>
            ))}
          </div>
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
                  className="ledger-row items-stretch"
                  style={{
                    gridTemplateColumns: showBoth ? 'repeat(6, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))',
                    padding: 0,
                    cursor: 'default',
                  }}
                >
                  {displayAsks && (
                    <div
                      onClick={() => isClickable(row.ask) && handleOrderClick(row.ask)}
                      className={`${showBoth ? 'col-span-3 grid grid-cols-3' : 'col-span-4 grid grid-cols-4'} items-center py-2 transition-colors`}
                      style={{
                        borderRight: displayBids ? '1px solid var(--color-border)' : undefined,
                        cursor: isClickable(row.ask) ? 'pointer' : 'default',
                        background: askSelected ? 'var(--color-green-15)' : undefined,
                      }}
                      onMouseEnter={(e) => { if (isClickable(row.ask)) (e.currentTarget as HTMLElement).style.background = 'var(--color-green-15)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = askSelected ? 'var(--color-green-15)' : ''; }}
                    >
                      {row.ask ? (showBoth ? (
                        <>
                          <div className="flex justify-end pr-2">{renderRank(row.ask.maker, 'end')}</div>
                          <span className="ledger-cell-secondary text-right pr-2">
                            {row.ask.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="ledger-cell-metric pr-3" style={{ color: 'var(--color-red)' }}>
                            ${parseFloat(row.price).toFixed(4)}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="ledger-cell-metric pl-3" style={{ color: 'var(--color-red)', textAlign: 'left' }}>
                            ${parseFloat(row.price).toFixed(4)}
                          </span>
                          <span className="ledger-cell-metric pl-2" style={{ textAlign: 'left' }}>
                            ${(parseFloat(row.price) * row.ask.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="ledger-cell-secondary pl-2">
                            {row.ask.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <div className="pl-2">{renderRank(row.ask.maker, 'start')}</div>
                        </>
                      )) : <div className={showBoth ? 'col-span-3' : 'col-span-4'} />}
                    </div>
                  )}

                  {displayBids && (
                    <div
                      onClick={() => isClickable(row.bid) && handleOrderClick(row.bid)}
                      className={`${showBoth ? 'col-span-3 grid grid-cols-3' : 'col-span-4 grid grid-cols-4'} items-center py-2 transition-colors`}
                      style={{
                        cursor: isClickable(row.bid) ? 'pointer' : 'default',
                        background: bidSelected ? 'var(--color-red-15)' : undefined,
                      }}
                      onMouseEnter={(e) => { if (isClickable(row.bid)) (e.currentTarget as HTMLElement).style.background = 'var(--color-red-15)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = bidSelected ? 'var(--color-red-15)' : ''; }}
                    >
                      {row.bid ? (showBoth ? (
                        <>
                          <span className="ledger-cell-metric pl-3" style={{ color: 'var(--color-green)', textAlign: 'left' }}>
                            ${parseFloat(row.price).toFixed(4)}
                          </span>
                          <span className="ledger-cell-secondary pl-2">
                            {row.bid.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <div className="pl-2">{renderRank(row.bid.maker, 'start')}</div>
                        </>
                      ) : (
                        <>
                          <span className="ledger-cell-metric pl-3" style={{ color: 'var(--color-green)', textAlign: 'left' }}>
                            ${parseFloat(row.price).toFixed(4)}
                          </span>
                          <span className="ledger-cell-metric pl-2" style={{ textAlign: 'left' }}>
                            ${(parseFloat(row.price) * row.bid.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="ledger-cell-secondary pl-2">
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

      </div>
    </div>
  );
}
