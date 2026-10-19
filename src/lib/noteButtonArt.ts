// src/lib/noteButtonArt.ts
import { canvasToDataUrl, prepareCanvas } from '@/lib/cardBackArt';

/* ---- Landing banknote buttons: the coin's rim ----
   A note is struck like the hero cards' chassis and needs no drawn art; the
   round note (the theme toggle) is edged with a single ring, the double
   rule's outer rule drawn as a circle. It is rendered as a mask, opaque on
   transparent, and BanknoteButton paints the theme's ink through it, so a
   theme switch recolours without redrawing. The coin follows the viewport,
   so the ring is redrawn when it resizes. */

/** The ring's centre line, `inset` px in from the coin's edge, at its print
    weight. */
const COIN_RIM = { inset: 2, lineWidth: 1.1 };

/** Renders the rim for a `size` px coin as a PNG data URL, for use as a mask;
    `lineWidth` overrides the print weight (the foil's). Drawn rather than built
    from a CSS gradient, which can't anti-alias a sub-pixel ring and leaves it
    visibly out of round. Resolves null if the coin has no size or the canvas
    can't be encoded. */
export function renderNoteCoinRim(size: number, lineWidth = COIN_RIM.lineWidth): Promise<string | null> {
  if (size <= 0) return Promise.resolve(null);
  const canvas = document.createElement('canvas');
  const ctx = prepareCanvas(canvas, size, size);
  if (!ctx) return Promise.resolve(null);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - COIN_RIM.inset, 0, 2 * Math.PI);
  ctx.stroke();
  return canvasToDataUrl(canvas);
}
