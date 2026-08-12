'use client';

import type { ReactNode } from 'react';
import { useFitZoom } from '@/hooks/useFitZoom';

/**
 * Vertically fits `children` (a section's heading + card stack) inside
 * whatever height its parent gives it, shrinking with CSS `zoom` only when
 * the natural content would otherwise overflow the viewport — e.g. a short
 * mobile screen under a heading + a fixed-height card. See useFitZoom for
 * why `zoom` and not `transform: scale`.
 */
export default function FitToViewport({ children }: { children: ReactNode }) {
  const { contentRef, boundsRef, zoom } = useFitZoom<HTMLDivElement, HTMLDivElement>();
  return (
    <div ref={boundsRef} className="flex-1 min-h-0 w-full flex flex-col items-center justify-center">
      <div ref={contentRef} style={{ zoom }} className="w-full flex flex-col items-center">
        {children}
      </div>
    </div>
  );
}
