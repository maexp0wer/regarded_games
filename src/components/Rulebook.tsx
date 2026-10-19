// src/components/Rulebook.tsx
"use client";

import React, { useState, useEffect, useId, useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform, animate, type ValueAnimationTransition } from 'framer-motion';
import { SOCIAL_CHANNELS, type SocialChannel } from '@/config/socials';
import { DiscourseIcon, XIcon, DiscordIcon, TelegramIcon, GithubIcon } from '@/components/icons/SocialIcons';
import { useViewportWidth } from '@/hooks/useViewportWidth';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { docsOrigin } from '@/utils/appUrls';
import { CARTOUCHE, COVER_STOCK, drawCoverPlateArt, type PlateHalo, renderCoverFoilMask } from '@/lib/coverPlateArt';
import { FOIL_REST, trackFoil } from '@/lib/holoFoil';
import PowerChamber from '@/components/PowerChamber';
import {
  ALLOCATIONS,
  COALITIONS,
  SEAT_CAPTION,
  allocationLit,
  coalitionLit,
  sameFocus,
  type ChamberFocus,
} from '@/config/distribution';

/* Scroll stops the rulebook occupies inside its landing section, back cover
   included — the LAST stop IS the back cover, reached by scrolling on from the
   final content page (there is no click-to-flip). Consumed by the landing
   SECTIONS table so the two can never drift. Below lg the single-page mobile
   book carries one page more: the Campaign Sequence runs across two phone
   pages. */
export const RULEBOOK_PAGES = 4;
export const RULEBOOK_PAGES_BELOW_LG = 5;

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
};

interface RulebookProps {
  /** Section is the active scroll-stop — drives the cover fold + the chamber's roll call. */
  active?: boolean;
  /** Book page from the scroll system. Desktop spread (RULEBOOK_PAGES stops):
      0 = Distribution, 1 = Campaign, 2 = Links, 3 = back cover. The mobile
      single-page book runs Campaign across two pages, so below lg it gets one
      stop more (RULEBOOK_PAGES_BELOW_LG, wired through `pagesBelowLg` in the
      landing SECTIONS): 0 = Distribution, 1 = Campaign I–II,
      2 = Campaign III–IV, 3 = Links, 4 = back cover. */
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

/* Where each cover's type sits, as a share of the cover — the vortex is erased
   in a soft halo round these so every block prints on clean stock. The covers
   place their blocks at the same shares of their height (top-[12%] and so on),
   so they hold at every size the book is drawn at. The back's band clears its
   own path through the vortex (coverPlateArt.ts). */
const FRONT_COVER_HALOS: readonly PlateHalo[] = [
  { cx: 0.5, cy: 0.12, rx: 0.38, ry: 0.055 },  // wordmark
  { cx: 0.5, cy: 0.5, rx: 0.38, ry: 0.22 },    // seal + title block
  { cx: 0.5, cy: 0.87, rx: 0.42, ry: 0.06 },   // printed strip
];
const BACK_COVER_HALOS: readonly PlateHalo[] = [
  { cx: 0.5, cy: 0.13, rx: 0.38, ry: 0.055 },  // wordmark
  { cx: 0.5, cy: 0.87, rx: 0.44, ry: 0.055 },  // title imprint
];

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

/* Campaign Sequence roadmap — mirrors Whitepaper §19. `state` drives the rail
   node + status pill styling (done = green, live = pulsing gold, upcoming =
   muted). `when` is the timeframe chip; `items` are the individual milestones,
   each ticked off (`done`) as it lands — so a live phase shows partial progress. */
type RoadmapState = 'done' | 'live' | 'upcoming';
interface RoadmapItem {
  label: string;
  done: boolean;
}
const ROADMAP_POINTS: {
  clause: string;
  phase: string;
  title: string;
  when: string;
  status: string;
  state: RoadmapState;
  items: RoadmapItem[];
}[] = [
  {
    clause: '2.1',
    phase: 'Phase I',
    title: 'Foundation',
    when: '2025',
    status: 'Complete',
    state: 'done',
    items: [
      { label: 'Conceptualisation & game-theory design', done: true },
      { label: 'Dual-token economic model', done: true },
      { label: 'DAO LLC legal structure', done: true },
    ],
  },
  {
    clause: '2.2',
    phase: 'Phase II',
    title: 'Build',
    when: 'Q1–Q3 2026',
    status: 'In Progress',
    state: 'live',
    items: [
      { label: 'Core smart contracts on Base', done: true },
      { label: 'dApp build-out (Exchange, Terminal, Community)', done: true },
      { label: 'Pre-launch community seeding', done: false },
    ],
  },
  {
    clause: '2.3',
    phase: 'Phase III',
    title: 'Testnet',
    when: 'Q4 2026',
    status: 'Upcoming',
    state: 'upcoming',
    items: [
      { label: 'Public testnet on Base Sepolia', done: false },
      { label: 'Community Genesis: testnet quests & Genesis Airdrop', done: false },
      { label: 'Immunefi audit competition', done: false },
      { label: 'Execution Council established', done: false },
    ],
  },
  {
    clause: '2.4',
    phase: 'Phase IV',
    title: 'Mainnet',
    when: 'Q1 2027',
    status: 'Upcoming',
    state: 'upcoming',
    items: [
      { label: '$RGD TGE & Capital Auction', done: false },
      { label: 'Genesis Airdrop distributed, market opens', done: false },
      { label: 'Mainnet launch & Season 1', done: false },
      { label: 'Hybrid governance (Snapshot + Council)', done: false },
    ],
  },
];

/* Section heading row, rulebook style. */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[14px] font-black uppercase tracking-[0.25em] text-text2">{children}</span>
      <div className="border-b border-[var(--color-border2)] opacity-60" />
    </div>
  );
}

