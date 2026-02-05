'use client';

import React, { useMemo } from 'react';
import { useRecentTrades } from "@/hooks/useRecentTrades";
import { useBatchPlayerPercentiles } from "@/hooks/useBatchPlayerPercentiles";
import { PercentileCircle } from "./PercentileCircle";

export function TradingActivityFeed({ seasonAddress }: { seasonAddress: string }) {
  const { data: trades, isLoading } = useRecentTrades(seasonAddress);

  // 1. Gather all unique participants (Sellers & Buyers) for batch fetching
  const participants = useMemo(() => {
    if (!trades) return [];
    const addrs = new Set<string>();
    trades.forEach(t => {
      if (t.seller) addrs.add(t.seller.toLowerCase());
      if (t.buyer) addrs.add(t.buyer.toLowerCase());
    });
    return Array.from(addrs);
  }, [trades]);

  // 2. Fetch Percentile Data for everyone in the feed
  const { data: percentileMap, isFetching } = useBatchPlayerPercentiles(seasonAddress, participants);

  const formatTime = (ts: number) => {
    return new Date(ts * 1000).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="bg-card rounded-xl p-6 shadow-sm h-full flex flex-col">
      {/* Header Area */}
      <div className="flex justify-between items-center border-b border-border/40 pb-3">
        <h3 className="text-[9px] font-black uppercase text-text2 tracking-[0.2em]">Recent Activity</h3>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center text-[10px] uppercase font-bold text-text2 animate-pulse">
            Scanning Ledger...
          </div>
        ) : !trades || trades.length === 0 ? (
          <p className="text-[10px] uppercase font-bold text-text2 italic text-center py-12 opacity-40">
            No Trades Found
          </p>
        ) : (
          <div className="space-y-1">
            {trades.map((trade) => {
              const sellerStats = percentileMap?.[trade.seller?.toLowerCase() || ''];
              const buyerStats = percentileMap?.[trade.buyer?.toLowerCase() || ''];

              return (
                <div 
                  key={trade.id} 
                  className="flex items-center justify-between py-2 border-b border-border/5 transition-colors gap-4"
                >
                  
                  {/* 1. LEFT SIDE: TIME (Pushed to left edge) */}
                  <div className="flex-1 flex justify-start">
                    <span className="text-text2 text-xs font-mono leading-none">
                      {formatTime(trade.timestamp)}
                    </span>
                  </div>

                  {/* 2. MIDDLE SIDE: PARTICIPANTS (Centered Anchor) */}
                  <div className="shrink-0 flex items-center justify-left gap-3">
                    {/* Seller Container */}
                    <div className="flex items-center">
                      {sellerStats ? (
                        <PercentileCircle 
                          percentage={sellerStats.factionPercentile} 
                          isCapitalist={sellerStats.isCapitalist} 
                          size="sm"
                        />
                      ) : (
                        <span className="text-[9px] opacity-20 italic">anon</span>
                      )}
                    </div>
                    
                    <span className="text-text2 text-[10px] opacity-30 shrink-0">➔</span>
                    
                    {/* Buyer Container */}
                    <div className="flex items-center">
                      {buyerStats ? (
                        <PercentileCircle 
                          percentage={buyerStats.factionPercentile} 
                          isCapitalist={buyerStats.isCapitalist} 
                          size="sm"
                        />
                      ) : (
                        <span className="text-[9px] opacity-20 italic">anon</span>
                      )}
                    </div>
                  </div>

                  {/* 3. RIGHT SIDE: FINANCIALS (Pushed to right edge) */}
                  <div className="flex-1 flex items-center justify-end whitespace-nowrap gap-2">
                    <span className="text-primary font-bold font-mono text-xs leading-none">
                      {trade.amount.toLocaleString()} FIM
                    </span>
                    <span className="text-text2 font-mono text-[9px] opacity-80 leading-none">
                      (${trade.price.toFixed(4)})
                    </span>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}