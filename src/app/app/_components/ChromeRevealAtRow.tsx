'use client';

import { useChromeRevealAt } from '@/lib/seasonChromeReveal';

interface ChromeRevealAtRowProps {
  /** Fold level at (and past) which this row is shown — the inverse of the
   *  fold-away rungs. */
  level: number;
  children: React.ReactNode;
  /** Applied to the inner content (e.g. the grid that lays the row out), not the
   *  collapse wrapper. */
  className?: string;
}

/**
 * Inverse of {@link ChromeRevealRow}: instead of folding away once the ladder
 * passes its rung, this row *reveals* once the ladder has folded down to `level`.
 *
 * Same `grid-rows-[1fr→0fr]` + `overflow-hidden` collapse trick, just driven by
 * `useChromeRevealAt` (shown when `foldLevel >= level`) rather than
 * `useChromeRungVisible` (shown when `foldLevel <= index`). Used for the 2xl
 * trading phase, where the trading row stays pinned across every stage and the
 * detail cards slide in only at the deepest fold.
 */
export function ChromeRevealAtRow({ level, children, className = '' }: ChromeRevealAtRowProps) {
  const visible = useChromeRevealAt(level);

  return (
    <div
      className={`shrink-0 overflow-hidden transition-[grid-template-rows] duration-300 ease-out grid ${
        visible ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      }`}
    >
      <div className="min-h-0">
        {/* No top gap: the pinned trading row above already supplies spacing, and
            a pt-* here would leave a residual gap before the row reveals. */}
        <div className={className}>{children}</div>
      </div>
    </div>
  );
}
