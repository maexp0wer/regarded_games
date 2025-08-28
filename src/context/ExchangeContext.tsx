// src/context/ExchangeContext.tsx
'use client';
import { createContext, useContext, ReactNode } from 'react';
import { useExchange, ExchangeState } from '@/hooks/useExchange';

const ExchangeContext = createContext<ExchangeState | undefined>(undefined);
export function ExchangeProvider({ children }: { children: ReactNode }) {
  const state = useExchange();
  return <ExchangeContext.Provider value={state}>{children}</ExchangeContext.Provider>;
}
export function useExchangeContext() {
  const context = useContext(ExchangeContext);
  if (context === undefined) throw new Error('useExchangeContext must be used within an ExchangeProvider');
  return context;
}