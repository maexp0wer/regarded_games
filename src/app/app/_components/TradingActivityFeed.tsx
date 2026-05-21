'use client';

import React from 'react';
import { useRecentTrades } from '@/hooks/useRecentTrades';
import { PercentileCircle } from './PercentileCircle';

export function TradingActivityFeed({ seasonAddress, className }: { seasonAddress: string; className?: string }) {
  const { data: trades, isLoading } = useRecentTrades(seasonAddress);

  const fmt = (ts: number) =>
    new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  return (
    <div className={`flex flex-col p-2 bg-card rounded-lg ${className ?? 'max-h-130'}`}>
      <div className="bg-bg flex flex-col flex-1 min-h-0 overflow-hidden border-border2">
        {/* Rows viewport with sticky header */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          <div
            className="ledger-header sticky top-0 z-10"
            style={{ gridTemplateColumns: '1fr 1fr 1fr' }}
          >
            <div>Time</div>
            <div>Participants</div>
            <div className="text-right">Amount</div>
          </div>

          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="section-label animate-pulse">Reading Ledger…</p>
            </div>
          ) : !trades || trades.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <p className="section-label opacity-40">No trades found</p>
            </div>
          ) : (
            trades.map((trade) => {
              const sellerKnown = trade.sellerBalance !== '0';
              const buyerKnown  = trade.buyerBalance  !== '0';

              return (
                <div
                  key={trade.id}
                  className="ledger-row"
                  style={{ gridTemplateColumns: '1fr 1fr 1fr' }}
                >
                  <span className="ledger-cell-secondary" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(trade.timestamp)}
                  </span>

                  <div className="flex items-center gap-2">
                    {sellerKnown ? (
                      <PercentileCircle percentage={trade.sellerPercentile} isCapitalist={trade.sellerIsCapitalist} size="xxs" />
                    ) : (
                      <span className="font-mono text-[10px] text-text2 opacity-30">anon</span>
                    )}
                    <span className="font-mono text-[10px] text-text2 opacity-30">→</span>
                    {buyerKnown ? (
                      <PercentileCircle percentage={trade.buyerPercentile} isCapitalist={trade.buyerIsCapitalist} size="xxs" />
                    ) : (
                      <span className="font-mono text-[10px] text-text2 opacity-30">anon</span>
                    )}
                  </div>

                  <span className="ledger-cell-metric text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {trade.amount.toLocaleString()} FIM
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
