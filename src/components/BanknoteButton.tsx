// src/components/BanknoteButton.tsx
import React, { useEffect, useRef } from 'react';
import { FOIL_REST, trackFoil } from '@/lib/holoFoil';
import { NOTE_ROPE, renderNoteButtonBraid } from '@/lib/noteButtonArt';

/* ---- Banknote button ----
   The landing's buttons, printed like the deck back.

   A note (the default) is stock with the rope braid as its edge (see
   src/lib/noteButtonArt.ts) around a label:
   - primary (Secure Your Stake): stock on card2 with a sunset braid. It glows
     in the sunset at rest and brighter on hover, and on hover the braid turns
     to holographic foil under the cursor, as on the deck back.
   - secondary (Docs): stock on card with a muted (text2) braid and no glow at
     rest. Hover prints the braid in the text colour and brings up a neutral
     text2 glow.

   `round` makes a 48px coin of stock for an icon (give it an `aria-label`),
   edged with a plain 2px rim in the muted (text2) ink instead of the braid.
   The icon keeps the label colour. As a primary (the theme toggle) it has no
   glow at rest; hover brings up the stake note's sunset glow and turns the rim
   and the icon to foil under the cursor.

   Unlike the deck back these follow the page theme: every colour is a theme
   token. The braid is a mask the token colours paint through, so a theme
   switch recolours it without redrawing. Both lift on hover, except with
   reduced motion. */

/* Built from the colour tokens rather than --sunset: that token resolves its
   colours where it's declared, so it would ignore a .dark set below <html>. */
const SUNSET = 'linear-gradient(90deg, var(--color-purple) 0%, var(--color-magenta) 45%, var(--color-orange) 75%, var(--color-gold) 100%)';

/* The deck back's foil, rescaled to a 56px-tall button the way the card
   front's footer foil is: a spectrum cycle every 70px, bands that slide
   FOIL_TRAVEL end to end as the cursor crosses the button, and a pool and
   glare sized to the braid rather than the card. Its braid mask is a touch
   heavier than print (FOIL_LINE), so the foil reads. */
const FOIL_BANDS =
  'repeating-linear-gradient(115deg, #FF6FD8 0px, #FFD36E 14px, #9CFF8A 28px, #62E6FF 42px, #8F7BFF 56px, #FF6FD8 70px)';
const FOIL_TRAVEL = { x: 90, y: 40 };
const FOIL_POOL =
  'radial-gradient(circle at var(--foil-glare-x) var(--foil-glare-y), #000 0px, #000 36px, transparent 120px)';
const FOIL_GLARE =
  'radial-gradient(circle at var(--foil-glare-x) var(--foil-glare-y), rgba(255, 255, 255, 0.95) 0px, rgba(255, 255, 255, 0.35) 30px, rgba(255, 255, 255, 0) 80px)';
const FOIL_LINE = 1.1;
/* A round button's rim, as a mask: a 2px ring just inside its edge, feathered
   half a pixel either side so it stays smooth. */
const RIM =
  'radial-gradient(closest-side, transparent calc(100% - 3.5px), #000 calc(100% - 3px), #000 calc(100% - 1px), transparent calc(100% - 0.5px))';

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

/* Foil: masked to its shape (the braid, the rim or the icon) and to the pool
   round the cursor. On the light stock the pastel spectrum is pushed deeper so
   it still reads. */
