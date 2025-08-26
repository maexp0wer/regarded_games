// src/context/FimBalanceContext.tsx
'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useFimBalance, FimBalanceState } from '@/hooks/useFimBalance';

const FimBalanceContext = createContext<FimBalanceState | undefined>(undefined);

export function FimBalanceProvider({ children }: { children: ReactNode }) {
  const fimBalanceState = useFimBalance();
  return (
    <FimBalanceContext.Provider value={fimBalanceState}>
      {children}
    </FimBalanceContext.Provider>
  );
}

export function useFimBalanceContext() {
  const context = useContext(FimBalanceContext);
  if (context === undefined) {
    throw new Error('useFimBalanceContext must be used within a FimBalanceProvider');
  }
  return context;
}