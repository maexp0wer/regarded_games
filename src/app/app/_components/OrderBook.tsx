'use client';

import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Order, useOrderBook } from '@/hooks/useOrderBook';
import { useBatchPlayerClass } from '@/hooks/useBatchPlayerClass';
import { PercentileCircle } from './PercentileCircle';
import PercentRangeSlider from './PercentRangeSlider';

interface OrderBookProps {
  seasonAddress: string;
  isBuy: boolean;
  isMaker: boolean;
  userAddress?: string;
  onSelectOrder: (o: Order) => void;
  onRemoveOrder?: (id: string) => void;
  selectedOrderIds?: string[];
  isOnHold?: boolean;
}

type AggregatedOrder = Order & { subOrders: Order[] };


export function OrderBook({
  seasonAddress, isMaker, userAddress, onSelectOrder, onRemoveOrder, selectedOrderIds = [], isOnHold = false,
}: OrderBookProps) {
  const { data } = useOrderBook(seasonAddress);

  const [sideFilter, setSideFilter] = useState<'ask' | 'bid' | null>(null);
  const [factionFilter, setFactionFilter] = useState<'bourgeoisie' | 'proletariat' | null>(null);

  // Each faction remembers its own percentile range independently.
  type Range = { min: number | ''; max: number | '' };
  const [ranges, setRanges] = useState<Record<'proletariat' | 'bourgeoisie', Range>>({
    proletariat: { min: 0, max: 100 },
    bourgeoisie: { min: 0, max: 100 },
  });

  // Active faction's range, with setters that write into its slot. Falls back to
  // proletariat's slot when no faction is selected (the inputs are hidden then).
  const activeFaction = factionFilter ?? 'proletariat';
  const minPercentile = ranges[activeFaction].min;
  const maxPercentile = ranges[activeFaction].max;
  const setMinPercentile = (v: number | '') =>
    setRanges((r) => ({ ...r, [activeFaction]: { ...r[activeFaction], min: v } }));
  const setMaxPercentile = (v: number | '') =>
    setRanges((r) => ({ ...r, [activeFaction]: { ...r[activeFaction], max: v } }));

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const targetRowRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const uniqueMakers = useMemo(() => {
    if (!data) return [];
    const makers = new Set<string>();
    [...(data.bids || []), ...(data.asks || [])].forEach(o => makers.add(o.maker.toLowerCase()));
    return Array.from(makers);
  }, [data]);

  const { data: classMap } = useBatchPlayerClass(seasonAddress, uniqueMakers);

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

      const stats = classMap?.[makerAddress.toLowerCase()];

      if (factionFilter !== null) {
        if (!stats) return false;
        if (factionFilter === 'bourgeoisie' && !stats.isCapitalist) return false;
        if (factionFilter === 'proletariat' && stats.isCapitalist) return false;

        // Filter automatically by rank when faction filter is active
        if (stats.classPercentile < parsedMin || stats.classPercentile > parsedMax) return false;
      }

      return true;
    });
  }, [data, classMap, sideFilter, factionFilter, minPercentile, maxPercentile]);

  const maxAskAmount = useMemo(
    () => Math.max(0, ...priceRows.map(r => r.ask?.amount ?? 0)),
    [priceRows],
  );
  const maxBidAmount = useMemo(
    () => Math.max(0, ...priceRows.map(r => r.bid?.amount ?? 0)),
    [priceRows],
  );

  // Rows are sorted descending by price, so the $1.00 boundary sits between the
  // last row priced ≥ $1 and the first row priced < $1. The divider is drawn on
  // the bottom of that last ≥ $1 row, landing exactly on the boundary.
  const boundaryRowKey = useMemo(() => {
    if (priceRows.length === 0) return null;
    let lastAboveKey: string | null = null;
    for (const row of priceRows) {
      if (parseFloat(row.price) >= 1.0) lastAboveKey = row.uniqueKey;
      else break;
    }
    // If every row is below $1, anchor the divider above the first row instead.
    return lastAboveKey ?? priceRows[0].uniqueKey;
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
  }, [boundaryRowKey]);

  // Whether the boundary row sits at/above $1 (divider goes on its bottom) or the
  // book is entirely below $1 (divider goes on the first row's top instead).
  const boundaryAtTop = useMemo(
    () => priceRows.length > 0 && parseFloat(priceRows[0].price) < 1.0,
    [priceRows],
  );

  const isOwnOrder = (order: AggregatedOrder) =>
    !!userAddress && order.maker.toLowerCase() === userAddress.toLowerCase();
  const isClickable = (order: AggregatedOrder | undefined): order is AggregatedOrder =>
    !isMaker && !!order && !isOwnOrder(order) && !isOnHold;
  const handleOrderClick = (order: AggregatedOrder) => {
    const anySelected = order.subOrders.some(sub => selectedOrderIds.includes(sub.id));
    if (anySelected && onRemoveOrder) {
      order.subOrders.forEach(sub => onRemoveOrder(sub.id));
    } else {
      order.subOrders.forEach(sub => onSelectOrder(sub));
    }
  };

  const renderRank = (makerAddress: string, align: 'start' | 'end') => {
    const stats = classMap?.[makerAddress.toLowerCase()];
    if (!stats) return (
      <div className={`flex w-full items-center ${align === 'end' ? 'justify-end' : 'justify-start'}`}>
        <span className="font-mono text-[10px] opacity-20 text-text2">—</span>
      </div>
    );
    return (
      <div className={`flex w-full items-center ${align === 'end' ? 'justify-end' : 'justify-start'}`}>
        <span className="sm:hidden">
          <PercentileCircle percentage={stats.classPercentile} isCapitalist={stats.isCapitalist} size="xxs" />
        </span>
        <span className="hidden sm:inline-flex">
          <PercentileCircle percentage={stats.classPercentile} isCapitalist={stats.isCapitalist} size="xxs" />
        </span>
      </div>
    );
  };

  const displayAsks = sideFilter === null || sideFilter === 'ask';
  const displayBids = sideFilter === null || sideFilter === 'bid';
  const showBoth = displayAsks && displayBids;


  // Refs to track absolute latest state values for safe intervals
  const minPercentileRef = useRef(minPercentile);
  const maxPercentileRef = useRef(maxPercentile);

  useEffect(() => {
    minPercentileRef.current = minPercentile;
  }, [minPercentile]);

  useEffect(() => {
    maxPercentileRef.current = maxPercentile;
  }, [maxPercentile]);

  // Refs to hold interval/timeout IDs
  const stepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper to execute a single step with cross-input collision boundaries
  // Helper to execute a single step with "push/pull" collision logic
  const step = (direction: 'up' | 'down', target: 'min' | 'max') => {
    const minFallback = 0;
    const maxFallback = 100;

    const currentMin = minPercentileRef.current === '' ? minFallback : (parseInt(String(minPercentileRef.current)) || 0);
    const currentMax = maxPercentileRef.current === '' ? maxFallback : (parseInt(String(maxPercentileRef.current)) || 0);

    if (target === 'min') {
      if (direction === 'up') {
        const nextMin = Math.min(100, currentMin + 1);
        setMinPercentile(nextMin);

        // Push max up to keep a span of at least 1 between them
        if (nextMin >= currentMax) {
          setMaxPercentile(Math.min(100, nextMin + 1));
        }
      } else {
        const nextMin = Math.max(0, currentMin - 1);
        setMinPercentile(nextMin);
      }
    } else {
      if (direction === 'up') {
        const nextMax = Math.min(100, currentMax + 1);
        setMaxPercentile(nextMax);
      } else {
        const nextMax = Math.max(0, currentMax - 1);
        setMaxPercentile(nextMax);

        // Pull min down to keep a span of at least 1 between them
        if (nextMax <= currentMin) {
          setMinPercentile(Math.max(0, nextMax - 1));
        }
      }
    }
  };

  // Triggers stepping immediately, then begins continuous looping after a delay
  const startStepping = (direction: 'up' | 'down', target: 'min' | 'max') => {
    stopStepping();
    step(direction, target); // Trigger first change immediately

    // After 300ms of holding, start cycling at a moderate pace (100ms interval)
    stepTimeoutRef.current = setTimeout(() => {
      stepIntervalRef.current = setInterval(() => {
        step(direction, target);
      }, 100); 
    }, 300);
  };

  // Clear timers to stop counting
  const stopStepping = () => {
    if (stepTimeoutRef.current) {
      clearTimeout(stepTimeoutRef.current);
      stepTimeoutRef.current = null;
    }
    if (stepIntervalRef.current) {
      clearInterval(stepIntervalRef.current);
      stepIntervalRef.current = null;
    }
  };

  // Clean up timers on component unmount
  useEffect(() => {
    return () => stopStepping();
  }, []);

  const renderPercentileInputs = () => {
    return (
      <div className="flex items-center gap-2 w-full mt-1.5 animate-in fade-in duration-200">
        {/* MINIMUM PERCENTILE */}
        <div className="flex items-center bg-card3 shrink-0 rounded border border-transparent h-[26px] focus-within:border-border2 focus-within:ring-1 focus-within:ring-purple-500/20 transition-all">
          <div className="flex-1 flex justify-center items-center h-full pl-2">
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
              // Removed fixed padding/margins so browser styles don't push the layout around
              className="no-spinners text-text bg-transparent text-center font-mono text-[12px] tracking-wide uppercase h-full p-0 m-0 outline-none border-none min-w-0"
              style={{ width: '2ch' }}
            />
            <span className="font-mono text-[12px] text-text2 select-none pointer-events-none pl-1">%</span>
          </div>
          
          {/* Minimalist Stepper (Right) */}
          <div className="flex flex-col gap-[2px] pl-1 pr-2 justify-center shrink-0 select-none">
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => { e.preventDefault(); startStepping('up', 'min'); }}
              onMouseUp={stopStepping}
              onMouseLeave={stopStepping}
              onTouchStart={(e) => { e.preventDefault(); startStepping('up', 'min'); }}
              onTouchEnd={stopStepping}
              className="text-[8px] leading-[1] text-text2 hover:text-text transition-colors"
            >
              ▲
            </button>
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => { e.preventDefault(); startStepping('down', 'min'); }}
              onMouseUp={stopStepping}
              onMouseLeave={stopStepping}
              onTouchStart={(e) => { e.preventDefault(); startStepping('down', 'min'); }}
              onTouchEnd={stopStepping}
              className="text-[8px] leading-[1] text-text2 hover:text-text transition-colors"
            >
              ▼
          </button>
          </div>
        </div>

        <PercentRangeSlider
          min={minPercentile === '' ? 0 : minPercentile}
          max={maxPercentile === '' ? 100 : maxPercentile}
          onChangeMin={setMinPercentile}
          onChangeMax={setMaxPercentile}
          faction={factionFilter ?? 'proletariat'}
        />


        {/* MAXIMUM PERCENTILE */}
        <div className="flex items-center bg-card3 shrink-0 rounded border border-transparent h-[26px] focus-within:border-border2 focus-within:ring-1 focus-within:ring-purple-500/20 transition-all">
          <div className="flex-1 flex justify-center items-center h-full pl-2">
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
              className="no-spinners text-text bg-transparent text-center font-mono text-[12px] tracking-wide uppercase h-full p-0 m-0 outline-none border-none min-w-0"
              style={{ width: '3ch' }}
            />
            <span className="font-mono text-[12px] text-text2 select-none pointer-events-none pl-2">%</span>
          </div>

          {/* Minimalist Stepper (Right) */}
          <div className="flex flex-col gap-[2px] pl-1 pr-2 justify-center shrink-0 select-none">
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => { e.preventDefault(); startStepping('up', 'max'); }}
              onMouseUp={stopStepping}
              onMouseLeave={stopStepping}
              onTouchStart={(e) => { e.preventDefault(); startStepping('up', 'max'); }}
              onTouchEnd={stopStepping}
              className="text-[8px] leading-[1] text-text2 hover:text-text transition-colors"
            >
              ▲
            </button>
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => { e.preventDefault(); startStepping('down', 'max'); }}
              onMouseUp={stopStepping}
              onMouseLeave={stopStepping}
              onTouchStart={(e) => { e.preventDefault(); startStepping('down', 'max'); }}
              onTouchEnd={stopStepping}
              className="text-[8px] leading-[1] text-text2 hover:text-text transition-colors"
            >
              ▼
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="flex flex-col h-full bg-card rounded-lg">
      {/* Order book card */}
      <div
        className="bg-card flex flex-col flex-1 min-h-0 overflow-hidden max-h-200 border-border p-0"
      >
        {/* Filter rows */}
        <div className="flex flex-col shrink-0 px-5 py-2 bg-card" style={{ borderBottom: '1px solid var(--color-border)' }}>
          {/* Row 1: Side */}
          <div className="flex gap-1 mt-1.5">
            <button
              onClick={() => setSideFilter(v => v === 'bid' ? null : 'bid')}
              className={`flex-1 px-2.5 py-1 text-[11px] font-dispaly font-bold uppercase tracking-[0.1rem]  rounded border border-border transition duration-150 active:scale-98 ${
                sideFilter === 'bid' ? 'text-text' : 'bg-card3 text-text2 hover:text-text hover:bg-[color-mix(in_srgb,var(--color-green-15),var(--color-card2))]'
              }`}
              style={sideFilter === 'bid' ? { backgroundColor: 'color-mix(in srgb, var(--color-green) 30%, var(--color-card3))' } : undefined}
            >
              Bid
            </button>
            <button
              onClick={() => setSideFilter(v => v === 'ask' ? null : 'ask')}
              className={`flex-1 px-2.5 py-1 text-[11px] font-display font-bold uppercase tracking-widest rounded border border-border transition duration-150 active:scale-98 ${
                sideFilter === 'ask' ? 'text-text' : 'bg-card3 text-text2 hover:text-text hover:bg-[color-mix(in_srgb,var(--color-red),var(--color-card2))]'
              }`}
              style={sideFilter === 'ask' ? { backgroundColor: 'color-mix(in srgb, var(--color-red) 30%, var(--color-card3))' } : undefined}
            >
              Ask
            </button>
          </div>
          {/* Row 2: Faction Buttons & Nested Ranks */}
          <div className="flex gap-1.5 mt-1.5 mb-1.5">
            {/* Proletarians Column */}
            <div className="flex-1 flex flex-col">
              <button
                onClick={() => setFactionFilter(v => v === 'proletariat' ? null : 'proletariat')}
                className={`w-full px-2.5 py-1 text-[11px] font-display font-bold uppercase tracking-widest rounded border border-border transition duration-150 active:scale-98 ${
                  factionFilter === 'proletariat' ? 'text-text' : 'bg-card3 text-text2 hover:text-text hover:bg-[color-mix(in_srgb,var(--color-purple),var(--color-card2))]'
                }`}
                style={factionFilter === 'proletariat' ? { backgroundColor: 'color-mix(in srgb, var(--color-purple) 30%, var(--color-card3))' } : undefined}
              >
                Proletarians
              </button>
            </div>

            {/* Capitalists Column */}
            <div className="flex-1 flex flex-col">
              <button
                onClick={() => setFactionFilter(v => v === 'bourgeoisie' ? null : 'bourgeoisie')}
                className={`w-full px-2.5 py-1 text-[11px] font-display font-bold uppercase tracking-widest rounded border border-border transition duration-150 active:scale-98 ${
                  factionFilter === 'bourgeoisie' ? 'text-text' : 'bg-card3 text-text2 hover:text-text hover:bg-[color-mix(in_srgb,var(--color-gold-15),var(--color-card2))]'
                }`}
                style={factionFilter === 'bourgeoisie' ? { backgroundColor: 'color-mix(in srgb, var(--color-gold) 30%, var(--color-card3))' } : undefined}
              >
                Capitalists
              </button>
            </div>
          </div>
          {/* Row 3: Full-width percentile range (shown when a faction is active) */}
          {factionFilter !== null && renderPercentileInputs()}
        </div>

        {/* Header — fixed above the scrollable rows */}
        <div
          className="ledger-header shrink-0"
          style={{ gridTemplateColumns: showBoth ? 'repeat(6, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))', paddingLeft: 0, paddingRight: 0 }}
        >
          {displayBids && (showBoth ? (
              <>
                <div className="text-right pl-4 pr-2">Class</div>
                <div className="text-right pr-2">Amount</div>
                <div className="text-right pr-3" style={{ color: 'var(--color-green)' }}>Bid</div>
              </>
            ) : (
              <>
                <div className="pl-4" style={{ color: 'var(--color-green)' }}>Bid</div>
                <div className="pl-2">Total</div>
                <div className="pl-2">Amount</div>
                <div className="pl-2 pr-4">Class</div>
              </>
            ))}
            {displayAsks && (showBoth ? (
              <>
                <div className="pl-3" style={{ color: 'var(--color-red)' }}>Ask</div>
                <div className="pl-2">Amount</div>
                <div className="pl-2 pr-4">Class</div>
              </>
            ) : (
              <>
                <div className="pl-4" style={{ color: 'var(--color-red)' }}>Ask</div>
                <div className="pl-2">Total</div>
                <div className="pl-2">Amount</div>
                <div className="pl-2 pr-4">Class</div>
              </>
            ))}
        </div>

        {/* Rows viewport — scrollable container for rows only */}
        <div ref={scrollContainerRef} data-chrome-scroll-guard className={`flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain relative custom-scrollbar`}>
          {priceRows.length === 0 ? (
            <div className="flex items-center justify-center h-full py-20">
              <p className="section-label opacity-40">No Matching Orders Found</p>
            </div>
          ) : (
            priceRows.map((row) => {
              const askSelected = row.ask?.subOrders.some(o => selectedOrderIds.includes(o.id)) ?? false;
              const bidSelected = row.bid?.subOrders.some(o => selectedOrderIds.includes(o.id)) ?? false;
              const isBoundaryRow = row.uniqueKey === boundaryRowKey;

              return (
                <div
                  key={row.uniqueKey}
                  ref={isBoundaryRow ? targetRowRef : undefined}
                  className="relative ledger-row ledger-row-passive items-stretch group"
                  style={{
                    gridTemplateColumns: showBoth ? 'repeat(6, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))',
                    padding: 0,
                    alignItems: 'stretch',
                    cursor: 'default',
                    borderBottom: isBoundaryRow && !boundaryAtTop ? '1px solid var(--color-border2)' : undefined,
                    borderTop: isBoundaryRow && boundaryAtTop ? '1px solid var(--color-border2)' : undefined,
                  }}
                >
                  {displayBids && (
                    <div
                      onClick={() => { if (isClickable(row.bid)) handleOrderClick(row.bid); }}
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
                          <div className="flex justify-end pr-2">{isOwnOrder(row.bid) ? <span className="font-mono text-[10px] font-bold text-text2 uppercase tracking-wide">YOU</span> : renderRank(row.bid.maker, 'end')}</div>
                          <span className="ledger-cell-secondary text-right pr-2">
                            {row.bid.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="ledger-cell-metric text-[0.72rem] text-right pr-3" style={{ color: 'var(--color-green)' }}>
                            ${parseFloat(row.price).toFixed(4)}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="ledger-cell-metric text-[0.72rem] pl-3" style={{ color: 'var(--color-green)', textAlign: 'left' }}>
                            ${parseFloat(row.price).toFixed(4)}
                          </span>
                          <span className="ledger-cell-metric pl-2" style={{ textAlign: 'left' }}>
                            ${(parseFloat(row.price) * row.bid.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="ledger-cell-secondary pl-2">
                            {row.bid.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <div className="pl-2">{isOwnOrder(row.bid) ? <span className="font-mono text-[10px] font-bold text-text2 uppercase tracking-wide">YOU</span> : renderRank(row.bid.maker, 'start')}</div>
                        </>
                      )) : <div className={showBoth ? 'col-span-3' : 'col-span-4'} />}
                    </div>
                  )}

                  {displayAsks && (
                    <div
                      onClick={() => { if (isClickable(row.ask)) handleOrderClick(row.ask); }}
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
                          <span className="ledger-cell-metric text-[0.72rem] pl-3" style={{ color: 'var(--color-red)', textAlign: 'left' }}>
                            ${parseFloat(row.price).toFixed(4)}
                          </span>
                          <span className="ledger-cell-secondary pl-2">
                            {row.ask.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <div className="pl-2">{isOwnOrder(row.ask) ? <span className="font-mono text-[10px] font-bold text-text2 uppercase tracking-wide">YOU</span> : renderRank(row.ask.maker, 'start')}</div>
                        </>
                      ) : (
                        <>
                          <span className="ledger-cell-metric text-[0.72rem] pl-3" style={{ color: 'var(--color-red)', textAlign: 'left' }}>
                            ${parseFloat(row.price).toFixed(4)}
                          </span>
                          <span className="ledger-cell-metric pl-2" style={{ textAlign: 'left' }}>
                            ${(parseFloat(row.price) * row.ask.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="ledger-cell-secondary pl-2">
                            {row.ask.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <div className="pl-2">{isOwnOrder(row.ask) ? <span className="font-mono text-[10px] font-bold text-text2 uppercase tracking-wide">YOU</span> : renderRank(row.ask.maker, 'start')}</div>
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