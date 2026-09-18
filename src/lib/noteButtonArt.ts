// src/lib/noteButtonArt.ts
import { type Braid, canvasToDataUrl, drawRope, prepareCanvas } from '@/lib/cardBackArt';

/* ---- Landing banknote buttons: the rope braid ----
   The landing's banknote buttons are edged with the deck back's rope braid
   (src/lib/cardBackArt.ts). They have no drawn border: the braid, printed just
   inside the stock's edge, is the button's outline.

   The braid is rendered once per size as a mask, opaque on transparent, and
   BanknoteButton paints the theme's colours through it. So it has to be
   redrawn when the button resizes (it hugs the button's real size, which
   follows its label and the display font), but not when the theme changes. */

/* The strands' outer swing (inset - amplitude) stays inside the button box,
   so the braid prints entirely on the stock, which fills the box. */
export const NOTE_ROPE: Braid = { inset: 3.5, radius: 4, amplitude: 2, pitch: 7, lineWidth: 0.8 };

/** Renders the braid for a `width` x `height` button as a PNG data URL, for
    use as a mask; `lineWidth` overrides the print weight. Resolves null if the
    button has no size or the canvas can't be encoded. */
export function renderNoteButtonBraid(width: number, height: number, lineWidth = NOTE_ROPE.lineWidth): Promise<string | null> {
  if (width <= 0 || height <= 0) return Promise.resolve(null);
  const canvas = document.createElement('canvas');
  const ctx = prepareCanvas(canvas, width, height);
  if (!ctx) return Promise.resolve(null);
  drawRope(ctx, width, height, { ...NOTE_ROPE, lineWidth }, '#fff', 1);
  return canvasToDataUrl(canvas);
}
