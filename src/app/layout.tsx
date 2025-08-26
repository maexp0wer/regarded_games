// src/app/layout.tsx
import './globals.css';
import { Providers } from './providers'; // 👈 Import our single, unified provider

// You can keep your font imports and other metadata here
import { Orbitron } from 'next/font/google';

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['900'],
  variable: '--font-orbitron',
});

// The theme script can also stay as it runs before React
const blockingThemeScript = `(function() { /* ... */ })();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: blockingThemeScript }} />
        
        <Providers>
           {children}
        </Providers>

        <div id="modal-root"></div>
      </body>
    </html>
  )
}