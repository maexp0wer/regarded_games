'use client';

import { usePathname } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { Navbar } from './_components/Navbar';
import { DiscourseHandshake } from './_components/DiscourseHandshake';

const KNOWN_APP_PAGES = new Set(['seasons', 'stake', 'swap', 'ico', 'dashboard']);

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { darkMode } = useTheme();
  const pathname = usePathname();

  const segments = pathname.split('/').filter(Boolean);
  const isSeasonPage =
    segments.length === 1 &&
    !KNOWN_APP_PAGES.has(segments[0]);

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-bg transition-colors duration-300">
        <DiscourseHandshake />
        <Navbar />
        <div className={isSeasonPage ? 'w-full px-6 pb-16' : 'mx-auto max-w-7xl px-6 pb-16'}>
          {children}
        </div>
      </div>
    </div>
  );
}
