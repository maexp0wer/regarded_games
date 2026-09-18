// src/lib/holoFoil.ts
import type { CSSProperties } from 'react';

/* ---- Holographic foil: pointer tracking ----
   Shared by every foil surface: the deck back's rope and microprint (HeroCard)
   and the landing hero's stake button (BanknoteButton). Each sets its own bands, pool and glare at its own scale;
   all of them read the four position variables written here. */

/** Where the pool and bands sit before the pointer has moved (and always, with
    reduced motion). */
export const FOIL_REST = {
  '--foil-x': '30%',
  '--foil-y': '20%',
  '--foil-glare-x': '22%',
  '--foil-glare-y': '12%',
} as CSSProperties;

/** Tracks the pointer over `surface` and writes the foil's position variables
    onto `foil`; returns the cleanup. The pool is placed in the foil's own
    (unscaled) px, so it stays under the cursor even while the deck scales the
    card. The bands track the pointer's share of the surface, so the colours
    shift across the whole surface, not just over the foil. */
export function trackFoil(surface: HTMLElement, foil: HTMLElement) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let clientX = 0;
  let clientY = 0;

  const place = () => {
    frame = 0;
    const foilRect = foil.getBoundingClientRect();
    const surfaceRect = surface.getBoundingClientRect();
    const share = (v: number) => `${Math.min(100, Math.max(0, v * 100))}%`;
    foil.style.setProperty('--foil-glare-x', `${((clientX - foilRect.left) / (foilRect.width || 1)) * foil.offsetWidth}px`);
    foil.style.setProperty('--foil-glare-y', `${((clientY - foilRect.top) / (foilRect.height || 1)) * foil.offsetHeight}px`);
    foil.style.setProperty('--foil-x', share((clientX - surfaceRect.left) / (surfaceRect.width || 1)));
    foil.style.setProperty('--foil-y', share((clientY - surfaceRect.top) / (surfaceRect.height || 1)));
  };
  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch' || reduceMotion.matches) return;
    clientX = e.clientX;
    clientY = e.clientY;
    if (!frame) frame = requestAnimationFrame(place);
  };
  surface.addEventListener('pointermove', onPointerMove);

  return () => {
    surface.removeEventListener('pointermove', onPointerMove);
    cancelAnimationFrame(frame);
  };
}
