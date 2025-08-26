// src/context/ConnectionContext.tsx
'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useConnection, ConnectionState } from '@/hooks/useConnection';

const ConnectionContext = createContext<ConnectionState | undefined>(undefined);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const connectionState = useConnection();
  return (
    <ConnectionContext.Provider value={connectionState}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnectionContext() {
  const context = useContext(ConnectionContext);
  if (context === undefined) {
    throw new Error('useConnectionContext must be used within a ConnectionProvider');
  }
  return context;
}