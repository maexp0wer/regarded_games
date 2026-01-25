'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useReadContract } from 'wagmi';
import { useSeasonById } from '@/hooks/useSeasonGini';
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';
import { AuctionInterface } from '../_components/AuctionInterface';
import { AuctionActivityFeed } from '../_components/AuctionActivityFeed';

// Components
import { GiniDashboard } from '../_components/GiniDashboard';

export default function SeasonDetailPage() {
  const { seasonSlug } = useParams() as { seasonSlug: string };
  const { data: metadata, isLoading: isMetaLoading } = useSeasonById(seasonSlug);

  // Fetch Phase at the page level to decide which Dashboard to render
  const { data: phase, isLoading: isPhaseLoading } = useReadContract({
    address: metadata?.address as `0x${string}`,
    abi: GameSeasonAbi as any,
    functionName: 'getPhase',
    query: { enabled: !!metadata?.address }
  });

  if (isMetaLoading || isPhaseLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-primary animate-pulse font-display text-xl uppercase tracking-widest">
        Reading Ledger...
      </div>
    );
  }

  if (!metadata) return (
    <div className="min-h-screen p-24 text-text text-center">Blockchain Data Unavailable</div>
  );

  const currentPhase = phase as string;
  const isAuctionOrBootstrap = currentPhase === "AUCTION" || currentPhase === "BOOTSTRAP";
  const formattedName = seasonSlug.replace(/_/g, " ");

  return (
    <main className="p-4 md:p-8 max-w-350 mx-auto space-y-6 animate-in fade-in duration-700">
      <GiniDashboard seasonAddress={metadata.address} seasonName={formattedName} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start max-w-7xl mx-auto mt-8">
        
        {/* LEFT COLUMN: ACTIONS (Stake / Buy) */}
        <div>
           <AuctionInterface 
             seasonAddress={metadata?.address}
             auctionAddress={metadata?.auctionAddress}
             fimAddress={metadata?.fimAddress}
           />
        </div>

        {/* RIGHT COLUMN: ACTIVITY FEED */}
        <div>
           <AuctionActivityFeed 
             seasonAddress={metadata?.address || ""} 
           />
        </div>

      </div>

      {/* Footer Reference */}
      <div className="pt-8 flex flex-col items-center gap-2">
        <p className="text-[9px] font-mono text-text2 uppercase tracking-widest">Protocol Reference</p>
        <code className="text-[10px] bg-card2 px-3 py-1 rounded-full text-text2 font-mono">
          {metadata.address}
        </code>
      </div>
    </main>
  );
}