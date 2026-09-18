// src/components/HeroCard.tsx
import { motion } from 'framer-motion';
import React, { useEffect, useId, useRef, useState } from 'react';
import {
  CARD_BACK_WORDMARK_Y,
  drawCardBackArt,
  renderCardBackFoilMask,
} from '@/lib/cardBackArt';
import { drawCardHeaderGuilloche } from '@/lib/cardFrontArt';
import { FOIL_REST, trackFoil } from '@/lib/holoFoil';

/* Body copy in the class box — the quote and the ability descriptions. A shade
   lighter than --color-text2 (#9E97BD), which measures 7.08:1 on the box's
   ground (FRONT_WELL, #0D0B14); this lands at 10.07:1 while still reading as
   secondary text under the white class title. */
const BOX_BODY_COLOR = '#BDB6D6';

/* ---- Deck back ----
   One back for the whole deck, set as a banknote: a sunset guilloché field (see
   src/lib/cardBackArt.ts), the house wordmark top and bottom, and a minted coin
   in the middle carrying Regardo's portrait. Like a real card back it is the
   same on every card — nothing on it varies with the card's own theme colour.

   It is a printed object, not a themed surface: it stays dark in light mode as
   well, so every colour here is struck literally instead of pulled from the
   light/dark tokens (the sunset values are the dark-mode ones). */
const BACK_STOCK = '#0D0B14';                    // the stock both faces are printed on
const BACK_INK = '#9E97BD';                      // printed rules and legend type
const BACK_EDGE = '#251F3D';                     // panel border
const BACK_WORDMARK = '#D6CFEA';                 // house wordmark
const BACK_GLOW_RGB = '255, 140, 0';             // card glow, chassis border
const BACK_CHASSIS = 'linear-gradient(135deg, #2e0854 0%, #9D4EDD 24%, #8b0054 48%, #FF8C00 74%, #6a501c 100%)';
const BACK_SUNSET = 'linear-gradient(135deg, #9D4EDD 0%, #D81B60 45%, #FF8C00 75%, #FFC300 100%)';

/* ---- Deck back coin ----
   The coin is the docs link. Its rim says so in print — READ THE DOCS — so the
   affordance does not depend on hover, which touch screens never get. Hovering
   (or keyboard focus) lifts the coin, brightens the glow behind it and lights
   that line of the rim in the coin's gold. The link itself is the fixed
   circle; everything that scales sits inside it with pointer events off.

   The coin face is drawn in a 200-unit viewBox. The portrait is Regardo.svg
   cropped to the head by viewBox, with his walking cane clipped away, painted as
   a CSS background-image: every card carries this back, and the source is
   ~50 KB of path data. See public/characters/README. */
const COIN_SIZE = 184;                           // px
const COIN_FACE = '#2B2544';
const COIN_RIM = '#191426';
/* The coin is struck in the Regardo card's gold (its themeColorRgba on the
   landing, 212 175 55), mixed the way the front's symbol seal mixes it — so the
   big coin and the small one read as the same metal. The milled edge is mixed
   opaque over the stock rather than drawn translucent, so the glow behind the
   coin doesn't tint it. */
const COIN_GOLD = '#D4AF37';                     // rim rules and dots, lit docs line, focus ring
const COIN_MILL_HI = '#B69632';                  // COIN_GOLD 85% over the stock
const COIN_MILL_LO = '#534420';                  // COIN_GOLD 35% over the stock
const COIN_ENGRAVING_ANGLES = Array.from({ length: 24 }, (_, i) => i * 15);
const HEAD_SRC = '/characters/RegardoHead.svg';
const HEAD_ASPECT = '480 / 536';                 // the asset's viewBox
/* The portrait sits inside the face (the 15% inset — 30 of the coin's 200
   units), hat and all, with PORTRAIT_TOP of headroom. The face's circular clip
   trims the collar under his jaw. */
const PORTRAIT_HEIGHT = 118;                     // px
const PORTRAIT_TOP = 6;                          // px

/* ---- Deck back foil ----
   The rope braid and the microprint rule are holographic foil. At rest they
   read as plain print; while the pointer is on the card, the foil catches the
   light in a pool around the cursor and the rest of the border stays print.
   Moving the cursor slides the spectrum bands (the colours shift as the
   "viewing angle" changes) and walks a glare along under it.

   The foil is one layer masked twice: to the braid and microprint (a bitmap
   from cardBackArt, at print weight) and to the pool around the cursor. The
   pointer only rewrites CSS variables — no re-render per move. Touch never
   hovers, so it never sees foil; with reduced motion the foil still shows on
   hover but holds its rest position instead of tracking the cursor. */
