// src/app/app/page.tsx
'use client';

// 1. Import all the providers
import { ConnectionProvider } from '@/context/ConnectionContext';
import { SeasonDataProvider } from '@/context/SeasonDataContext';
import { UserHoldingsProvider } from '@/context/UserHoldingsContext';
import { AuctionProvider } from '@/context/AuctionContext';
import { OrderBookProvider } from '@/context/OrderBookContext';
import { OrderActionsProvider } from '@/context/OrderActionsContext';

// 2. Import all the display components
import { ConnectionDisplay } from '@/components/ConnectionDisplay';
import { SeasonDisplay } from '@/components/SeasonDisplay';
import { UserHoldingsDisplay } from '@/components/UserHoldingsDisplay';
import { AuctionForm } from '@/components/AuctionForm';
import { OrderBookDisplay } from '@/components/OrderBookDisplay';
import { CreateOrderForm } from '@/components/CreateOrderForm';

export default function DAppPage() {
  return (
    // 3. Nest the new provider
    <ConnectionProvider>
      <SeasonDataProvider>
        <UserHoldingsProvider>
          <AuctionProvider>
            <OrderBookProvider>
              <OrderActionsProvider>
                <main className="flex min-h-screen flex-col items-center p-8 md:p-24 bg-bg">
                  <div className="w-full max-w-2xl text-center space-y-8">
                    <h1 className="text-4xl font-bold">FIM Token Auction & Exchange</h1>
                    
                    <ConnectionDisplay />
                    <AuctionForm />
                    <CreateOrderForm />
                    <UserHoldingsDisplay />
                    <OrderBookDisplay />
                    <SeasonDisplay />

                  </div>
                </main>
              </OrderActionsProvider>
            </OrderBookProvider>
          </AuctionProvider>
        </UserHoldingsProvider>
      </SeasonDataProvider>
    </ConnectionProvider>
  );
}