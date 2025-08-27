// src/context/AuctionContext.tsx
'use client';
import { createContext, useContext, ReactNode } from 'react';
import { useAuction, AuctionState } from '@/hooks/useAuction';

const defaultState: AuctionState = {
  USDCAmount: '',
  setUSDCAmount: () => {},
  buttonState: 'no_wallet',
  buttonText: 'Loading...',
  isButtonDisabled: true,
  handleActionClick: () => {},
  currentAllowance: '...',
  buyFimError: undefined,
};

const AuctionContext = createContext<AuctionState>(defaultState);

export function AuctionProvider({ children }: { children: ReactNode }) {
  const AuctionState = useAuction();
  return <AuctionContext.Provider value={AuctionState}>{children}</AuctionContext.Provider>;
}

export function useAuctionContext() {
  return useContext(AuctionContext);
}