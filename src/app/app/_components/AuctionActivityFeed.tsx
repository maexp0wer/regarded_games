'use client';

import React from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { formatUnits, isAddress } from 'viem';

const DEAD_ADDRESS = '0x0000000000000000000000000000000000000000';

export function AuctionActivityFeed({ seasonAddress, className }: { seasonAddress: string; className?: string }) {
  const isSeasonValid = seasonAddress && seasonAddress !== DEAD_ADDRESS && isAddress(seasonAddress);
  const normalizedAddress = seasonAddress?.toLowerCase();

  const { data: history, isLoading } = useQuery({
    queryKey: ['auctionHistory', normalizedAddress],
    queryFn: async () => {
      if (!isSeasonValid) return [];
      const response = await fetch('http://127.0.0.1:42069/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query GetMints($addr: String!) {
            auctionMintss(where: { seasonAddress: $addr }, orderBy: "timestamp", orderDirection: "desc", limit: 3) {
              items { id playerAddress fimAmount timestamp }
            }
          }`,
          variables: { addr: normalizedAddress },
        }),
      });
      const res = await response.json();
      if (res.errors) throw new Error('Ponder Error');
      return res.data?.auctionMintss?.items || [];
    },
    enabled: !!isSeasonValid,
    refetchInterval: 5000,
    placeholderData: keepPreviousData,
  });

  const fmt = (ts: number) =>
    new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  return (
    <div className={`flex flex-col p-2 bg-card rounded-lg ${className ?? ''}`}>
      <div className="bg-bg flex flex-col flex-1 min-h-0 overflow-hidden border-border2">
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
            history.map((mint: any) => (
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
                  +{Number(formatUnits(mint.fimAmount, 18)).toLocaleString()} FIM
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
