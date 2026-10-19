// src/components/BanknoteButton.tsx
import React, { useEffect, useRef } from 'react';
import { FOIL_REST, trackFoil } from '@/lib/holoFoil';
import { renderNoteCoinRim } from '@/lib/noteButtonArt';

/* ---- Banknote button ----
   The landing's buttons, struck like the hero cards' chassis.

   A note (the default) is a frame of struck metal round a recessed well, with
   the label set in the well. No corner brackets and no field: the frame and
   the well are the whole of its ornament.
   - primary (Secure Your Stake): the frame struck in the sunset under a
     metallic sheen, round a well of the deck's stock, literal so it stays dark
     in both themes. The label is inked in the sunset lifted a step so it holds
     on that stock. It glows in the sunset at rest and brighter on hover.
   - secondary (Docs): the same build struck in pewter round a well of the
     page's card. The label is in the muted (text2) ink and comes up to the
     text colour on hover, with a neutral text2 glow.
   On hover a glint sweeps across the frame; with reduced motion it doesn't.

   `round` makes a coin of stock for an icon (give it an `aria-label`), edged
   with a single thin ring in the muted (text2) ink. It scales with the
   viewport on the notes' curve but smaller, 36px to 44px, with the icon at
   half its size. The icon keeps the label colour. As a primary (the theme
   toggle) it has no glow at rest; hover brings up the stake note's sunset
   glow. Hover turns the ring and the icon to foil under the cursor.

   Unlike the deck back these follow the page theme: every colour but the
   primary's well and label is a theme token, or picked per theme. All of them
   lift on hover, except with reduced motion. */

/* Built from the colour tokens rather than --sunset: that token resolves its
   colours where it's declared, so it would ignore a .dark set below <html>. */
const SUNSET = 'linear-gradient(90deg, var(--color-purple) 0%, var(--color-magenta) 45%, var(--color-orange) 75%, var(--color-gold) 100%)';

/* The note's frame: light and shade struck across the metal, laid over its
   ink (the sunset on the primary). The pewter is the secondary's metal, one
   per theme. The struck edge is a hairline highlight over a soft inner shade. */
const SHEEN =
  'linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(255, 255, 255, 0.36) 28%, rgba(0, 0, 0, 0.06) 52%, rgba(255, 255, 255, 0.3) 76%, rgba(0, 0, 0, 0.32) 100%)';
const PEWTER_LIGHT = 'linear-gradient(135deg, #B3AEC6 0%, #F4F3F8 28%, #CBC6DA 52%, #F4F3F8 76%, #B3AEC6 100%)';
const PEWTER_DARK = 'linear-gradient(135deg, #2A2540 0%, #6E6790 28%, #3A3452 52%, #6E6790 76%, #2A2540 100%)';
const STRUCK_EDGE = {
  primary: 'inset 0 0 0 1px rgba(255, 255, 255, 0.22), inset 0 0 6px rgba(0, 0, 0, 0.45)',
  secondary: 'inset 0 0 0 1px rgba(255, 255, 255, 0.14), inset 0 0 5px rgba(0, 0, 0, 0.35)',
};
/* The cards' paper grain, a touch heavier at this size. */
const TOOTH = 'repeating-linear-gradient(45deg, transparent 0px, transparent 2px, rgba(0, 0, 0, 0.1) 2px, rgba(0, 0, 0, 0.1) 4px)';
/* The primary's well is the deck's stock and its label the sunset lifted a
   step to read on it, both literal like the card faces' wells. */
const WELL_STOCK = '#0D0B14';
const WELL_LABEL = 'linear-gradient(90deg, #B577F2 0%, #F0408A 45%, #FFA833 75%, #FFD447 100%)';

/* The deck back's foil, rescaled to the 36-44px coin: a spectrum cycle every
   70px, bands that slide FOIL_TRAVEL end to end as the cursor crosses the
   coin, and a pool and glare sized to it rather than the card. It takes the
   ring, its mask a touch heavier than print (FOIL_LINE) so the foil reads,
   and the icon. */
const FOIL_BANDS =
  'repeating-linear-gradient(115deg, #FF6FD8 0px, #FFD36E 14px, #9CFF8A 28px, #62E6FF 42px, #8F7BFF 56px, #FF6FD8 70px)';
const FOIL_TRAVEL = { x: 90, y: 40 };
const FOIL_POOL =
  'radial-gradient(circle at var(--foil-glare-x) var(--foil-glare-y), #000 0px, #000 36px, transparent 120px)';
const FOIL_GLARE =
  'radial-gradient(circle at var(--foil-glare-x) var(--foil-glare-y), rgba(255, 255, 255, 0.95) 0px, rgba(255, 255, 255, 0.35) 30px, rgba(255, 255, 255, 0) 80px)';
