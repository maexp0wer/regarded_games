// src/context/SeasonDataContext.tsx
'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useSeasonData, SeasonDataState } from '@/hooks/useSeasonData';

const SeasonDataContext = createContext<SeasonDataState | undefined>(undefined);

export function SeasonDataProvider({ children }: { children: ReactNode }) {
  const seasonDataState = useSeasonData();
  return (
    <SeasonDataContext.Provider value={seasonDataState}>
      {children}
    </SeasonDataContext.Provider>
  );
}

export function useSeasonDataContext() {
  const context = useContext(SeasonDataContext);
  if (context === undefined) {
    throw new Error('useSeasonDataContext must be used within a SeasonDataProvider');
  }
  return context;
}