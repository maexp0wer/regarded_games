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

  const [sideFilter, setSideFilter] = useState<'ask' | 'bid' | null>(null);
  const [factionFilter, setFactionFilter] = useState<'bourgeoisie' | 'proletariat' | null>(null);
  const [rankFilterEnabled, setRankFilterEnabled] = useState(false);
  const [minPercentile, setMinPercentile] = useState<number | ''>(0);
  const [maxPercentile, setMaxPercentile] = useState<number | ''>(100);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const targetRowRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

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

    return rawRows.filter((row) => {
      if (sideFilter === 'ask' && !row.ask) return false;
      if (sideFilter === 'bid' && !row.bid) return false;

      const makerAddress = row.ask?.maker || row.bid?.maker;
      if (!makerAddress) return true;

      const stats = percentileMap?.[makerAddress.toLowerCase()];

      if (factionFilter !== null) {
        if (!stats) return false;
        if (factionFilter === 'bourgeoisie' && !stats.isCapitalist) return false;
        if (factionFilter === 'proletariat' && stats.isCapitalist) return false;
      }

      if (rankFilterEnabled && stats) {
        if (stats.factionPercentile < parsedMin || stats.factionPercentile > parsedMax) return false;
      }

      return true;
    });
  }, [data, percentileMap, sideFilter, factionFilter, rankFilterEnabled, minPercentile, maxPercentile]);

  const maxAskAmount = useMemo(
    () => Math.max(0, ...priceRows.map(r => r.ask?.amount ?? 0)),
    [priceRows],
  );
  const maxBidAmount = useMemo(
    () => Math.max(0, ...priceRows.map(r => r.bid?.amount ?? 0)),
    [priceRows],
  );

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
    const container = scrollContainerRef.current;
    if (!container) return;
    const update = () => setIsOverflowing(container.scrollHeight > container.clientHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    return () => ro.disconnect();
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

  const displayAsks = sideFilter === null || sideFilter === 'ask';
  const displayBids = sideFilter === null || sideFilter === 'bid';
  const showBoth = displayAsks && displayBids;


  return (
    <div className="flex flex-col h-full p-2 bg-card rounded-lg">
      {/* Order book card */}
      <div
        className="bg-card flex flex-col flex-1 min-h-0 overflow-hidden max-h-200 border-border2 p-0"
      >
        {/* Filter rows */}
        <div className="flex flex-col shrink-0 bg-card" style={{ borderBottom: '1px solid var(--color-border2)' }}>
          {/* Row 1: Side */}
          <div className="flex bg-card2 border border-border rounded-sm p-[0.2rem] gap-[0.2rem] mt-1.5">
            <button onClick={() => setSideFilter(v => v === 'ask' ? null : 'ask')} className={`btn-input-switch filter-sell ${sideFilter === 'ask' ? 'active' : ''}`}>Ask</button>
            <button onClick={() => setSideFilter(v => v === 'bid' ? null : 'bid')} className={`btn-input-switch filter-buy ${sideFilter === 'bid' ? 'active' : ''}`}>Bid</button>
          </div>
          {/* Row 2: Faction */}
          <div className="flex bg-card2 border border-border rounded-sm p-[0.2rem] gap-[0.2rem] mt-1.5">
            <button onClick={() => setFactionFilter(v => v === 'bourgeoisie' ? null : 'bourgeoisie')} className={`btn-input-switch filter-gold ${factionFilter === 'bourgeoisie' ? 'active' : ''}`}>Bourgeoisie</button>
            <button onClick={() => setFactionFilter(v => v === 'proletariat' ? null : 'proletariat')} className={`btn-input-switch filter-all ${factionFilter === 'proletariat' ? 'active' : ''}`}>Proletariat</button>
          </div>
          {/* Row 3: Rank range */}
          <div className="flex items-stretch w-full bg-card2 border border-border rounded-sm p-[0.2rem] gap-[0.2rem] mt-1.5 mb-1.5">
            <button
              onClick={() => setRankFilterEnabled(v => !v)}
              className={`btn-input-switch flex-1 ${rankFilterEnabled ? 'active' : ''}`}
              
            >
              Rank %
            </button>
            {rankFilterEnabled && (
              <>
                {/* MINIMUM PERCENTILE */}
                <div className="flex items-center bg-card3 ml-8 flex-1 rounded-sm focus-within:ring-1 focus-within:ring-purple-500/50 transition-all">
                  <input
                    type="number" 
                    min="0" 
                    max="100" 
                    placeholder="0"
                    value={minPercentile}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setMinPercentile(raw === '' ? '' : Math.min(100, Math.max(0, parseInt(raw) || 0)));
                    }}
                    className="no-spinners text-text bg-transparent flex-1 min-w-0 border-none outline-none text-center font-mono text-[0.65rem] tracking-wide uppercase py-1 pl-2 pr-1"
                  />
                  <div className="flex flex-col gap-[2px] pr-1 py-[2px] justify-center">
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setMinPercentile(prev => Math.min(100, (parseInt(String(prev)) || 0) + 1))}
                      className="btn-stepper"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setMinPercentile(prev => Math.max(0, (parseInt(String(prev)) || 0) - 1))}
                      className="btn-stepper"
                    >
                      ▼
                    </button>
                  </div>
                </div>

                <span className="font-mono shrink-0 text-[0.65rem] px-3 text-text self-center">—</span>

                {/* MAXIMUM PERCENTILE */}
                <div className="flex items-center bg-card3 flex-1 rounded-sm focus-within:ring-1 focus-within:ring-purple-500/50 transition-all">
                  <input
                    type="number" 
                    min="0" 
                    max="100" 
                    placeholder="100"
                    value={maxPercentile}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setMaxPercentile(raw === '' ? '' : Math.min(100, Math.max(0, parseInt(raw) || 0)));
                    }}
                    className="no-spinners text-text bg-transparent flex-1 min-w-0 border-none outline-none text-center font-mono text-[0.65rem] tracking-wide uppercase py-1 pl-2 pr-1"
                  />
                  <div className="flex flex-col gap-[2px] pr-1 py-[2px] justify-center">
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setMaxPercentile(prev => Math.min(100, (parseInt(String(prev === '' ? 100 : prev)) || 0) + 1))}
                      className="btn-stepper"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setMaxPercentile(prev => Math.max(0, (parseInt(String(prev === '' ? 100 : prev)) || 0) - 1))}
                      className="btn-stepper"
                    >
                      ▼
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Rows viewport — header is sticky inside so both share the same scrollbar-adjusted width */}
        <div ref={scrollContainerRef} className={`flex-1 overflow-y-auto overflow-x-hidden relative ${isOverflowing ? 'scrollbar-on-hover' : ''}`}>
          <div
            className="ledger-header sticky top-0 z-10"
            style={{ gridTemplateColumns: showBoth ? 'repeat(6, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))', paddingLeft: 0, paddingRight: 0 }}
          >
            {displayBids && (showBoth ? (
              <>
                <div className="text-right pl-4 pr-2">Rank</div>
                <div className="text-right pr-2">Amount</div>
                <div className="text-right pr-3" style={{ color: 'var(--color-green)' }}>Bid</div>
              </>
            ) : (
              <>
                <div className="pl-4" style={{ color: 'var(--color-green)' }}>Bid</div>
                <div className="pl-2">Total</div>
                <div className="pl-2">Amount</div>
                <div className="pl-2 pr-4">Rank</div>
              </>
            ))}
            {displayAsks && (showBoth ? (
              <>
                <div className="pl-3" style={{ color: 'var(--color-red)' }}>Ask</div>
                <div className="pl-2">Amount</div>
                <div className="pl-2 pr-4">Rank</div>
              </>
            ) : (
              <>
                <div className="pl-4" style={{ color: 'var(--color-red)' }}>Ask</div>
                <div className="pl-2">Total</div>
                <div className="pl-2">Amount</div>
                <div className="pl-2 pr-4">Rank</div>
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
                  className="relative ledger-row ledger-row-passive items-stretch group"
                  style={{
                    gridTemplateColumns: showBoth ? 'repeat(6, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))',
                    padding: 0,
                    alignItems: 'stretch',
                    cursor: 'default',
                  }}
                >
                  {displayBids && (
                    <div
                      onClick={() => isClickable(row.bid) && handleOrderClick(row.bid)}
                      className={`group/bid ${showBoth ? 'col-span-3 grid grid-cols-3' : 'col-span-4 grid grid-cols-4'} items-center ${showBoth ? 'pl-4' : 'px-4'} py-1 transition-colors relative`}
                      style={{
                        borderRight: displayAsks ? '1px solid var(--color-border)' : undefined,
                        cursor: isClickable(row.bid) ? 'pointer' : 'default',
                        background: bidSelected ? 'var(--color-card3)' : undefined,
                      }}
                      onMouseEnter={(e) => { if (isClickable(row.bid)) (e.currentTarget as HTMLElement).style.background = 'var(--color-card2)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = bidSelected ? 'var(--color-card3)' : ''; }}
                    >
                      {row.bid && maxBidAmount > 0 && (
                        <div className="absolute top-0 h-full pointer-events-none transition-opacity duration-150 group-hover/bid:opacity-0" style={{ width: `${(row.bid.amount / maxBidAmount) * 100}%`, background: 'var(--color-green)', opacity: 0.08, ...(showBoth ? { right: 0 } : { left: 0 }) }} />
                      )}
                      {row.bid ? (showBoth ? (
                        <>
                          <div className="flex justify-end pr-2">{renderRank(row.bid.maker, 'end')}</div>
                          <span className="ledger-cell-secondary text-right pr-2">
                            {row.bid.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="ledger-cell-metric text-right pr-3" style={{ color: 'var(--color-green)' }}>
                            ${parseFloat(row.price).toFixed(4)}
                          </span>
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
                      {row.bid && isOwnOrder(row.bid) && (
                        <div
                          role="tooltip"
                          className="absolute bottom-full mb-2 left-0 z-40 w-56 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                          style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.25))' }}
                        >
                          <div style={{ height: 2, background: 'var(--cyber-sunset)', borderRadius: '3px 3px 0 0' }} />
                          <div className="bg-card3 border border-t-0 border-border2 rounded-b p-3 font-mono">
                            <h3 className="text-[11px] font-black text-text uppercase tracking-wide">
                              Own Order
                            </h3>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {displayAsks && (
                    <div
                      onClick={() => isClickable(row.ask) && handleOrderClick(row.ask)}
                      className={`group/ask ${showBoth ? 'col-span-3 grid grid-cols-3' : 'col-span-4 grid grid-cols-4'} items-center ${showBoth ? 'pr-4' : 'px-4'} py-1 transition-colors relative`}
                      style={{
                        cursor: isClickable(row.ask) ? 'pointer' : 'default',
                        background: askSelected ? 'var(--color-card3)' : undefined,
                      }}
                      onMouseEnter={(e) => { if (isClickable(row.ask)) (e.currentTarget as HTMLElement).style.background = 'var(--color-card2)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = askSelected ? 'var(--color-card3)' : ''; }}
                    >
                      {row.ask && maxAskAmount > 0 && (
                        <div className="absolute top-0 h-full pointer-events-none transition-opacity duration-150 group-hover/ask:opacity-0" style={{ width: `${(row.ask.amount / maxAskAmount) * 100}%`, background: 'var(--color-red)', opacity: 0.08, left: 0 }} />
                      )}
                      {row.ask ? (showBoth ? (
                        <>
                          <span className="ledger-cell-metric pl-3" style={{ color: 'var(--color-red)', textAlign: 'left' }}>
                            ${parseFloat(row.price).toFixed(4)}
                          </span>
                          <span className="ledger-cell-secondary pl-2">
                            {row.ask.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <div className="pl-2">{renderRank(row.ask.maker, 'start')}</div>
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
                      {row.ask && isOwnOrder(row.ask) && (
                        <div
                          role="tooltip"
                          className="absolute bottom-full mb-2 left-0 z-40 w-56 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                          style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.25))' }}
                        >
                          <div style={{ height: 2, background: 'var(--cyber-sunset)', borderRadius: '3px 3px 0 0' }} />
                          <div className="bg-card3 border border-t-0 border-border2 rounded-b p-3 font-mono">
                            <h3 className="text-[11px] font-black text-text uppercase tracking-wide">
                              Own Order
                            </h3>
                          </div>
                        </div>
                      )}
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
