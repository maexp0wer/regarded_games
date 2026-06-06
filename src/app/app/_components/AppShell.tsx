'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { Navbar } from './Navbar';
import { DiscourseHandshake } from './DiscourseHandshake';
import { installSeasonChromeReveal, useChromeRungVisible } from '@/lib/seasonChromeReveal';

const KNOWN_APP_PAGES = new Set(['seasons', 'stake', 'swap', 'ico', 'dashboard']);

export function AppShell({ children }: { children: React.ReactNode }) {
  const { darkMode } = useTheme();
  const pathname = usePathname();

  const segments = pathname.split('/').filter(Boolean);
  const isSeasonPage = segments.length === 1 && !KNOWN_APP_PAGES.has(segments[0]);

  // On a season page the chrome folds on a staged ladder shared via the
  // seasonChromeReveal store: each scroll-down at the top folds the next rung
  // (navbar → band → content rows, top-down), each scroll-up re-expands the last
  // one, and the page scrolls normally only once every rung is folded. The
  // navbar is rung 0; off a season page it's always shown.
  useEffect(() => installSeasonChromeReveal(isSeasonPage), [isSeasonPage]);

  // Hide the document scrollbar on season pages: revealing the navbar briefly
  // grows the document past the viewport, which would otherwise flash a page
  // scrollbar. The page is still scrollable (wheel/touch); only the bar is gone.
  useEffect(() => {
    const root = document.documentElement;
    if (isSeasonPage) root.classList.add('hide-scrollbar');
    return () => root.classList.remove('hide-scrollbar');
  }, [isSeasonPage]);

  const navRungVisible = useChromeRungVisible(0);
  const navVisible = !isSeasonPage || navRungVisible;

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-bg transition-colors duration-300">
        <DiscourseHandshake />

        {isSeasonPage ? (
          // Navbar lives in a collapsing wrapper in normal flow: shown, it pushes
          // content down; hidden, it collapses to zero height. The reveal only
          // fires at scroll top, so the content below is already pinned at 0 and
          // nothing jumps when the wrapper grows.
          <div
            className={`overflow-hidden transition-[grid-template-rows] duration-300 ease-out grid ${
              navVisible ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
            }`}
          >
            <div className="min-h-0">
              <Navbar />
            </div>
          </div>
        ) : (
          <Navbar />
        )}

        <div
          className={
            isSeasonPage
              ? // No top padding here: the band's reveal wrapper owns the top
                // gap so the padding collapses together with the band when it
                // folds (a pt-6 here would persist and orphan a gap at stage 0).
                'w-full px-6 pb-6 min-h-screen'
              : 'mx-auto max-w-7xl px-6 pb-16 pt-6'
          }
        >
          {children}
        </div>
      </div>
    </div>
  );
}
