'use client';

import React, { useMemo, useState } from 'react';
import { Order, useOrderBook } from "@/hooks/useOrderBook";
import { useBatchPlayerPercentiles } from "@/hooks/useBatchPlayerPercentiles"; // Import the new hook

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
  seasonAddress, 
  isBuy, 
  isMaker, 
  onSelectOrder,
  selectedOrderIds = []
}: OrderBookProps) {
  
  const { data } = useOrderBook(seasonAddress);
  
  // 1. Extract Unique Makers for the Hook
  const uniqueMakers = useMemo(() => {
    if (!data) return [];
    const makers = new Set<string>();
    [...(data.bids || []), ...(data.asks || [])].forEach(o => makers.add(o.maker.toLowerCase()));
    return Array.from(makers);
  }, [data]);

  // 2. Fetch Batch Percentiles
  const { data: percentileMap } = useBatchPlayerPercentiles(seasonAddress, uniqueMakers);

  const priceRows = useMemo(() => {
    const bidsRaw = data?.bids || [];
    const asksRaw = data?.asks || [];

    const aggregateByMaker = (orders: Order[]): AggregatedOrder[] => {
      const map = new Map<string, AggregatedOrder>();

      orders.forEach((o) => {
        const unitPrice = (o.amount > 0 ? o.price / o.amount : 0).toFixed(4);
        const key = `${o.maker}-${unitPrice}`;

        if (map.has(key)) {
          const existing = map.get(key)!;
          existing.amount += o.amount; 
          existing.price += o.price;   
          existing.subOrders.push(o); 
        } else {
          map.set(key, { ...o, subOrders: [o] });
        }
      });
      return Array.from(map.values());
    };

    const aggregatedBids = aggregateByMaker(bidsRaw);
    const aggregatedAsks = aggregateByMaker(asksRaw);

    const levels: Record<string, { asks: AggregatedOrder[], bids: AggregatedOrder[] }> = {};
    const getPriceKey = (o: Order) => (o.amount > 0 ? (o.price / o.amount) : 0).toFixed(4);

    aggregatedAsks.forEach((order) => {
      const key = getPriceKey(order);
      if (!levels[key]) levels[key] = { asks: [], bids: [] };
      levels[key].asks.push(order);
    });

    aggregatedBids.forEach((order) => {
      const key = getPriceKey(order);
      if (!levels[key]) levels[key] = { asks: [], bids: [] };
      levels[key].bids.push(order);
    });

    return Object.keys(levels)
      .sort((a, b) => parseFloat(b) - parseFloat(a))
      .flatMap((priceKey) => {
        const lvl = levels[priceKey];
        const count = Math.max(lvl.asks.length, lvl.bids.length);
        
        const rows = [];
        for (let i = 0; i < count; i++) {
          rows.push({
            price: priceKey,
            ask: lvl.asks[i] || undefined,
            bid: lvl.bids[i] || undefined,
            uniqueKey: `${priceKey}-${i}`
          });
        }
        return rows;
      });

  }, [data]); 

  const isAskActive = !isMaker && isBuy;
  const isBidActive = !isMaker && !isBuy;

  const handleOrderClick = (order: AggregatedOrder) => {
    order.subOrders.forEach(sub => onSelectOrder(sub));
  };

  // 3. Helper to Render Percentile Cell
  const renderPercentile = (makerAddress: string, align: 'start' | 'end') => {
  const stats = percentileMap ? percentileMap[makerAddress.toLowerCase()] : undefined;
  
  if (!stats) return <span className="text-text2/20 text-[10px] w-full block">-</span>;

  return (
    <div className={`flex w-full items-center ${align === 'end' ? 'justify-end' : 'justify-start'}`}>
      <PercentileCircle 
        percentage={stats.factionPercentile} 
        isCapitalist={stats.isCapitalist} 
        size="xs"
      />
    </div>
  );
};

  return (
    <div className="bg-card rounded-xl shadow-lg flex flex-col h-full min-h-150 overflow-hidden transition-all">
      
      <div className="p-4 border-b border-border/20 text-center">
          <h3 className="h3-app">Order Book</h3>
      </div>

      <div className="grid grid-cols-8 px-4 py-2 border-b border-border/50 bg-card2/30 h4-app items-center">
        {/* CHANGED: Replaced "Maker FIM" with "Percentile" */}
        <span className="text-text2 text-right pr-2">Rank %</span>
        
        <span className="text-text2 text-right pr-2">Amount</span>
        <span className="text-text2 text-right pr-2">Total</span>
        <span className="text-right pr-4 border-r border-border/10 h-full flex items-center justify-end text-success">Ask</span>
        
        <span className="pl-4 text-left h-full flex items-center text-danger">Bid</span>
        <span className="text-text2 text-left pl-2">Total</span>
        <span className="text-text2 text-left pl-2">Amount</span>
        
        {/* CHANGED: Replaced "Maker FIM" with "Percentile" */}
        <span className="text-text2 text-left pl-2">Rank %</span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {priceRows.length === 0 ? (
          <div className="p-20 text-center h3-app">Book Empty</div>
        ) : (
          priceRows.map((row) => {
            const askSelected = row.ask ? row.ask.subOrders.some(o => selectedOrderIds.includes(o.id)) : false;
            const bidSelected = row.bid ? row.bid.subOrders.some(o => selectedOrderIds.includes(o.id)) : false;
            
            return (
              <div key={row.uniqueKey} className="grid grid-cols-8 px-4 border-b border-border/5 items-stretch group">
                
                {/* ASK SIDE */}
                <div 
                  onClick={() => isAskActive && row.ask && handleOrderClick(row.ask)}
                  className={`col-span-4 grid grid-cols-4 items-center py-2.5 transition-all border-r border-border/10 text-right
                    ${isAskActive && row.ask ? 'cursor-pointer hover:bg-success/5 active:bg-success/10' : 'cursor-default'}
                    ${askSelected && !isMaker ? 'bg-success/10' : ''}
                  `}
                >
                  {row.ask ? (
                    <>
                      {/* CHANGED: New Percentile Display */}
                      <div className="pl-2 text-left">

                        {renderPercentile(row.ask.maker, 'start')}
                      </div>

                      <span className="text-text text-[11px] pr-2">{row.ask.amount.toLocaleString()}</span>
                      <span className="text-text2 text-[10px] pr-2">${row.ask.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      <span className="font-bold text-[11px] pr-4 text-success">
                        ${parseFloat(row.price).toFixed(4)}
                      </span>
                    </>
                  ) : <div className="col-span-4" />}
                </div>

                {/* BID SIDE */}
                <div 
                  onClick={() => isBidActive && row.bid && handleOrderClick(row.bid)}
                  className={`col-span-4 grid grid-cols-4 items-center py-2.5 transition-all text-left
                    ${isBidActive && row.bid ? 'cursor-pointer hover:bg-danger/5 active:bg-danger/10' : 'cursor-default'}
                    ${bidSelected && !isMaker ? 'bg-danger/10' : ''}
                  `}
                >
                  {row.bid ? (
                    <>
                      <span className="font-bold text-[11px] pl-4 text-danger">
                        ${parseFloat(row.price).toFixed(4)}
                      </span>
                      <span className="text-text2 text-[10px] pl-2">${row.bid.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      <span className="text-text text-[11px] pl-2">{row.bid.amount.toLocaleString()}</span>
                      <div className="pl-2 text-left">
                        {renderPercentile(row.bid.maker, 'start')}
                      </div>
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