const FOIL_LINE = 1.4;

function applyMask(element: HTMLElement, layers: string) {
  element.style.maskImage = layers;
  element.style.setProperty('-webkit-mask-image', layers);
}

/* The icon as a mask image: its markup with currentColor struck opaque. */
function iconMask(icon: SVGSVGElement) {
  const copy = icon.cloneNode(true) as SVGSVGElement;
  copy.removeAttribute('class');
  copy.setAttribute('color', '#000');
  return `url("data:image/svg+xml,${encodeURIComponent(new XMLSerializer().serializeToString(copy))}")`;
}

/* Every masked layer starts fully masked (invisible) until the effect supplies
   its mask. The effect writes mask-image straight to the element; React never
   sets it, so a re-render can't reset it. */
const MASKED = 'absolute inset-0 pointer-events-none mask-no-repeat mask-[linear-gradient(transparent,transparent)]';

/* Foil: masked to its shape (the coin's ring or its icon) and to the pool
   round the cursor. Lit at half strength on a primary and fainter on a
   secondary, so it tints the print under it rather than covering it. On the
   light stock the pastel spectrum is pushed deeper so it still reads. */
function Foil({ ref, primary }: { ref: React.Ref<HTMLSpanElement>; primary: boolean }) {
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={`${MASKED} mask-[100%_100%,100%_100%] mask-intersect opacity-0 transition-opacity duration-450 ${
        primary ? 'group-hover:opacity-50' : 'group-hover:opacity-30'
      }`}
      style={{ WebkitMaskComposite: 'source-in', ...FOIL_REST }}
    >
      <span
        className="absolute inset-0 saturate-[1.6] brightness-[0.85] in-[.dark]:saturate-[1.15] in-[.dark]:brightness-[1.08]"
        style={{
          backgroundImage: FOIL_BANDS,
          backgroundSize: `calc(100% + ${FOIL_TRAVEL.x}px) calc(100% + ${FOIL_TRAVEL.y}px)`,
          backgroundPosition: 'var(--foil-x) var(--foil-y)',
        }}
      />
      <span className="absolute inset-0 mix-blend-overlay opacity-55" style={{ backgroundImage: FOIL_GLARE }} />
    </span>
  );
}