/* State-driven ink for the rail node and the printed status legend. A page
   marks state the way print does — by ink weight and by the shape of the mark,
   not by hue: `done` is struck solid in the text ink, `upcoming` is a hollow
   ring in the muted rule colour, and gold is spent once per page on the phase
   actually in hand.

   `mark` colours the graphic, `legend` the type. They differ for `live` because
   gold-as-text needs the `-hover` token to clear 4.5:1 — which is the deeper
   ochre in light mode and the brighter metallic in dark, so it works both ways
   round. The tint fills, coloured rings and glows this used to carry are gone;
   a content page holds no fills in the accent. */
const ROADMAP_STATE_STYLE: Record<RoadmapState, { mark: string; legend: string }> = {
  done: { mark: 'var(--color-text)', legend: 'var(--color-text2)' },
  live: { mark: 'var(--color-gold)', legend: 'var(--color-gold-hover)' },
  upcoming: { mark: 'var(--color-border2)', legend: 'var(--color-text2)' },
};

/* A single milestone tick: a small disc struck solid in the text ink with a
   centred check when done, an empty hollow ring when still pending. Display
   only — reflects real progress. The check svg is `block` + viewBox-fitted so
   it sits cleanly inside the circle (no inline-svg baseline gap, no overflow).

   The green fill and its 3px tint halo are gone: green is a trading signal on
   the terminal side, and a halo is a glow on a content surface. Done/pending
   now reads off solid-vs-hollow, which survives both themes and greyscale. */
