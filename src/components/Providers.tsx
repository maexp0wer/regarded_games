'use client';

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, type State } from 'wagmi';
import { RainbowKitProvider, darkTheme, lightTheme, Theme } from '@rainbow-me/rainbowkit';
import { config } from '@/config/wagmi';
import { ThemeProvider, useTheme } from '@/context/ThemeContext'; 

function RainbowKitThemeWrapper({
  children,
  initialChainId,
}: {
  children: React.ReactNode;
  initialChainId?: number;
}) {
  const { darkMode } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // We generate the base theme first
  const baseTheme = darkMode ? darkTheme() : lightTheme();

  const customTheme: Theme = {
    ...baseTheme,
    blurs: {
      ...baseTheme.blurs,
      modalOverlay: '8px',
    },
    colors: {
      ...baseTheme.colors,
      // Accent
      accentColor: 'var(--color-gold)',
      accentColorForeground: 'var(--color-bg)',
      // Modal surfaces
      modalBackground: 'var(--color-card)',
      modalBorder: 'var(--color-border)',
      modalBackdrop: 'color-mix(in srgb, var(--color-bg) 60%, transparent)',
      modalText: 'var(--color-text)',
      modalTextSecondary: 'var(--color-text2)',
      modalTextDim: 'var(--color-text2)',
      // Profile panel
      profileForeground: 'var(--color-card2)',
      profileAction: 'var(--color-card2)',
      profileActionHover: 'var(--color-card3)',
      // Action buttons
      actionButtonBorder: 'var(--color-border)',
      actionButtonBorderMobile: 'var(--color-border)',
      actionButtonSecondaryBackground: 'var(--color-card2)',
      // Close control
      closeButton: 'var(--color-text2)',
      closeButtonBackground: 'var(--color-card2)',
      // Menu
      menuItemBackground: 'var(--color-card2)',
      // Structural borders
      generalBorder: 'var(--color-border)',
      generalBorderDim: 'var(--color-border)',
      // Selection / focus
      selectedOptionBorder: 'var(--color-purple)',
      // Status
      error: 'var(--color-red)',
      standby: 'var(--color-text2)',
      // Built-in connect button (unused but required by the type)
      connectButtonBackground: 'var(--color-card)',
      connectButtonBackgroundError: 'var(--color-red-15)',
      connectButtonInnerBackground: 'var(--color-card2)',
      connectButtonText: 'var(--color-text)',
      connectButtonTextError: 'var(--color-red)',
    },
    fonts: {
      body: 'var(--font-sans)',
    },
    radii: {
      ...baseTheme.radii,
      modal: '0.75rem',
      modalMobile: '1rem',
      actionButton: '0.5rem',
      connectButton: '0.5rem',
      menuButton: '0.5rem',
    },
    shadows: {
      ...baseTheme.shadows,
      connectButton: 'none',
      dialog: '0 8px 32px rgba(0,0,0,0.2)',
      profileDetailsAction: 'none',
      selectedOption: '0 0 0 1px var(--color-purple)',
      selectedWallet: '0 0 0 1px var(--color-purple)',
      walletLogo: 'none',
    },
  };

  return (
    <RainbowKitProvider
      theme={mounted ? customTheme : darkTheme()}
      modalSize="compact"
      initialChain={initialChainId}
    >
      {children}
    </RainbowKitProvider>
  );
}

export default function Providers({
  children,
  initialState,
  initialChainId,
}: {
  children: React.ReactNode;
  initialState?: State;
  initialChainId?: number;
}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <RainbowKitThemeWrapper initialChainId={initialChainId}>
            {children}
          </RainbowKitThemeWrapper>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}