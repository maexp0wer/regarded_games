// src/components/BanknoteGround.tsx
import { useId } from 'react';

/* ---- Landing ground: security printing ----
   The landing's background, borrowed from the card back's banknote: a field of
   guilloché waves — fine parallel lines whose amplitude swells and pinches and
   whose phase drifts line to line, so together they weave into broad moiré
   ribbons.

   It is ground, not decoration: iris-printed in the sunset colours from the
   theme tokens (so it follows light/dark), a few percent strong, and faded out
   toward the middle of the viewport where the slides put their content.

   One inline SVG, static, no per-frame work. The waves are a single sine path
   reused per line with a transform, which keeps the markup to a couple of KB.
   Every number that comes out of trig is rounded at module load, so server and
   client render the identical string — unrounded, Node and the browser can
   disagree in the last digit and trip hydration. */

const TILE_W = 480;       // px — two wavelengths, so the tile repeats seamlessly
const TILE_H = 216;       // px
const LINES = 24;         // one line every 9px
const WAVELENGTH = 240;   // px

const round = (n: number, digits = 2) => Number(n.toFixed(digits));

/* A unit-amplitude sine four wavelengths long: shifted left by up to one
   wavelength it still spans the tile. */
const WAVE_PATH = (() => {
  const points: string[] = [];
  for (let x = 0; x <= WAVELENGTH * 4; x += 8) {
    points.push(`${x} ${round(Math.sin((2 * Math.PI * x) / WAVELENGTH), 3)}`);
  }
  return `M${points.join('L')}`;
})();

/* Each line's placement. Amplitude swings 2–8px and the phase drifts two
   wavelengths down the tile; both repeat every LINES lines, so the tile also
   repeats seamlessly top to bottom. A line whose swing crosses the tile's top
   or bottom edge gets a copy one tile away, so the wave continues into the
   neighbouring tile instead of being cut off at the seam. */
const WAVE_LINES = (() => {
  const lines: { key: string; transform: string }[] = [];
  const spacing = TILE_H / LINES;
  for (let i = 0; i < LINES; i++) {
    const y = (i + 0.5) * spacing;
    const amplitude = 5 + 3 * Math.sin((2 * Math.PI * i) / LINES);
    const shift = (((2 * i) / LINES) * WAVELENGTH) % WAVELENGTH;
    for (const offset of [-TILE_H, 0, TILE_H]) {
      const cy = y + offset;
      if (cy + amplitude < 0 || cy - amplitude > TILE_H) continue;
      lines.push({
        key: `${i}:${offset}`,
        transform: `translate(${round(-shift)} ${round(cy)}) scale(1 ${round(amplitude)})`,
      });
    }
  }
  return lines;
})();

export default function BanknoteGround() {
  /* useId's output carries characters that url(#…) references choke on. */
  const id = `ground-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const wave = `${id}-wave`;
  const waves = `${id}-waves`;
  const ink = `${id}-ink`;
  const iris = `${id}-iris`;
  const fade = `${id}-fade`;
  const fadeGradient = `${id}-fade-gradient`;

  return (
    /* Strength lives here: the ink is drawn at full alpha and the whole ground
       is dialled down with opacity. Dark runs a little higher than light — the
       fade in the middle eats most of it, and hairlines on the dark canvas
       vanish sooner. */
    <svg aria-hidden="true" className="absolute inset-0 size-full pointer-events-none opacity-10 in-[.dark]:opacity-10">
      <defs>
        <path id={wave} d={WAVE_PATH} vectorEffect="non-scaling-stroke" />
        <pattern id={waves} width={TILE_W} height={TILE_H} patternUnits="userSpaceOnUse">
          <g fill="none" stroke="#fff" strokeWidth="1">
            {WAVE_LINES.map((line) => (
              <use key={line.key} href={`#${wave}`} transform={line.transform} />
            ))}
          </g>
        </pattern>

        {/* The printed image, as a mask: the wave field. */}
        <mask id={ink}>
          <rect width="100%" height="100%" fill={`url(#${waves})`} />
        </mask>

        {/* Iris printing: the ink runs through the sunset corner to corner. */}
        <linearGradient id={iris} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--color-purple)' }} />
          <stop offset="0.45" style={{ stopColor: 'var(--color-magenta)' }} />
          <stop offset="0.75" style={{ stopColor: 'var(--color-orange)' }} />
          <stop offset="1" style={{ stopColor: 'var(--color-gold)' }} />
        </linearGradient>

        {/* Clear in the middle of the viewport, full strength toward the edges. */}
        <radialGradient id={fadeGradient} cx="50%" cy="50%" r="75%">
          <stop offset="0" stopColor="#000" />
          <stop offset="0.4" stopColor="#000" />
          <stop offset="1" stopColor="#fff" />
        </radialGradient>
        <mask id={fade}>
          <rect width="100%" height="100%" fill={`url(#${fadeGradient})`} />
        </mask>
      </defs>

      <g mask={`url(#${fade})`}>
        <rect width="100%" height="100%" fill={`url(#${iris})`} mask={`url(#${ink})`} />
      </g>
    </svg>
  );
}
