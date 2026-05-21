'use client';

import React from 'react';
import { useRecentTrades } from '@/hooks/useRecentTrades';
import { PercentileCircle } from './PercentileCircle';

export function TradingActivityFeed({ seasonAddress, className }: { seasonAddress: string; className?: string }) {
  const { data: trades, isLoading } = useRecentTrades(seasonAddress);

  const fmt = (ts: number) =>
    new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  return (
    <div
      className={`card-app bg-[image:var(--subtle-glow)] flex flex-col border-border2 p-0 ${className ?? 'max-h-130'}`}
    >
      {/* Header */}
      

      {/* Column headers */}
      <div
        className="flex items-center justify-between px-5 py-2 shrink-0"
        style={{ background: 'var(--color-card3)', borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-4">
          <span className="section-label w-15">Time</span>
          <span className="section-label">Participants</span>
        </div>
        <span className="section-label w-20 text-right">Amount</span>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="section-label animate-pulse">Reading Ledger…</p>
          </div>
        ) : !trades || trades.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="section-label opacity-30">No trades found</p>
          </div>
        ) : (
          trades.map((trade) => {
            const sellerKnown = trade.sellerBalance !== '0';
            const buyerKnown  = trade.buyerBalance  !== '0';

            return (
              <div
                key={trade.id}
                className="flex items-center justify-between px-5 py-2.5 gap-3 transition-colors hover:bg-card2/50 border-t border-border"
              >
                {/* Left: time + participants */}
                <div className="flex items-center gap-4 min-w-0">
                  <span className="font-mono text-[11px] text-text2 shrink-0 w-15" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(trade.timestamp)}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
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
                </div>

                {/* Right: amount */}
                <span
                  className="font-mono text-[11px] font-semibold w-20 text-right shrink-0"
                  style={{ color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}
                >
                  {trade.amount.toLocaleString()} FIM
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
