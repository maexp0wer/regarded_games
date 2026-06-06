'use client';

import { useEffect, useSyncExternalStore } from 'react';

/**
 * Shared scroll-reveal ladder for a season page. The navbar, the SeasonBand and
 * each content row are "rungs" stacked top-to-bottom; a scroll-down gesture made
 * *at the very top* folds the next rung to zero height instead of scrolling, and
 * a scroll-up gesture re-expands the last folded rung. The page only scrolls
 * normally once every rung is folded (and re-expands as you scroll back to top).
 *
 * Rung index is positional from the top:
 *   rung 0 → navbar
 *   rung 1 → SeasonBand
 *   rung 2 → first content row
 *   rung 3 → second content row …
 *
 * State is a single `foldLevel` = how many rungs (counting from the top) are
 * currently folded:
 *   foldLevel 0 → nothing folded, everything shown
 *   foldLevel n → the top n rungs are folded
 *
 * A rung at index `i` is folded when `foldLevel > i`, so they fold top-down
 * (navbar first) and re-expand bottom-up — matching the original navbar→band
 * ordering, now generalised to any number of rows.
 *
 * The default fold level shows the band but hides the navbar (foldLevel 1),
 * preserving the prior season-page default where the band is the resting chrome.
 *
 * The total rung count is set per phase via `setChromeRowCount` (the number of
 * collapsible content rows below the band); AppShell owns rung 0 (navbar) and
 * rung 1 (band) implicitly. `installSeasonChromeReveal` installs the one scroll
 * listener; everything else just reads. A module-level store rather than a
 * context: it can't be prop-drilled across the AppShell→children gap and the
 * consumer set is small, so a context would be overkill per the project rules.
 */

// foldLevel 1 = navbar (rung 0) folded, band (rung 1) shown — the resting state.
const DEFAULT_FOLD = 1;

// Rung count floor: navbar + band always exist even before any row registers.
const BASE_RUNGS = 2;

let foldLevel = DEFAULT_FOLD;
let rowCount = 0;
const listeners = new Set<() => void>();

function totalRungs() {
  return BASE_RUNGS + rowCount;
}

// The last rung is the resting floor — it never folds, so the final visible
// block stays put instead of scrolling away once everything above it is folded.
// Cap the fold level one below the total so that bottom rung is always shown.
function maxFold() {
  return Math.max(0, totalRungs() - 1);
}

function emit() {
  for (const l of listeners) l();
}

function setFold(next: number) {
  const clamped = Math.min(maxFold(), Math.max(0, next));
  if (clamped === foldLevel) return;
  foldLevel = clamped;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return foldLevel;
}

// SSR: resting state (band shown, navbar folded).
function getServerSnapshot() {
  return DEFAULT_FOLD;
}

/** Subscribe to the current fold level (how many top rungs are folded). */
export function useChromeFoldLevel(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Whether the rung at `index` is currently shown. A rung is folded once the
 * fold level has passed it (`foldLevel > index`), so rungs fold top-down.
 */
export function useChromeRungVisible(index: number): boolean {
  return useChromeFoldLevel() <= index;
}

/**
 * The rung index of the first content row (after navbar + band). A phase layout
 * places its rows at `firstRowRung() + 0, + 1, …` top-to-bottom.
 */
export function firstRowRung(): number {
  return BASE_RUNGS;
}

/**
 * Set how many collapsible content rows the current phase has. Called by the
 * phase layout; clamps the fold level if the ladder shrank. Idempotent.
 */
export function setChromeRowCount(count: number): void {
  const next = Math.max(0, count);
  if (next === rowCount) return;
  rowCount = next;
  if (foldLevel > maxFold()) foldLevel = maxFold();
  emit();
}

/**
 * Declare the current phase's collapsible row count for the component's
 * lifetime, resetting to 0 on unmount so a phase change doesn't leave a stale
 * ladder length. Pair with `firstRowRung()` to index the rows.
 */
export function useChromeRowCount(count: number): void {
  useEffect(() => {
    setChromeRowCount(count);
    return () => setChromeRowCount(0);
  }, [count]);
}

/**
 * Install the single scroll listener that drives the ladder. Call once from the
 * owner (AppShell) when on a season page; the returned cleanup removes the
 * listener and resets to the default fold level. No-op when `active` is false so
 * off-season pages bind nothing and show all chrome.
 */
export function installSeasonChromeReveal(active: boolean): () => void {
  if (!active || typeof window === 'undefined') {
    // Off a season page everything is shown; reset to the resting default so a
    // later activation starts fresh rather than from a stale fold level.
    setFold(DEFAULT_FOLD);
    return () => {};
  }

  setFold(DEFAULT_FOLD);

  const atTop = () => window.scrollY <= 0;

  // Non-passive so we can preventDefault the at-top gesture that only folds a
  // rung — that gesture changes the chrome without moving the page. Once every
  // rung is folded (foldLevel === maxFold) the guards fall through and the
  // browser scrolls normally.
  const onWheel = (e: WheelEvent) => {
    if (!atTop()) return;
    if (e.deltaY > 0 && foldLevel < maxFold()) {
      e.preventDefault();
      setFold(foldLevel + 1); // scroll down → fold the next rung (top-down)
    } else if (e.deltaY < 0 && foldLevel > 0) {
      e.preventDefault();
      setFold(foldLevel - 1); // scroll up → re-expand the last folded rung
    }
  };

  let touchStartY = 0;
  const onTouchStart = (e: TouchEvent) => {
    touchStartY = e.touches[0]?.clientY ?? 0;
  };
  const onTouchMove = (e: TouchEvent) => {
    if (!atTop()) return;
    const y = e.touches[0]?.clientY ?? 0;
    const moved = y - touchStartY; // finger up (negative) = scroll-down intent
    if (moved < -8 && foldLevel < maxFold()) {
      e.preventDefault();
      setFold(foldLevel + 1);
    } else if (moved > 8 && foldLevel > 0) {
      e.preventDefault();
      setFold(foldLevel - 1);
    }
  };

  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: false });

  return () => {
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchmove', onTouchMove);
    setFold(DEFAULT_FOLD);
  };
}
