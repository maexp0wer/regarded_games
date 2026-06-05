'use client';

import React, { useState, useEffect } from 'react';
import { useRecentTrades } from '@/hooks/useRecentTrades';
import { PercentileCircle } from './PercentileCircle';

const PAGE_SIZE = 50;

export function TradingActivityFeed({ seasonAddress, className }: { seasonAddress: string; className?: string }) {
  const { data: trades, isLoading } = useRecentTrades(seasonAddress);

  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [seasonAddress]);

  const totalItems = trades?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const pageItems = trades?.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) ?? [];

  const fmt = (ts: number) =>
    new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  return (
    <div className={`flex flex-col p-2 bg-card rounded-lg ${className ?? 'max-h-130'}`}>
      <div className="bg-bg flex flex-col flex-1 min-h-0 overflow-hidden border-border2">
        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          <div
            className="ledger-header sticky top-0 z-10"
            style={{ gridTemplateColumns: '1fr 1fr 1fr' }}
          >
            <div>Time</div>
            <div>Players</div>
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
            pageItems.map((trade) => {
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

        {totalItems > PAGE_SIZE && (
          <div className="flex items-center justify-center gap-3 py-2 border-t border-[--color-border]">
            <button
              className="btn-game-secondary px-1.5 py-0.5 text-[10px] leading-none disabled:opacity-30"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              ←
            </button>
            <span className="section-label">{page + 1} / {totalPages}</span>
            <button
              className="btn-game-secondary px-1.5 py-0.5 text-[10px] leading-none disabled:opacity-30"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
