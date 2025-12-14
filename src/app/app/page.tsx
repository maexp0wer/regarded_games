// src/app/app/page.tsx
'use client' ;

import { ConnectionProvider } from '@/context/ConnectionContext';
import { SeasonDataProvider } from '@/context/SeasonDataContext';
import { UserHoldingsProvider } from '@/context/UserHoldingsContext';
import { AuctionProvider } from '@/context/AuctionContext';
// We no longer need a separate ExchangeProvider, as the component provides its own.

import { ConnectionDisplay } from '@/components/ConnectionDisplay';
import { SeasonDisplay } from '@/components/SeasonDisplay';
import { UserHoldingsDisplay } from '@/components/UserHoldingsDisplay';
import { AuctionForm } from '@/components/AuctionForm';
import { Exchange } from '@/components/Exchange';

export default function DAppPage() {
  return (
    <ConnectionProvider>
      <SeasonDataProvider>
        <UserHoldingsProvider>
          <AuctionProvider>
              <main className="flex min-h-screen flex-col items-center p-8 md:p-24 bg-gray-50">
                <div className="w-full max-w-4xl text-center space-y-8">
                  <h1 className="text-4xl font-bold">FIM Token Auction & Exchange</h1>
                  
                  <ConnectionDisplay />
                  <AuctionForm />
                  <UserHoldingsDisplay />
                  <Exchange />
                  <SeasonDisplay />

                </div>
              </main>
          </AuctionProvider>
        </UserHoldingsProvider>
      </SeasonDataProvider>
    </ConnectionProvider>
  );
}