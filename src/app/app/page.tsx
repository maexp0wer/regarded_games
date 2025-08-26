// src/app/app/page.tsx
'use client';

import { AuctionClient } from "@/components/AuctionClient";
import { ActiveSeasonDisplay } from "@/components/ActiveSeasonDisplay";

export default function DAppPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold">FIM Token Auction</h1>
        <p className="text-gray-600 mt-2">Connect your wallet to purchase FIM with USDC.</p>
      </div>
      <ActiveSeasonDisplay />
      <AuctionClient />
    </main>
  );
}