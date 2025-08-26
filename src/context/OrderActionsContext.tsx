// src/context/OrderActionsContext.tsx
'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useOrderActions, OrderActionsState } from '@/hooks/useOrderActions';

const OrderActionsContext = createContext<OrderActionsState | undefined>(undefined);

export function OrderActionsProvider({ children }: { children: ReactNode }) {
  const state = useOrderActions();
  return (
    <OrderActionsContext.Provider value={state}>
      {children}
    </OrderActionsContext.Provider>
  );
}

export function useOrderActionsContext() {
  const context = useContext(OrderActionsContext);
  if (context === undefined) {
    throw new Error('useOrderActionsContext must be used within an OrderActionsProvider');
  }
  return context;
}