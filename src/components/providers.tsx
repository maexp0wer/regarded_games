'use client';

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, type State } from 'wagmi';
import { RainbowKitProvider, darkTheme, lightTheme, Theme } from '@rainbow-me/rainbowkit';
import { config } from '@/config/wagmi';
import { ThemeProvider, useTheme } from '@/context/ThemeContext'; 

function RainbowKitThemeWrapper({ children }: { children: React.ReactNode }) {
  const { darkMode } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // We generate the base theme first
  const baseTheme = darkMode ? darkTheme() : lightTheme();

  // We create our custom theme by merging the baseTheme with your CSS variables
  const customTheme: Theme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      accentColor: 'var(--color-primary)',
      accentColorForeground: 'white',
      modalBackground: 'var(--color-card)',
      modalBorder: 'transparent',
      modalText: 'var(--color-text)',
      modalTextSecondary: 'var(--color-text2)',
      actionButtonBorder: 'transparent',
      actionButtonSecondaryBackground: 'var(--color-card3)',
      closeButton: 'var(--color-text2)',
      closeButtonBackground: 'var(--color-card2)',
      menuItemBackground: 'var(--color-card2)',
    },
    // We spread baseTheme.radii to ensure we don't miss any required keys
    radii: {
      ...baseTheme.radii,
      modal: '1rem',
      actionButton: '0.75rem',
      connectButton: '0.75rem',
    },
  };

  return (
    <RainbowKitProvider 
      theme={mounted ? customTheme : darkTheme()} 
      modalSize="compact"
    >
      {children}
    </RainbowKitProvider>
  );
}

export function Providers({
  children,
  initialState,
}: {
  children: React.ReactNode;
  initialState?: State;
}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <RainbowKitThemeWrapper>
            {children}
          </RainbowKitThemeWrapper>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}