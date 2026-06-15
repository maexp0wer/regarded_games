'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * Press-and-hold stepping for ▲/▼ buttons, mirroring the OrderBook percentile
 * filter behavior: fire once immediately on press, then after a 300ms hold begin
 * repeating at a 100ms interval until release.
 *
 * Acceleration: once the user has held through `accelerateAfter` increments
 * (default 20), every subsequent step is multiplied by `accelerateFactor`
 * (default 10). The current multiplier is passed as the first argument to `step`,
 * so each caller scales its own base increment by it.
 *
 * The `step` callback must read the latest value itself — use the functional
 * updater form of setState (`setX(v => ...)`) so the repeated calls never act on
 * stale state captured by the interval closure.
 *
 * Returns spread-able handlers for the trigger element. `bind(...args)` forwards
 * those args to `step` (after the multiplier), so a single hook instance can drive
 * both ▲ and ▼ (and any other variants) by binding a different direction per button.
 */
export function useButtonHold<Args extends unknown[]>(
  step: (multiplier: number, ...args: Args) => void,
  {
    initialDelay = 300,
    interval = 100,
    accelerateAfter = 20,
    accelerateFactor = 10,
  }: {
    initialDelay?: number;
    interval?: number;
    accelerateAfter?: number;
    accelerateFactor?: number;
  } = {},
) {
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // How many increments the current press has fired (resets on each new press).
  const ticksRef = useRef(0);

  const stop = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(
    (...args: Args) => {
      stop();
      ticksRef.current = 0;
      const fire = () => {
        const multiplier = ticksRef.current >= accelerateAfter ? accelerateFactor : 1;
        ticksRef.current += 1;
        stepRef.current(multiplier, ...args);
      };
      fire(); // Trigger first change immediately
      timeoutRef.current = setTimeout(() => {
        intervalRef.current = setInterval(fire, interval);
      }, initialDelay);
    },
    [stop, initialDelay, interval, accelerateAfter, accelerateFactor],
  );

  // Clean up timers on unmount
  useEffect(() => stop, [stop]);

  /** Spread onto a button to give it press-and-hold stepping. */
  const bind = useCallback(
    (...args: Args) => ({
      onMouseDown: (e: React.MouseEvent) => {
        e.preventDefault();
        start(...args);
      },
      onMouseUp: stop,
      onMouseLeave: stop,
      onTouchStart: (e: React.TouchEvent) => {
        e.preventDefault();
        start(...args);
      },
      onTouchEnd: stop,
    }),
    [start, stop],
  );

  return { bind, stop };
}
