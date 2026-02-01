'use client';

import React, { useMemo } from 'react';
import { Order, useOrderBook } from "@/hooks/useOrderBook";

interface OrderBookProps {
  seasonAddress: string;
  isBuy: boolean;
  isMaker: boolean;
  onSelectOrder: (o: Order) => void;
  selectedOrderIds?: string[];
}

// Helper type to handle our local grouping
type AggregatedOrder = Order & { subOrders: Order[] };

export function OrderBook({ 
  seasonAddress, 
  isBuy, 
  isMaker, 
  onSelectOrder,
  selectedOrderIds = []
}: OrderBookProps) {
  
  const { data } = useOrderBook(seasonAddress);
  
  // LOGIC: Group by Maker+Price, then by Price Level
  const priceRows = useMemo(() => {
    const bidsRaw = data?.bids || [];
    const asksRaw = data?.asks || [];

    // 1. Helper: Group orders from the SAME MAKER at the SAME PRICE
    const aggregateByMaker = (orders: Order[]): AggregatedOrder[] => {
      const map = new Map<string, AggregatedOrder>();

      orders.forEach((o) => {
        // Calculate unit price safely
        const unitPrice = (o.amount > 0 ? o.price / o.amount : 0).toFixed(4);
        // Key combines Maker Address AND Price
        const key = `${o.maker}-${unitPrice}`;

        if (map.has(key)) {
          const existing = map.get(key)!;
          // Combine amounts and prices
          existing.amount += o.amount; 
          existing.price += o.price;   
          existing.subOrders.push(o); 
        } else {
          // Initialize new aggregated order
          // We clone 'o' to avoid mutating the original data
          map.set(key, { ...o, subOrders: [o] });
        }
      });
      return Array.from(map.values());
    };

    // 2. Perform the aggregation on raw data
    const aggregatedBids = aggregateByMaker(bidsRaw);
    const aggregatedAsks = aggregateByMaker(asksRaw);

    // 3. Now Group by PRICE LEVEL for the UI (Asks vs Bids side-by-side)
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

    // 4. Flatten into rows for rendering
    // Sort High to Low
    return Object.keys(levels)
      .sort((a, b) => parseFloat(b) - parseFloat(a))
      .flatMap((priceKey) => {
        const lvl = levels[priceKey];
        // If there are 2 asks and 1 bid at this price, we need 2 rows
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

  }, [data]); // Dependency is just 'data'

  const shortAddr = (addr: string) => `${addr.substring(0, 4)}..${addr.substring(addr.length - 2)}`;

  // Color Logic Helpers
  const isAskActive = !isMaker && isBuy;
  const isBidActive = !isMaker && !isBuy;

  // Helper to handle clicking a group (selects all sub-orders)
  const handleOrderClick = (order: AggregatedOrder) => {
    order.subOrders.forEach(sub => onSelectOrder(sub));
  };

  return (
    <div className="bg-card rounded-xl border border-border/10 shadow-lg flex flex-col h-full min-h-150 overflow-hidden transition-all">
      
      {/* Header Title */}
      <div className="p-4 border-b border-border/10 bg-card2/20 text-center">
          <h3 className="h3-app">Order Book</h3>
      </div>

      {/* Column Labels */}
      <div className="grid grid-cols-8 px-4 py-2 border-b border-border/50 bg-card2/30 h4-app items-center">
        <span className="text-text2 text-right pr-2">Maker FIM</span>
        <span className="text-text2 text-right pr-2">Amount</span>
        <span className="text-text2 text-right pr-2">Total</span>
        <span className="text-right pr-4 border-r border-border/10 h-full flex items-center justify-end text-success">Ask</span>
        
        <span className="pl-4 text-left h-full flex items-center text-danger">Bid</span>
        <span className="text-text2 text-left pl-2">Total</span>
        <span className="text-text2 text-left pl-2">Amount</span>
        <span className="text-text2 text-left pl-2">Maker FIM</span>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {priceRows.length === 0 ? (
          <div className="p-20 text-center h3-app">Book Empty</div>
        ) : (
          priceRows.map((row) => {
            // Check if ANY of the sub-orders in this group are currently selected
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
                      <div className="flex items-center justify-end gap-2 text-[11px] pr-2">
                         <span className="text-text font-bold">{row.ask.makerBalance.toLocaleString()}</span>
                         <span className="text-[8px] text-primary opacity-70">
                            {shortAddr(row.ask.maker)}
                            {row.ask.subOrders.length > 1 && (
                                <span className="ml-1 text-[7px] bg-card border border-border px-1 rounded-full text-text2">
                                    x{row.ask.subOrders.length}
                                </span>
                            )}
                         </span>
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
                      <div className="flex items-center justify-start gap-1 text-[11px] pl-2">
                        <span className="text-text font-bold">{row.bid.makerBalance.toLocaleString()}</span>
                        <span className="text-[8px] text-primary opacity-70">
                            {shortAddr(row.bid.maker)}
                        </span>
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