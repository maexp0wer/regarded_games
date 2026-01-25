'use client';

import React from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { formatUnits, isAddress } from 'viem';

const DEAD_ADDRESS = '0x0000000000000000000000000000000000000000';

export function AuctionActivityFeed({ seasonAddress }: { seasonAddress: string }) {
  
  const isSeasonValid = seasonAddress && seasonAddress !== DEAD_ADDRESS && isAddress(seasonAddress);
  const normalizedAddress = seasonAddress?.toLowerCase();

  const { data: history, isFetching } = useQuery({
    queryKey: ["auctionHistory", normalizedAddress],
    queryFn: async () => {
      if (!isSeasonValid) return []; 
      
      const response = await fetch("http://127.0.0.1:42069/graphql", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `query GetMints($addr: String!) {
            auctionMintss(where: { seasonAddress: $addr }, orderBy: "timestamp", orderDirection: "desc", limit: 10) {
              items { 
                id
                playerAddress
                fimAmount
                timestamp 
              }
            }
          }`,
          variables: { addr: normalizedAddress }
        }),
      });

      const res = await response.json();
      if (res.errors) throw new Error("Ponder Error");
      
      return res.data?.auctionMintss?.items || [];
    },
    enabled: !!isSeasonValid, 
    refetchInterval: 5000,
    placeholderData: keepPreviousData,
  });

  return (
    <div className="bg-card rounded-xl border border-border/10 p-6 shadow-sm min-h-[400px]">
      <div className="flex justify-between items-center border-b border-border/40 pb-3 mb-4">
        <h3 className="text-[9px] font-black uppercase text-text2 tracking-[0.2em]">Live Auction Activity</h3>
        {isFetching && <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" title="Syncing..." />}
      </div>
      <div className="space-y-4">
        {history?.map((mint: any) => (
          <div key={mint.id} className="flex justify-between items-center text-xs border-b border-border/10 pb-4">
            <div className="flex flex-col">
              <span className="font-mono text-primary font-bold tracking-tighter">
                {mint.playerAddress.slice(0, 6)}...{mint.playerAddress.slice(-4)}
              </span>
              <span className="text-[8px] text-text2 uppercase font-medium">
                {new Date(Number(mint.timestamp) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
              </span>
            </div>
            <span className="font-black text-text font-mono text-sm tracking-tight">
              +{Number(formatUnits(mint.fimAmount, 18)).toLocaleString()} FIM
            </span>
          </div>
        ))}
        {(!history || history.length === 0) && !isFetching && (
          <p className="text-[10px] uppercase font-bold text-text2 italic text-center py-12 opacity-40">
             No active buys found.
          </p>
        )}
      </div>
    </div>
  );
}