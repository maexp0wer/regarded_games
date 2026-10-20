// src/components/Rulebook.tsx
"use client";

import React, { useState, useEffect, useId, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate, type ValueAnimationTransition } from 'framer-motion';
import { SOCIAL_CHANNELS, type SocialChannel } from '@/config/socials';
import { DiscourseIcon, XIcon, DiscordIcon, TelegramIcon, GithubIcon } from '@/components/icons/SocialIcons';
import { useViewportWidth } from '@/hooks/useViewportWidth';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useHoverFocus } from '@/hooks/useHoverFocus';
import { docsOrigin } from '@/utils/appUrls';
import { CARTOUCHE, COVER_STOCK, drawCoverPlateArt, type PlateHalo, renderCoverFoilMask } from '@/lib/coverPlateArt';
import { FOIL_REST, trackFoil } from '@/lib/holoFoil';
import PowerChamber from '@/components/PowerChamber';
import CampaignTrack, { HalfStruck } from '@/components/CampaignTrack';
import { PEWTER_DARK, STRUCK_EDGE, TOOTH } from '@/components/BanknoteButton';
import {
  ALLOCATIONS,
  COALITIONS,
  SEAT_CAPTION,
  allocationLit,
  coalitionLit,
  sameFocus,
  type ChamberFocus,
} from '@/config/distribution';
import {
  LIVE_PHASE,
  MILESTONES,
  NEXT_MILESTONE,
  PHASES,
  focusedPhase,
  milestonesDone,
  phaseLit,
  sameCampaignFocus,
  type CampaignFocus,
} from '@/config/campaign';

/* Scroll stops the rulebook occupies inside its landing section, back cover
   included — the LAST stop IS the back cover, reached by scrolling on from the
   final content page (there is no click-to-flip). Consumed by the landing
   SECTIONS table so the two can never drift. The single-page phone book runs
   the same stops as the desktop spread: each chapter takes one phone page. */
export const RULEBOOK_PAGES = 4;

/* Docs subdomain base, derived the same way LandingClient + useDocNavigation do:
   the main domain with a `docs.` prefix (e.g. http://docs.localhost:3000 locally,
   https://docs.<domain> in prod). The running-head links render as raw <a href>
   on the main app domain, so a bare "intro#..." would resolve against the app
   domain and 404 — these must be absolute docs URLs. */
const MAIN_DOMAIN = process.env.NEXT_PUBLIC_MAIN_DOMAIN || '';
const DOCS_URL = docsOrigin(MAIN_DOMAIN);

/* Explainer targets for the content pages that have one, reachable from the
   "… ↗" title in their running head. Same destination-link role the header
   plays on the playing cards (HeroCard `headerHref`). The other pages print
   their running head as plain titles: they link nowhere. */
const DOC_LINKS = {
  distribution: `${DOCS_URL}/intro#how-ownership-is-distributed`,
  campaign: `${DOCS_URL}/intro#the-roadmap`,
};

interface RulebookProps {
  /** Section is the active scroll-stop — drives the cover fold + the chamber's roll call. */
  active?: boolean;
  /** Book page from the scroll system (RULEBOOK_PAGES stops, the same at
      every breakpoint): 0 = Distribution, 1 = Campaign, 2 = Links,
      3 = back cover. */
  page?: number;
  /** Live scroll direction: 1 = scrolling down, -1 = scrolling up. Drives the
      slide-in side and the entry/exit backside flash. */
  dir?: 1 | -1;
  /** A deck-rail jump is carrying the reader into or through the book: the
      cover fold and leaf turns run at RULEBOOK_QUICK_TURN_MS for its duration. */
  quick?: boolean;
}

/* Dotted clause leader, rulebook table-of-contents style. */
const DottedLeader = () => (
  <span
    className="flex-1 border-b border-dotted opacity-40 mb-0.75"
    style={{ borderColor: 'var(--color-text2)' }}
  />
);

/* ---- Covers ----
   Struck like the deck back, in literal colours: a cover is a printed object,
   not a themed surface, so nothing on it comes from a token. The plate (the
   vortex, the band, the double rule) is drawn by src/lib/coverPlateArt.ts,
   which also owns the stock (COVER_STOCK); the type and the seal are set here
   over it. */
const COVER_EDGE = '#251F3D';
const COVER_INK = '#9E97BD';
const COVER_WORDMARK = '#D6CFEA';
const COVER_SUNSET = 'linear-gradient(90deg, #9D4EDD 0%, #D81B60 45%, #FF8C00 75%, #FFC300 100%)';

/* The pages are printed on the covers' stock, so the book is one paper from
   cover to cover. */
const PAGE_STOCK = COVER_STOCK;

/* The whole book glows in the sunset, the deck back's halo at twice its rest
   strength, so the dark book stands off the page canvas in either theme.
   Carried by one layer behind the book (see the spread and the mobile stack),
   not by the sheets, so stacked leaves don't add up. */
const BOOK_GLOW = '0 0 48px rgba(255, 140, 0, 0.3)';

/* The cover sheet: stock edge to edge with a hairline edge. Its printed edge
   is the plate's double rule. */
const coverSheet: React.CSSProperties = {
  backgroundColor: COVER_STOCK,
  boxShadow: `inset 0 0 0 1px ${COVER_EDGE}`,
};

/* "Rulebook" is set in the landing hero's stencil (--font-headline, the same
   optical size), inked in the sunset. */
const COVER_TITLE: React.CSSProperties = {
  fontFamily: 'var(--font-headline), var(--font-display)',
  fontOpticalSizing: 'none',
  fontVariationSettings: "'opsz' 36",
  backgroundImage: COVER_SUNSET,
};

/* ---- Cover plate ----
   The printing under each cover's type, drawn to the cover's real size by
   src/lib/coverPlateArt.ts, and only while the book is on screen (the deck
   backs' lazy draw).

   The back's band and edition cartouche are holographic foil, as the deck
   back's frame is: at rest plain print, and while the pointer is on the cover
   the foil catches the light in a pool round the cursor, its bands sliding as
   the pointer crosses the cover. The cover is dark stock in both themes, so the
   spectrum is tuned for dark stock. The front carries no foil. */
const COVER_FOIL_BANDS =
  'repeating-linear-gradient(115deg, #FF6FD8 0px, #FFD36E 24px, #9CFF8A 48px, #62E6FF 72px, #8F7BFF 96px, #FF6FD8 120px)';
const COVER_FOIL_TRAVEL = { x: 160, y: 80 };
const COVER_FOIL_POOL =
  'radial-gradient(circle at var(--foil-glare-x) var(--foil-glare-y), #000 0px, #000 50px, transparent 170px)';
const COVER_FOIL_GLARE =
  'radial-gradient(circle at var(--foil-glare-x) var(--foil-glare-y), rgba(255, 255, 255, 0.9) 0px, rgba(255, 255, 255, 0.3) 52px, rgba(255, 255, 255, 0) 130px)';

function CoverPlate({ active, halos, back = false }: { active: boolean; halos: readonly PlateHalo[]; back?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const foilRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const foil = back ? foilRef.current : null;
    const cover = canvas?.parentElement;
    if (!active || !canvas || !cover) return;

    /* `pass` drops a slow foil encode that a newer resize has overtaken. */
    let cancelled = false;
    let pass = 0;
    const draw = () => {
      if (cancelled) return;
      const current = ++pass;
      const width = cover.clientWidth;
      const height = cover.clientHeight;
      drawCoverPlateArt(canvas, width, height, halos, back);
      if (!foil) return;
      renderCoverFoilMask(width, height).then((mask) => {
        if (cancelled || current !== pass || !mask) return;
        const layers = `url(${mask}), ${COVER_FOIL_POOL}`;
        foil.style.maskImage = layers;
        foil.style.setProperty('-webkit-mask-image', layers);
      });
    };
    const observer = new ResizeObserver(draw);
    observer.observe(cover);
    const stopTracking = foil ? trackFoil(cover, foil) : undefined;

    return () => {
      cancelled = true;
      observer.disconnect();
      stopTracking?.();
    };
  }, [active, halos, back]);

  return (
    <>
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 size-full pointer-events-none" />
      {/* Fully masked (invisible) until the effect supplies the real mask. The
          effect writes mask-image and the position variables straight to the
          element; React never sets them, so a re-render can't reset them. */}
      {back && (
        <div
          ref={foilRef}
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-450 group-hover/cover:opacity-50
            mask-no-repeat mask-[linear-gradient(transparent,transparent)] mask-[100%_100%,100%_100%] mask-intersect"
          style={{ WebkitMaskComposite: 'source-in', ...FOIL_REST }}
        >
          <div
            className="absolute inset-0 saturate-[1.15] brightness-[1.08]"
            style={{
              backgroundImage: COVER_FOIL_BANDS,
              backgroundSize: `calc(100% + ${COVER_FOIL_TRAVEL.x}px) calc(100% + ${COVER_FOIL_TRAVEL.y}px)`,
              backgroundPosition: 'var(--foil-x) var(--foil-y)',
            }}
          />
          <div className="absolute inset-0 mix-blend-overlay opacity-50" style={{ backgroundImage: COVER_FOIL_GLARE }} />
        </div>
      )}
    </>
  );
}

/* Where the front cover's type sits, as a share of the cover — the vortex is
   erased in a soft halo round these so every block prints on clean stock. The
   cover places its blocks at the same shares of its height (top-[12%] and so
   on), so they hold at every size the book is drawn at. The back has none: the
   vortex fills its whole field, and its wordmark, title imprint and band all
   print straight over it (coverPlateArt.ts). */
const FRONT_COVER_HALOS: readonly PlateHalo[] = [
  { cx: 0.5, cy: 0.12, rx: 0.38, ry: 0.055 },  // wordmark
  { cx: 0.5, cy: 0.5, rx: 0.38, ry: 0.22 },    // seal + title block
  { cx: 0.5, cy: 0.87, rx: 0.42, ry: 0.06 },   // printed strip
];
const BACK_COVER_HALOS: readonly PlateHalo[] = [];

/* The house wordmark, set as on the deck back. Smaller below lg, so the back's
   longer title imprint fits a phone-width cover inside its rules. */
function CoverWordmark({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="font-display font-black uppercase leading-none whitespace-nowrap tracking-[0.3em] pl-[0.3em] text-[13px] sm:text-[15px] lg:text-[20px]"
      style={{ color: COVER_WORDMARK }}
    >
      {children}
    </span>
  );
}

/* Engraved divider with a centred lozenge — the printed rule over the front
   cover's strip. */
