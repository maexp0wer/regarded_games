// src/context/AuctionContext.tsx
'use client';
import { createContext, useContext, ReactNode } from 'react';
import { useAuction, AuctionState } from '@/hooks/useAuction';

const defaultState: AuctionState = {
  usdcAmount: '',
  setUsdcAmount: () => {},
  buttonState: 'no_wallet',
  buttonText: 'Loading...',
  isButtonDisabled: true,
  handleActionClick: () => {},
  currentAllowance: '...',
  buyFimError: undefined,
};

const AuctionContext = createContext<AuctionState>(defaultState);

export function AuctionProvider({ children }: { children: ReactNode }) {
  const auctionState = useAuction();
  return <AuctionContext.Provider value={auctionState}>{children}</AuctionContext.Provider>;
}

export function useAuctionContext() {
  return useContext(AuctionContext);
}