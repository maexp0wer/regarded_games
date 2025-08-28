// src/app/app/page.tsx
'use client';

import { ConnectionProvider } from '@/context/ConnectionContext';
import { SeasonDataProvider } from '@/context/SeasonDataContext';
import { UserHoldingsProvider } from '@/context/UserHoldingsContext';
import { AuctionProvider } from '@/context/AuctionContext';
import { ExchangeProvider } from '@/context/ExchangeContext';
import { TradingFormProvider } from '@/context/TradingFormContext'; // 👈 The new provider

import { ConnectionDisplay } from '@/components/ConnectionDisplay';
import { SeasonDisplay } from '@/components/SeasonDisplay';
import { UserHoldingsDisplay } from '@/components/UserHoldingsDisplay';
import { AuctionForm } from '@/components/AuctionForm';
import { Exchange } from '@/components/Exchange';
import { TradingForm } from '@/components/TradingForm'; // 👈 The new component

export default function DAppPage() {
  return (
    <ConnectionProvider>
      <SeasonDataProvider>
        <UserHoldingsProvider>
          <AuctionProvider>
            <ExchangeProvider>
              <TradingFormProvider>
                <main className="flex min-h-screen flex-col items-center p-8 md:p-24 bg-bg">
                  <div className="w-full max-w-4xl text-center space-y-8">
                    <h1 className="text-4xl font-bold">FIM Token Auction & Exchange</h1>
                    
                    <ConnectionDisplay />
                    <AuctionForm />
                    <UserHoldingsDisplay />
                    
                    {/* The new Trading Form sits above the Exchange order book */}
                    <TradingForm />
                    <Exchange /> 

                    <SeasonDisplay />
                  </div>
                </main>
              </TradingFormProvider>
            </ExchangeProvider>
          </AuctionProvider>
        </UserHoldingsProvider>
      </SeasonDataProvider>
    </ConnectionProvider>
  );
}