function MilestoneCheck({ item }: { item: RoadmapItem }) {
  return (
    <li className="flex items-start gap-2.5">
      {item.done ? (
        <span
          className="grid place-items-center w-3.5 h-3.5 rounded-full shrink-0 mt-1"
          style={{ backgroundColor: 'var(--color-text)' }}
        >
          <svg viewBox="0 0 10 10" className="block w-2 h-2" fill="none" stroke={PAGE_STOCK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 5.2 L4.2 7.4 L8 3" />
          </svg>
        </span>
      ) : (
        <span
          className="w-3.5 h-3.5 rounded-full shrink-0 mt-1 border"
          style={{ borderColor: 'var(--color-border2)' }}
        />
      )}
      <span
        className="font-sans text-[13px] leading-snug"
        style={{ color: item.done ? 'var(--color-text)' : 'var(--color-text2)' }}
      >
        {item.label}
      </span>
    </li>
  );
}

/* Rail node: the larger phase marker. Done is struck solid with a tick, the
   live phase solid with a punched centre, an upcoming one a hollow ring.

   Nothing here animates. A printed page is print at rest, and the ping the live
   node used to throw — plus its 8px glow and the done node's 2px halo — were
   terminal idioms that had wandered onto paper: they pulled the eye off the
   prose the page exists to carry, on every view, forever. */
function RailNode({ state }: { state: RoadmapState }) {
  const s = ROADMAP_STATE_STYLE[state];
  if (state === 'upcoming') {
    return (
      <span
        className="w-4.25 h-4.25 rounded-full shrink-0 border-2"
        style={{ backgroundColor: PAGE_STOCK, borderColor: s.mark }}
      />
    );
  }
  return (
    <span className="grid place-items-center w-4.25 h-4.25 rounded-full shrink-0" style={{ backgroundColor: s.mark }}>
      {state === 'done' ? (
        <svg viewBox="0 0 12 12" className="block w-2.5 h-2.5" fill="none" stroke={PAGE_STOCK} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6.3 L5.2 8.4 L9 3.6" />
        </svg>
      ) : (
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PAGE_STOCK }} />
      )}
    </span>
  );
}