function Foil({ ref }: { ref: React.Ref<HTMLSpanElement> }) {
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={`${MASKED} mask-[100%_100%,100%_100%] mask-intersect opacity-0 transition-opacity duration-450 group-hover:opacity-85`}
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
  const litRef = useRef<HTMLSpanElement>(null);
  const foilRef = useRef<HTMLSpanElement>(null);
  const rimFoilRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const button = buttonRef.current;
    const label = labelRef.current;
    if (!button || !label) return;
    const foil = primary ? foilRef.current : null;
    const stopTracking = foil ? trackFoil(button, foil) : undefined;

    /* Round: `foil` is the icon's, and the rim has its own. The icon's foil
       takes the icon's shape, re-read whenever the icon is swapped (the theme
       toggle's sun and moon). */
    if (round) {
      const rimFoil = primary ? rimFoilRef.current : null;
      if (!foil || !rimFoil) return stopTracking;
      applyMask(rimFoil, `${RIM}, ${FOIL_POOL}`);
      const draw = () => {
        const icon = label.querySelector('svg');
        if (icon) applyMask(foil, `${iconMask(icon)}, ${FOIL_POOL}`);
      };
      draw();
      const observer = new MutationObserver(draw);
      observer.observe(label, { childList: true, subtree: true });
      const stopRim = trackFoil(button, rimFoil);
      return () => {
        observer.disconnect();
        stopTracking?.();
        stopRim();
      };
    }

    /* Note: re-renders the braid whenever the button resizes, which includes
       the label reflowing once the display face loads. `pass` drops a slow
       encode that a newer resize has already overtaken. */
    let cancelled = false;
    let pass = 0;
    const draw = () => {
      if (cancelled) return;
      const current = ++pass;
      const stale = () => cancelled || current !== pass;
      const width = button.offsetWidth;
      const height = button.offsetHeight;
      renderNoteButtonBraid(width, height).then((mask) => {
        if (stale() || !mask) return;
        for (const layer of [printRef.current, litRef.current]) if (layer) applyMask(layer, `url(${mask})`);
      });
      if (foil) {
        renderNoteButtonBraid(width, height, FOIL_LINE).then((mask) => {
          if (stale() || !mask) return;
          applyMask(foil, `url(${mask}), ${FOIL_POOL}`);
        });
      }
    };
    const observer = new ResizeObserver(draw);
    observer.observe(button);

    return () => {
      cancelled = true;
      observer.disconnect();
      stopTracking?.();
    };
  }, [primary, round]);

  const shape = round ? 'size-12 rounded-full' : `h-14 rounded-md ${primary ? 'px-11' : 'px-8'}`;
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
      {/* Glow: a blurred copy of the button's footprint behind the stock */}
      <span
        aria-hidden="true"
        className={`absolute inset-1 blur-lg pointer-events-none transition-opacity duration-450 ${round ? 'rounded-full' : 'rounded-md'} ${
          primary ? `${round ? 'opacity-0' : 'opacity-40'} group-hover:opacity-90` : 'bg-text2 opacity-0 group-hover:opacity-40'
        }`}
        style={primary ? { backgroundImage: SUNSET } : undefined}
      />
      {/* Stock. On a note it runs under the whole braid, so the braid prints
          on it rather than on the page, with its corner concentric with the
          braid's. */}
      <span
        aria-hidden="true"
        className={`absolute inset-0 pointer-events-none ${primary ? 'bg-card2' : 'bg-card'} ${round ? 'rounded-full' : ''}`}
        style={round ? undefined : { borderRadius: NOTE_ROPE.inset + NOTE_ROPE.radius }}
      />
      {round && (
        <>
          <span
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none bg-text2 opacity-70"
            style={{ maskImage: RIM, WebkitMaskImage: RIM }}
          />
          {primary && <Foil ref={rimFoilRef} />}
        </>
      )}
      {!round && (
        <>
          <span
            ref={printRef}
            aria-hidden="true"
            className={`${MASKED} mask-size-[100%_100%] ${primary ? 'opacity-90' : 'bg-text2 opacity-70'}`}
            style={primary ? { backgroundImage: SUNSET } : undefined}
          />
          {!primary && (
            <span
              ref={litRef}
              aria-hidden="true"
              className={`${MASKED} mask-size-[100%_100%] bg-text opacity-0 transition-opacity duration-300 group-hover:opacity-85`}
            />
          )}
          {primary && <Foil ref={foilRef} />}
        </>
      )}
      <span
        ref={labelRef}
        className="relative flex items-center justify-center font-display font-black text-sm leading-none uppercase tracking-[0.12em] whitespace-nowrap text-text/85 transition-colors duration-300 group-hover:text-text"
      >
        {children}
        {round && primary && <Foil ref={foilRef} />}
      </span>
    </button>
  );
}
