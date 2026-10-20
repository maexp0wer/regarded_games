// src/lib/coverPlateArt.ts
import { canvasToDataUrl, prepareCanvas } from '@/lib/cardBackArt';

/* ---- Rulebook covers: the printed plate ----
   The covers are printed like the deck back, in its sunset (see
   src/lib/cardBackArt.ts) but on the book's own stock, a shade lighter than
   the deck back's, and edged with the double rule, the sunset outside and the
   muted ink inside, in place of the deck back's rope braid and microprint.
   Inside the rules the deck back's guilloché vortex turns out of the centre.
   On the front it is erased in soft halos round the type so every block prints
   on clean stock; the back's type prints straight over it, as the deck back's
   wordmark does.

   The back cover runs a guilloché band across its middle, the card header's
   band woven into a net, carrying the edition cartouche. The vortex runs on
   under the band, across the whole field.
   The band and the cartouche's outer rule are what the back's holographic foil
   lights (renderCoverFoilMask).

   Struck in literal colours: a cover is a printed object, so it stays dark in
   light mode. Drawn to a canvas for the deck back's reasons: the rules hug the
   cover's real edge, and the vortex and the band fill the field, at every size
   the book is laid out at. Rulebook only draws it while the book is on screen. */

/** The book's stock, covers and pages alike: the dark card surface
    (--color-card under .dark), a shade lighter than the deck back's. */
export const COVER_STOCK = '#161322';
const INK = '#9E97BD';
const SUNSET_STOPS: ReadonlyArray<readonly [number, string]> = [
  [0, '#9D4EDD'],
  [0.45, '#D81B60'],
  [0.75, '#FF8C00'],
  [1, '#FFC300'],
];

type Rule = { inset: number; radius: number; lineWidth: number; alpha: number };

/* The double rule, px in from the cover edge, with the inner rule at about
   half the outer's strength. FIELD is where
   the vortex and the band stop, a clear step inside the inner rule. */
const OUTER_RULE: Rule = { inset: 14, radius: 6, lineWidth: 1.1, alpha: 0.85 };
const INNER_RULE: Rule = { inset: 19, radius: 1, lineWidth: 0.6, alpha: 0.35 };
const FIELD = 27;

/* The band: three strand families, the card header's tight twelve and loose
   six with a mirrored eight crossing between them so it reads as a net
   (amplitude in px). Every wavelength divides the envelope's period, so the
   band repeats seamlessly. */
const BAND_PERIOD = 288;
const BAND_FAMILIES = [
  { count: 12, wavelength: 48, amplitude: 36, mirrored: false, lineWidth: 0.7, alpha: 0.62 },
  { count: 8, wavelength: 72, amplitude: 39, mirrored: true, lineWidth: 0.6, alpha: 0.4 },
  { count: 6, wavelength: 144, amplitude: 41, mirrored: false, lineWidth: 0.6, alpha: 0.28 },
] as const;

/** The edition cartouche on the back cover: a box this size centred on the
    cover, with `pad` px of stock cleared round it out of the band. Rulebook sets
    the cartouche's type in the same box. */
export const CARTOUCHE = { width: 196, height: 40, radius: 3, pad: 6 };

/** A patch of the vortex erased so a block of type sits on clean stock. Given
    in fractions of the cover's width and height, not px: the cover's blocks are
    placed at shares of its height, so they hold their place at every size the
    book is drawn at. */
export type PlateHalo = { cx: number; cy: number; rx: number; ry: number };

function sunset(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  SUNSET_STOPS.forEach(([offset, color]) => g.addColorStop(offset, color));
  return g;
}

function strokeRule(ctx: CanvasRenderingContext2D, width: number, height: number, rule: Rule, style: string | CanvasGradient) {
  ctx.globalAlpha = rule.alpha;
  ctx.strokeStyle = style;
  ctx.lineWidth = rule.lineWidth;
  ctx.beginPath();
  ctx.roundRect(rule.inset, rule.inset, width - 2 * rule.inset, height - 2 * rule.inset, rule.radius);
  ctx.stroke();
}

function envelope(x: number, mirrored: boolean) {
  return 0.72 + 0.28 * Math.sin((2 * Math.PI * x) / BAND_PERIOD + (mirrored ? Math.PI : 0));
}

/* The band's strands across the field, centred on `cy`. `foil` prints every
   strand opaque at one weight, for the foil's mask. */