/* One milestone row on the Campaign Sequence page. */
function RoadmapEntry({ point, isLast }: { point: (typeof ROADMAP_POINTS)[number]; isLast: boolean }) {
  const s = ROADMAP_STATE_STYLE[point.state];
  const live = point.state === 'live';
  const doneCount = point.items.filter((i) => i.done).length;
  return (
    <div className="flex gap-3.5">
      {/* Rail: node + connector down to the next milestone. The connector below a
          completed phase is drawn in its accent so the finished run reads solid. */}
      <div className="flex flex-col items-center pt-px">
        <RailNode state={point.state} />
        {/* The connector is a rule, not a status bar — one colour, with the run
            already walked printed a shade heavier. */}
        {!isLast && (
          <span
            className="w-px flex-1 mt-1"
            style={{ backgroundColor: 'var(--color-border2)', opacity: point.state === 'done' ? 0.55 : 0.3 }}
          />
        )}
      </div>
      <div className="flex flex-col gap-1.5 flex-1 pb-5 min-w-0">
        {/* Eyebrow: clause + phase tag, the leader, then the timeframe. Set as
            plain legend type — the dotted leader already carries the eye to the
            date, which is the whole job the capsule around it was doing. */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-black tabular-nums shrink-0 tracking-wider" style={{ color: live ? s.legend : 'var(--color-text2)' }}>§ {point.clause}</span>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-text2 opacity-70">{point.phase}</span>
          <DottedLeader />
          <span className="font-mono text-[11px] font-bold tabular-nums tracking-wider shrink-0 text-text2">{point.when}</span>
        </div>
        {/* Title, printed status legend, progress counter. The title stays in
            the text ink for every phase but the live one, so the page carries a
            single accent rather than one per row. */}
        <div className="flex items-center gap-2">
          <span
            className="font-display font-black text-[15px] uppercase tracking-widest leading-tight"
            style={{ color: live ? s.legend : 'var(--color-text)' }}
          >
            {point.title}
          </span>
          <span
            className="font-mono text-[10px] font-black uppercase tracking-[0.2em] shrink-0"
            style={{ color: s.legend }}
          >
            {point.status}
          </span>
          <DottedLeader />
          <span className="font-mono text-[10px] font-bold tabular-nums shrink-0 text-text2 opacity-70">{doneCount}/{point.items.length}</span>
        </div>
        {/* Individual milestones, each ticked off as it lands */}
        <ul className="flex flex-col gap-1.5 mt-0.5">
          {point.items.map((item, i) => (
            <MilestoneCheck key={i} item={item} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function RoadmapList({ from, to }: { from: number; to: number }) {
  const points = ROADMAP_POINTS.slice(from, to);
  return (
    <div className="flex flex-col">
      {points.map((p, i) => (
        <RoadmapEntry key={p.clause} point={p} isLast={i === points.length - 1} />
      ))}
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

const roadmapLeftContent = (
  <div className="flex flex-col flex-grow gap-3 w-full">
    <SectionHeading>Sec. 02 — Campaign Sequence</SectionHeading>
    <RoadmapList from={0} to={2} />
  </div>
);

const roadmapRightContent = (
  <div className="flex flex-col flex-grow gap-3 w-full">
    <SectionHeading>Sec. 02 — Continued</SectionHeading>
    <RoadmapList from={2} to={4} />
  </div>
);

/* Mobile runs the same Sec. 02 split as the desktop spread — phases I–II on
   one page, III–IV on the next — so neither page ever has to scroll. */
const roadmapMobileContentA = (
  <div className="flex flex-col flex-grow gap-3 w-full">
    <SectionHeading>Sec. 02 — Campaign Sequence</SectionHeading>
    <RoadmapList from={0} to={2} />
  </div>
);

const roadmapMobileContentB = (
  <div className="flex flex-col flex-grow gap-3 w-full">
    <SectionHeading>Sec. 02 — Continued</SectionHeading>
    <RoadmapList from={2} to={4} />
  </div>
);

/* Brand mark per channel key — struck straight into the row in the muted ink,
   with no badge behind it: a filled disc in the accent is an accent fill on a
   content surface, and five of them down a page read as buttons. */
const CHANNEL_ICONS: Record<SocialChannel['key'], React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  discourse: DiscourseIcon,
  x: XIcon,
  discord: DiscordIcon,
  telegram: TelegramIcon,
  github: GithubIcon,
};

/* One channel row on the Links pages — the brand mark, the clause line with a
   dotted leader, and the channel's state printed at the end of it: an open
   channel ends in a gold, underlined "Join ↗"; a pending one in a muted
   "Coming Soon" legend. */
function ChannelEntry({ channel, clause }: { channel: SocialChannel; clause: string }) {
  /* A channel is live purely on whether its URL exists in socials.ts. This used
     to also require the app to be live, which had it backwards: a forum, a repo
     or a Discord open during the pre-launch window is exactly when a link
     matters most. The game's launch state has nothing to do with a chat server.

     A live entry is printed live the whole way across — mark, clause and name in
     full ink, tail in gold and underlined — and a pending one is muted end to
     end. The tail alone used to carry it, and once the gold capsule came off
     that tail read no louder than "Coming Soon" until you hovered it, which on
     a touch screen is never. Right now GitHub is the only open channel in
     socials.ts, so this is the difference between it being findable and it
     being lost in a column of four dead ones. Gold is spent here and nowhere
     else on the page: one accent, on the one entry that goes anywhere. */
  const live = channel.href !== '';
  const Icon = CHANNEL_ICONS[channel.key];
  const ink = live ? 'text-text' : 'text-text2';
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <Icon className={`size-4 shrink-0 ${live ? 'text-text' : 'text-text2 opacity-60'}`} />
      <span className={`font-mono text-[13px] font-black tabular-nums shrink-0 ${ink}`}>§ {clause}</span>
      <span className={`font-display font-black text-[15px] uppercase tracking-widest leading-tight shrink-0 ${ink}`}>{channel.label}</span>
      <DottedLeader />
      {live ? (
        <a
          href={channel.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="font-mono text-[11px] font-black uppercase tracking-[0.2em] shrink-0 text-gold-hover
            underline underline-offset-[3px] decoration-1 transition-colors duration-200
            hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-hover"
        >
          Join ↗
        </a>
      ) : (
        <span className="font-mono text-[11px] font-black uppercase tracking-[0.2em] shrink-0 text-text2 opacity-70">
          Coming Soon
        </span>
      )}
    </div>
  );
}

/* All five channels, clauses 3.1–3.5, on the left page of the Links spread.
   The facing page (006) is left blank for now. */
const commsLeftContent = (
  <div className="flex flex-col flex-grow gap-4 w-full">
    <SectionHeading>Sec. 03 — Links</SectionHeading>
    <div className="flex flex-col gap-5">
      {SOCIAL_CHANNELS.map((c, i) => (
        <ChannelEntry key={c.key} channel={c} clause={`3.${i + 1}`} />
      ))}
    </div>
  </div>
);

const commsMobileContent = (
  <div className="flex flex-col flex-grow gap-4 w-full">
    <SectionHeading>Sec. 03 — Links</SectionHeading>
    <div className="flex flex-col gap-4">
      {SOCIAL_CHANNELS.map((c, i) => (
        <ChannelEntry key={c.key} channel={c} clause={`3.${i + 1}`} />
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
   ignored under preserve-3d). Kept SMALL: the counter-scale removes the apparent
   magnification, but an off-center leaf also shifts radially with z (parallax),
   and that residual shift scales with z — small z keeps it sub-pixel. The order
   is all that matters for sorting; compositor transforms sort sub-pixel deltas. */
const Z_LEAF4 = 0.75;     // comms/backside leaf, resting (deepest right leaf)
const Z_LEAF3 = 1;        // roadmap-right/comms-left leaf, resting (under leaf2)
const Z_LEAF2 = 2;        // Sec01/roadmap-left leaf
const Z_LEAF3_TOP = 3;    // leaf3 lifted while turned past leaf2 (comms spread)
const Z_BACK_TOP = 4;     // backside leaf (leaf4) lifted on top of the stack
const Z_COVER_DOWN = 0.5; // cover sunk flat under the right leaves
const Z_COVER_UP = 6;     // cover closed / opening, above everything
const Z_GLOW = 0;         // the book's glow, flat under every leaf

/* Depth wrapper transform: push to depth z AND counter-scale by (P-z)/P so the
   page's APPARENT size is constant at every depth — without this, a leaf pushed
   toward the viewer (higher z) renders larger and visibly "grows" as it changes
   depth during a turn. The two cancel: perspective magnifies by P/(P-z), the
   scale shrinks by (P-z)/P. */
const tz = (z: number) => `translateZ(${z}px) scale(${(SCENE_PERSPECTIVE - z) / SCENE_PERSPECTIVE})`;

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
/* How long leaving a coalition or allocation waits before the chamber settles
   back to rest: long enough to cross the aisle, or the gap between two index
   rows, without flashing the resting readout. */
const FOCUS_LEAVE_MS = 180;

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
   panel of fixed height beneath, so neither the list nor the chamber above
   ever reflows. A tap on the panel (or its ✕) closes a pin. At rest the panel
   says how to read the chamber, in a phone's terms: a tap. */
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
    return (
      <div className="flex flex-col gap-4 w-full">
        <div className="flex flex-col gap-2.5">
          {COALITIONS.map((c, k) => {
            const first = ALLOCATIONS.findIndex((a) => a.coalition === k);
            return (
              <div key={c.name} className={`flex flex-col gap-1.5 ${k ? 'pt-2.5 border-t border-border' : ''}`}>
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

        <div
          className="h-44 flex flex-col gap-2 pt-3 border-t border-border overflow-y-auto custom-scrollbar"
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
  /* Chamber focus has two input modes. A pointer that can hover focuses what
     it is over (in the chamber or on the index), and leaving waits
     FOCUS_LEAVE_MS before the chamber settles back to rest, a wait the next
     hover cancels. A touch screen cannot hover, so there a TAP pins a
     coalition or allocation, and the pin holds until the same one, the ✕, the
     detail overlay or the empty chamber is tapped. Capability is read after
     mount — matchMedia does not exist during SSR — defaulting to hover so the
     desktop first paint is already right. */
  const [hovered, setHovered] = useState<ChamberFocus>(null);
  const [pinned, setPinned] = useState<ChamberFocus>(null);
  const [canHover, setCanHover] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const read = () => setCanHover(mq.matches);
    read();
    mq.addEventListener('change', read);
    return () => mq.removeEventListener('change', read);
  }, []);

  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(leaveTimerRef.current), []);
  const hoverFocus = useCallback((next: ChamberFocus) => {
    if (!canHover) return;
    clearTimeout(leaveTimerRef.current);
    setHovered(next);
  }, [canHover]);
  const leaveFocus = useCallback(() => {
    if (!canHover) return;
    clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = setTimeout(() => setHovered(null), FOCUS_LEAVE_MS);
  }, [canHover]);
  const selectFocus = useCallback((next: ChamberFocus) => {
    if (canHover) return;
    setPinned((prev) => (sameFocus(prev, next) ? null : next));
  }, [canHover]);
  const clearSelection = useCallback(() => {
    clearTimeout(leaveTimerRef.current);
    setPinned(null);
    setHovered(null);
  }, []);
  /* A pin outranks a hover, so a pinned clause survives the pointer wandering. */
  const focus = pinned ?? hovered;

  /* The book's backside is the section's FINAL scroll stop, not a click target:
     the last content page turns on to it and scrolling back up turns it home.
     Which index that is depends on the breakpoint — the single-page mobile book
     carries one page more than the desktop spread (see RULEBOOK_PAGES*). */
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
  const backPage = (belowLg ? RULEBOOK_PAGES_BELOW_LG : RULEBOOK_PAGES) - 1;
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

  /* A page flip drops any focus — it belongs to the chamber's page alone, and
     must not ride along to the next one. */
  useEffect(() => { clearSelection(); }, [page, active, clearSelection]);

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
     page2 = Campaign Sequence I–II, page2b = Campaign Sequence III–IV,
     page3 = comms/back leaf. The mobile book carries that one extra leaf, so
     its scroll stops run 0–4 against the desktop spread's 0–3 — see
     `pagesBelowLg` in the landing SECTIONS. */
  const mTurnDur = 0.9;
  const mInstant = enteredUp && flashBack;
  const mTurnT = mInstant || snapLeaves || parked ? { duration: 0 } : { duration: mTurnDur, ease: turnEase };
  const mPage1TurnT = mTurnT;
  const mPage2TurnT = mTurnT;
  const mPage2bTurnT = mTurnT;
  const mPage3TurnT = mTurnT;

  const mCoverAway = bookOpen;
  const mPage1Away = page >= 1 || backShown;
  const mPage2Away = page >= 2 || backShown;
  const mPage2bAway = page >= 3 || backShown;
  /* page1 + page2 + page2b + cover fold ~270° onto the back via useFoldLeaf: an
     animated rotateY whose derived zIndex drops the leaf behind the back cover
     the exact frame it crosses M_FOLD_BEHIND_DEG (no state-flip lag). page3 does
     NOT fold — it flips in place to reveal its own backside (see the mobile
     page3 leaf). Rest order (topZ): cover 40 > page1 30 > page2 25 > page2b 22 >
     page3 (z-20); folded, they stack back the other way (behindZ). */
  const mCoverTurnT = mInstant || parked
    ? { duration: 0 }
    : mCoverAway
      ? { duration: 0.9, delay: innerDelay + 0.25, ease: [0.45, 0, 0.25, 1] as const }
      : { duration: 0.45, ease: 'easeIn' as const };
  const mPage1Fold = useFoldLeaf(mPage1Away, mPage1TurnT, 30, 0);
  const mPage2Fold = useFoldLeaf(mPage2Away, mPage2TurnT, 25, 0.5);
  const mPage2bFold = useFoldLeaf(mPage2bAway, mPage2bTurnT, 22, 0.75);
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

            {/* leaf1 — left page. Front = the chamber; back = book cover. Closed
                (inactive) the leaf lies on the right half showing the cover;
                on entry it folds open around the spine. It never moves for
                the backside stop — the back lands on top of it via leaf3. The
                non-rotating wrapper carries the cover's depth slot so its
                stacking holds through the open/close fold. */}
            <div className="relative w-1/2 h-full" style={{ transformStyle: 'preserve-3d', transform: tz(coverDown ? Z_COVER_DOWN : Z_COVER_UP) }}>
            <motion.div
              className="absolute inset-0"
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
              <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d', transform: tz(leaf4OnTop ? Z_BACK_TOP : Z_LEAF4) }}>
              <motion.div
                className="absolute inset-0"
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

              {/* leaf3: front = roadmap right page (004); back = the Links
                  page (005). Turns for the scroll flip to the comms spread
                  (page ≥ 2) AND on the way to the backside. Lifted to
                  Z_LEAF3_TOP while turned so its back paints over leaf2's
                  turned back (003) on the left half; dropped once fully home. */}
              <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d', transform: tz(leaf3OnTop ? Z_LEAF3_TOP : Z_LEAF3) }}>
              <motion.div
                className="absolute inset-0"
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
                  <PageFace side="right" head={['Sec. 02', 'Campaign Sequence']} folio="004">{roadmapRightContent}</PageFace>
                </div>
                <div
                  className="absolute inset-0"
                  style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', pointerEvents: page >= 2 && !backShown ? 'auto' : 'none' }}
                >
                  <PageFace side="left" head={['Rulebook', 'Vol. I']} folio="005">{commsLeftContent}</PageFace>
                </div>
              </motion.div>
              </div>

              {/* leaf2: front = clauses page (Sec 01), back = roadmap left page.
                  Fills the half (absolute inset-0) so it never defines height —
                  the spread height is the container's definite h-full, identical
                  for both halves and stable through the turn. Turns for a scroll
                  page-flip (page ≥ 1) AND on the backside stop. Non-rotating
                  wrapper carries its depth slot. */}
              <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d', transform: tz(Z_LEAF2) }}>
              <motion.div
                className="absolute inset-0"
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
                  <PageFace side="left" head={['Rulebook', 'Vol. I']} folio="003">{roadmapLeftContent}</PageFace>
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

            {/* page2 — Campaign Sequence, phases I–II. Folds away like page1
                (~270° onto the back) once the scroll moves past it (page ≥ 2)
                or the backside shows; rests behind the book at z 0.5. */}
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
              <PageFace side="single" head={['Sec. 02', 'Campaign Sequence']} folio="002">
                {roadmapMobileContentA}
              </PageFace>
            </motion.div>

            {/* page2b — Campaign Sequence, phases III–IV. The mobile-only
                second half of Sec. 02: the four phases do not fit one phone
                page, so they turn instead of scrolling. Folds away at page ≥ 3
                and rests behind the book at z 0.75, on top of page2. */}
            <motion.div
              className="absolute inset-0"
              style={{
                transformOrigin: 'left center',
                transformStyle: 'preserve-3d',
                rotateY: mPage2bFold.rotateY,
                zIndex: mPage2bFold.zIndex,
                pointerEvents: mPage2bAway ? 'none' : 'auto',
              }}
            >
              <PageFace side="single" head={['Sec. 02', 'Campaign Sequence']} folio="003">
                {roadmapMobileContentB}
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
                pointerEvents: page >= 3 ? 'auto' : 'none',
              }}
              initial={false}
              animate={{ rotateY: backShown ? -180 : 0 }}
              transition={mPage3TurnT}
            >
              {/* Front face — Sec 03 links */}
              <PageFace
                side="single"
                head={['Sec. 03', 'Links']}
                folio="004"
                style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
              >
                {commsMobileContent}
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
