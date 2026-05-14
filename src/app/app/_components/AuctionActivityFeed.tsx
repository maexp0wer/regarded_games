'use client';

import React from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { formatUnits, isAddress } from 'viem';

const DEAD_ADDRESS = '0x0000000000000000000000000000000000000000';

export function AuctionActivityFeed({ seasonAddress }: { seasonAddress: string }) {
  const isSeasonValid = seasonAddress && seasonAddress !== DEAD_ADDRESS && isAddress(seasonAddress);
  const normalizedAddress = seasonAddress?.toLowerCase();

  const { data: history, isFetching } = useQuery({
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
    <div
      className="card-app flex flex-col h-full"
      style={{ borderColor: 'var(--color-border-bright)', padding: 0 }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <p className="section-label">Recent Activity</p>
        {isFetching && (
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--color-gold)' }} />
        )}
      </div>

      {/* Column headers */}
      <div
        className="flex items-center justify-between px-5 py-2 shrink-0"
        style={{ background: 'var(--color-card2)', borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-4">
          <span className="section-label w-15">Time</span>
          <span className="section-label">Address</span>
        </div>
        <span className="section-label w-20 text-right">Amount</span>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {!history || history.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="section-label opacity-30">No activity yet</p>
          </div>
        ) : (
          history.map((mint: any) => (
            <div
              key={mint.id}
              className="flex items-center justify-between px-5 py-2.5 gap-3 transition-colors hover:bg-card2/50"
              style={{ borderTop: '1px solid var(--color-dark-a50)' }}
            >
              {/* Left: time + address */}
              <div className="flex items-center gap-4 min-w-0">
                <span className="font-mono text-[11px] text-text2 shrink-0 w-15" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(Number(mint.timestamp))}
                </span>
                <span className="font-mono text-[11px] text-text truncate">
                  {mint.playerAddress.slice(0, 6)}…{mint.playerAddress.slice(-4)}
                </span>
              </div>
              {/* Right: amount */}
              <span
                className="font-mono text-[11px] font-semibold w-20 text-right shrink-0"
                style={{ color: 'var(--color-green)', fontVariantNumeric: 'tabular-nums' }}
              >
                +{Number(formatUnits(mint.fimAmount, 18)).toLocaleString()} FIM
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
