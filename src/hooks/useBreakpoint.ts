'use client';

import { useEffect, useState } from 'react';

/**
 * Active Tailwind breakpoint, smallest → largest. Matches the project's default
 * Tailwind screens (sm 640, md 768, lg 1024, xl 1280, 2xl 1536). `xs` is the
 * implicit below-sm tier.
 */
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const QUERIES: { bp: Breakpoint; min: number }[] = [
  { bp: '2xl', min: 1536 },
  { bp: 'xl', min: 1280 },
  { bp: 'lg', min: 1024 },
  { bp: 'md', min: 768 },
  { bp: 'sm', min: 640 },
];

function read(): Breakpoint {
  if (typeof window === 'undefined') return 'lg'; // SSR default; corrected on mount
  const w = window.innerWidth;
  for (const { bp, min } of QUERIES) if (w >= min) return bp;
  return 'xs';
}

/**
 * Report the active breakpoint, re-computing on resize. Returns `lg` during SSR
 * and the first client render, then settles to the real value after mount, so
 * breakpoint-dependent layout is stable once hydrated.
 */
export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>('lg');

  useEffect(() => {
    const update = () => setBp(read());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return bp;
}