function CoverRule() {
  return (
    <div className="flex items-center gap-2 w-full">
      <span className="flex-1 h-px" style={{ backgroundColor: COVER_INK, opacity: 0.35 }} />
      <span className="w-1.5 h-1.5 rotate-45" style={{ backgroundColor: COVER_INK, opacity: 0.55 }} />
      <span className="flex-1 h-px" style={{ backgroundColor: COVER_INK, opacity: 0.35 }} />
    </div>
  );
}

/* The Sec. 01 supply split, printed as a struck wheel on the seal's face: the
   five allocations (src/config/distribution.ts) as shares, inked in the
   sunset's run with the smallest in the muted ink, so the wheel reads as one
   engraving. */
const SEAL_SEGMENTS: ReadonlyArray<readonly [number, string]> = [
  [40, '#9D4EDD'],
  [20, '#D81B60'],
  [15, '#FF8C00'],
  [15, '#FFC300'],
  [10, COVER_INK],
];

/* Rosette engraved behind the wheel, placed by rotation so no trig runs during
   render — the deck coins' ring of offset circles at seal scale. */
const SEAL_ROSETTE_ANGLES = Array.from({ length: 18 }, (_, i) => i * 20);

/* ---- Cover seal ----
   Struck as a house coin: the milled edge, rim legend between two rules and
   engraved rosette the deck backs carry (see CoinFace in HeroCard.tsx), with
   the Sec. 01 supply wheel as the device on its face where the deck coin has
   Regardo's portrait. So the book closes on the same object the cards turn
   over to, and its face still previews the shares the rulebook opens on. The
   milled edge is struck in the sunset, the rules and legend in the muted ink.
   The reeding is cut to 72: the deck back's 144 aliases at this size.

   `id` scopes the SVG defs — the desktop spread and the mobile stack can both
   be mounted at once. */
function CoverSeal({ id }: { id: string }) {
  const R = 17;
  const C = 2 * Math.PI * R;
  const sun = `${id}-sun`;
  const topArc = `${id}-top`;
  const bottomArc = `${id}-bottom`;
  let offset = 0;

  return (
    <svg viewBox="0 0 100 100" className="w-[110px] h-[110px] lg:w-[150px] lg:h-[150px] shrink-0" aria-hidden="true">
      <defs>
        <linearGradient id={sun} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100" y2="100">
          <stop offset="0" stopColor="#9D4EDD" />
          <stop offset="0.45" stopColor="#D81B60" />
          <stop offset="0.75" stopColor="#FF8C00" />
          <stop offset="1" stopColor="#FFC300" />
        </linearGradient>
        {/* The top arc runs clockwise so its type stands outward; the bottom arc
            runs counter-clockwise so its type stands upright too. */}
        <path id={topArc} d="M 13.5 50 A 36.5 36.5 0 0 1 86.5 50" />
        <path id={bottomArc} d="M 10 50 A 40 40 0 0 0 90 50" />
      </defs>

      {/* Coin: the rim band, then the face inside the inner rule */}
      <circle cx="50" cy="50" r="47.4" fill="#191426" />
      <circle cx="50" cy="50" r="30" fill="#211B33" />

      {/* Milled edge: 72 reeds — pathLength normalises the ring so the dashes close evenly */}
      <circle cx="50" cy="50" r="45.2" fill="none" stroke={`url(#${sun})`} strokeOpacity="0.3" strokeWidth="3.4" />
      <circle cx="50" cy="50" r="45.2" fill="none" stroke={`url(#${sun})`} strokeOpacity="0.9" strokeWidth="3.4" pathLength={144} strokeDasharray="1 1" />

      {/* Rim: the legend band between two rules, dotted either side */}
      <circle cx="50" cy="50" r="43.2" fill="none" stroke={COVER_INK} strokeOpacity="0.5" strokeWidth="0.7" />
      <circle cx="50" cy="50" r="30" fill="none" stroke={COVER_INK} strokeOpacity="0.5" strokeWidth="0.7" />
      <g
        fill={COVER_INK}
        fillOpacity="0.9"
        fontSize="5.6"
        fontWeight="700"
        letterSpacing="1"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        <text>
          <textPath href={`#${topArc}`} startOffset="50%" textAnchor="middle">REGARDED GAMES</textPath>
        </text>
        <text>
          <textPath href={`#${bottomArc}`} startOffset="50%" textAnchor="middle">RULEBOOK</textPath>
        </text>
      </g>
      <circle cx="6.8" cy="50" r="0.9" fill={COVER_INK} fillOpacity="0.6" />
      <circle cx="93.2" cy="50" r="0.9" fill={COVER_INK} fillOpacity="0.6" />

      {/* Engraved rosette, struck behind the device */}
      <g fill="none" stroke={COVER_INK} strokeWidth="0.4" strokeOpacity="0.2">
        {SEAL_ROSETTE_ANGLES.map((angle) => (
          <circle key={angle} cx="75.5" cy="50" r="5.2" transform={`rotate(${angle} 50 50)`} />
        ))}
      </g>

      {/* Supply wheel — one dashed arc per allocation, struck from 12 o’clock */}
      <g transform="rotate(-90 50 50)" fill="none" strokeWidth="9">
        {SEAL_SEGMENTS.map(([pct, color], i) => {
          const len = (pct / 100) * C - 1.6;
          const arc = (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={R}
              stroke={color}
              strokeDasharray={`${len} ${C - len}`}
              strokeDashoffset={-offset}
            />
          );
          offset += (pct / 100) * C;
          return arc;
        })}
      </g>
      <circle cx="50" cy="50" r="7.5" fill="none" stroke={COVER_INK} strokeWidth="0.7" strokeOpacity="0.55" />
    </svg>
  );
}

/* Front cover — the title page of the bound object BackCoverDesign closes: the
   house wordmark, the struck seal over the title, and a three-part printed
   strip in the same rhythm as the HeroCard footer, each block at a fixed share
   of the cover's height (see FRONT_COVER_HALOS). Sits on the right half of the
   closed desktop spread (edge="right"); on mobile it is the whole page
   (edge="full"). */
