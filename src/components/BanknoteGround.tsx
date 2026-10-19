// src/components/BanknoteGround.tsx
import { useEffect, useId, useRef } from 'react';
import { FOIL_REST, trackFoil } from '@/lib/holoFoil';

/* ---- Landing ground: security printing ----
   The landing's background, borrowed from the card back's banknote: a field of
   guilloché waves — fine parallel lines whose amplitude swells and pinches and
   whose phase drifts line to line, so together they weave into broad moiré
   ribbons.

   It is ground, not decoration: iris-printed in the sunset colours from the
   theme tokens (so it follows light/dark), a few percent strong, and faded out
   toward the middle of the viewport where the slides put their content.

   The waves are also foil, very faintly: wherever the pointer is on the page,
   the lines round it catch a little of the holographic spectrum, the bands
   sliding as it moves. Touch and reduced motion get the print alone.

   One inline SVG, static, no per-frame work, plus the foil layer: the same
   wave tile as a CSS mask, whose position variables trackFoil writes straight
   onto it. The waves are a single sine path reused per line with a transform,
   which keeps the markup to a couple of KB. Every number that comes out of
   trig is rounded at module load, so server and client render the identical
   string — unrounded, Node and the browser can disagree in the last digit and
   trip hydration. */

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

/* The foil's masks. The wave tile, drawn as a standalone SVG so CSS can repeat
   it, lines up with the print's pattern: both start at the ground's top-left
   corner. The fade matches the print's (clear through the middle of the
   viewport), and the pool is a wide, soft patch round the cursor. */
const WAVE_TILE_MASK = (() => {
  const uses = WAVE_LINES.map((line) => `<use href="#w" transform="${line.transform}"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_W}" height="${TILE_H}"><defs><path id="w" d="${WAVE_PATH}" vector-effect="non-scaling-stroke"/></defs><g fill="none" stroke="#fff" stroke-width="1">${uses}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
})();
const FOIL_FADE = 'radial-gradient(ellipse 75% 75% at 50% 50%, transparent 40%, #000 100%)';
const FOIL_POOL = 'radial-gradient(circle at var(--foil-glare-x) var(--foil-glare-y), #000 0px, #000 120px, transparent 420px)';
const FOIL_BANDS =
  'repeating-linear-gradient(115deg, #FF6FD8 0px, #FFD36E 48px, #9CFF8A 96px, #62E6FF 144px, #8F7BFF 192px, #FF6FD8 240px)';
const FOIL_TRAVEL = { x: 400, y: 200 };

export default function BanknoteGround() {
  /* useId's output carries characters that url(#…) references choke on. */
  const id = `ground-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const wave = `${id}-wave`;
  const waves = `${id}-waves`;
  const ink = `${id}-ink`;
  const iris = `${id}-iris`;
  const fade = `${id}-fade`;
  const fadeGradient = `${id}-fade-gradient`;
  const foilRef = useRef<HTMLDivElement>(null);

  /* The ground takes no pointer events, so the foil follows the pointer over
     the whole stage it sits in (pointermove bubbles up from every slide). It
     lights on the first mouse or pen move and dims when the pointer leaves the
     stage; React never sets data-lit, so a re-render can't reset it. */
  useEffect(() => {
    const foil = foilRef.current;
    const stage = foil?.parentElement;
    if (!foil || !stage) return;
    const stopTracking = trackFoil(stage, foil);
    const light = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') foil.dataset.lit = '';
    };
    const dim = () => {
      delete foil.dataset.lit;
    };
    stage.addEventListener('pointermove', light);
    stage.addEventListener('pointerleave', dim);
    return () => {
      stopTracking();
      stage.removeEventListener('pointermove', light);
      stage.removeEventListener('pointerleave', dim);
    };
  }, []);

  return (
    <>
      {/* Strength lives here: the ink is drawn at full alpha and the whole
          ground is dialled down with opacity — opacity-10 for the light theme,
          in-[.dark]:opacity-10 for the dark one. */}
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

      {/* The foil: the spectrum through the wave tile, the fade and the pool.
          Its strength lives here too: data-[lit]:opacity-10 while the pointer
          is on the page. On the light page the spectrum is pushed deeper, so
          the pastels still read. */}
      <div
        ref={foilRef}
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-700 data-lit:opacity-10 motion-reduce:hidden
          saturate-[1.6] brightness-[0.85] in-[.dark]:saturate-[1.15] in-[.dark]:brightness-[1.08]"
        style={{
          ...FOIL_REST,
          backgroundImage: FOIL_BANDS,
          backgroundSize: `calc(100% + ${FOIL_TRAVEL.x}px) calc(100% + ${FOIL_TRAVEL.y}px)`,
          backgroundPosition: 'var(--foil-x) var(--foil-y)',
          maskImage: `${WAVE_TILE_MASK}, ${FOIL_FADE}, ${FOIL_POOL}`,
          WebkitMaskImage: `${WAVE_TILE_MASK}, ${FOIL_FADE}, ${FOIL_POOL}`,
          maskSize: `${TILE_W}px ${TILE_H}px, 100% 100%, 100% 100%`,
          WebkitMaskSize: `${TILE_W}px ${TILE_H}px, 100% 100%, 100% 100%`,
          maskRepeat: 'repeat, no-repeat, no-repeat',
          WebkitMaskRepeat: 'repeat, no-repeat, no-repeat',
          maskComposite: 'intersect',
          WebkitMaskComposite: 'source-in',
        }}
      />
    </>
  );
}
