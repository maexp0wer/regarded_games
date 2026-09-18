// src/lib/cardBackArt.ts

/* ---- HeroCard deck back: the printed line-art ----
   The back is set as a banknote: a guilloché vortex spiralling out of the coin,
   a rosette band around the coin's well, and a braided rope border with a
   microprint rule inside it.

   Drawn to a canvas rather than shipped as a static SVG because two things have
   to track the panel's real size, which changes when the card narrows on small
   screens: the rope and microprint hug the panel edges, and the sunset gradient
   runs continuously corner to corner across all of it. A 9-sliced image can do
   neither. HeroCard only draws it once a card is actually flipped, so the backs
   nobody turns over cost nothing.

   The rope and microprint are also rendered on their own as the mask for the
   holographic foil HeroCard lays over them on hover.

   The canvas setup, the rope braid and the mask encoding are exported: the
   landing's banknote buttons are edged with the same braid (see
   noteButtonArt.ts). */

const CARD_BACK_SUNSET_STOPS: ReadonlyArray<readonly [number, string]> = [
  [0, '#9D4EDD'],
  [0.45, '#D81B60'],
  [0.75, '#FF8C00'],
  [1, '#FFC300'],
];

/* Centre of each wordmark, px in from the panel's top and bottom edge. The
   vortex is erased in a soft halo around this point so the type sits on clean
   stock; HeroCard positions the wordmark text from the same number. */
export const CARD_BACK_WORDMARK_Y = 71;

const INK = '#9E97BD';

/* Printed at a fixed 2x: the hairlines are 0.6px, which smear on a 1x bitmap. */
const PIXEL_RATIO = 2;

/* Frame geometry, px in from the panel edge: the rope's centre line, the
   hairline inside it, the microprint's centre line, and where the vortex starts. */
const ROPE = 12;
const HAIRLINE = 20.5;
const MICRO = 28.5;
const VORTEX = 38;

const MICROPRINT = 'REGARDED GAMES · CLASS WAR: THE GAME · ';

/** Sizes `canvas` for a `width` x `height` panel and returns a cleared context
    drawing in panel px. */
export function prepareCanvas(canvas: HTMLCanvasElement, width: number, height: number) {
  canvas.width = Math.round(width * PIXEL_RATIO);
  canvas.height = Math.round(height * PIXEL_RATIO);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(PIXEL_RATIO, 0, 0, PIXEL_RATIO, 0, 0);
  ctx.clearRect(0, 0, width, height);
  return ctx;
}

function sunsetGradient(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const g = ctx.createLinearGradient(0, 0, width, height);
  CARD_BACK_SUNSET_STOPS.forEach(([offset, color]) => g.addColorStop(offset, color));
  return g;
}

/* Points along a rounded rectangle, ~`step` px apart, each with its outward normal. */
function roundRectPoints(x: number, y: number, w: number, h: number, r: number, step: number) {
  const out: [number, number, number, number][] = [];
  const line = (x1: number, y1: number, x2: number, y2: number, nx: number, ny: number) => {
    const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / step));
    for (let i = 0; i < n; i++) out.push([x1 + ((x2 - x1) * i) / n, y1 + ((y2 - y1) * i) / n, nx, ny]);
  };
  const arc = (ax: number, ay: number, a1: number, a2: number) => {
    const n = Math.max(1, Math.round((r * Math.abs(a2 - a1)) / step));
    for (let i = 0; i < n; i++) {
      const a = a1 + ((a2 - a1) * i) / n;
      out.push([ax + r * Math.cos(a), ay + r * Math.sin(a), Math.cos(a), Math.sin(a)]);
    }
  };
  line(x + r, y, x + w - r, y, 0, -1);
  arc(x + w - r, y + r, -Math.PI / 2, 0);
  line(x + w, y + r, x + w, y + h - r, 1, 0);
  arc(x + w - r, y + h - r, 0, Math.PI / 2);
  line(x + w - r, y + h, x + r, y + h, 0, 1);
  arc(x + r, y + h - r, Math.PI / 2, Math.PI);
  line(x, y + h - r, x, y + r, -1, 0);
  arc(x + r, y + r, Math.PI, 1.5 * Math.PI);
  return out;
}

