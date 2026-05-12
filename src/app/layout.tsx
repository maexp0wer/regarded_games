import type { Metadata } from 'next';
import { Bricolage_Grotesque, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { headers } from 'next/headers';
import { cookieToInitialState } from 'wagmi';
import { config } from '@/config/wagmi';
import { Providers } from '@/components/Providers';

import './globals.css';
import '@rainbow-me/rainbowkit/styles.css';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
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
  const cookie = (await headers()).get('cookie');
  const initialState = cookieToInitialState(config, cookie);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${bricolage.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
        <script dangerouslySetInnerHTML={{ __html: blockingThemeScript }} />

        <Providers initialState={initialState}>
          {children}
        </Providers>

        <div id="modal-root"></div>
      </body>
    </html>
  );
}
