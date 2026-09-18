// src/lib/coverPlateArt.ts
import { type Braid, canvasToDataUrl, drawMicroprint, drawRope, prepareCanvas } from '@/lib/cardBackArt';

/* ---- Rulebook covers: the printed plate ----
   The front and back covers of the rulebook are the deck back's plate struck
   into gold instead of onto stock (see src/lib/cardBackArt.ts): a guilloché
   vortex turning out of the centre, a hairline rule, a braided rope border and
   a microprint rule between them.

   Same four rings in from the edge as the card back, on the same ~8px cadence —
   rope 9 · hairline 19 · microprint 27 · field 36 — so the two objects read as
   one house. The braid geometry is the exported `Braid` type, and the legend is
   the deck back's own, so nothing here is a second vocabulary.

   Struck in one literal ink rather than the back's sunset gradient: the ground
   is already a five-stop metal, and a gradient over a gradient reads as neither.
   The ink is literal for the same reason the deck back's colours are — a cover
   is a printed object, not a themed surface, and it must not invert in light
   mode.

   Drawn to a canvas rather than shipped as an SVG for the deck back's reasons:
   the rope and microprint hug the cover's real edge, which moves between the
   desktop spread, the mobile page and every viewport in between. Rulebook only
   draws it while a cover is actually showing. */

/* Frame geometry, px in from the cover edge: the rope's centre line, the
   hairline inside it, the microprint's centre line, and where the field starts.
   FIELD is also where the cover's type area begins (Rulebook's covers are p-9),
   so the printed blocks sit inside the field and clear the microprint rule. */
const ROPE = 9;
const HAIRLINE = 19;
const MICRO = 27;
const FIELD = 36;

const COVER_ROPE: Braid = { inset: ROPE, radius: 6, amplitude: 3.5, pitch: 11, lineWidth: 0.7 };

/** A patch of the field erased so a block of type sits on clean metal. Given in
    fractions of the cover's width and height, not px: the cover's blocks are
    laid out with `justify-between`, so they hold their share of the face at
    every size the book is drawn at. */
export type PlateHalo = { cx: number; cy: number; rx: number; ry: number };

/** Paints a cover's line-art into `canvas`, sized to a `width` x `height` cover
    and struck in `ink`. `monoFamily` is the resolved --font-mono stack, for the
    microprint; `halos` are erased out of the field (see PlateHalo). */
export function drawCoverPlateArt(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  ink: string,
  monoFamily: string,
  halos: readonly PlateHalo[],
) {
  const W = width;
  const H = height;
  if (W <= 0 || H <= 0) return;
  const ctx = prepareCanvas(canvas, W, H);
  if (!ctx) return;
  const cx = W / 2;
  const cy = H / 2;

  /* 1. Vortex: two counter-turning families of log spirals, the deck back's
        recipe at a lower count and a lower alpha — the metal beneath is already
        working, and the back's weight would silt it up. Drawn on its own layer
        so the type halos can be erased out of it. */
  const layer = document.createElement('canvas');
  const l = prepareCanvas(layer, W, H);
  if (!l) return;
  l.save();
  l.beginPath();
  l.roundRect(FIELD, FIELD, W - 2 * FIELD, H - 2 * FIELD, 5);
  l.clip();
  l.lineWidth = 0.6;
  l.strokeStyle = ink;
  const rMax = Math.hypot(cx, cy);
  const family = (count: number, twist: number, alpha: number) => {
    l.globalAlpha = alpha;
    for (let k = 0; k < count; k++) {
      l.beginPath();
      // 40 stays the phase origin, as on the deck back; 60 skips the dense core.
      for (let r = 60; r <= rMax; r += 2.5) {
        const th = (2 * Math.PI * k) / count + twist * Math.log(r / 40) + 0.018 * Math.sin(r / 10);
        const x = cx + r * Math.cos(th);
        const y = cy + r * Math.sin(th);
        if (r === 60) l.moveTo(x, y);
        else l.lineTo(x, y);
      }
      l.stroke();
    }
  };
  family(60, 2.4, 0.22);
  family(30, -0.9, 0.1);
  l.restore();

  // 2. Erase the type halos, so every printed block sits on clean metal.
  l.globalCompositeOperation = 'destination-out';
  l.globalAlpha = 1;
  for (const halo of halos) {
    l.save();
    l.translate(halo.cx * W, halo.cy * H);
    l.scale(halo.rx * W, halo.ry * H);
    const g = l.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.6, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    l.fillStyle = g;
    l.beginPath();
    l.arc(0, 0, 1, 0, 2 * Math.PI);
    l.fill();
    l.restore();
  }
  ctx.drawImage(layer, 0, 0, W, H);

  // 3. Rope border, the hairline inside it, and the microprint rule.
  drawRope(ctx, W, H, COVER_ROPE, ink, 0.55);
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.roundRect(HAIRLINE, HAIRLINE, W - 2 * HAIRLINE, H - 2 * HAIRLINE, 4);
  ctx.stroke();
  drawMicroprint(ctx, W, H, MICRO, ink, 0.5, monoFamily);
  ctx.globalAlpha = 1;
}

/** Renders the foil mask for a `width` x `height` cover — the rope braid and
    microprint alone, opaque on transparent, at print weight — as a PNG data
    URL. Resolves null if the cover has no size or the canvas can't be encoded. */
export function renderCoverFoilMask(width: number, height: number, monoFamily: string): Promise<string | null> {
  if (width <= 0 || height <= 0) return Promise.resolve(null);
  const canvas = document.createElement('canvas');
  const ctx = prepareCanvas(canvas, width, height);
  if (!ctx) return Promise.resolve(null);
  drawRope(ctx, width, height, { ...COVER_ROPE, lineWidth: 1 }, '#fff', 1);
  drawMicroprint(ctx, width, height, MICRO, '#fff', 1, monoFamily);
  return canvasToDataUrl(canvas);
}
