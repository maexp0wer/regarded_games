import type { Metadata } from 'next';
import { Space_Grotesk, Azeret_Mono, Exo_2, Orbitron } from 'next/font/google';
import { headers } from 'next/headers';
import { cookieToInitialState } from 'wagmi';
import { config } from '@/config/wagmi';
import Providers from '@/components/Providers';
import { TENANTS, type TenantKey } from '@/config/tenants';
import { SITE_NAME, SITE_DESCRIPTION, SITE_ORIGIN } from '@/config/seo';

import './globals.css';
import '@rainbow-me/rainbowkit/styles.css';

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-orbitron',
  display: 'swap',
});

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

const azeretMono = Azeret_Mono({
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
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  icons: {
    icon: '/Regardo_Head.svg',
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
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
      <body className={`${orbitron.variable} ${exo2.variable} ${spaceGrotesk.variable} ${azeretMono.variable}`}>
        <script dangerouslySetInnerHTML={{ __html: blockingThemeScript }} />

        <Providers initialState={initialState} initialChainId={initialChainId}>
          {children}
        </Providers>

        <div id="modal-root"></div>
      </body>
    </html>
  );
}
