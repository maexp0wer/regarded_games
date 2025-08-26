// src/context/AuctionContext.tsx
'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useAuction, AuctionState } from '@/hooks/useAuction';

const AuctionContext = createContext<AuctionState | undefined>(undefined);

export function AuctionProvider({ children }: { children: ReactNode }) {
  const auctionState = useAuction();
  return (
    <AuctionContext.Provider value={auctionState}>
      {children}
    </AuctionContext.Provider>
  );
}

export function useAuctionContext() {
  const context = useContext(AuctionContext);
  if (context === undefined) {
    throw new Error('useAuctionContext must be used within an AuctionProvider');
  }
  return context;
}