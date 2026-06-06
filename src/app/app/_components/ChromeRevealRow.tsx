'use client';

import { useChromeFoldLevel } from '@/lib/seasonChromeReveal';

interface ChromeRevealRowProps {
  /** Positional rung index from the top (navbar = 0, band = 1, first row = 2…). */
  index: number;
  children: React.ReactNode;
  /** Applied to the inner content (e.g. the grid that lays the row out), not the
   *  collapse wrapper — the wrapper is itself a grid driving the fold. */
  className?: string;
}

/**
 * A content row that participates in the season-page reveal ladder. When the
 * ladder folds past this rung (`foldLevel > index`) the wrapper collapses to
 * zero height, mirroring the SeasonBand reveal.
 *
 * The collapse uses the same `grid-rows-[1fr→0fr]` + `overflow-hidden` trick as
 * SeasonBandReveal. Inter-row spacing (pt-5) lives on an inner div *inside* the
 * collapsing grid item — not on the grid item (whose own padding the `0fr` track
 * wouldn't zero) and not as a parent flex `gap` (which would persist around a
 * collapsed row). Nesting it makes the gap fold away with the row, so collapsed
 * rows leave no orphaned space. The phase layout therefore drops its `gap-*` and
 * lets each row own its top gap; indices come from `firstRowRung()` in document
 * order, with the total declared via `useChromeRowCount`.
 */
export function ChromeRevealRow({ index, children, className = '' }: ChromeRevealRowProps) {
  const visible = useChromeFoldLevel() <= index;

  return (
    <div
      className={`overflow-hidden transition-[grid-template-rows] duration-300 ease-out grid ${
        visible ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      }`}
    >
      <div className="min-h-0">
        <div className={`pt-5 ${className}`}>{children}</div>
      </div>
    </div>
  );
}
