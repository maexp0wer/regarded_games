'use client';

import { SeasonBand } from './SeasonBand';
import { useChromeRungVisible } from '@/lib/seasonChromeReveal';

interface SeasonBandRevealProps {
  seasonAddress: `0x${string}`;
  seasonName: string;
}

/**
 * Scroll-reveal wrapper for the SeasonBand. The reveal stage is owned by the
 * shared seasonChromeReveal store (the scroll listener lives in AppShell); the
 * band is shown at stage >= 1 (the default), so it hides on the first
 * scroll-down at the top and returns one scroll before the navbar reappears.
 *
 * The band lives in a collapsing grid wrapper in normal flow: shown, it pushes
 * content down; hidden, it collapses to zero height. Because the stage only
 * changes at scroll-top, the content below is already pinned at 0 and nothing
 * jumps when the wrapper grows.
 *
 * The top gap (pt-6) sits on an inner div *inside* the collapsing grid item —
 * not on the grid item itself. A grid item's own padding isn't zeroed by the
 * `0fr` track, so it would leave a residual gap when folded; nesting the padding
 * one level deeper makes it part of the clipped content so it folds to nothing.
 */
export function SeasonBandReveal({ seasonAddress, seasonName }: SeasonBandRevealProps) {
  // The band is rung 1 (after the navbar at rung 0).
  const visible = useChromeRungVisible(1);

  return (
    <div
      className={`overflow-hidden transition-[grid-template-rows] duration-300 ease-out grid ${
        visible ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      }`}
    >
      <div className="min-h-0">
        <div className="pt-6">
          <SeasonBand seasonAddress={seasonAddress} seasonName={seasonName} />
        </div>
      </div>
    </div>
  );
}
