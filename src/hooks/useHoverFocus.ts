// src/hooks/useHoverFocus.ts
"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

/* A focus shared by a figure and its index, with two input modes. A pointer
   that can hover focuses what it is over, and leaving waits `leaveMs` before
   the focus clears, a wait the next hover cancels, so crossing a gap between
   two targets never flashes the resting state. A touch screen cannot hover,
   so there a TAP pins a target, and the pin holds until the same one is
   tapped again or `clear` runs. Capability is read after mount (matchMedia
   does not exist during SSR), defaulting to hover so the desktop first paint
   is already right. A pin outranks a hover. */
export function useHoverFocus<T>(same: (a: T | null, b: T | null) => boolean, leaveMs: number) {
  const [hovered, setHovered] = useState<T | null>(null);
  const [pinned, setPinned] = useState<T | null>(null);
  const [canHover, setCanHover] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const read = () => setCanHover(mq.matches);
    read();
    mq.addEventListener('change', read);
    return () => mq.removeEventListener('change', read);
  }, []);

  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(leaveTimerRef.current), []);
  const hover = useCallback((next: T | null) => {
    if (!canHover) return;
    clearTimeout(leaveTimerRef.current);
    setHovered(next);
  }, [canHover]);
  const leave = useCallback(() => {
    if (!canHover) return;
    clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = setTimeout(() => setHovered(null), leaveMs);
  }, [canHover, leaveMs]);
  const select = useCallback((next: T | null) => {
    if (canHover) return;
    setPinned((prev) => (same(prev, next) ? null : next));
  }, [canHover, same]);
  const clear = useCallback(() => {
    clearTimeout(leaveTimerRef.current);
    setPinned(null);
    setHovered(null);
  }, []);

  return { focus: pinned ?? hovered, pinned, hover, leave, select, clear };
}
