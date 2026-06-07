'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRecentTrades } from '@/hooks/useRecentTrades';
import { PercentileCircle } from './PercentileCircle';

// Fixed number of rows per page, independent of the pane height. A page's rows
// scroll within the pane; once exhausted, the user jumps to the next page.
const PAGE_SIZE = 50;

export function TradingActivityFeed({ seasonAddress, className }: { seasonAddress: string; className?: string }) {
  const { data: trades, isLoading } = useRecentTrades(seasonAddress);

  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [seasonAddress]);

  // Scrollbar stays invisible until the content overflows AND the pointer is over
  // the pane — and a scroll at the top/bottom never chains to the page chrome
  // (`data-chrome-scroll-guard` + `overscroll-y-contain`). Mirrors the OrderBook.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const totalItems = trades?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  // Clamp the page if newer data shrank the page count under the current page.
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = trades?.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE) ?? [];

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const update = () => setIsOverflowing(container.scrollHeight > container.clientHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    return () => ro.disconnect();
  });

  // Reset scroll to the top whenever the page changes so the new page starts at row 1.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [safePage]);

  const fmt = (ts: number) =>
    new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  return (
    <div className={`flex flex-col p-2 bg-card rounded-lg ${className ?? 'max-h-130'}`}>
      <div className="bg-card flex flex-col flex-1 min-h-0 overflow-hidden border-border2">
        <div
          ref={scrollRef}
          data-chrome-scroll-guard
          className={`flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain relative ${isOverflowing ? '[scrollbar-width:thin] [scrollbar-color:transparent_transparent] hover:[scrollbar-color:var(--color-text2)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-[10px] [&::-webkit-scrollbar-thumb]:transition-colors [&::-webkit-scrollbar-thumb]:duration-200 [&:hover::-webkit-scrollbar-thumb]:bg-text2' : ''}`}
        >
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
          <div className="flex items-center justify-center gap-3 py-2 border-t border-border2 bg-card pt-3">
            <button
              className="btn-stepper px-1 py-0.5 text-[12px]! leading-none disabled:opacity-30"
              disabled={safePage === 0}
              onClick={() => setPage(Math.max(0, safePage - 1))}
            >
              ◀
            </button>
            <span className="section-label">{safePage + 1} / {totalPages}</span>
            <button
              className="btn-stepper px-1 py-0.5 text-[12px]! leading-none disabled:opacity-30"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
            >
              ▶
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