/** A rope braid's geometry: its centre line runs `inset` px in from the panel
    edge with corner `radius`; each strand swings `amplitude` px either side of
    it and crosses the other every `pitch` px. */
export type Braid = { inset: number; radius: number; amplitude: number; pitch: number; lineWidth: number };

const CARD_BACK_ROPE: Braid = { inset: ROPE, radius: 9, amplitude: 4.5, pitch: 12, lineWidth: 0.6 };

/** Rope border: a two-strand braid along the edge of a `width` x `height` panel. */
export function drawRope(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  braid: Braid,
  style: string | CanvasGradient,
  alpha: number,
) {
  const { inset, radius, amplitude, pitch, lineWidth } = braid;
  // 12 points per cycle, whatever the pitch, so small braids stay smooth.
  const points = roundRectPoints(inset, inset, width - 2 * inset, height - 2 * inset, radius, pitch / 12);
  const cycles = Math.round(points.length / 12);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = style;
  ctx.lineWidth = lineWidth;
  for (let strand = 0; strand < 2; strand++) {
    ctx.beginPath();
    points.forEach(([x, y, nx, ny], j) => {
      const o = amplitude * Math.sin((2 * Math.PI * cycles * j) / points.length + strand * Math.PI);
      if (j) ctx.lineTo(x + nx * o, y + ny * o);
      else ctx.moveTo(x + nx * o, y + ny * o);
    });
    ctx.closePath();
    ctx.stroke();
  }
}

/** Microprint rule, running clockwise so each edge reads outward-up. `rule` is
    the rule's centre line, px in from the panel edge. Exported so a second
    plate can carry the same legend (see coverPlateArt.ts). */
export function drawMicroprint(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rule: number,
  style: string,
  alpha: number,
  monoFamily: string,
) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = style;
  ctx.font = `600 5.5px ${monoFamily}`;
  ctx.textBaseline = 'middle';
  const phraseWidth = ctx.measureText(MICROPRINT).width;
  const inset = rule + 2.5;
  const edges: [number, number, number, number][] = [
    [inset, rule, 0, width - 2 * inset],
    [width - rule, inset, Math.PI / 2, height - 2 * inset],
    [width - inset, height - rule, Math.PI, width - 2 * inset],
    [rule, height - inset, -Math.PI / 2, height - 2 * inset],
  ];
  for (const [x, y, angle, length] of edges) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.rect(0, -4, length, 8);
    ctx.clip();
    ctx.fillText(MICROPRINT.repeat(Math.ceil(length / phraseWidth) + 1), 0, 0);
    ctx.restore();
  }
}

/** Paints the deck back's line-art into `canvas`, sized to a `width` x `height`
    panel. `monoFamily` is the resolved --font-mono stack, for the microprint. */
