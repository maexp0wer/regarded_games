'use client';

import { useSyncExternalStore } from 'react';

/**
 * Width assumed before the real viewport is known — i.e. on the server and
 * during the hydration pass. Wider than any viewport we ship to, so off-screen
 * parking transforms derived from it always clear the edge.
 */
export const FALLBACK_VIEWPORT_WIDTH = 1600;

let width = FALLBACK_VIEWPORT_WIDTH;
const listeners = new Set<() => void>();

function handleResize() {
  const next = window.innerWidth;
  if (next === width) return;
  width = next;
  for (const notify of listeners) notify();
}

/* One resize listener for every subscriber — attached with the first, dropped
   with the last. React re-reads the snapshot right after subscribing, so the
   width picked up here lands without an explicit notify. */
function subscribe(notify: () => void) {
  if (listeners.size === 0) {
    width = window.innerWidth;
    window.addEventListener('resize', handleResize);
  }
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
    if (listeners.size === 0) window.removeEventListener('resize', handleResize);
  };
}

/**
 * Live `window.innerWidth`, re-read on resize.
 *
 * Returns FALLBACK_VIEWPORT_WIDTH on the server AND on the client's hydration
 * render, then settles to the real width in the commit that follows. Reading
 * `window` straight from render instead (`typeof window !== 'undefined' ? ... `)
 * makes the hydration pass compute a different value than the server put in the
 * HTML — a mismatch for anything the width feeds, inline transforms included.
 */
export function useViewportWidth(): number {
  return useSyncExternalStore(subscribe, () => width, () => FALLBACK_VIEWPORT_WIDTH);
}
