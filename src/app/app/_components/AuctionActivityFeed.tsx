'use client';

import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { formatUnits, isAddress } from 'viem';
import { useTenantPonderUrl } from '@/context/TenantContext';
import { fetchAllPonderItems } from '@/lib/ponder';

const DEAD_ADDRESS = '0x0000000000000000000000000000000000000000';
const DEFAULT_PAGE_SIZE = 20;

export function AuctionActivityFeed({ seasonAddress, className }: { seasonAddress: string; className?: string }) {
  const ponderUrl = useTenantPonderUrl();
  const isSeasonValid = seasonAddress && seasonAddress !== DEAD_ADDRESS && isAddress(seasonAddress);
  const normalizedAddress = seasonAddress?.toLowerCase();

  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [normalizedAddress]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const { data: history, isLoading } = useQuery({
    queryKey: ['auctionHistory', normalizedAddress, ponderUrl],
    queryFn: async () => {
      if (!isSeasonValid) return [];
      return fetchAllPonderItems<{ id: string; playerAddress: string; fimAmount: string; timestamp: string }>(
        ponderUrl,
        `query GetMints($addr: String!, $after: String, $limit: Int!) {
          auctionMintss(where: { seasonAddress: $addr }, orderBy: "timestamp", orderDirection: "desc", after: $after, limit: $limit) {
            items { id playerAddress fimAmount timestamp }
            pageInfo { endCursor hasNextPage }
          }
        }`,
        { addr: normalizedAddress },
        (d) => d.auctionMintss,
      );
    },
    enabled: !!isSeasonValid,
    refetchInterval: 5000,
    placeholderData: keepPreviousData,
  });

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

  useLayoutEffect(() => {
    recomputeRef.current();
  }, [history]);

  const totalItems = history?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = history?.slice(safePage * pageSize, (safePage + 1) * pageSize) ?? [];

  const fmt = (ts: number) =>
    new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  return (
    <div className={`flex flex-col p-2 bg-card rounded-lg ${className ?? ''}`}>
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden border-border2">
        <div ref={scrollRef} className="flex-1 overflow-y-hidden custom-scrollbar relative">
          <div
            ref={headerRef}
            className="ledger-header sticky top-0 z-10"
            style={{ gridTemplateColumns: '1fr 1fr 1fr' }}
          >
            <div>Time</div>
            <div>Address</div>
            <div className="text-right">Amount</div>
          </div>

          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="section-label animate-pulse">Reading Ledger…</p>
            </div>
          ) : !history || history.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <p className="section-label opacity-40">No activity yet</p>
            </div>
          ) : (
            pageItems.map((mint, i) => (
              <div
                key={mint.id}
                ref={i === 0 ? rowRef : undefined}
                className="ledger-row"
                style={{ gridTemplateColumns: '1fr 1fr 1fr' }}
              >
                <span className="ledger-cell-secondary">
                  {fmt(Number(mint.timestamp))}
                </span>
                <span className="ledger-cell-secondary">
                  {mint.playerAddress.slice(0, 6)}…{mint.playerAddress.slice(-4)}
                </span>
                <span className="ledger-cell-metric" style={{ color: 'var(--color-green)' }}>
                  +{Number(formatUnits(BigInt(mint.fimAmount), 18)).toLocaleString()} FIM
                </span>
              </div>
            ))
          )}
        </div>

        {totalItems > pageSize && (
          <div className="flex items-center justify-center gap-3 py-2 border-t border-border bg-card pt-3">
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