export function drawCardBackArt(canvas: HTMLCanvasElement, width: number, height: number, monoFamily: string) {
  const W = width;
  const H = height;
  if (W <= 0 || H <= 0) return;
  const ctx = prepareCanvas(canvas, W, H);
  if (!ctx) return;
  const cx = W / 2;
  const cy = H / 2;

  // 1. Vortex: two counter-turning families of log spirals. Drawn on their own
  //    layer so the coin's well and the wordmark halos can be erased out of it.
  const layer = document.createElement('canvas');
  const l = prepareCanvas(layer, W, H);
  if (!l) return;
  l.save();
  l.beginPath();
  l.roundRect(VORTEX, VORTEX, W - 2 * VORTEX, H - 2 * VORTEX, 6);
  l.clip();
  l.lineWidth = 0.6;
  l.strokeStyle = sunsetGradient(l, W, H);
  const rMax = Math.hypot(cx, cy);
  const family = (count: number, twist: number, alpha: number) => {
    l.globalAlpha = alpha;
    for (let k = 0; k < count; k++) {
      l.beginPath();
      // Starts just inside the well (erased below); 40 stays the phase origin.
      for (let r = 96; r <= rMax; r += 2.5) {
        const th = (2 * Math.PI * k) / count + twist * Math.log(r / 40) + 0.018 * Math.sin(r / 10);
        const x = cx + r * Math.cos(th);
        const y = cy + r * Math.sin(th);
        if (r === 96) l.moveTo(x, y);
        else l.lineTo(x, y);
      }
      l.stroke();
    }
  };
  family(72, 2.4, 0.3);
  family(36, -0.9, 0.14);
  l.restore();

  l.globalCompositeOperation = 'destination-out';
  l.globalAlpha = 1;
  const well = l.createRadialGradient(cx, cy, 100, cx, cy, 185);
  well.addColorStop(0, 'rgba(0,0,0,1)');
  well.addColorStop(1, 'rgba(0,0,0,0)');
  l.fillStyle = well;
  l.beginPath();
  l.arc(cx, cy, 185, 0, 2 * Math.PI);
  l.fill();
  l.fillStyle = '#000';
  l.beginPath();
  l.arc(cx, cy, 100, 0, 2 * Math.PI);
  l.fill();
  for (const y of [CARD_BACK_WORDMARK_Y, H - CARD_BACK_WORDMARK_Y]) {
    l.save();
    l.translate(cx, y);
    l.scale(1, 40 / 160);
    const halo = l.createRadialGradient(0, 0, 0, 0, 0, 160);
    halo.addColorStop(0, 'rgba(0,0,0,1)');
    halo.addColorStop(0.55, 'rgba(0,0,0,1)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    l.fillStyle = halo;
    l.beginPath();
    l.arc(0, 0, 160, 0, 2 * Math.PI);
    l.fill();
    l.restore();
  }
  ctx.drawImage(layer, 0, 0, W, H);

  // 2. Rosette band around the coin's well: three phase-shifted strands.
  ctx.lineWidth = 0.6;
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = sunsetGradient(ctx, W, H);
  for (let i = 0; i < 3; i++) {
    const phase = (i * 2 * Math.PI) / 3;
    ctx.beginPath();
    for (let s = 0; s <= 900; s++) {
      const th = (s / 900) * 2 * Math.PI;
      const r = 116 + 7 * Math.sin(24 * th + phase);
      const x = cx + r * Math.cos(th);
      const y = cy + r * Math.sin(th);
      if (s) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.arc(cx, cy, 103, 0, 2 * Math.PI);
  ctx.stroke();

  // 3. Rope border, the hairline inside it, and the microprint rule.
  drawRope(ctx, W, H, CARD_BACK_ROPE, sunsetGradient(ctx, W, H), 0.5);
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.roundRect(HAIRLINE, HAIRLINE, W - 2 * HAIRLINE, H - 2 * HAIRLINE, 5);
  ctx.stroke();
  drawMicroprint(ctx, W, H, MICRO, INK, 0.55, monoFamily);
  ctx.globalAlpha = 1;
}

/** Renders the foil mask for a `width` x `height` panel — the rope braid and
    microprint alone, opaque on transparent, at print weight — as a PNG data URL.
    Encoded off the main thread via toBlob; resolves null if the panel has no
    size or the canvas can't be encoded. */
export function renderCardBackFoilMask(width: number, height: number, monoFamily: string): Promise<string | null> {
  if (width <= 0 || height <= 0) return Promise.resolve(null);
  const canvas = document.createElement('canvas');
  const ctx = prepareCanvas(canvas, width, height);
  if (!ctx) return Promise.resolve(null);
  drawRope(ctx, width, height, CARD_BACK_ROPE, '#fff', 1);
  drawMicroprint(ctx, width, height, MICRO, '#fff', 1, monoFamily);
  return canvasToDataUrl(canvas);
}

/** Encodes `canvas` as a PNG data URL, off the main thread via toBlob; resolves
    null if it can't be encoded. */
export function canvasToDataUrl(canvas: HTMLCanvasElement): Promise<string | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    }, 'image/png');
  });
}
