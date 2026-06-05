'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { formatUnits, isAddress } from 'viem';
import { useTenantPonderUrl } from '@/context/TenantContext';
import { fetchAllPonderItems } from '@/lib/ponder';

const DEAD_ADDRESS = '0x0000000000000000000000000000000000000000';
const PAGE_SIZE = 7;

export function AuctionActivityFeed({ seasonAddress, className }: { seasonAddress: string; className?: string }) {
  const ponderUrl = useTenantPonderUrl();
  const isSeasonValid = seasonAddress && seasonAddress !== DEAD_ADDRESS && isAddress(seasonAddress);
  const normalizedAddress = seasonAddress?.toLowerCase();

  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [normalizedAddress]);

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

  const totalItems = history?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const pageItems = history?.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) ?? [];

  const fmt = (ts: number) =>
    new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  return (
    <div className={`flex flex-col p-2 bg-card rounded-lg ${className ?? ''}`}>
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden border-border2">
        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          <div
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
            pageItems.map((mint) => (
              <div
                key={mint.id}
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

        {totalItems > PAGE_SIZE && (
          <div className="flex items-center justify-center gap-3 py-2 border-t border-border bg-card pt-3">
            <button
              className="btn-stepper px-1 py-0.5 text-[12px]! leading-none disabled:opacity-30"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              ◀
            </button>
            <span className="section-label">{page + 1} / {totalPages}</span>
            <button
              className="btn-stepper px-1 py-0.5 text-[12px]! leading-none disabled:opacity-30"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              ▶
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
