'use client';

import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useRecentTrades } from '@/hooks/useRecentTrades';
import { PercentileCircle } from './PercentileCircle';

// Fallback before the rows area has been measured (SSR / first paint).
const DEFAULT_PAGE_SIZE = 20;

export function TradingActivityFeed({ seasonAddress, className }: { seasonAddress: string; className?: string }) {
  const { data: trades, isLoading } = useRecentTrades(seasonAddress);

  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [seasonAddress]);

  // Derive the page size from the available height: how many ledger rows fit
  // below the sticky header. Measured from the DOM (the header and a sample row),
  // recomputed on resize so the feed always fills its pane without inner scroll.
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const recomputeRef = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;

    const recompute = () => {
      const rowH = rowRef.current?.offsetHeight ?? 0;
      const headerH = headerRef.current?.offsetHeight ?? 0;
      if (rowH <= 0) return;
      const avail = scroll.clientHeight - headerH;
      const fit = Math.floor(avail / rowH);
      setPageSize(Math.max(1, fit));
    };

    recomputeRef.current = recompute;
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(scroll);
    return () => ro.disconnect();
  }, []);

  // Re-run whenever trades arrive so the first rendered row can be measured.
  useLayoutEffect(() => {
    recomputeRef.current();
  }, [trades]);

  const totalItems = trades?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  // Clamp the page if a resize shrank the page count under the current page.
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = trades?.slice(safePage * pageSize, (safePage + 1) * pageSize) ?? [];

  const fmt = (ts: number) =>
    new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  return (
    <div className={`flex flex-col p-2 bg-card rounded-lg ${className ?? 'max-h-130'}`}>
      <div className="bg-card flex flex-col flex-1 min-h-0 overflow-hidden border-border2">
        <div ref={scrollRef} className="flex-1 overflow-y-hidden custom-scrollbar relative">
          <div
            ref={headerRef}
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
            pageItems.map((trade, i) => {
              const sellerKnown = trade.sellerBalance !== '0';
              const buyerKnown  = trade.buyerBalance  !== '0';

              return (
                <div
                  key={trade.id}
                  ref={i === 0 ? rowRef : undefined}
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

        {totalItems > pageSize && (
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
