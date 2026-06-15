'use client';

import { useChromeFoldLevel } from '@/lib/seasonChromeReveal';

interface ChromeRevealRowProps {
  /** Positional rung index from the top (navbar = 0, band = 1, first row = 2…). */
  index: number;
  children: React.ReactNode;
  /** Applied to the inner content (e.g. the grid that lays the row out), not the
   *  collapse wrapper — the wrapper is itself a grid driving the fold. */
  className?: string;
  /** When true the collapse wrapper grows to fill remaining flex space. */
  grow?: boolean;
}

export function ChromeRevealRow({ index, children, className = '', grow = false }: ChromeRevealRowProps) {
  const visible = useChromeFoldLevel() <= index;

  return (
    <div
      className={`overflow-hidden transition-[grid-template-rows] duration-300 ease-out grid ${
        visible ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      } ${grow ? 'flex-1 min-h-0' : ''}`}
    >
      <div className="min-h-0 flex flex-col">
        <div className={`pt-5 ${grow ? 'flex-1 min-h-0' : ''} ${className}`}>{children}</div>
      </div>
    </div>
  );
}
