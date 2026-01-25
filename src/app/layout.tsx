import type { Metadata } from 'next';
import { Orbitron } from 'next/font/google';
import { headers } from 'next/headers';
import { cookieToInitialState } from 'wagmi';
import { config } from '@/config/wagmi';
import { Providers } from '@/components/Providers';

// Global Styles
import './globals.css';
import '@rainbow-me/rainbowkit/styles.css';

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-orbitron',
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
  title: 'Ritardo Games',
  description: 'Economic Warfare - Fought on Chain',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ✅ FIX: Read cookies for Wagmi SSR
  const cookie = (await headers()).get('cookie');
  const initialState = cookieToInitialState(config, cookie);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={orbitron.variable}>
        <script dangerouslySetInnerHTML={{ __html: blockingThemeScript }} />
        
        <Providers initialState={initialState}>
          {children}
        </Providers>

        <div id="modal-root"></div>
      </body>
    </html>
  );
}