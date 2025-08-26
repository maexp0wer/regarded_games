// src/context/UserHoldingsContext.tsx
'use client';
import { createContext, useContext, ReactNode } from 'react';
import { useUserHoldings, UserHoldingsState } from '@/hooks/useUserHoldings';

const UserHoldingsContext = createContext<UserHoldingsState | undefined>(undefined);

export function UserHoldingsProvider({ children }: { children: ReactNode }) {
  const state = useUserHoldings();
  return <UserHoldingsContext.Provider value={state}>{children}</UserHoldingsContext.Provider>;
}

export function useUserHoldingsContext() {
  const context = useContext(UserHoldingsContext);
  if (context === undefined) throw new Error('useUserHoldingsContext must be used within a UserHoldingsProvider');
  return context;
}