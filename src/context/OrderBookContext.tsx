// src/context/OrderBookContext.tsx
'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useOrderBook, OrderBookState } from '@/hooks/useOrderBook';

const OrderBookContext = createContext<OrderBookState | undefined>(undefined);

export function OrderBookProvider({ children }: { children: ReactNode }) {
  const orderBookState = useOrderBook();
  return (
    <OrderBookContext.Provider value={orderBookState}>
      {children}
    </OrderBookContext.Provider>
  );
}

export function useOrderBookContext() {
  const context = useContext(OrderBookContext);
  if (context === undefined) {
    throw new Error('useOrderBookContext must be used within an OrderBookProvider');
  }
  return context;
}