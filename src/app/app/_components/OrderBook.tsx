'use client';

import React, { useMemo } from 'react';
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

export function OrderBook({
  seasonAddress, isBuy, isMaker, onSelectOrder, selectedOrderIds = [],
}: OrderBookProps) {
  const { data } = useOrderBook(seasonAddress);

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

    return Object.keys(levels)
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
  }, [data]);

  const isAskActive = !isMaker && isBuy;
  const isBidActive = !isMaker && !isBuy;

  const handleOrderClick = (order: AggregatedOrder) => order.subOrders.forEach(sub => onSelectOrder(sub));

  const renderRank = (makerAddress: string, align: 'start' | 'end') => {
    const stats = percentileMap?.[makerAddress.toLowerCase()];
    if (!stats) return <span className="font-mono text-[10px] opacity-20 text-text2">—</span>;
    return (
      <div className={`flex w-full items-center ${align === 'end' ? 'justify-end' : 'justify-start'}`}>
        <PercentileCircle percentage={stats.factionPercentile} isCapitalist={stats.isCapitalist} size="xs" />
      </div>
    );
  };

  return (
    <div
      className="card-app flex flex-col flex-1 min-h-80 overflow-hidden"
      style={{ padding: 0, borderColor: 'var(--color-border-bright)' }}
    >
      {/* Header */}
      <div
        className="px-5 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <p className="section-label">Order Book</p>
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

      {/* Rows */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {priceRows.length === 0 ? (
          <div className="flex items-center justify-center h-full py-20">
            <p className="section-label opacity-40">Order Book Empty</p>
          </div>
        ) : (
          priceRows.map((row) => {
            const askSelected = row.ask?.subOrders.some(o => selectedOrderIds.includes(o.id)) ?? false;
            const bidSelected = row.bid?.subOrders.some(o => selectedOrderIds.includes(o.id)) ?? false;

            return (
              <div
                key={row.uniqueKey}
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
                    background: askSelected
                      ? 'rgba(107,203,110,0.08)'
                      : undefined,
                  }}
                  onMouseEnter={(e) => { if (isAskActive && row.ask) (e.currentTarget as HTMLElement).style.background = 'rgba(107,203,110,0.05)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = askSelected ? 'rgba(107,203,110,0.08)' : ''; }}
                >
                  {row.ask ? (
                    <>
                      <div className="pl-1">{renderRank(row.ask.maker, 'start')}</div>
                      <span className="font-mono text-[11px] text-text text-right pr-2" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {row.ask.amount.toLocaleString()}
                      </span>
                      <span className="font-mono text-[10px] text-text2 text-right pr-2" style={{ fontVariantNumeric: 'tabular-nums' }}>
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
                      <span className="font-mono text-[10px] text-text2 pl-2" style={{ fontVariantNumeric: 'tabular-nums' }}>
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