function strokeBand(ctx: CanvasRenderingContext2D, width: number, cy: number, style: string | CanvasGradient, foil: boolean) {
  const x0 = FIELD;
  const x1 = width - FIELD;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, cy - 46, x1 - x0, 92);
  ctx.clip();
  ctx.strokeStyle = style;
  for (const family of BAND_FAMILIES) {
    ctx.globalAlpha = foil ? 1 : family.alpha;
    ctx.lineWidth = foil ? 1 : family.lineWidth;
    const flip = family.mirrored ? -1 : 1;
    for (let k = 0; k < family.count; k++) {
      const phase = (2 * Math.PI * k) / family.count;
      ctx.beginPath();
      for (let x = x0; x <= x1; x++) {
        const y = cy + flip * family.amplitude * envelope(x, family.mirrored) * Math.sin((2 * Math.PI * x) / family.wavelength + phase);
        if (x === x0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

function cartoucheBox(width: number, height: number) {
  return { x: (width - CARTOUCHE.width) / 2, y: (height - CARTOUCHE.height) / 2 };
}

/** Paints a cover's line-art into `canvas`, sized to a `width` x `height`
    cover. `halos` are erased out of the vortex (see PlateHalo); `back` adds the
    band and the edition cartouche across the middle. */
export function drawCoverPlateArt(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  halos: readonly PlateHalo[],
  back: boolean,
) {
  const W = width;
  const H = height;
  if (W <= 0 || H <= 0) return;
  const ctx = prepareCanvas(canvas, W, H);
  if (!ctx) return;
  const cx = W / 2;
  const cy = H / 2;

  /* 1. Vortex: the deck back's two counter-turning families of log spirals, a
        step stronger than the back's and running right in to the centre. Drawn
        on its own layer so the front's halos can be erased out of it. */
  const layer = document.createElement('canvas');
  const l = prepareCanvas(layer, W, H);
  if (!l) return;
  l.save();
  l.beginPath();
  l.roundRect(FIELD, FIELD, W - 2 * FIELD, H - 2 * FIELD, 3);
  l.clip();
  l.lineWidth = 0.6;
  l.strokeStyle = sunset(l, 0, 0, W, H);
  const rMax = Math.hypot(cx, cy);
  const family = (count: number, twist: number, alpha: number) => {
    l.globalAlpha = alpha;
    for (let k = 0; k < count; k++) {
      l.beginPath();
      // 40 stays the phase origin, as on the deck back.
      for (let r = 6; r <= rMax; r += 2.5) {
        const th = (2 * Math.PI * k) / count + twist * Math.log(r / 40) + 0.018 * Math.sin(r / 10);
        const x = cx + r * Math.cos(th);
        const y = cy + r * Math.sin(th);
        if (r === 6) l.moveTo(x, y);
        else l.lineTo(x, y);
      }
      l.stroke();
    }
  };
  family(60, 2.4, 0.36);
  family(30, -0.9, 0.17);
  l.restore();

  // 2. Erase the type halos, so every printed block sits on clean stock.
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

  // 3. The back's band, and the cartouche printed over its middle.
  if (back) {
    strokeBand(ctx, W, cy, sunset(ctx, FIELD, 0, W - FIELD, 0), false);
    const { x, y } = cartoucheBox(W, H);
    const { width: cw, height: ch, radius, pad } = CARTOUCHE;
    ctx.globalAlpha = 1;
    ctx.fillStyle = COVER_STOCK;
    ctx.beginPath();
    ctx.roundRect(x - pad, y - pad, cw + 2 * pad, ch + 2 * pad, radius + pad);
    ctx.fill();
    ctx.strokeStyle = sunset(ctx, x, 0, x + cw, 0);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x + 0.5, y + 0.5, cw - 1, ch - 1, radius);
    ctx.stroke();
    ctx.globalAlpha = 0.32;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.roundRect(x + 3.5, y + 3.5, cw - 7, ch - 7, 1);
    ctx.stroke();
  }

  // 4. The double rule: the outer rule is the cover's printed edge.
  strokeRule(ctx, W, H, OUTER_RULE, sunset(ctx, 0, 0, W, H));
  strokeRule(ctx, W, H, INNER_RULE, INK);
  ctx.globalAlpha = 1;
}

/** Renders the back cover's foil mask for a `width` x `height` cover (the
    band's strands and the cartouche's outer rule, opaque on transparent) as a
    PNG data URL. Resolves null if the cover has no size or the canvas can't be
    encoded. */
export function renderCoverFoilMask(width: number, height: number): Promise<string | null> {
  if (width <= 0 || height <= 0) return Promise.resolve(null);
  const canvas = document.createElement('canvas');
  const ctx = prepareCanvas(canvas, width, height);
  if (!ctx) return Promise.resolve(null);
  strokeBand(ctx, width, height / 2, '#fff', true);
  // The cartouche's stock covers the band's middle, so the foil does too.
  const { x, y } = cartoucheBox(width, height);
  const { width: cw, height: ch, radius, pad } = CARTOUCHE;
  ctx.globalCompositeOperation = 'destination-out';
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.roundRect(x - pad, y - pad, cw + 2 * pad, ch + 2 * pad, radius + pad);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(x + 0.5, y + 0.5, cw - 1, ch - 1, radius);
  ctx.stroke();
  return canvasToDataUrl(canvas);
}