export default function BanknoteButton({
  variant,
  round = false,
  onClick,
  'aria-label': ariaLabel,
  children,
}: {
  variant: 'primary' | 'secondary';
  round?: boolean;
  onClick: () => void;
  'aria-label'?: string;
  children: React.ReactNode;
}) {
  const primary = variant === 'primary';
  const buttonRef = useRef<HTMLButtonElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const printRef = useRef<HTMLSpanElement>(null);
  const foilRef = useRef<HTMLSpanElement>(null);
  const rimFoilRef = useRef<HTMLSpanElement>(null);

  /* Round only (a note draws nothing): `foil` is the icon's, and the rim has
     its own. The rim is drawn to the coin's measured size, which follows the
     viewport, so it is redrawn when the coin resizes; `pass` drops a slow
     encode a newer resize has overtaken. The icon's foil takes the icon's
     shape, re-read whenever the icon is swapped (the theme toggle's sun and
     moon). */
  useEffect(() => {
    const button = buttonRef.current;
    const label = labelRef.current;
    const rim = printRef.current;
    const foil = foilRef.current;
    const rimFoil = rimFoilRef.current;
    if (!round || !button || !label || !rim || !foil || !rimFoil) return;

    let cancelled = false;
    let pass = 0;
    const drawRim = () => {
      if (cancelled) return;
      const current = ++pass;
      const stale = () => cancelled || current !== pass;
      const size = button.offsetWidth;
      renderNoteCoinRim(size).then((mask) => {
        if (stale() || !mask) return;
        applyMask(rim, `url(${mask})`);
      });
      renderNoteCoinRim(size, FOIL_LINE).then((mask) => {
        if (stale() || !mask) return;
        applyMask(rimFoil, `url(${mask}), ${FOIL_POOL}`);
      });
    };
    const resizeObserver = new ResizeObserver(drawRim);
    resizeObserver.observe(button);

    const drawIcon = () => {
      const icon = label.querySelector('svg');
      if (icon) applyMask(foil, `${iconMask(icon)}, ${FOIL_POOL}`);
    };
    drawIcon();
    const mutationObserver = new MutationObserver(drawIcon);
    mutationObserver.observe(label, { childList: true, subtree: true });
    const stopTracking = trackFoil(button, foil);
    const stopRim = trackFoil(button, rimFoil);
    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      stopTracking();
      stopRim();
    };
  }, [round]);

  /* A note scales with the viewport over a narrow band, about a third larger
     on a big screen than on a phone (the hero headline doubles): 48px tall up
     to tablet widths, so it stays easy to tap, growing to 64px. The label sets
     the type size and the padding follows it in em; the frame keeps its px, so
     it strikes at the same weight at every size. A round note runs the same
     curve, smaller (36px to 44px), and sizes its icon to half its own size
     over whatever size the icon sets. */
  const shape = round
    ? 'size-[clamp(36px,1.2vw_+_27px,44px)] rounded-full [&_svg]:size-[clamp(18px,0.6vw_+_13.5px,22px)]'
    : `h-[clamp(48px,2.4vw_+_30px,64px)] text-[length:clamp(13px,0.2vw_+_12px,15px)] rounded-[9px] ${primary ? 'px-[3.15em]' : 'px-[2.3em]'}`;
  const halo = round
    ? `rounded-full ${primary ? 'opacity-0 group-hover:opacity-90' : 'bg-text2 opacity-0 group-hover:opacity-40'}`
    : `rounded-[10px] ${primary ? 'opacity-30 group-hover:opacity-85' : 'bg-text2 opacity-0 group-hover:opacity-35'}`;
  const labelInk = round
    ? 'text-text/85 group-hover:text-text'
    : primary
      ? 'bg-clip-text text-transparent'
      : 'text-text2 group-hover:text-text';
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`group relative inline-flex items-center justify-center cursor-pointer ${shape}
        transition-[translate] duration-250 hover:-translate-y-0.5 active:translate-y-px motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:translate-y-0
        focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-text2`}
    >
      {/* Halo: a blurred copy of the button's footprint behind it */}
      <span
        aria-hidden="true"
        className={`absolute inset-1 blur-lg pointer-events-none transition-opacity duration-450 ${halo}`}
        style={primary ? { backgroundImage: SUNSET } : undefined}
      />
      {round ? (
        <>
          {/* Stock, edged with the ring */}
          <span aria-hidden="true" className={`absolute inset-0 rounded-full pointer-events-none ${primary ? 'bg-card2' : 'bg-card'}`} />
          <span ref={printRef} aria-hidden="true" className={`${MASKED} mask-size-[100%_100%] bg-text2 opacity-70`} />
          <Foil ref={rimFoilRef} primary={primary} />
        </>
      ) : (
        <>
          {/* Frame: the metal, struck. The secondary's pewter is picked per
              theme, one layer each. */}
          {primary ? (
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-[9px] pointer-events-none"
              style={{ backgroundImage: `${SHEEN}, ${SUNSET}`, boxShadow: STRUCK_EDGE.primary }}
            />
          ) : (
            <>
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-[9px] pointer-events-none in-[.dark]:hidden"
                style={{ backgroundImage: PEWTER_LIGHT, boxShadow: STRUCK_EDGE.secondary }}
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-[9px] pointer-events-none hidden in-[.dark]:block"
                style={{ backgroundImage: PEWTER_DARK, boxShadow: STRUCK_EDGE.secondary }}
              />
            </>
          )}
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-[9px] pointer-events-none mix-blend-overlay"
            style={{ backgroundImage: TOOTH }}
          />
          {/* Glint: a bar of light swept across the frame on hover. The well
              covers its middle, so it only crosses the metal. */}
          <span aria-hidden="true" className="absolute inset-0 rounded-[9px] overflow-hidden pointer-events-none motion-reduce:hidden">
            <span className="absolute -inset-y-3 -left-22.5 w-14 skew-x-[-22deg] bg-linear-to-r from-white/0 via-white/60 to-white/0 transition-[left] duration-900 group-hover:left-[calc(100%+40px)]" />
          </span>
          {/* Well: recessed into the frame, with a faint bevel inside its edge */}
          <span
            aria-hidden="true"
            className={`absolute inset-1.25 rounded-[5px] border pointer-events-none ${
              primary
                ? 'shadow-[inset_0_0_12px_rgba(0,0,0,0.6),inset_0_0_3px_rgba(255,255,255,0.2)]'
                : 'bg-card border-text2/25 shadow-[inset_0_0_8px_rgba(0,0,0,0.18)]'
            }`}
            style={primary ? { backgroundColor: WELL_STOCK, borderColor: 'rgba(255, 195, 0, 0.25)' } : undefined}
          >
            <span className="absolute inset-0.75 rounded-[3px] border border-white/5" />
          </span>
        </>
      )}
      <span
        ref={labelRef}
        className={`relative flex items-center justify-center font-display font-black leading-none uppercase tracking-[0.12em] whitespace-nowrap transition-colors duration-300 ${labelInk}`}
        style={primary && !round ? { backgroundImage: WELL_LABEL } : undefined}
      >
        {children}
        {round && <Foil ref={foilRef} primary={primary} />}
      </span>
    </button>
  );
}