const FOIL_BANDS =
  'repeating-linear-gradient(115deg, #FF6FD8 0%, #FFD36E 4.8%, #9CFF8A 9.6%, #62E6FF 14.4%, #8F7BFF 19.2%, #FF6FD8 24%)';
const FOIL_POOL =
  'radial-gradient(circle at var(--foil-glare-x) var(--foil-glare-y), #000 0px, #000 50px, transparent 190px)';
const FOIL_GLARE =
  'radial-gradient(circle at var(--foil-glare-x) var(--foil-glare-y), rgba(255, 255, 255, 0.95) 0px, rgba(255, 255, 255, 0.35) 60px, rgba(255, 255, 255, 0) 150px)';
/* Pointer tracking and the rest position are shared with the landing hero's
   stake button: see src/lib/holoFoil.ts. */

/* Line-art canvas and foil layer for the back panel. Draws only while the back
   is showing — the deck mounts every card at once and most backs are never
   turned over — and again once the mono face has loaded, so the microprint
   isn't left set in the fallback. The bitmap and mask survive flipping back to
   the front. */
function CardBackArt({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const foilRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const foil = foilRef.current;
    const panel = canvas?.parentElement;
    if (!active || !canvas || !foil || !panel) return;

    let cancelled = false;
    const mono = getComputedStyle(canvas).getPropertyValue('--font-mono').trim() || 'monospace';

    const draw = () => {
      if (cancelled) return;
      const width = panel.clientWidth;
      const height = panel.clientHeight;
      drawCardBackArt(canvas, width, height, mono);
      renderCardBackFoilMask(width, height, mono).then((mask) => {
        if (cancelled || !mask) return;
        const layers = `url(${mask}), ${FOIL_POOL}`;
        foil.style.maskImage = layers;
        foil.style.setProperty('-webkit-mask-image', layers);
      });
    };
    const observer = new ResizeObserver(draw);
    observer.observe(panel);
    document.fonts.load(`600 11px ${mono}`).then(draw, () => {});
    const stopTracking = trackFoil(panel, foil);

    return () => {
      cancelled = true;
      observer.disconnect();
      stopTracking();
    };
  }, [active]);

  return (
    <>
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 size-full pointer-events-none" />
      {/* Fully masked (invisible) until the effect supplies the real mask. The
          effect writes mask-image and the position variables straight to the
          element; React never sets them, so a re-render can't reset them. */}
      <div
        ref={foilRef}
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-450 group-hover:opacity-85
          mask-no-repeat mask-[linear-gradient(transparent,transparent)] mask-[100%_100%,100%_100%] mask-intersect"
        style={{ WebkitMaskComposite: 'source-in', ...FOIL_REST }}
      >
        <div
          className="absolute inset-0 saturate-[1.15] brightness-[1.08]"
          style={{ backgroundImage: FOIL_BANDS, backgroundSize: '300% 300%', backgroundPosition: 'var(--foil-x) var(--foil-y)' }}
        />
        <div className="absolute inset-0 mix-blend-overlay opacity-55" style={{ backgroundImage: FOIL_GLARE }} />
      </div>
    </>
  );
}

/* The minted face: milled edge, rim legend, engraved rosette. `id` scopes the
   SVG defs — the deck renders ten of these on one page. */
