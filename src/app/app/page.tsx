// src/app/app/page.tsx
'use client';

// 1. Import all the providers
import { ConnectionProvider } from '@/context/ConnectionContext';
import { SeasonDataProvider } from '@/context/SeasonDataContext';
import { AuctionProvider } from '@/context/AuctionContext';
import { FimBalanceProvider } from '@/context/FimBalanceContext';

// 2. Import all the display components
import { ConnectionDisplay } from '@/components/ConnectionDisplay';
import { SeasonDisplay } from '@/components/SeasonDisplay';
import { AuctionForm } from '@/components/AuctionForm';
import { BalanceDisplay } from '@/components/BalanceDisplay';

export default function DAppPage() {
  return (
    // 3. Nest the providers correctly. FimBalanceProvider needs the others.
    <ConnectionProvider>
      <SeasonDataProvider>
        <AuctionProvider>
          <FimBalanceProvider>
            <main className="flex min-h-screen flex-col items-center p-8 md-p-24 bg-bg">
              <div className="w-full max-w-2xl text-center space-y-8">
                <h1 className="text-4xl font-bold text-text">FIM Token Auction</h1>
                
                {/* 4. Render the components. You can place them in any order. */}
                <ConnectionDisplay />
                <AuctionForm />
                <BalanceDisplay /> {/* 👈 Add the new component */}
                <SeasonDisplay />

              </div>
            </main>
          </FimBalanceProvider>
        </AuctionProvider>
      </SeasonDataProvider>
    </ConnectionProvider>
  );
}