function FrontCoverDesign({ active, edge = 'right' }: { active: boolean; edge?: 'right' | 'full' }) {
  /* useId's output carries characters that url(#…) references choke on. */
  const sealId = `seal-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <div
      className={`group/cover relative h-full w-full overflow-hidden select-none ${edge === 'right' ? 'rounded-r-md' : 'rounded-md'}`}
      style={coverSheet}
    >
      <CoverPlate active={active} halos={FRONT_COVER_HALOS} />

      <div className="absolute inset-x-0 top-[12%] -translate-y-1/2 flex justify-center">
        <CoverWordmark>Regarded Games</CoverWordmark>
      </div>

      {/* Title block. pl-[…] on the tracked lines cancels the trailing
          letter-space so they optically centre under the seal. */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3 lg:gap-4">
        <CoverSeal id={sealId} />
        <span
          className="font-black uppercase leading-none tracking-[0.12em] pl-[0.12em] text-[42px] lg:text-[56px] bg-clip-text text-transparent"
          style={COVER_TITLE}
        >
          Rulebook
        </span>
        <span
          className="-mt-1 font-mono text-[9px] lg:text-[10px] font-bold uppercase tracking-[0.3em] whitespace-nowrap pl-[0.3em]"
          style={{ color: COVER_INK }}
        >
          Class War · The Game
        </span>
      </div>

      {/* Printed strip — three-part, same rhythm as the HeroCard footer */}
      <div className="absolute left-[15%] right-[15%] top-[87%] -translate-y-1/2 flex flex-col gap-3">
        <CoverRule />
        <div
          className="flex justify-between items-center font-mono text-[8px] lg:text-[9px] font-bold uppercase tracking-[0.2em]"
          style={{ color: COVER_INK }}
        >
          <span>Vol. I</span>
          <span>Rules of Play</span>
          <span className="tabular-nums">Sec. 01–03</span>
        </div>
      </div>
    </div>
  );
}

/* Section heading row, rulebook style. */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[14px] font-black uppercase tracking-[0.25em] text-text2">{children}</span>
      <div className="border-b border-[var(--color-border2)] opacity-60" />
    </div>
  );
}

/* ---- Campaign index ----
   The track's facing page: the five phases, numbered 1 to 5, each with its
   timeframe, status and milestones completed, lit together with the track
   (src/components/CampaignTrack.tsx). A phase's name prints in the text ink
   once complete, in gold while in progress and in the muted ink while still
   ahead, so the page tells done from not done at a glance. Hovering a row (on
   touch, tapping it) focuses it here and on the track, and the rest dims.

   Beneath the rows, a panel of fixed height lists the milestones of the
   focused phase, or of the phase in progress at rest, so the current
   milestones never need a tap and nothing above the panel reflows. A
   completed milestone is ticked solid (gold in the phase in progress), the
   one in progress is half struck (the coin's mark on the track), and an
   upcoming one is a hollow ring with its label in the muted ink.

   `compact` is the cut for the single-page book, where the index shares the
   page with the track above it: one line per phase over the same panel. */
function phaseInk(phase: number) {
  const { state } = PHASES[phase];
  return state === 'live' ? 'text-gold-hover' : state === 'complete' ? 'text-text' : 'text-text2';
}

function MilestoneTick({ state, live }: { state: 'done' | 'current' | 'open'; live: boolean }) {
  if (state === 'current') {
    return (
      <svg viewBox="-7 -7 14 14" aria-hidden="true" className="block size-3.5 shrink-0 mt-0.75">
        <HalfStruck r={6.2} />
      </svg>
    );
  }
  if (state === 'open') return <span className="size-3.5 rounded-full shrink-0 mt-0.75 border border-border2" />;
  return (
    <span className={`grid place-items-center size-3.5 rounded-full shrink-0 mt-0.75 ${live ? 'bg-gold' : 'bg-text'}`}>
      <svg viewBox="0 0 10 10" className="block size-2" fill="none" stroke={PAGE_STOCK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 5.2 L4.2 7.4 L8 3" />
      </svg>
    </span>
  );
}

function CampaignIndex({
  compact = false,
  focus,
  onHover,
  onLeave,
  onSelect,
}: {
  compact?: boolean;
  focus: CampaignFocus;
  onHover: (focus: CampaignFocus) => void;
  onLeave: () => void;
  onSelect: (focus: CampaignFocus) => void;
}) {
  const row = (target: CampaignFocus) => ({
    onMouseEnter: () => onHover(target),
    onMouseLeave: onLeave,
    onClick: () => onSelect(target),
  });
  const shown = focusedPhase(focus) ?? Math.max(0, LIVE_PHASE);
  const phase = PHASES[shown];
  const first = MILESTONES.findIndex((m) => m.phase === shown);
  const count = (k: number, of = '') =>
    PHASES[k].milestones.length ? `${milestonesDone(k)}/${PHASES[k].milestones.length}${of}` : PHASES[k].status;

  const panel = (
    <div className={`${compact ? 'h-44' : 'h-48 mt-auto'} shrink-0 flex flex-col gap-3 pt-3.5 border-t border-border2`}>
      <div className="flex items-end gap-1.5">
        <span className={`font-mono text-[11px] font-black tabular-nums shrink-0 ${phaseInk(shown)}`}>{phase.n}</span>
        <span className={`font-display font-black text-[13px] uppercase tracking-widest leading-tight shrink-0 ${phaseInk(shown)}`}>{phase.title}</span>
        <DottedLeader />
        <span className="font-mono text-[10px] font-bold tabular-nums shrink-0 text-text2">{count(shown, ' completed')}</span>
      </div>
      {phase.milestones.length ? (
        <ul className="flex flex-col gap-1.75">
          {phase.milestones.map((m, j) => {
            const i = first + j;
            return (
              <li
                key={m.label}
                className={`flex items-start gap-2.5 cursor-default transition-opacity duration-200 ${focus?.kind === 'milestone' && focus.index !== i ? 'opacity-35' : ''}`}
                {...row({ kind: 'milestone', index: i })}
              >
                <MilestoneTick state={m.done ? 'done' : i === NEXT_MILESTONE ? 'current' : 'open'} live={phase.state === 'live'} />
                <span className={`font-sans text-[13px] leading-snug ${m.done || i === NEXT_MILESTONE ? 'text-text' : 'text-text2'}`}>{m.label}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="font-sans text-[13px] leading-relaxed text-text2">{phase.note}</p>
      )}
    </div>
  );

  if (compact) {
    return (
      <div className="flex flex-col gap-4 w-full">
        <div className="flex flex-col gap-2.5">
          {PHASES.map((p, k) => (
            <div
              key={p.title}
              className={`flex items-end gap-1.5 py-0.5 cursor-default transition-opacity duration-200 ${phaseLit(focus, k) ? '' : 'opacity-35'}`}
              {...row({ kind: 'phase', index: k })}
            >
              <span className={`font-mono text-[11px] font-black tabular-nums shrink-0 ${phaseInk(k)}`}>{p.n}</span>
              <span className={`font-display font-black text-[13px] uppercase tracking-widest leading-tight shrink-0 ${phaseInk(k)}`}>{p.title}</span>
              <DottedLeader />
              <span className="font-mono text-[10px] font-bold tabular-nums shrink-0 text-text2">{p.milestones.length ? count(k) : p.when}</span>
            </div>
          ))}
        </div>
        {panel}
      </div>
    );
  }

  return (
    <div className="relative flex flex-col grow gap-4.5 w-full">
      <SectionHeading>Campaign Sequence</SectionHeading>
      <div className="flex flex-col">
        {PHASES.map((p, k) => (
          <div
            key={p.title}
            className={`flex flex-col gap-1.5 cursor-default transition-opacity duration-200 ${k ? 'py-2.75 border-t border-border' : 'pb-2.75'} ${phaseLit(focus, k) ? '' : 'opacity-35'}`}
            {...row({ kind: 'phase', index: k })}
          >
            <div className="flex items-end gap-2">
              <span className={`font-mono text-[11px] font-black uppercase tracking-wider shrink-0 ${p.state === 'live' ? 'text-gold-hover' : 'text-text2'}`}>Phase {p.n}</span>
              <DottedLeader />
              <span className="font-mono text-[11px] font-bold tabular-nums tracking-wider shrink-0 text-text2">{p.when}</span>
            </div>
            <div className="flex items-end gap-2">
              <span className={`font-display font-black text-[15px] uppercase tracking-widest leading-tight shrink-0 ${phaseInk(k)}`}>{p.title}</span>
              <span className={`font-mono text-[10px] font-black uppercase tracking-[0.2em] shrink-0 ${p.state === 'live' ? 'text-gold-hover' : 'text-text2'}`}>{p.status}</span>
              <DottedLeader />
              <span className="font-mono text-[10px] font-bold tabular-nums shrink-0 text-text2 opacity-80">{p.milestones.length ? count(k) : '—'}</span>
            </div>
          </div>
        ))}
      </div>
      {panel}
    </div>
  );
}

/* ---- Book pages ----
   A page follows the theme (the book's dark wrapper keeps it dark in both):
   the card surface edged in the sunset on its outer sides, paper grain and the
   fore-edge stack. No frame inside and no corner brackets — the page is ruled
   the way a book is: a running head ruled off in the sunset at the top, and the
   folio ruled off in the muted ink at the foot, at the page's outer corner. */
type PageSide = 'left' | 'right' | 'single';

/* Built from the colour tokens rather than --sunset: that token resolves its
   colours where it's declared, so it would ignore the book's .dark wrapper. */
const PAGE_SUNSET = 'linear-gradient(90deg, var(--color-purple) 0%, var(--color-magenta) 45%, var(--color-orange) 75%, var(--color-gold) 100%)';
const PAGE_GRAIN = 'repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 3px)';
const FORE_EDGE = 'repeating-linear-gradient(90deg, transparent 0px, transparent 1.5px, rgba(0,0,0,0.22) 1.5px, rgba(0,0,0,0.22) 2.5px)';

/* The book's edge: a sunset border on every side but the spine, heavy enough to
   hold the book's outline against the page canvas behind it. */
const PAGE_EDGE_WIDTH = 1;

/* The page ground (the stock) inside its sunset edge: a transparent border painted by a
   border-box gradient beneath a padding-box fill, which survives the rounded
   corners. On the open spread the sunset runs once across both pages — the
   left page prints its first half, the right page its second — so it doesn't
   restart at the spine. */
function pageSurface(side: PageSide): React.CSSProperties {
  const w = `${PAGE_EDGE_WIDTH}px`;
  const sunset = side === 'single'
    ? `${PAGE_SUNSET} border-box`
    : `${PAGE_SUNSET} ${side === 'left' ? '0%' : '100%'} 0 / 200% 100% border-box`;
  return {
    borderStyle: 'solid',
    borderColor: 'transparent',
    borderWidth: side === 'left' ? `${w} 0 ${w} ${w}` : side === 'right' ? `${w} ${w} ${w} 0` : w,
    background: `linear-gradient(${PAGE_STOCK}, ${PAGE_STOCK}) padding-box, ${sunset}`,
  };
}

/* The running head's title, wired to the page's explainer section in the docs
   where it has one — the same destination-link role the header plays on the
   playing cards (HeroCard `headerHref`): opens the docs in a new tab. Warms to
   gold on hover. The head is pointer-events-none so a click anywhere on the
   page still turns it, so the link re-enables hits on itself (its padding
   widens the target past the small legend type) and stops the click from
   reaching the page-turn handlers, like the card links. */
function HeadDocLink({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="pointer-events-auto inline-block py-2 -my-2 transition-colors duration-200 hover:text-gold-hover focus-visible:text-gold-hover"
    >
      {label} ↗
    </a>
  );
}

/* A book page: the running head (`head`, its two halves), the page's content,
   and the folio. `bodyClassName` sets the content area's padding and scroll;
   the default suits a page of flowing content. */
function PageFace({
  side,
  head,
  folio,
  style,
  bodyClassName = 'overflow-y-auto custom-scrollbar px-6 pt-5 lg:px-8 lg:pt-6',
  children,
}: {
  side: PageSide;
  head: readonly [React.ReactNode, React.ReactNode];
  folio: string;
  style?: React.CSSProperties;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  const radius = side === 'left' ? 'rounded-l-md' : side === 'right' ? 'rounded-r-md' : 'rounded-md';
  return (
    <div className={`relative h-full w-full flex flex-col overflow-hidden ${radius}`} style={{ ...pageSurface(side), ...style }}>
      <div className="absolute inset-0 pointer-events-none opacity-[0.05] mix-blend-overlay" style={{ backgroundImage: PAGE_GRAIN }} />
      {/* Page-edge stack on the fore-edge (the outer edge) */}
      <div
        className={`absolute inset-y-1 ${side === 'left' ? 'left-0' : 'right-0'} w-1.25 pointer-events-none z-10`}
        style={{ backgroundImage: FORE_EDGE }}
      />

      {/* Running head, ruled off in the sunset */}
      <div className="relative z-20 shrink-0 px-6 lg:px-8 pt-5 pointer-events-none">
        <div className="flex justify-between items-center gap-4 font-mono text-[9px] font-bold uppercase tracking-[0.2em] leading-none text-text2 opacity-80">
          <span>{head[0]}</span>
          <span>{head[1]}</span>
        </div>
        <div className="mt-2.25 h-px opacity-75" style={{ backgroundImage: PAGE_SUNSET }} />
      </div>

      <div className={`relative flex flex-col flex-1 min-h-0 ${bodyClassName}`}>{children}</div>

      {/* Folio, ruled off in the muted ink, at the outer corner */}
      <div className="relative shrink-0 px-6 lg:px-8 pt-2 pb-3 pointer-events-none">
        <div className="h-px bg-text2 opacity-[0.22]" />
        <div className={`flex ${side === 'left' ? 'justify-start' : 'justify-end'} pt-2.25 font-mono text-[11px] leading-none tabular-nums text-text2 opacity-80`}>
          {folio}
        </div>
      </div>
    </div>
  );
}

/* Brand mark per channel key, set in the tile's label ink. */
const CHANNEL_ICONS: Record<SocialChannel['key'], React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  discourse: DiscourseIcon,
  x: XIcon,
  discord: DiscordIcon,
  telegram: TelegramIcon,
  github: GithubIcon,
};

/* The landing's secondary (Docs) note's frame, from BanknoteButton. The book
   renders dark in both themes, so it takes the dark pewter alone. */
const CHANNEL_FRAME: React.CSSProperties = { backgroundImage: PEWTER_DARK, boxShadow: STRUCK_EDGE.secondary };

/* One channel tile on the Links page, struck as the Docs note is: the pewter
   frame with the paper tooth, round a recessed card well, and the brand mark
   over the channel name in the muted ink. No call to action is printed on it.

   A channel is live purely on whether its URL exists in socials.ts: the game's
   launch state has nothing to do with a chat server, and a forum or a repo
   open before launch is exactly when the link matters most. A live tile
   answers the pointer as the Docs note does: a glint sweeps the frame, a
   neutral halo comes up behind it, the label comes up to the text ink and the
   tile lifts. It lifts by `top`, not a translate: inside the book's 3D scene
   Chrome stops hit-testing a transformed layer, so a translated tile would
   lose the pointer it is lifting for.

   A pending channel is not a link at all: its frame is struck at half
   strength, its mark is faded, it prints a "Soon" legend under its name, and it
   does nothing under the pointer. On a touch screen, where nothing hovers, the
   legend is what tells the dead tiles from the live one. */
function ChannelTile({ channel, wide }: { channel: SocialChannel; wide: boolean }) {
  const live = channel.href !== '';
  const Icon = CHANNEL_ICONS[channel.key];
  const shape = `relative flex flex-col items-center justify-center gap-2.25 lg:gap-3 h-26 lg:h-[clamp(96px,14vh,140px)] rounded-[9px] ${wide ? 'col-span-2' : ''}`;
  const labelInk = `text-text2 transition-colors duration-300 ${live ? 'group-hover:text-text' : ''}`;

  const face = (
    <>
      {/* Halo: a blurred copy of the tile's footprint behind it */}
      {live && (
        <span
          aria-hidden="true"
          className="absolute inset-1 rounded-[10px] bg-text2 blur-lg opacity-0 transition-opacity duration-450 group-hover:opacity-35 pointer-events-none"
        />
      )}
      {/* Frame: the pewter, struck */}
      <span
        aria-hidden="true"
        className={`absolute inset-0 rounded-[9px] pointer-events-none ${live ? '' : 'opacity-50'}`}
        style={CHANNEL_FRAME}
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-[9px] pointer-events-none mix-blend-overlay"
        style={{ backgroundImage: TOOTH }}
      />
      {/* Glint: swept across the frame on hover; the well covers its middle */}
      {live && (
        <span aria-hidden="true" className="absolute inset-0 rounded-[9px] overflow-hidden pointer-events-none motion-reduce:hidden">
          <span className="absolute -inset-y-3 -left-22.5 w-14 skew-x-[-22deg] bg-linear-to-r from-white/0 via-white/60 to-white/0 transition-[left] duration-900 group-hover:left-[calc(100%+40px)]" />
        </span>
      )}
      {/* Well: recessed into the frame, with a faint bevel inside its edge */}
      <span
        aria-hidden="true"
        className="absolute inset-1.25 rounded-[5px] border bg-card border-text2/25 shadow-[inset_0_0_8px_rgba(0,0,0,0.18)] pointer-events-none"
      >
        <span className="absolute inset-0.75 rounded-[3px] border border-white/5" />
      </span>

      <Icon aria-hidden="true" className={`relative size-6 lg:size-7.5 ${labelInk} ${live ? '' : 'opacity-35'}`} />
      <span className={`relative font-display font-black text-[13px] lg:text-[14px] uppercase leading-none tracking-[0.12em] pl-[0.12em] whitespace-nowrap ${labelInk}`}>
        {channel.label}
      </span>
      {!live && (
        <span className="relative -mt-0.5 font-mono text-[9px] font-bold uppercase leading-none tracking-[0.2em] pl-[0.2em] text-text2">
          Soon
        </span>
      )}
    </>
  );

  if (!live) return <div className={shape}>{face}</div>;
  return (
    <a
      href={channel.href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`group ${shape} cursor-pointer top-0 transition-[top] duration-250 hover:-top-0.5 active:top-px
        motion-reduce:transition-none motion-reduce:hover:top-0 motion-reduce:active:top-0
        focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-text2`}
    >
      {face}
    </a>
  );
}

/* All five channels as tiles, two to a row. Discourse, the house forum, takes
   the top row whole (socials.ts lists it first, so the grid stays closed). The
   desktop spread prints this on its left page (005), the facing page (006) left
   blank for now; the phone book prints it on its own page. The lg: steps on the
   tile size it for the spread. */
const commsContent = (
  <div className="flex flex-col flex-grow gap-4 w-full">
    <SectionHeading>Sec. 03 — Links</SectionHeading>
    <div className="grid grid-cols-2 gap-2.5 lg:gap-3.5 pt-1">
      {SOCIAL_CHANNELS.map((c) => (
        <ChannelTile key={c.key} channel={c} wide={c.key === 'discourse'} />
      ))}
    </div>
  </div>
);

/* Backside of the book — the plate that closes it: the house wordmark at the
   head, the title imprint at the foot, and across the middle the guilloché
   band carrying the edition cartouche, both lit as holographic foil under the
   pointer. The back carries no links and no seal. On desktop this is the back
   face of the last right leaf, landing on the left half (edge="left"); on
   mobile it is the full single back page (edge="full"). */
function BackCoverDesign({ active, edge = 'left' }: { active: boolean; edge?: 'left' | 'full' }) {
  return (
    <div
      className={`group/cover relative h-full w-full overflow-hidden select-none ${edge === 'left' ? 'rounded-l-md' : 'rounded-md'}`}
      style={coverSheet}
    >
      <CoverPlate active={active} halos={BACK_COVER_HALOS} back />

      <div className="absolute inset-x-0 top-[13%] -translate-y-1/2 flex justify-center">
        <CoverWordmark>Regarded Games</CoverWordmark>
      </div>

      {/* The edition cartouche: the plate prints its frame, centred on the
          cover; this is its type, set in the same box. Purely decorative, so it
          never takes the pointer. */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none
          font-mono text-[12px] font-bold uppercase tracking-[0.3em] whitespace-nowrap"
        style={{ width: CARTOUCHE.width, height: CARTOUCHE.height, color: COVER_WORDMARK }}
      >
        <span className="pl-[0.3em]">First Edition</span>
      </div>

      <div className="absolute inset-x-0 top-[87%] -translate-y-1/2 flex justify-center">
        <CoverWordmark>Class War · The Game</CoverWordmark>
      </div>
    </div>
  );
}

/* The closed book slides in from the right before anything else happens; the
   cover fold and the chamber's roll call both wait out this slide. */
const SLIDE_IN_S = 0.6;
const SLIDE_OUT_S = 0.7;
const SLIDE_IN_MS = SLIDE_IN_S * 1000;

/* Desktop cover fold: it waits out the slide-in plus a short hold, then swings
   open around the spine. */
const COVER_FOLD_DELAY_S = 0.25;
const COVER_FOLD_S = 1.05;

/* Leaf turn duration — shared by scroll page-flips and the backside flips so
   every page-turn reads identically. */
const RULEBOOK_TURN_MS = 1000;

/* Turn duration of a deck-rail jump (the `quick` prop). A reader who picked a
   page off the rail wants that page, so the cover and the leaves turn briskly
   on the way there; the slide-in and the hold before the fold keep their usual
   tempo. `RULEBOOK_QUICK_OPEN_MS` runs from the book going active to its cover
   lying flat on the desktop spread: the earliest moment a leaf can turn
   without landing on a closed book. */
export const RULEBOOK_QUICK_TURN_MS = 550;
export const RULEBOOK_QUICK_OPEN_MS = SLIDE_IN_MS + COVER_FOLD_DELAY_S * 1000 + RULEBOOK_QUICK_TURN_MS;

/* Desktop leaf stacking is by depth, not z-index: the whole spread is one
   `preserve-3d` scene (so z-index is ignored), and each leaf's NON-rotating
   wrapper carries a `translateZ` slot. Depth lives on the wrapper, not the
   rotating leaf, so a turn past 90° never flips on-top to on-bottom. Order maps
   from the old z-index values (leaf3 25 < leaf2 30 < backside-on-top 35; cover
   sunk 20 < cover raised 50). A few px is plenty under perspective 2200. */
/* Shared-scene perspective (must match the spread container's `perspective`). */
const SCENE_PERSPECTIVE = 2200;

/* Depth slots for the desktop leaf stack. Stacking is by translateZ (z-index is
   ignored under preserve-3d). With the counter-scale taken about the spine (see
   `depth`) a slot moves nothing on screen; the order is all that matters for
   sorting, and compositor transforms sort sub-pixel deltas. */
const Z_LEAF4 = 0.75;     // comms/backside leaf, resting (deepest right leaf)
const Z_LEAF3 = 1;        // campaign-index/comms-left leaf, resting (under leaf2)
const Z_LEAF2 = 2;        // Sec01/campaign-track leaf
const Z_LEAF3_TOP = 3;    // leaf3 lifted while turned past leaf2 (comms spread)
const Z_BACK_TOP = 4;     // backside leaf (leaf4) lifted on top of the stack
const Z_COVER_DOWN = 0.5; // cover sunk flat under the right leaves
const Z_COVER_UP = 6;     // cover closed / opening, above everything
const Z_SEAM = 0.25;      // the stock backing the spine seam, under every leaf
const Z_GLOW = 0;         // the book's glow, flat under every leaf

/* Depth transform: push to depth z AND counter-scale by (P-z)/P so the page's
   APPARENT size is constant at every depth — without this, a leaf pushed toward
   the viewer (higher z) renders larger and visibly "grows" as it changes depth
   during a turn. The two cancel: perspective magnifies by P/(P-z), the scale
   shrinks by (P-z)/P. Alone it suits only a layer centred on the spine (the
   spine, the seam, the glow at z 0), whose own centre is the perspective
   origin. */
const tz = (z: number) => `translateZ(${z}px) scale(${(SCENE_PERSPECTIVE - z) / SCENE_PERSPECTIVE})`;

/* A half's depth wrapper. The magnification and the counter-scale cancel only
   about the perspective origin — the spine — so the scale is taken about the
   wrapper's spine edge. About its own centre, a page would slide sideways with
   its depth (by about a quarter-spread × z/(P-z)), and two facing pages at
   different depths would part at the spine, the canvas showing through. */
const depth = (z: number, half: 'left' | 'right'): React.CSSProperties => ({
  transform: tz(z),
  transformOrigin: half === 'left' ? 'right center' : 'left center',
});

/* Where a turning leaf's free edge falls on screen, in leaf widths from the
   spine (+ right, − left), for a leaf `leafPx` wide turned `deg` about the
   spine (rotateY; 0 lies flat on the right, −180 on the left). The edge moves
   by the cosine of the turn, not in step with it: it hardly moves while the
   leaf leaves and meets the page, and sweeps across through the middle,
   where the leaf stands up toward the viewer and the scene's perspective
   swings it further out. The book's glow follows this, not the angle. */
function leafEdge(deg: number, leafPx: number) {
  const a = (deg * Math.PI) / 180;
  return Math.cos(a) / (1 + (leafPx / SCENE_PERSPECTIVE) * Math.sin(a));
}
const glowPct = (n: number) => `${Number(n.toFixed(3))}%`;

/* Cover hold + book fold first; the chamber's roll call begins as the page
   settles flat. */
const CALL_DELAY_MS = 1250;
/* How long leaving a target waits before the chamber or the track settles
   back to rest: long enough to cross the aisle, or the gap between two index
   rows, without flashing the resting readout. */
const FOCUS_LEAVE_MS = 180;

/* A phone page's turn, which the track's coin waits out before it glides. */
const M_TURN_MS = 900;

/* Mobile fold-away pose: instead of vanishing at 90°, a turned page swings 270°
   around its left edge onto the BACK of the book, staying visible the whole spin
   (single-faced, no backface-hidden). It's on top while spinning, then drops
   behind the back cover where it rests fully hidden. */
const M_FOLD_DEG = -270; // ¾ turn, coming to rest flat on the back
/* Angle past which a folding leaf has cleared the now-top page and drops behind.
   Set short of the -270 fold target (not equal) so float precision can't leave a
   leaf that settles at -269.99 stuck in front. The drop is driven off the live
   rotation (see useFoldLeaf) so it switches on the exact frame the leaf crosses
   this angle — a React-state flip lagged a frame or two, briefly painting the
   leaf back in front of the active page. */
const M_FOLD_BEHIND_DEG = -200;

/* Drives one mobile leaf's fold, frame-accurately. rotateY is an animated
   MotionValue; zIndex is DERIVED from it (useTransform), so it switches on the
   same compositor frame the leaf crosses M_FOLD_BEHIND_DEG — no React render
   lag, hence no flash of the leaf in front of the active page. Folded leaves
   rest fully behind the (opaque) back cover, so nothing peeks on the left.
   `topZ`/`behindZ` are the leaf's z while spinning-on-top / settled-behind. */
function useFoldLeaf(
  away: boolean,
  transition: React.ComponentProps<typeof motion.div>['transition'],
  topZ: number,
  behindZ: number,
) {
  const rotateY = useMotionValue(0);
  useEffect(() => {
    const controls = animate(rotateY, away ? M_FOLD_DEG : 0, transition as ValueAnimationTransition<number>);
    return () => controls.stop();
    // transition identity changes each render; gate on the actual target so we
    // don't restart the tween every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [away]);
  const zIndex = useTransform(rotateY, (r) => (r <= M_FOLD_BEHIND_DEG ? behindZ : topZ));
  return { rotateY, zIndex };
}

/* A sub-allocation as the index prints it, under its allocation. */
function SubAllocationRow({ name, share, color }: { name: string; share: number; color: string }) {
  return (
    <div className="flex items-end gap-1.5">
      <span className="size-1.5 rounded-full shrink-0 mb-0.75" style={{ backgroundColor: color }} />
      <span className="font-mono text-[13px] uppercase tracking-wider text-text2 leading-tight">{name}</span>
      <DottedLeader />
      <span className="font-mono text-[13px] tabular-nums shrink-0 text-text2">{share}%</span>
    </div>
  );
}

/* ---- Distribution index ----
   The chamber's facing page: each coalition with its allocations beneath it,
   lit together with the chamber. Hovering a row (on touch, tapping it)
   focuses it here and in the chamber, and the rest dims, and the focused row
   opens in place to its explanation, an allocation's to its sub-allocations
   too.

   `compact` is the cut for the single-page book, where the index shares the
   page with the chamber under it: a coalition per line with its allocations
   set as one wrapped line of chips, and the focused item's explanation in a
   panel beneath. A pin keeps only its own coalition on the list: the dimmed
   one folds away and the panel takes its room, which the longest terms (an
   allocation and its sub-allocations) need. The index's height is held by an
   invisible copy of its resting layout, so the chamber above never reflows. A
   tap on the panel (or its ✕) closes a pin. At rest the panel says how to
   read the chamber, in a phone's terms: a tap. A hover never folds the list:
   the row under the pointer would move out from under it. */
function DistributionIndex({
  compact = false,
  focus,
  pinned,
  onHover,
  onLeave,
  onSelect,
  onClear,
}: {
  compact?: boolean;
  focus: ChamberFocus;
  pinned: boolean;
  onHover: (focus: ChamberFocus) => void;
  onLeave: () => void;
  onSelect: (focus: ChamberFocus) => void;
  onClear: () => void;
}) {
  const row = (target: ChamberFocus) => ({
    onMouseEnter: () => onHover(target),
    onMouseLeave: onLeave,
    onClick: () => onSelect(target),
  });

  if (compact) {
    const detail = !focus
      ? null
      : focus.kind === 'allocation'
        ? ALLOCATIONS[focus.index]
        : { ...COALITIONS[focus.index], ink: null, subs: [] };
    /* The coalition lines in the given order, the first without its rule. */
    const coalitionLines = (order: number[]) => (
      <div className="flex flex-col gap-2.5">
        {order.map((k, n) => {
          const c = COALITIONS[k];
          const first = ALLOCATIONS.findIndex((a) => a.coalition === k);
          return (
            <div key={c.name} className={`flex flex-col gap-1.5 ${n ? 'pt-2.5 border-t border-border' : ''}`}>
              <div className={`flex items-end gap-1.5 cursor-default transition-opacity duration-200 ${coalitionLit(focus, k) ? '' : 'opacity-35'}`} {...row({ kind: 'coalition', index: k })}>
                <span className="font-display font-black text-[13px] uppercase tracking-widest leading-tight text-text">{c.name}</span>
                <DottedLeader />
                <span className="font-mono font-bold text-[15px] tabular-nums shrink-0 text-text">{c.share}%</span>
              </div>
              <div className="flex flex-wrap gap-x-4">
                {c.allocations.map((a, j) => {
                  const i = first + j;
                  return (
                    <span
                      key={a.name}
                      className={`inline-flex items-center gap-1.5 py-1 cursor-default transition-opacity duration-200 ${allocationLit(focus, i) ? '' : 'opacity-35'}`}
                      {...row({ kind: 'allocation', index: i })}
                    >
                      <span className="size-1.75 rounded-full shrink-0" style={{ backgroundColor: a.ink }} />
                      <span className="font-mono text-[11px] uppercase tracking-wider leading-none text-text">{a.short}</span>
                      <span className="font-mono text-[11px] tabular-nums leading-none text-text2">{a.share}%</span>
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
    const all = COALITIONS.map((_, k) => k);
    const listed = pinned ? all.filter((k) => coalitionLit(focus, k)) : all;
    return (
      <div className="relative w-full">
        <div aria-hidden="true" className="invisible flex flex-col gap-4">
          {coalitionLines(all)}
          <div className="h-44" />
        </div>
        <div className="absolute inset-0 flex flex-col gap-4">
          {coalitionLines(listed)}

          <div
            className="flex-1 min-h-0 flex flex-col gap-2 pt-3 border-t border-border overflow-y-auto custom-scrollbar"
            onClick={pinned ? onClear : undefined}
          >
            {detail ? (
              <>
                <div className="flex items-end gap-1.5">
                  {detail.ink && <span className="size-1.75 rounded-full shrink-0 mb-1" style={{ backgroundColor: detail.ink }} />}
                  <span className="font-display font-black text-[13px] uppercase tracking-widest leading-tight text-text">{detail.name}</span>
                  <DottedLeader />
                  <span className="font-mono font-bold text-[15px] tabular-nums shrink-0 text-text">{detail.share}%</span>
                  {pinned && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onClear(); }}
                      aria-label="Close"
                      className="font-mono text-[13px] leading-none shrink-0 mb-px px-1 text-text2 hover:text-text transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <p className="font-sans text-[13px] text-text2 leading-relaxed">{detail.explanation}</p>
                {detail.subs.length > 0 && (
                  <div className="flex flex-col gap-1.25 pt-1">
                    {detail.subs.map((sub) => <SubAllocationRow key={sub.name} {...sub} />)}
                  </div>
                )}
              </>
            ) : (
              <p className="m-auto font-mono text-[10px] uppercase tracking-[0.14em] text-center text-text2 opacity-75">
                Tap a coalition or an allocation to read its terms
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col grow gap-4.5 w-full">
      <SectionHeading>Distribution of Power</SectionHeading>
      {COALITIONS.map((c, k) => {
        const first = ALLOCATIONS.findIndex((a) => a.coalition === k);
        const open = focus?.kind === 'coalition' && focus.index === k;
        return (
          <div key={c.name} className={`flex flex-col gap-2.75 ${k ? 'pt-4 border-t border-border' : ''}`}>
            <div className={`cursor-default transition-opacity duration-200 ${coalitionLit(focus, k) ? '' : 'opacity-35'}`} {...row({ kind: 'coalition', index: k })}>
              <div className="flex items-end gap-1.5">
                <span className="font-display font-black text-[14px] uppercase tracking-widest leading-tight text-text">{c.name}</span>
                <DottedLeader />
                <span className="font-mono font-bold text-[17px] tabular-nums shrink-0 text-text">{c.share}%</span>
              </div>
              {open && <p className="mt-1.5 font-sans text-[14px] text-text2 leading-relaxed">{c.explanation}</p>}
            </div>
            <div className="flex flex-col gap-2.25">
              {c.allocations.map((a, j) => {
                const i = first + j;
                const opened = focus?.kind === 'allocation' && focus.index === i;
                return (
                  <div key={a.name} className={`cursor-default transition-opacity duration-200 ${allocationLit(focus, i) ? '' : 'opacity-35'}`} {...row({ kind: 'allocation', index: i })}>
                    <div className="flex items-end gap-1.5">
                      <span className="size-1.75 rounded-full shrink-0 mb-0.75" style={{ backgroundColor: a.ink }} />
                      <span className="font-mono text-[13px] uppercase tracking-wider leading-tight text-text">{a.name}</span>
                      <DottedLeader />
                      <span className="font-mono text-[13px] tabular-nums shrink-0 text-text">{a.share}%</span>
                    </div>
                    {opened && (
                      <div className="flex flex-col gap-1.5 mt-1.5 pl-3.25">
                        <p className="font-sans text-[14px] text-text2 leading-relaxed">{a.explanation}</p>
                        {a.subs.map((sub) => <SubAllocationRow key={sub.name} {...sub} />)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const Rulebook: React.FC<RulebookProps> = ({ active = false, page: pageProp = 0, dir = 1, quick = false }) => {
  /* The chamber's focus and the track's, each shared by a figure and its
     index: a pointer focuses what it is over, a tap pins it (useHoverFocus). */
  const chamberFocus = useHoverFocus<NonNullable<ChamberFocus>>(sameFocus, FOCUS_LEAVE_MS);
  const campaignFocus = useHoverFocus<NonNullable<CampaignFocus>>(sameCampaignFocus, FOCUS_LEAVE_MS);
  const { focus, pinned, hover: hoverFocus, leave: leaveFocus, select: selectFocus, clear: clearSelection } = chamberFocus;
  const clearCampaign = campaignFocus.clear;

  /* The book's backside is the section's FINAL scroll stop, not a click target:
     the last content page turns on to it and scrolling back up turns it home. */
  const bp = useBreakpoint();
  const belowLg = bp === 'xs' || bp === 'sm' || bp === 'md';

  /* Once the book has slid off-screen after an exit it is `parked` (see the
     repark effect below), and a parked book rests shut on its first page,
     whatever page the scroll system last left it on. A deck-rail jump can carry
     the reader out from any page, back cover included, and a book left open
     would come back already open — or turn its leaves home in view. Parking
     settles it instantly while nobody can see it, so every entrance starts from
     the closed cover. */
  const [parkedRight, setParkedRight] = useState(false);
  const parked = parkedRight && !active;
  const page = parked ? 0 : pageProp;
  const backPage = RULEBOOK_PAGES - 1;
  const pageBack = page >= backPage;

  /* The direction the book LEAVES in is frozen the instant it deactivates —
     later `dir` flips (the scroll system stepping between other sections) must
     not retarget a parked book. Mirrors CardThrow's exitDir pattern. */
  const [exitDir, setExitDir] = useState<1 | -1>(1);
  const [prevActive, setPrevActive] = useState(active);
  /* Until the book has been active once it sits parked off-screen right (hidden)
     so its first entrance always slides in rather than fading from center. */
  const [everActive, setEverActive] = useState(active);

  /* Scroll-driven backside flash, distinct from the backside scroll stop:
       enter-up   — the book lands showing its back, then turns to Sec 02.
       exit-down  — the book flashes its back, then slides off to the left.
     `flashBack` turns the same leaves as the backside stop does; `exiting`
     gates the slide so it waits for that flash. */
  const [flashBack, setFlashBack] = useState(false);
  const [exiting, setExiting] = useState(false);
  /* On an up-entrance the leaves must START on the back (no front→back turn) so
     only the backside shows, then turn open to Sec 02. While this is true the
     turn TO the back is instant; the turn back to the page animates. */
  const [enteredUp, setEnteredUp] = useState(false);
  /* Parking (below) shuts the book once its exit slide has landed. A reader who
     comes straight back before then finds the leaves still on the page they
     left, so a down-entrance also snaps them to the page it enters on —
     instantly, while the book is still off-screen — instead of turning them
     home in view. Held for a beat, just long enough to commit. */
  const [snapLeaves, setSnapLeaves] = useState(false);

  /* z-choreography for the cover leaf: it must stay above the whole right
     stack while the book is closed AND during the opening fold — dropping it
     at the instant `active` flips would hide the cover behind the right-page
     leaves before it ever moves. It sinks under the stack only once it lies
     flat (fold complete), so turned pages can land on top of it. Declared above
     the render-time transition block, which pre-sinks it on enter-up. */
  const [coverDown, setCoverDown] = useState(active);

  const TURN_MS = quick ? RULEBOOK_QUICK_TURN_MS : RULEBOOK_TURN_MS;
  /* Brief beat the fully-turned back lingers before the book resolves (turns to
     its page on entry, or slides away on exit). */
  const FLASH_HOLD_MS = 300;

  /* Phase timers fire AFTER the active flip to advance time-delayed stages
     (hold→open on enter-up; flash→slide on exit-down). The instantaneous truth
     of each phase is set in the render-time transition block below — never here
     — so frame 1 of any entrance is already correct (no paint race). */
  const flashTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearFlashTimers = () => {
    flashTimersRef.current.forEach(clearTimeout);
    flashTimersRef.current = [];
  };

  /* ---- Render-time entrance/exit transition ----
     Runs during render the instant `active` flips, so the values the leaves and
     slide read are committed on the SAME render — eliminating the effect-vs-paint
     race that flashed the front face on up-entrance. Only timers are deferred. */
  if (active !== prevActive) {
    setPrevActive(active);
    clearFlashTimers();
    if (active) {
      setEverActive(true);
      setExiting(false);
      if (dir === -1) {
        /* Enter-up: appear showing ONLY the back (instant turn), hold, then turn
           open to Sec 02. Cover is pre-opened + sunk so no cover-fold shows. */
        setEnteredUp(true);
        setFlashBack(true);
        setCoverDown(true);
        flashTimersRef.current.push(
          setTimeout(() => { setFlashBack(false); setEnteredUp(false); }, SLIDE_IN_MS + FLASH_HOLD_MS)
        );
      } else {
        /* Enter-down: normal cover-open fold to Sec 01, no backside flash. */
        setEnteredUp(false);
        setFlashBack(false);
        setSnapLeaves(true);
        flashTimersRef.current.push(setTimeout(() => setSnapLeaves(false), 50));
      }
    } else {
      /* Leaving: freeze the exit direction, then set the exit phase. */
      setExitDir(dir);
      setEnteredUp(false);
      if (dir === 1) {
        /* Exit-down: turn the leaves to the back, hold, then slide off left. */
        setFlashBack(true);
        setExiting(false);
        flashTimersRef.current.push(
          setTimeout(() => setExiting(true), TURN_MS + FLASH_HOLD_MS)
        );
      } else {
        /* Exit-up: just slide back off to the right, no flash. */
        setFlashBack(false);
        setExiting(false);
      }
    }
  }

  /* Clear any pending phase timers on unmount. */
  useEffect(() => clearFlashTimers, []);

  /* Either trigger shows the backside: the terminal scroll stop, or the
     entry/exit flash. */
  const backShown = pageBack || flashBack;

  /* True from the moment the book turns to the backside until the backside
     leaf (leaf4) has finished flipping home again — keeps that leaf painted on
     top of the stack for the whole round trip. Since the back is reached only
     from the page immediately before it, exactly ONE leaf ever turns per stop:
     no cascade to stagger. */
  const [leaf4OnTop, setLeaf4OnTop] = useState(false);
  useEffect(() => { if (backShown) setLeaf4OnTop(true); }, [backShown]);

  /* leaf3 is painted above leaf2 whenever it is turned (comms spread or the
     backside) — its back (005) must cover leaf2's turned back (003) on the
     left half; dropped once it has turned fully home (leaf3
     onAnimationComplete). */
  const leaf3Turned = page >= 2 || backShown;
  const [leaf3OnTop, setLeaf3OnTop] = useState(false);
  useEffect(() => { if (leaf3Turned) setLeaf3OnTop(true); }, [leaf3Turned]);

  /* A page flip drops any focus — it belongs to its figure's page alone, and
     must not ride along to the next one. */
  useEffect(() => { clearSelection(); clearCampaign(); }, [page, active, clearSelection, clearCampaign]);

  /* The chamber stands empty while the book opens; its roll call begins once
     the page has settled flat, and each entry calls it again. Only the book
     on screen (the spread or the single page) plays it. */
  const [calling, setCalling] = useState(false);
  useEffect(() => {
    if (!active) {
      setCalling(false);
      return;
    }
    const timer = setTimeout(() => setCalling(true), SLIDE_IN_MS + CALL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [active]);

  /* The track's coin waits at the head of the track until its page lies flat:
     the leaf turned to Sec. 02 on the spread, the page above it folded away on
     a phone. Then it glides once, and rests there for the rest of the visit;
     the next entry starts it at the head again. */
  const campaignShown = active && page === 1 && !backShown;
  const [campaignPlay, setCampaignPlay] = useState(false);
  useEffect(() => {
    if (!active) {
      setCampaignPlay(false);
      return;
    }
    if (!campaignShown) return;
    const timer = setTimeout(() => setCampaignPlay(true), belowLg ? M_TURN_MS : TURN_MS);
    return () => clearTimeout(timer);
  }, [active, campaignShown, belowLg, TURN_MS]);

  /* `compact`: the single-page book's cuts (see PowerChamber, DistributionIndex). */
  const chamber = (play: boolean, compact = false) => (
    <PowerChamber play={play} compact={compact} focus={focus} onHover={hoverFocus} onLeave={leaveFocus} onSelect={selectFocus} />
  );
  const distributionIndex = (compact = false) => (
    <DistributionIndex
      compact={compact}
      focus={focus}
      pinned={pinned !== null}
      onHover={hoverFocus}
      onLeave={leaveFocus}
      onSelect={selectFocus}
      onClear={clearSelection}
    />
  );
  const campaignTrack = (play: boolean, compact = false) => (
    <CampaignTrack
      play={play}
      compact={compact}
      focus={campaignFocus.focus}
      onHover={campaignFocus.hover}
      onLeave={campaignFocus.leave}
      onSelect={campaignFocus.select}
    />
  );
  const campaignIndex = (compact = false) => (
    <CampaignIndex
      compact={compact}
      focus={campaignFocus.focus}
      onHover={campaignFocus.hover}
      onLeave={campaignFocus.leave}
      onSelect={campaignFocus.select}
    />
  );

  /* ---- Book slide choreography ----
     Enters from the right edge (both scroll directions), parks centered, and
     leaves to the left after the exit-down backside flash. Exit-up reverses the
     entrance back off to the right. The slide offset clears the widest viewport;
     the book is centered, so one screen-width always pushes it fully off.
     Read only after hydration: the offset lands in an inline transform, so a
     render-time `window` read would not match the server-rendered HTML. */
  const slideOffset = useViewportWidth();

  const slideOut = { x: { duration: SLIDE_OUT_S, ease: 'easeIn' as const }, opacity: { duration: 0.3, delay: SLIDE_OUT_S - 0.3, ease: 'easeIn' as const } };

  let bookX: number;
  let bookOpacity: number;
  let bookTransition: React.ComponentProps<typeof motion.div>['transition'];
  if (active) {
    // Parked center. Slides in from the right (the resting pose below); the
    // inner fold/sweep wait for the slide to settle.
    bookX = 0;
    bookOpacity = 1;
    bookTransition = { x: { duration: SLIDE_IN_S, ease: 'easeOut' }, opacity: { duration: 0.3, ease: 'easeOut' } };
  } else if (!everActive) {
    // Never shown — park off-screen right, hidden, no animation.
    bookX = slideOffset;
    bookOpacity = 0;
    bookTransition = { duration: 0 };
  } else if (exitDir === 1 && !exiting) {
    // Exit-down, flash phase: hold centered, back showing, no slide yet.
    bookX = 0;
    bookOpacity = 1;
    bookTransition = { duration: 0 };
  } else if (exitDir === 1) {
    // Exit-down, slide phase: glide off to the left, then it stays hidden.
    bookX = -slideOffset;
    bookOpacity = 0;
    bookTransition = slideOut;
  } else {
    // Exit-up: reverse the entrance — slide back off to the right.
    bookX = slideOffset;
    bookOpacity = 0;
    bookTransition = slideOut;
  }

  /* After an exit the book must be repositioned to the right (its entrance
     launch point) while hidden, so the next entry slides in from the right
     instead of drifting from wherever it left. Done invisibly via a 0-dur
     snap once the slide-out has fully played. */
  const reparkRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (active) { setParkedRight(false); return; }
    if (everActive && exitDir === -1) {
      // exit-up slide is running; park once it lands, which shuts the book.
      if (reparkRef.current) clearTimeout(reparkRef.current);
      reparkRef.current = setTimeout(() => setParkedRight(true), SLIDE_OUT_S * 1000 + 50);
    }
    if (everActive && exitDir === 1 && exiting) {
      // exit-down slide is running; snap right + drop the flash once it lands.
      if (reparkRef.current) clearTimeout(reparkRef.current);
      reparkRef.current = setTimeout(() => {
        setParkedRight(true);
        setFlashBack(false);
        setExiting(false);
      }, SLIDE_OUT_S * 1000 + 50);
    }
    return () => { if (reparkRef.current) clearTimeout(reparkRef.current); };
  }, [active, everActive, exitDir, exiting]);
  if (parkedRight && !active) { bookX = slideOffset; bookOpacity = 0; bookTransition = { duration: 0 }; }

  /* Inner fold + roll call wait for the slide-in to settle on entry. */
  const innerDelay = active ? SLIDE_IN_S : 0;

  /* The book holds its open spread through the exit-down backside flash so the
     cover/spine don't snap shut before the back has shown — they reset only as
     the book slides away. */
  const bookOpen = active || backShown;

  /* The desktop glow's edges ride the two leaves that move them: the cover's
     free edge on the left (rotateY 180 closed, 0 open; as a leaf hinged on the
     right, 180° less) and the back leaf's on the right. Their turns animate
     these motion values (passed in their style), and the glow reads each edge
     off its leaf's live angle, every frame, kept to the book's footprint.
     `leafPxRef` is a leaf's width, for the perspective. */
  const coverTurn = useMotionValue(bookOpen ? 0 : 180);
  const leaf4Turn = useMotionValue(backShown ? -180 : 0);
  const spreadRef = useRef<HTMLDivElement>(null);
  const leafPxRef = useRef(0);
  useEffect(() => {
    const spread = spreadRef.current;
    if (!spread) return;
    const observer = new ResizeObserver(() => { leafPxRef.current = spread.offsetWidth / 2; });
    observer.observe(spread);
    return () => observer.disconnect();
  }, []);
  const glowLeft = useTransform(coverTurn, (r) => glowPct(50 * (1 + Math.max(-1, Math.min(0, leafEdge(r - 180, leafPxRef.current))))));
  const glowRight = useTransform(leaf4Turn, (r) => glowPct(50 * (1 - Math.min(1, Math.max(0, leafEdge(r, leafPxRef.current))))));

  /* The backside leaves' turn transition. Normally a full page-turn; on an
     up-entrance the turn ONTO the back is instant (the book must appear already
     showing only its back) while the subsequent turn open to Sec 02 animates. */
  const turnDur = TURN_MS / 1000;
  const turnEase = [0.45, 0, 0.25, 1] as const;

  /* One stop turns exactly one leaf — the backside is reached by scrolling on
     from the page before it, never jumped to from an arbitrary page — so every
     turn is a single plain flip with no cascade to stagger. */
  const turnInstant = enteredUp && flashBack;
  const leafTurnT = turnInstant || snapLeaves || parked ? { duration: 0 } : { duration: turnDur, ease: turnEase };
  const leaf2TurnT = leafTurnT;
  const leaf3TurnT = leafTurnT;
  const leaf4TurnT = leafTurnT;
  const coverFoldT = turnInstant || parked
    ? { duration: 0 }
    : bookOpen
      ? { duration: quick ? RULEBOOK_QUICK_TURN_MS / 1000 : COVER_FOLD_S, delay: innerDelay + COVER_FOLD_DELAY_S, ease: [0.45, 0, 0.25, 1] as const }
      : { duration: 0.45, ease: 'easeIn' as const };

  /* Mobile equivalents (single-page book, 0.9s turns). page1 = Sec-01 leaf,
     page2 = Campaign Sequence, page3 = comms/back leaf: the same stops as the
     desktop spread. */
  const mTurnDur = M_TURN_MS / 1000;
  const mInstant = enteredUp && flashBack;
  const mTurnT = mInstant || snapLeaves || parked ? { duration: 0 } : { duration: mTurnDur, ease: turnEase };
  const mPage1TurnT = mTurnT;
  const mPage2TurnT = mTurnT;
  const mPage3TurnT = mTurnT;

  const mCoverAway = bookOpen;
  const mPage1Away = page >= 1 || backShown;
  const mPage2Away = page >= 2 || backShown;
  /* page1 + page2 + cover fold ~270° onto the back via useFoldLeaf: an
     animated rotateY whose derived zIndex drops the leaf behind the back cover
     the exact frame it crosses M_FOLD_BEHIND_DEG (no state-flip lag). page3 does
     NOT fold — it flips in place to reveal its own backside (see the mobile
     page3 leaf). Rest order (topZ): cover 40 > page1 30 > page2 25 > page3
     (z-20); folded, they stack back the other way (behindZ). */
  const mCoverTurnT = mInstant || parked
    ? { duration: 0 }
    : mCoverAway
      ? { duration: 0.9, delay: innerDelay + 0.25, ease: [0.45, 0, 0.25, 1] as const }
      : { duration: 0.45, ease: 'easeIn' as const };
  const mPage1Fold = useFoldLeaf(mPage1Away, mPage1TurnT, 30, 0);
  const mPage2Fold = useFoldLeaf(mPage2Away, mPage2TurnT, 25, 0.5);
  const mCoverFold = useFoldLeaf(mCoverAway, mCoverTurnT, 40, 1);
  /* Cover sinks under the stack once flat, and only pops back up when the book
     is fully closed AND gone (not merely mid-exit-flash). */
  useEffect(() => { if (!bookOpen) setCoverDown(false); }, [bookOpen]);

  return (
    <div className="w-full h-full relative">
      <div className="h-full flex flex-col items-center justify-center">
        <motion.div
          className="relative w-full h-full flex flex-col select-none"
          style={{ maxWidth: '1100px', pointerEvents: active ? 'auto' : 'none' }}
          initial={false}
          animate={{ x: bookX, opacity: bookOpacity }}
          transition={bookTransition}
        >

          {/* Desktop spread — two facing pages meeting at the spine. One shared
              3D scene: perspective + preserve-3d, so all leaves fold in the same
              space and stack by translateZ (not z-index, which preserve-3d
              ignores). */}
          <div ref={spreadRef} className="hidden lg:flex relative items-stretch h-full" style={{ perspective: SCENE_PERSPECTIVE, transformStyle: 'preserve-3d' }}>

            {/* Glow (BOOK_GLOW) round the book's footprint: the right half
                while closed, widening with the cover as it opens; the whole
                spread; and the left half on the backside, narrowing as the
                back leaf turns over. Each edge sits under the free edge of the
                leaf that moves it (glowLeft / glowRight). */}
            <motion.div
              aria-hidden="true"
              className="absolute inset-y-0 rounded-md pointer-events-none"
              style={{ boxShadow: BOOK_GLOW, transform: tz(Z_GLOW), left: glowLeft, right: glowRight }}
            />

            {/* Seam backing — a hairline of stock under the spine, beneath every
                leaf, so the two facing pages' antialiased edges, which meet
                there, blend into stock rather than the canvas. Only while a
                page lies flat on both halves (the cover folded down, the back
                leaf home): shut, or on the backside, it would sit beside the
                lone sheet's spine edge. */}
            {coverDown && !backShown && !leaf4OnTop && (
              <div
                aria-hidden="true"
                className="absolute inset-y-0 left-1/2 -ml-px w-0.5 pointer-events-none"
                style={{ backgroundColor: PAGE_STOCK, transform: tz(Z_SEAM) }}
              />
            )}

            {/* leaf1 — left page. Front = the chamber; back = book cover. Closed
                (inactive) the leaf lies on the right half showing the cover;
                on entry it folds open around the spine. It never moves for
                the backside stop — the back lands on top of it via leaf3. The
                non-rotating wrapper carries the cover's depth slot so its
                stacking holds through the open/close fold.

                No leaf, and no leaf's wrapper, takes the pointer itself: only
                its faces do, each while it is the page showing. A wrapper stays
                on its own half when its leaf turns, at its depth slot, so it
                would sit in front of the page beneath and take its pointer (leaf
                2's wrapper over page 004 once Sec. 01 has turned). */}
            <div className="relative w-1/2 h-full pointer-events-none" style={{ transformStyle: 'preserve-3d', ...depth(coverDown ? Z_COVER_DOWN : Z_COVER_UP, 'left') }}>
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{ transformOrigin: 'right center', transformStyle: 'preserve-3d', rotateY: coverTurn }}
              initial={false}
              animate={{ rotateY: bookOpen ? 0 : 180 }}
              transition={coverFoldT}
              onAnimationComplete={() => { if (bookOpen) setCoverDown(true); }}
            >
              {/* Front face: the chamber page. Like every face, it takes the
                  pointer only while it's the page showing: a hidden face is
                  still hit-tested. */}
              <PageFace
                side="left"
                head={['Rulebook', 'Vol. I']}
                folio="001"
                bodyClassName="px-8 pt-4"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  pointerEvents: bookOpen && page === 0 && !backShown ? 'auto' : 'none',
                }}
              >
                <div className="relative flex-1 min-h-0">{chamber(calling && !belowLg)}</div>
              </PageFace>

              {/* Back face at rotateY(180deg): the front cover — visible on entry
                  fold, and again when the leaf swings past 90° on the way to -180.
                  Turned away once the book is open, where it would otherwise
                  sit over the chamber and take its pointer. */}
              <div
                className="absolute inset-0"
                style={{
                  transform: 'rotateY(180deg)',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  pointerEvents: bookOpen ? 'none' : 'auto',
                }}
              >
                <FrontCoverDesign active={active} edge="right" />
              </div>
            </motion.div>
            </div>

            {/* Right half — leaf stack. preserve-3d so its leaves share the
                spread's 3D scene and stack by translateZ. h-full so both halves
                are the same definite height (no content-driven resize). */}
            <div className="relative w-1/2 h-full" style={{ transformStyle: 'preserve-3d' }}>

              {/* leaf4: front = blank right page (006); back = the book's
                  backside. The deepest right leaf — it turns only for the
                  backside. On backShown it turns over the spine and lands on
                  the LEFT half (lifted to Z_BACK_TOP via leaf4OnTop so its back
                  paints over every other turned leaf) displaying
                  BackCoverDesign. Depth lives on the non-rotating wrapper
                  (translateZ) so culling stays correct and stacking holds
                  through the turn. */}
              <div className="absolute inset-0 pointer-events-none" style={{ transformStyle: 'preserve-3d', ...depth(leaf4OnTop ? Z_BACK_TOP : Z_LEAF4, 'right') }}>
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{ transformOrigin: 'left center', transformStyle: 'preserve-3d', rotateY: leaf4Turn }}
                initial={false}
                animate={{ rotateY: backShown ? -180 : 0 }}
                transition={leaf4TurnT}
                onAnimationComplete={() => { if (!backShown) setLeaf4OnTop(false); }}
              >
                <div
                  className="absolute inset-0"
                  style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', pointerEvents: page >= 2 && !backShown ? 'auto' : 'none' }}
                >
                  <PageFace side="right" head={['Sec. 03', 'Links']} folio="006">{null}</PageFace>
                </div>
                <div
                  className="absolute inset-0"
                  style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', pointerEvents: backShown ? 'auto' : 'none' }}
                >
                  <BackCoverDesign active={active} />
                </div>
              </motion.div>
              </div>

              {/* leaf3: front = the campaign index (004); back = the Links
                  page (005). Turns for the scroll flip to the comms spread
                  (page ≥ 2) AND on the way to the backside. Lifted to
                  Z_LEAF3_TOP while turned so its back paints over leaf2's
                  turned back (003) on the left half; dropped once fully home. */}
              <div className="absolute inset-0 pointer-events-none" style={{ transformStyle: 'preserve-3d', ...depth(leaf3OnTop ? Z_LEAF3_TOP : Z_LEAF3, 'right') }}>
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{ transformOrigin: 'left center', transformStyle: 'preserve-3d' }}
                initial={false}
                animate={{ rotateY: page >= 2 || backShown ? -180 : 0 }}
                transition={leaf3TurnT}
                onAnimationComplete={() => { if (!(page >= 2 || backShown)) setLeaf3OnTop(false); }}
              >
                <div
                  className="absolute inset-0"
                  style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', pointerEvents: page >= 2 || backShown ? 'none' : 'auto' }}
                >
                  <PageFace
                    side="right"
                    head={['Sec. 02', <HeadDocLink key="doc" label="Campaign Sequence" href={DOC_LINKS.campaign} />]}
                    folio="004"
                  >
                    {campaignIndex()}
                  </PageFace>
                </div>
                <div
                  className="absolute inset-0"
                  style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', pointerEvents: page >= 2 && !backShown ? 'auto' : 'none' }}
                >
                  <PageFace side="left" head={['Rulebook', 'Vol. I']} folio="005">{commsContent}</PageFace>
                </div>
              </motion.div>
              </div>

              {/* leaf2: front = clauses page (Sec 01), back = the campaign track.
                  Fills the half (absolute inset-0) so it never defines height —
                  the spread height is the container's definite h-full, identical
                  for both halves and stable through the turn. Turns for a scroll
                  page-flip (page ≥ 1) AND on the backside stop. Non-rotating
                  wrapper carries its depth slot. */}
              <div className="absolute inset-0 pointer-events-none" style={{ transformStyle: 'preserve-3d', ...depth(Z_LEAF2, 'right') }}>
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{ transformOrigin: 'left center', transformStyle: 'preserve-3d' }}
                initial={false}
                animate={{ rotateY: page >= 1 || backShown ? -180 : 0 }}
                transition={leaf2TurnT}
              >
                <PageFace
                  side="right"
                  head={['Sec. 01', <HeadDocLink key="doc" label="Distribution of Power" href={DOC_LINKS.distribution} />]}
                  folio="002"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    pointerEvents: page >= 1 || backShown ? 'none' : 'auto',
                  }}
                >
                  {distributionIndex()}
                </PageFace>
                <div
                  className="absolute inset-0"
                  style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', pointerEvents: page === 1 && !backShown ? 'auto' : 'none' }}
                >
                  <PageFace side="left" head={['Rulebook', 'Vol. I']} folio="003" bodyClassName="px-8 pt-4">
                    <div className="relative flex-1 min-h-0">{campaignTrack(campaignPlay && !belowLg)}</div>
                  </PageFace>
                </div>
              </motion.div>
              </div>
            </div>

            {/* Spine — binding shadow between the pages, no hard border.
                Hidden on the backside (only the lone left page remains). Sits
                above the flat page surfaces in the 3D scene via translateZ
                (z-index is ignored under preserve-3d). */}
            <motion.div
              className="absolute inset-y-0 left-1/2 -ml-2 w-4 pointer-events-none"
              initial={false}
              animate={{ opacity: active && !backShown ? 1 : 0 }}
              transition={active && !backShown ? { duration: 0.5, delay: innerDelay + 0.85, ease: 'easeOut' } : { duration: 0.3, ease: 'easeIn' }}
              style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.32) 50%, transparent 100%)', transform: tz(Z_BACK_TOP) }}
            />
          </div>

          {/* Glow (BOOK_GLOW): the single page's footprint, which stays put
              while the stack slides for the backside. */}
          <div aria-hidden="true" className="lg:hidden absolute inset-0 rounded-md pointer-events-none" style={{ boxShadow: BOOK_GLOW }} />

          {/* Mobile — single-page book. page1, page2 + cover fold ~270° onto
              the back (M_FOLD_DEG). Showing the backside is different: page3
              (comms) flips 180° over its left edge to reveal its OWN back face
              (the back cover) while this whole container slides one
              page-width LEFT, bringing the flipped backside (which lands one
              page-width right of its hinge) into frame. The slide uses page3's
              turn transition so they stay in sync. */}
          <motion.div
            className="lg:hidden relative h-full"
            style={{ perspective: 1600 }}
            initial={false}
            animate={{ x: backShown ? '-100%' : '0%' }}
            transition={mPage3TurnT}
          >

            {/* page1 — the chamber + its index. Folds away with a near-full spin
                onto the back (M_FOLD_DEG), visible throughout; drops behind
                once landed. */}
            <motion.div
              className="relative h-full"
              style={{
                transformOrigin: 'left center',
                transformStyle: 'preserve-3d',
                rotateY: mPage1Fold.rotateY,
                zIndex: mPage1Fold.zIndex,
                pointerEvents: mPage1Away ? 'none' : 'auto',
              }}
            >
              <PageFace
                side="single"
                head={['Sec. 01', <HeadDocLink key="doc" label="Distribution of Power" href={DOC_LINKS.distribution} />]}
                folio="001"
                bodyClassName="pt-3"
              >
                {/* The compact cuts: the chamber, cropped to the hemicycle and
                    as wide as the page allows, takes every height the caption
                    and the index (a fixed height) leave it. On a phone it
                    fills the width, a tablet's page is shorter than wide, so
                    there it fills the height. */}
                <div className="flex-1 min-h-0 px-2">
                  <div className="relative w-full h-full">{chamber(calling && belowLg, true)}</div>
                </div>
                <p className="shrink-0 px-6 pt-2 font-mono text-[10px] uppercase tracking-[0.14em] leading-none text-center text-text2 opacity-75">
                  {SEAT_CAPTION}
                </p>
                <div className="shrink-0 px-6 pt-5">{distributionIndex(true)}</div>
              </PageFace>
            </motion.div>

            {/* Cover — folds to the back on section entry, near-full spin onto
                the back; drops behind once landed. */}
            <motion.div
              className="absolute inset-0"
              style={{
                transformOrigin: 'left center',
                transformStyle: 'preserve-3d',
                rotateY: mCoverFold.rotateY,
                zIndex: mCoverFold.zIndex,
                pointerEvents: mCoverAway ? 'none' : 'auto',
              }}
            >
              <FrontCoverDesign active={active} edge="full" />
            </motion.div>

            {/* page2 — Campaign Sequence: the track over its index. Folds away
                like page1 (~270° onto the back) once the scroll moves past it
                (page ≥ 2) or the backside shows; rests behind the book at z 0.5. */}
            <motion.div
              className="absolute inset-0"
              style={{
                transformOrigin: 'left center',
                transformStyle: 'preserve-3d',
                rotateY: mPage2Fold.rotateY,
                zIndex: mPage2Fold.zIndex,
                pointerEvents: mPage2Away ? 'none' : 'auto',
              }}
            >
              <PageFace
                side="single"
                head={['Sec. 02', <HeadDocLink key="doc" label="Campaign Sequence" href={DOC_LINKS.campaign} />]}
                folio="002"
                bodyClassName="pt-3"
              >
                {/* The compact cuts: the track, cropped to the route and as
                    wide as the page allows, over the one-line index and its
                    panel (a fixed height). */}
                <div className="flex-1 min-h-0 px-2">
                  <div className="relative w-full h-full">{campaignTrack(campaignPlay && belowLg, true)}</div>
                </div>
                <div className="shrink-0 px-6 pt-5">{campaignIndex(true)}</div>
              </PageFace>
            </motion.div>

            {/* page3 — Links (front) + the book's backside (back).
                Two-faced: showing the backside flips this
                leaf 180° over its LEFT edge (the left edge is the one that
                lifts and crosses → hinge on the RIGHT, rotate -180) while the
                whole mobile book slides one page-width LEFT, bringing the
                flipped backside (which lands one page-width right of its
                hinge) into frame. Reverse mirrors it. */}
            <motion.div
              className="absolute inset-0 z-20"
              style={{
                transformOrigin: 'right center',
                transformStyle: 'preserve-3d',
                pointerEvents: page >= 2 ? 'auto' : 'none',
              }}
              initial={false}
              animate={{ rotateY: backShown ? -180 : 0 }}
              transition={mPage3TurnT}
            >
              {/* Front face — Sec 03 links */}
              <PageFace
                side="single"
                head={['Sec. 03', 'Links']}
                folio="003"
                style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
              >
                {commsContent}
              </PageFace>
              {/* Back face — the book's backside */}
              <div
                className="absolute inset-0"
                style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
              >
                <BackCoverDesign active={active} edge="full" />
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Rulebook;
