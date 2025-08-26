// src/app/app/page.tsx
'use client';

import { ConnectionProvider } from '@/context/ConnectionContext';
import { SeasonDataProvider } from '@/context/SeasonDataContext';
import { AuctionProvider } from '@/context/AuctionContext';

import { ConnectionDisplay } from '@/components/ConnectionDisplay';
import { SeasonDisplay } from '@/components/SeasonDisplay';
import { AuctionForm } from '@/components/AuctionForm';

export default function DAppPage() {
  return (
    // Wrap the entire page in all three providers.
    // The order doesn't matter as the hooks are independent.
    <ConnectionProvider>
      <SeasonDataProvider>
        <AuctionProvider>
          <main className="flex min-h-screen flex-col items-center p-8 md:p-24 bg-gray-50">
            <div className="w-full max-w-2xl text-center space-y-8">
              <h1 className="text-4xl font-bold">FIM Token Auction</h1>
              
              {/* Render the three distinct components */}
              <ConnectionDisplay />
              <AuctionForm />
              <SeasonDisplay />

            </div>
          </main>
        </AuctionProvider>
      </SeasonDataProvider>
    </ConnectionProvider>
  );
}