function CoinFace({ id }: { id: string }) {
  const docs = 'DOCUMENTATION';
  const topArc = `${id}-top`;
  const bottomArc = `${id}-bottom`;

  return (
    <svg viewBox="0 0 200 200" className="absolute inset-0 size-full" aria-hidden="true">
      <defs>
        {/* The top arc runs clockwise so its type stands outward; the bottom arc
            runs counter-clockwise so its type stands upright too. */}
        <path id={topArc} d="M 21 100 A 79 79 0 0 1 179 100" />
        <path id={bottomArc} d="M 13.5 100 A 86.5 86.5 0 0 0 186.5 100" />
      </defs>

      {/* Milled edge: 144 reeds — pathLength normalises the ring so the dashes close evenly */}
      <circle cx="100" cy="100" r="97.75" fill="none" stroke={COIN_MILL_LO} strokeWidth="4.5" />
      <circle cx="100" cy="100" r="97.75" fill="none" stroke={COIN_MILL_HI} strokeWidth="4.5" pathLength={288} strokeDasharray="1 1" />
      <circle cx="100" cy="100" r="95.5" fill={COIN_RIM} />
      <circle cx="100" cy="100" r="93.5" fill="none" stroke={COIN_GOLD} strokeOpacity="0.55" strokeWidth="0.7" />
      <circle cx="100" cy="100" r="71.5" fill="none" stroke={COIN_GOLD} strokeOpacity="0.55" strokeWidth="0.7" />
      <circle cx="100" cy="100" r="70" fill={COIN_FACE} />

      {/* Engraved rosette, placed by rotation so no trig runs during render */}
      <g fill="none" stroke={BACK_INK} strokeWidth="0.6">
        <g strokeOpacity="0.13">
          {COIN_ENGRAVING_ANGLES.map((angle) => (
            <circle key={angle} cx="122.83" cy="100" r="41.3" transform={`rotate(${angle} 100 100)`} />
          ))}
        </g>
        <circle cx="100" cy="100" r="66.3" strokeOpacity="0.22" />
      </g>

      <g fill={BACK_INK} fontSize="9.2" fontWeight="700" letterSpacing="1.9" style={{ fontFamily: 'var(--font-mono)' }}>
        <text>
          <textPath href={`#${topArc}`} startOffset="50%" textAnchor="middle">REGARDED GAMES</textPath>
        </text>
        <text>
          <textPath href={`#${bottomArc}`} startOffset="50%" textAnchor="middle">{docs}</textPath>
        </text>
        <text
          fill={COIN_GOLD}
          className="opacity-0 transition-opacity duration-300 group-hover/mark:opacity-100 group-focus-visible/mark:opacity-100"
        >
          <textPath href={`#${bottomArc}`} startOffset="50%" textAnchor="middle">{docs}</textPath>
        </text>
      </g>

      <circle cx="16.5" cy="100" r="1.6" fill={COIN_GOLD} fillOpacity="0.7" />
      <circle cx="183.5" cy="100" r="1.6" fill={COIN_GOLD} fillOpacity="0.7" />
    </svg>
  );
}

/* ---- Front: what it borrows from the back ----
   The front keeps its own layout and its own theme colour; it takes three
   details from the back, restated in that colour:

   - The header is security-printed: a guilloché band behind it (see
     src/lib/cardFrontArt.ts), faded out under the title.
   - The header symbol is struck as a small coin — the back's milled edge, rim
     rules and engraved rosette at badge size — struck on FRONT_WELL, the same
     ground as the illustration frame and the class box. No glow: at this size
     the halo competed with the symbol. The coin is 40px so the header stays as
     tall as it was with the old square badge, and the reeding is cut to 48 (the
     back's 144 would alias there).

   The header is also the card's destination control, and the coin its sign —
   see headerControl and HeaderCoin. */
const SEAL_ROSETTE_ANGLES = Array.from({ length: 12 }, (_, i) => i * 30);
/* The front's inset ground — the illustration frame, the class box and the
   coin — is the back's stock, so both faces are printed on the same paper.
   Literal like the rest of the back, so it stays dark in light mode too. */
const FRONT_WELL = BACK_STOCK;

/* The fade under the title, left to right, so the band gathers around the coin.
   A mask rather than part of the bitmap, so the per-frame redraw skips it. */
const HEADER_GUILLOCHE_FADE = 'linear-gradient(to right, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.4) 50%, #000 85%)';

/* While `playing`, the band is redrawn every frame as travelling waves (see
   src/lib/cardFrontArt.ts). Stopping freezes it on the current frame, and the
   clock carries on from there next time, so it never jumps. Only the one
   hovered header animates; with reduced motion none do. Redraws on every
   header resize; ResizeObserver fires once on observe, which covers the first
   paint. */
