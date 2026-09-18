// src/lib/cardFrontArt.ts

/* ---- HeroCard front: the header guilloché ----
   The front's one piece of printed line-art, borrowed from the deck back (see
   src/lib/cardBackArt.ts): a banknote border band — two families of
   phase-shifted sines under a shared pinch envelope — struck in the card's own
   colour rather than the back's house sunset, so each card keeps its identity.

   Drawn to a canvas for the same reason as the back: the band has to track the
   header's real width, which changes when the card narrows on small screens.

   It can also be drawn at a moment `t` of a wave animation: each family's
   strands and the pinch envelope travel toward the coin at their own speed, so
   the braid ripples and re-forms rather than sliding as one rigid picture.
   The fade under the title is a CSS mask in HeroCard, not part of the bitmap. */

/* Printed at a fixed 2x: the hairlines are 0.6px, which smear on a 1x bitmap. */
const PIXEL_RATIO = 2;

/* Pattern geometry, px: the pinch envelope's period, and each family's wavelength. */
const ENVELOPE_PERIOD = 264;
const TIGHT_WAVELENGTH = ENVELOPE_PERIOD / 6;
const LOOSE_WAVELENGTH = ENVELOPE_PERIOD / 2;

/* Travel speeds, px/s, all toward the coin (rightward). Unequal on purpose: the
   swells (the envelope) race through strands that drift much more slowly, so
   waves visibly pass along the braid instead of the whole band sliding. */
const TIGHT_SPEED = 45;
const LOOSE_SPEED = 20;
const ENVELOPE_SPEED = 110;

/** Paints the band into `canvas` for a `width` x `height` header, at `t`
    seconds into the wave animation (0 is the resting pattern). `rgb` is an
    "r, g, b" triple — the card's themeColorRgba. Cheap to call every frame: the
    bitmap is only reallocated when the size changes. */
export function drawCardHeaderGuilloche(canvas: HTMLCanvasElement, width: number, height: number, rgb: string, t = 0) {
  const W = width;
  const H = height;
  if (W <= 0 || H <= 0) return;

  const bitmapW = Math.round(W * PIXEL_RATIO);
  const bitmapH = Math.round(H * PIXEL_RATIO);
  if (canvas.width !== bitmapW) canvas.width = bitmapW;
  if (canvas.height !== bitmapH) canvas.height = bitmapH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(PIXEL_RATIO, 0, 0, PIXEL_RATIO, 0, 0);
  ctx.clearRect(0, 0, W, H);

  // A tight family of twelve strands braided over a looser six, under a shared
  // pinch envelope.
  ctx.lineWidth = 0.6;
  ctx.strokeStyle = `rgb(${rgb})`;
  const mid = H / 2;
  const envelopeShift = ENVELOPE_SPEED * t;
  const family = (count: number, wavelength: number, speed: number, amp: number, alpha: number) => {
    ctx.globalAlpha = alpha;
    const shift = speed * t;
    for (let k = 0; k < count; k++) {
      const phase = (2 * Math.PI * k) / count;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 1) {
        const envelope = 0.72 + 0.28 * Math.sin((2 * Math.PI * (x - envelopeShift)) / ENVELOPE_PERIOD);
        const y = mid + amp * envelope * Math.sin((2 * Math.PI * (x - shift)) / wavelength + phase);
        if (x) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
  };
  family(12, TIGHT_WAVELENGTH, TIGHT_SPEED, H * 0.36, 0.5);
  family(6, LOOSE_WAVELENGTH, LOOSE_SPEED, H * 0.44, 0.24);
}
