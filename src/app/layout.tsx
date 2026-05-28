import type { Metadata } from 'next';
import { Space_Grotesk, JetBrains_Mono, Exo_2 } from 'next/font/google';
import { headers } from 'next/headers';
import { cookieToInitialState } from 'wagmi';
import { config } from '@/config/wagmi';
import { Providers } from '@/components/Providers';
import { TENANTS, type TenantKey } from '@/config/tenants';

import './globals.css';
import '@rainbow-me/rainbowkit/styles.css';

const exo2 = Exo_2({
  subsets: ['latin'],
  variable: '--font-display', // This is what overrides your CSS!
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
});

const blockingThemeScript = `(function() {
  try {
    var localTheme = localStorage.getItem('theme');
    var supportDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (localTheme === 'dark' || (!localTheme && supportDarkMode)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();`;

export const metadata: Metadata = {
  title: 'Regarded Games',
  description: 'Economic Warfare - Fought on Chain',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = await headers();
  const cookie = h.get('cookie');
  const initialState = cookieToInitialState(config, cookie);

  const tenantHeader = h.get('x-tenant') as TenantKey | null;
  const initialChainId =
    tenantHeader === 'mainnet' || tenantHeader === 'sepolia'
      ? TENANTS[tenantHeader].activeChainId
      : undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${exo2.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
        <script dangerouslySetInnerHTML={{ __html: blockingThemeScript }} />

        <Providers initialState={initialState} initialChainId={initialChainId}>
          {children}
        </Providers>

        <div id="modal-root"></div>
      </body>
    </html>
  );
}