function HeaderGuilloche({ rgb, playing }: { rgb: string; playing: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clockRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const header = canvas?.parentElement;
    if (!canvas || !header) return;

    const draw = () => drawCardHeaderGuilloche(canvas, header.clientWidth, header.clientHeight, rgb, clockRef.current);
    const observer = new ResizeObserver(draw);
    observer.observe(header);

    let frame = 0;
    if (playing && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      let last = performance.now();
      const tick = (now: number) => {
        clockRef.current += (now - last) / 1000;
        last = now;
        draw();
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [rgb, playing]);

  /* rounded-[3px] clips the band to the header's inner corners. */
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 size-full rounded-[3px] pointer-events-none"
      style={{ maskImage: HEADER_GUILLOCHE_FADE, WebkitMaskImage: HEADER_GUILLOCHE_FADE }}
    />
  );
}

/* The coin's rim, shared by both faces: milled edge, the dark rim between two
   rules, and a dot either side. */
function CoinRim({ rgb }: { rgb: string }) {
  const rule = `rgba(${rgb}, 0.55)`;
  return (
    <>
      <circle cx="24" cy="24" r="22.5" fill="none" stroke={`rgba(${rgb}, 0.35)`} strokeWidth="3" />
      <circle cx="24" cy="24" r="22.5" fill="none" stroke={`rgba(${rgb}, 0.85)`} strokeWidth="3" pathLength={96} strokeDasharray="1 1" />
      <circle cx="24" cy="24" r="21" fill={FRONT_WELL} />
      <circle cx="24" cy="24" r="20.2" fill="none" stroke={rule} strokeWidth="0.45" />
      <circle cx="24" cy="24" r="16.6" fill="none" stroke={rule} strokeWidth="0.45" />
      <circle cx="5.4" cy="24" r="0.8" fill={`rgba(${rgb}, 0.7)`} />
      <circle cx="42.6" cy="24" r="0.8" fill={`rgba(${rgb}, 0.7)`} />
    </>
  );
}

/* The manicule — the printer's pointing hand, which on old notes and documents
   means "see there". Struck on the coin's reverse as the "go to" mark: it reads
   as a destination rather than a direction, and it is the same hand the browser
   shows over a link. Drawn as paths in the coin's 48-unit face (not the ☛ glyph,
   which has no consistent font coverage); the knuckle lines are cut in the
   face's ground. */
function Manicule({ color }: { color: string }) {
  return (
    <g transform="translate(12.5 14) scale(0.96)">
      <g style={{ fill: color }}>
        <rect x="0" y="4.2" width="3.2" height="11.6" rx="0.8" />
        <path d="M4.2 6.2 Q4.2 4.6 5.8 4.4 L9.5 3.8 Q11 3.6 12 4.4 L22.4 4.4 Q24 4.4 24 6.1 Q24 7.8 22.4 7.8 L13.6 7.8 L13.6 8.4 Q15.6 8.6 15.6 10.1 Q15.6 11.3 14.6 11.6 Q15.3 12.1 15.3 13.1 Q15.3 14.2 14.3 14.5 Q14.8 15 14.8 15.8 Q14.8 17.4 13.2 17.4 L6.6 17.4 Q4.2 17.4 4.2 15 Z" />
      </g>
      <g fill="none" stroke={FRONT_WELL} strokeWidth="0.7" strokeLinecap="round">
        <path d="M9.6 8.4 L13.6 8.4" />
        <path d="M9.8 11.6 L14.6 11.6" />
        <path d="M9.8 14.5 L14.3 14.5" />
        <path d="M6.2 7.8 Q8.4 7.2 10.6 7.8" />
      </g>
    </g>
  );
}

/* ---- Header coin ----
   The sign on a header that leads somewhere (see headerControl). While the
   header is active — hovered, or its control has keyboard focus — the
   guilloché waves toward the coin and the coin is `turned` over to the
   manicule on its reverse; both run off the one state in HeroCard, so they
   always start and stop together. The coin itself is artwork, not a control:
   the header's control lies over it. A card without a destination gets a coin
   that never turns (`turnable` false). */
function HeaderCoin({
  symbol,
  themeColorRgba,
  highlightColor,
  turnable,
  turned,
}: {
  symbol: React.ReactNode;
  themeColorRgba: string;
  highlightColor: string;
  turnable: boolean;
  turned: boolean;
}) {
  /* Sized to hold its own against the manicule on the reverse: 20px for a
     single glyph; a two-character number ("01") drops to 18px, which keeps it
     inside the face's inner rule. Callers pass bare glyphs — no size of their
     own — so this is the one place the symbol is sized. */
  const symbolSize = typeof symbol === 'string' && symbol.length > 1 ? 'text-[18px]' : 'text-[20px]';

  const obverse = (
    <span className="absolute inset-0 flex items-center justify-center backface-hidden">
      <svg viewBox="0 0 48 48" className="absolute inset-0 size-full" aria-hidden="true">
        <CoinRim rgb={themeColorRgba} />
        <g fill="none" stroke={BACK_INK} strokeWidth="0.35">
          <g strokeOpacity="0.16">
            {SEAL_ROSETTE_ANGLES.map((angle) => (
              <circle key={angle} cx="29.2" cy="24" r="9.4" transform={`rotate(${angle} 24 24)`} />
            ))}
          </g>
          <circle cx="24" cy="24" r="15.2" strokeOpacity="0.22" />
        </g>
      </svg>
      <span className={`relative font-black leading-none ${symbolSize}`} style={{ color: highlightColor }}>
        {symbol}
      </span>
    </span>
  );

  if (!turnable) {
    return <div className="relative size-10 shrink-0">{obverse}</div>;
  }

  return (
    <div className="relative size-10 shrink-0 perspective-[160px]">
      <span
        className={`absolute inset-0 transform-3d transition-transform duration-500 ease-out motion-reduce:transition-none ${
          turned ? 'transform-[rotateY(180deg)]' : ''
        }`}
      >
        {obverse}
        <span aria-hidden="true" className="absolute inset-0 backface-hidden transform-[rotateY(180deg)]">
          <svg viewBox="0 0 48 48" className="absolute inset-0 size-full">
            <CoinRim rgb={themeColorRgba} />
            <Manicule color={highlightColor} />
          </svg>
        </span>
      </span>
    </div>
  );
}

interface HeroCardProps {
  isFlipped: boolean;
  onFlip: () => void;
  
  // Theming
  themeColor: string;           
  themeColorHover?: string;     
  themeColorRgba: string;       
  chassisGradient: string;      
  
  // Content (Made optional to support the bottomBoxSlot custom override)
  headerTag: string;
  title: string;
  symbol: React.ReactNode; 
  classTitle?: string;
  classSymbol?: React.ReactNode;
  classDesc?: string;
  abilities?: { name: string; desc: string }[];
  footerLeftText: string;
  footerMiddleText: string;
  footerTextColor?: string;
  backInfoLink: string;

  /* Header destination — the card's way out to its app surface, taken by
     clicking the header (see headerControl). Supply AT MOST ONE of
     `headerHref` / `headerOnClick`: the href makes the header a real anchor (so
     middle-click / cmd-click / "open in new tab" work and it is
     keyboard-focusable), the handler makes it a button — used when the
     destination is gated and we pop a modal instead of navigating. With
     neither, the header stays inert printed card face and never animates —
     right for a card whose only link is the docs, which the back's coin
     already carries. */
  headerHref?: string;
  headerOnClick?: () => void;
  /** Accessible name for the header control, e.g. "Open Auction". */
  headerLabel?: string;
  
  // Sizing & Events
  maxWidth?: string;
  height?: string;
  imageHeight?: string;
  titleSize?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;

  // New Slots for custom layouts
  actionButtonSlot?: React.ReactNode;
  bottomBoxSlot?: React.ReactNode; // Overrides the default abilities box

  // Slots for custom graphics
  backgroundSlot?: React.ReactNode; 
  illustrationSlot: React.ReactNode; 
}

export default function HeroCard({
  isFlipped,
  onFlip,
  themeColor,
  themeColorHover,
  themeColorRgba,
  chassisGradient,
  headerTag,
  title,
  symbol,
  classTitle = '',
  classSymbol = '',
  classDesc = '',
  abilities = [],
  footerLeftText,
  footerMiddleText,
  footerTextColor,
  backInfoLink,
  headerHref,
  headerOnClick,
  headerLabel,
  maxWidth = '400px',
  height = '580px',
  /* 44%, down from 48%: gives the class box below it ~27px more height for the
     1px-larger body copy. The illustration frame still clears CARD_ICON_H
     (250px) at this ratio on the 675px cards, so no character gets cropped. */
  imageHeight = 'h-[45%]',
  titleSize = 'text-2xl',
  onMouseEnter,
  onMouseLeave,
  actionButtonSlot,
  bottomBoxSlot,
  backgroundSlot,
  illustrationSlot
}: HeroCardProps) {
  const [isCardHovered, setIsCardHovered] = useState(false);
  const highlightColor = themeColorHover || themeColor;

  /* The header's active state plays the guilloché waves and turns the coin (see
     HeaderCoin): pointer over the header, or keyboard focus on its control. Only
     a card with a destination has one, and only while its front is up. Touch
     never hovers — a tap on the header simply goes. */
  const hasDestination = !!headerHref || !!headerOnClick;
  const [headerHovered, setHeaderHovered] = useState(false);
  const [headerFocused, setHeaderFocused] = useState(false);
  const headerActive = hasDestination && !isFlipped && (headerHovered || headerFocused);
  const headerActivityProps = hasDestination
    ? {
        onPointerEnter: (e: React.PointerEvent) => {
          if (e.pointerType !== 'touch') setHeaderHovered(true);
        },
        onPointerLeave: () => setHeaderHovered(false),
        onFocus: (e: React.FocusEvent) => setHeaderFocused(e.target.matches(':focus-visible')),
        onBlur: () => setHeaderFocused(false),
      }
    : {};

  /* ---- Header control ----
     The whole header leads to the card's destination. The control is an empty
     anchor/button stretched over the header rather than a wrapper around it:
     the title is an <h3>, which a <button> may not contain, and this way both
     kinds of control share one shape. It lies over the band, title and coin, so
     a click anywhere on the header goes. stopPropagation keeps the click off
     the card's flip handler, like actionButtonSlot and the back's docs coin. */
  const headerControlProps = {
    /* cursor-pointer explicitly: a <button> takes the browser's default arrow,
       which would override the card's pointer cursor on gated headers. */
    className: 'absolute inset-0 z-20 rounded cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2',
    style: { outlineColor: themeColor },
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      if (headerOnClick) headerOnClick();
    },
    'aria-label': headerLabel,
  };

  let headerControl: React.ReactNode = null;
  if (headerHref) {
    headerControl = <a {...headerControlProps} href={headerHref} target="_blank" rel="noopener noreferrer" />;
  } else if (headerOnClick) {
    headerControl = <button {...headerControlProps} type="button" />;
  }

  /* useId's output carries characters that url(#…) references choke on. */
  const coinId = `coin-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const handleMouseEnter = () => {
    setIsCardHovered(true);
    if (onMouseEnter) onMouseEnter();
  };

  const handleMouseLeave = () => {
    setIsCardHovered(false);
    if (onMouseLeave) onMouseLeave();
  };

  /* ---- Footer strip ----
     Printed identity, inert: nothing here is a control or draws a box of its
     own, so the row keeps sitting on the card's colored border. The right-hand
     label points at the docs coin on the back — a click anywhere on the card
     turns it over, so the hint needs no control of its own. */
  const footerStrip = (
    <div
      className="flex justify-between items-center px-1.5 text-[11px] font-mono rounded opacity-80 pt-1"
      style={{ color: footerTextColor || 'rgba(255, 255, 255, 0.6)' }}
    >
      <span>{footerLeftText}</span>
      <span>{footerMiddleText}</span>
      <span>Docs <span aria-hidden="true">↩</span></span>
    </div>
  );

  return (
    <div 
      className="w-full relative group mx-auto" 
      style={{ perspective: 1200, maxWidth, height }} 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        whileHover={{ y: -6, transition: { duration: 0.3 } }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d" }}
        className="w-full h-full relative cursor-pointer"
        onClick={onFlip}
      >
        {/* ================= FRONT SIDE ================= */}
        {/* `inert` matters as much as pointer-events here: backface-visibility
            hides the turned-away face visually but leaves its links focusable,
            so without this a keyboard user can Tab to an invisible control. */}
        <div
          className={`absolute inset-0 w-full h-full rounded-md ${isFlipped ? 'pointer-events-none' : ''}`}
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transformStyle: 'preserve-3d' }}
          inert={isFlipped || undefined}
        >
          {/* Hides its own backface too. The wrapper above preserves 3D, so this
              layer is placed in the card's 3D space on its own rather than
              flattened into the wrapper, and the wrapper's backface-visibility
              doesn't reach it. Left visible, the turned card keeps this whole
              face mirrored in the back's plane: the back covers it, but the
              front's coloured border and glow bleed through along the
              anti-aliased edges. */}
          <div
            className="flex flex-col h-full w-full rounded-md p-3 relative select-none transition-all duration-500"
            style={{
              backgroundColor: '#070709',
              border: '0px solid #101014',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              boxShadow: isCardHovered
                ? `0 0 40px rgba(${themeColorRgba}, 0.5)`
                : `0 0 40px rgba(${themeColorRgba}, 0.15)`
            }}
          >
            <div
              className="flex flex-col h-full w-full rounded-md p-2.5 justify-between border relative overflow-visible"
              style={{ 
                background: chassisGradient,
                borderColor: `rgba(${themeColorRgba}, 0.55)`, 
                boxShadow: 'inset 0 0 12px rgba(0,0,0,0.6), inset 0 0 3px rgba(255,255,255,0.25)', 
              }}
            >
              <div 
                className="absolute inset-0 pointer-events-none opacity-25 mix-blend-overlay rounded-md"
                style={{ backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)' }}
              />
              <div className="absolute inset-1 border border-black/15 rounded pointer-events-none" />

              <div className="flex flex-col h-full justify-between space-y-2 z-10 overflow-visible">
                
                {/* 1. Header — security-printed, with the symbol struck as a coin
                    (see the front note above HeaderGuilloche), and the card's
                    destination control laid over all of it (see headerControl). */}
                <div
                  className="relative flex justify-between items-center px-4 py-2 rounded border shadow-md transition-colors duration-300"
                  style={{ backgroundColor: 'rgba(12, 12, 15, 0.6)', borderColor: `rgba(${themeColorRgba}, 0.25)` }}
                  {...headerActivityProps}
                >
                  <HeaderGuilloche rgb={themeColorRgba} playing={headerActive} />
                  <div className="relative flex flex-col">
                    <span className="text-[10px] uppercase font-black tracking-widest font-mono" style={{ color: themeColor }}>
                      {headerTag}
                    </span>
                    <h3 className={`${titleSize} font-black tracking-widest leading-tight uppercase text-white`}>
                      {title}
                    </h3>
                  </div>
                  <HeaderCoin
                    symbol={symbol}
                    themeColorRgba={themeColorRgba}
                    highlightColor={highlightColor}
                    turnable={hasDestination}
                    turned={headerActive}
                  />
                  {headerControl}
                </div>

                {/* 2. Character / Graphic Frame */}
                <div 
                  className={`w-full ${imageHeight} border rounded-sm relative overflow-visible flex items-center justify-center shadow-inner`}
                  style={{ backgroundColor: FRONT_WELL, borderColor: `rgba(${themeColorRgba}, 0.3)` }}
                >
                  {backgroundSlot && (
                    <div className="absolute inset-0 z-0 rounded-md overflow-hidden">
                      {backgroundSlot}
                    </div>
                  )}

                  <div className="absolute inset-1 border border-white/5 pointer-events-none rounded z-30" />
                  
                  <div className="absolute top-1 left-1 w-3 h-3 border-t border-l z-30" style={{ borderColor: `rgba(${themeColorRgba}, 0.35)` }} />
                  <div className="absolute top-1 right-1 w-3 h-3 border-t border-r z-30" style={{ borderColor: `rgba(${themeColorRgba}, 0.35)` }} />
                  <div className="absolute bottom-1 left-1 w-3 h-3 border-b border-l z-30" style={{ borderColor: `rgba(${themeColorRgba}, 0.35)` }} />
                  <div className="absolute bottom-1 right-1 w-3 h-3 border-b border-r z-30" style={{ borderColor: `rgba(${themeColorRgba}, 0.35)` }} />

                  {/* Backface-culled wrapper: keeps the illustration/icon flipping WITH the front face.
                      backface-visibility is per-element (not inherited), so the icon layer needs its own
                      flag to be hidden once the card rotates past 90deg. */}
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transformStyle: 'preserve-3d' }}
                  >
                    {illustrationSlot}
                  </div>
                </div>

                {/* 3. Class/Type Box */}
                {bottomBoxSlot ? (
                  bottomBoxSlot
                ) : (
                  <div 
                    className="border rounded-md p-3 flex flex-col gap-2 shadow-sm text-left grow justify-start"
                    style={{ backgroundColor: FRONT_WELL, borderColor: `rgba(${themeColorRgba}, 0.25)` }}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[15px] font-semibold uppercase tracking-wider text-white font-mono">
                        {classTitle}
                      </span>
                      <span className="text-[14px]" style={{ color: highlightColor }}>{classSymbol}</span>
                    </div>
                    {classDesc && (
                      <p className="text-[14px] leading-relaxed italic border-t pt-1.5" style={{ borderColor: '#251F3D', fontFamily: 'var(--font-sans)', color: BOX_BODY_COLOR }}>
                        &ldquo;{classDesc}&rdquo;
                      </p>
                    )}

                    {/* Abilities */}
                    <div className="space-y-1.5 text-left overflow-y-auto pr-1.5 mt-1.5">
                      {abilities.map((ability, index) => (
                        <div key={index}>
                          <span className="font-bold text-[14px] uppercase tracking-wider mr-1" style={{ fontFamily: 'var(--font-display)', color: highlightColor }}>
                            {ability.name}:
                          </span>
                          <span className="text-[14px] leading-relaxed" style={{ fontFamily: 'var(--font-sans)', color: BOX_BODY_COLOR }}>
                            {ability.desc}
                          </span>
                        </div>
                      ))}
                    </div>

                    {actionButtonSlot && (
                      <div 
                        className="mt-auto pt-2.5 w-full z-20"
                        onClick={(e) => e.stopPropagation()} 
                      >
                        {actionButtonSlot}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Footer */}
                {footerStrip}

              </div>
            </div>
          </div>
        </div>

        {/* ================= BACK SIDE ================= */}
        <div
          className={`absolute inset-0 w-full h-full ${!isFlipped ? 'pointer-events-none' : ''}`}
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: "rotateY(180deg)" }}
          inert={!isFlipped || undefined}
        >
          <div
            className="flex flex-col h-full w-full rounded-md p-3 relative select-none transition-all duration-500"
            style={{
              backgroundColor: '#070709',
              border: '0px solid #101014',
              boxShadow: isCardHovered
                ? `0 0 40px rgba(${BACK_GLOW_RGB}, 0.5)`
                : `0 0 40px rgba(${BACK_GLOW_RGB}, 0.15)`
            }}
          >
            <div
              className="flex flex-col h-full w-full rounded-md p-2.5 justify-between border relative overflow-hidden"
              style={{
                background: BACK_CHASSIS,
                borderColor: `rgba(${BACK_GLOW_RGB}, 0.55)`,
                boxShadow: 'inset 0 0 12px rgba(0,0,0,0.6), inset 0 0 3px rgba(255,255,255,0.25)',
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none opacity-25 mix-blend-overlay rounded-md"
                style={{ backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)' }}
              />
              <div className="absolute inset-1 border border-black/15 rounded pointer-events-none" />

              <div
                className="w-full grow rounded-sm border relative overflow-hidden shadow-inner z-10"
                style={{ backgroundColor: BACK_STOCK, borderColor: BACK_EDGE }}
              >
                <CardBackArt active={isFlipped} />

                {/* House wordmark — upright above the coin, on its head below it, so
                    it survives turning the card around. The line-art is erased in a
                    halo around the same centre line (CARD_BACK_WORDMARK_Y). */}
                <span
                  className="absolute inset-x-0 flex justify-center -translate-y-1/2 pl-[0.3em] text-[17px] leading-none font-black uppercase tracking-[0.3em] pointer-events-none"
                  style={{ top: `${CARD_BACK_WORDMARK_Y}px`, fontFamily: 'var(--font-display)', color: BACK_WORDMARK }}
                >
                  Regarded Games
                </span>
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 flex justify-center translate-y-1/2 rotate-180 pl-[0.3em] text-[17px] leading-none font-black uppercase tracking-[0.3em] pointer-events-none"
                  style={{ bottom: `${CARD_BACK_WORDMARK_Y}px`, fontFamily: 'var(--font-display)', color: BACK_WORDMARK }}
                >
                  Regarded Games
                </span>

                {/* The coin — see the deck-back coin note at the top of the file.
                    rounded-full clips hit testing to the circle, so the panel around
                    it stays card: a click there flips, as elsewhere on the back. */}
                <a
                  href={backInfoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Read the docs"
                  className="group/mark absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4"
                  style={{ width: `${COIN_SIZE}px`, height: `${COIN_SIZE}px`, outlineColor: COIN_GOLD }}
                >
                  {/* Glow. Pulses faintly at rest; on hover the pulse is dropped and
                      the glow comes up to full. The pulse runs on the inner layer so
                      the outer one can own the rest/hover level. */}
                  <span
                    aria-hidden="true"
                    className="absolute -inset-4.5 rounded-full pointer-events-none opacity-30 transition-opacity duration-300
                      group-hover/mark:opacity-100 group-focus-visible/mark:opacity-100"
                  >
                    <span
                      className="absolute inset-0 rounded-full blur-xl animate-pulse motion-reduce:animate-none
                        group-hover/mark:animate-none group-focus-visible/mark:animate-none"
                      style={{ background: BACK_SUNSET }}
                    />
                  </span>

                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full pointer-events-none transition-transform duration-300
                      group-hover/mark:scale-[1.06] group-focus-visible/mark:scale-[1.06] group-active/mark:scale-[0.98]"
                  >
                    <CoinFace id={coinId} />
                    <span className="absolute inset-[15%] rounded-full overflow-hidden">
                      <span
                        className="absolute left-1/2 -translate-x-1/2"
                        style={{
                          top: `${PORTRAIT_TOP}px`,
                          height: `${PORTRAIT_HEIGHT}px`,
                          aspectRatio: HEAD_ASPECT,
                          backgroundImage: `url(${HEAD_SRC})`,
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                        }}
                      />
                    </span>
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}