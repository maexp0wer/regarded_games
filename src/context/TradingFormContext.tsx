// src/context/TradingFormContext.tsx
'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useTradingForm, TradingFormState } from '@/hooks/useTradingForm';

const TradingFormContext = createContext<TradingFormState | undefined>(undefined);

export function TradingFormProvider({ children }: { children: ReactNode }) {
  const state = useTradingForm();
  return <TradingFormContext.Provider value={state}>{children}</TradingFormContext.Provider>;
}

export function useTradingFormContext() {
  const context = useContext(TradingFormContext);
  if (context === undefined) throw new Error('useTradingFormContext must be used within a TradingFormProvider');
  return context;
}