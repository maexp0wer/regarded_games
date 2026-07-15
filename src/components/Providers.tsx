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
      // RainbowKit injects this value straight into `backdrop-filter`, so it must
      // be a full filter function — not just a length. `blur(8px)` matches the
      // app's own `.modal-overlay-blur`; a bare `8px` is invalid and blurs nothing.
      modalOverlay: 'blur(8px)',
    },
    colors: {
      ...baseTheme.colors,
      // Accent
      accentColor: 'var(--color-gold)',
      accentColorForeground: 'var(--color-bg)',
      // Modal surfaces — mirror the app's own modals (TxModal): the dialog is a
      // `card3` well with a `border2` frame (surface ladder: nested rows below
      // sit one level down on `card2`).
      modalBackground: 'var(--color-card3)',
      modalBorder: 'var(--color-border2)',
      modalBackdrop: 'color-mix(in srgb, var(--color-bg) 60%, transparent)',
      modalText: 'var(--color-text)',
      modalTextSecondary: 'var(--color-text2)',
      modalTextDim: 'var(--color-text2)',
      // Profile panel — one level below the card3 modal surface.
      profileForeground: 'var(--color-card2)',
      profileAction: 'var(--color-card2)',
      profileActionHover: 'var(--color-card)',
      // Action buttons / wallet rows — nested on the modal, so `card2` (one step
      // down from the card3 dialog) with the interactive `border2` frame.
      actionButtonBorder: 'var(--color-border2)',
      actionButtonBorderMobile: 'var(--color-border2)',
      actionButtonSecondaryBackground: 'var(--color-card2)',
      // Close control
      closeButton: 'var(--color-text2)',
      closeButtonBackground: 'var(--color-card2)',
      // Menu
      menuItemBackground: 'var(--color-card2)',
      // Structural borders — dividers inside the modal.
      generalBorder: 'var(--color-border2)',
      generalBorderDim: 'var(--color-border)',
      // Selection / focus — remove the purple border from selected items in dialogs.
      // The "selected" visual feedback should be minimal (flat surfaces per design).
      selectedOptionBorder: 'transparent',
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
      // Match the app's own modals: TxModal floats with Tailwind `shadow-2xl`.
      dialog: '0 25px 50px -12px rgba(0,0,0,0.25)',
      profileDetailsAction: 'none',
      // Remove the purple glow from selected items — the flat design has no selection highlight.
      selectedOption: 'none',
      selectedWallet: 'none',
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