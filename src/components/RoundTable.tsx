'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Regardo from '@/components/icons/Regardo.svg';
import Carlo from '@/components/icons/Carlo.svg';

/**
 * The crowd and the agora for the landing page's REDEFINE MARKETS card — a
 * marketplace of Capitalists and Proletarians talking over each other, and the
 * temple they raise underneath them while they do it.
 *
 * Sixteen people stand scattered across the upper frame, not seated in a ring:
 * a crowd, not a committee. Empty bubbles cross between them continuously and
 * only ever between the two classes, because the thing being shown is that the
 * classes deal with each other. Every so often a bubble sheds a piece, which
 * falls the height of the frame and then opens out into the next part of the
 * building below — stylobate first, then the columns one by one, then the
 * architrave, and last the pediment.
 *
 * It goes up once and then it stands. The talking does not stop when the roof
 * lands — that is the card's claim: the market is not a thing you finish
 * building, it is a thing people keep talking into existence. What repeats is
 * upkeep. Every twenty to thirty seconds a column cracks — the fracture runs
 * through it until every one of its eighteen pieces is drawn, then it lets go
 * and they drop, top first, dissolving as they reach the floor. Once the
 * wreckage is gone a fresh column falls into the gap the same way the first
 * fifteen pieces did, so the structure is visibly held up by the exchange
 * still going on above it.
 *
 * The building wears the card's own orange rather than a colour of its own.
 * Every graphic in the deck carries its card's accent, and the class colours
 * stay on the people and on what they say — so the agora is the one thing on
 * screen that belongs to neither side.
 *
 * On the risk in the form: columned classical architecture is also the visual
 * language of banks, which would be an unfortunate thing to say on the card
 * arguing against extractive finance. What keeps it an agora and not a bank is
 * that you can see straight through it — eight columns with gaps wider than
 * they are, no walls, nothing hidden behind the facade. The roof and the
 * members are solid stone, but every bay between the columns is sky, and that
 * is the whole defence: a dense colonnade would read as imposing, this one
 * reads as public. Keep the bays open.
 *
 * Nothing is captioned and nothing is written in the bubbles. Their widths
 * vary instead — identical rounded boxes read as loading skeletons, boxes of
 * differing widths read as utterances.
 *
 * Both characters are instanced through `<use>` off a single hidden sprite in
 * `<defs>`, NOT rendered sixteen times. Carlo.svg alone is ~580 KB / 336 paths
 * and svgr inlines it into the DOM at every render site, so sixteen literal
 * copies would put many megabytes of path data on the deck's heaviest slide.
 * The sprite pays for one Carlo and one Regardo; the crowd is cheap references
 * to them.
 *
 * Playback follows the Play deck's cards exactly: `isHovered` gates every
 * timer, so the graphic runs during the section's live window, freezes where
 * it stands, and resumes on hover — where it then runs on indefinitely. The
 * caller ORs in `belowLg` so touch devices, which have no hover to fall back
 * on, simply run it forever. Because the renewal clock only advances while the
 * graphic runs, a column is replaced after twenty to thirty seconds of actual
 * playback rather than of wall time.
 *
 * No live data and no interaction — the graphic is inert to the pointer, so a
 * click anywhere on it bubbles to the HeroCard and flips the card. Colors are
 * hardcoded to the dark palette like the other landing card graphics; the card
 * chassis is always dark regardless of theme.
 */

/* Dark theme palette (hardcoded). The building is drawn in one colour, the
   card's own --color-orange at its dark-theme value: a single hue reads as
   material where three saturated ones read as diagram, and taking it from the
   card ties the graphic to the deck it sits in. The class colours stay on the
   people and on what they say. */
const ORANGE_COLOR = '#FF8C00';
/** The illustration frame's own background, from HeroCard. Every gap in the
    masonry is cut out of the building in this colour rather than drawn on it —
    a crack, the joint between two members, the seam between two shards of a
    falling column are all the same thing: the frame showing through. */
const FRAME_BG = '#0D0B14';
const CARD2_COLOR  = '#1F1A30';
const PURPLE_COLOR = '#9D4EDD';
const GOLD_COLOR   = '#FFC300';

/* ── Sprites ─────────────────────────────────────────────────────────────────
   Whole figures, not head crops. Regardo wears a hat that eats about 15% of
   his height while Carlo is bare-headed and fills his own frame to the top, so
   at equal render height Carlo's body reads noticeably larger. The fix is the
   one the landing page already uses everywhere else (CARLO_VIEWBOX in
   LandingClient): pad empty space above Carlo equal to Regardo's hat, so his
   content becomes the lower 85% of a taller box and the two bodies match. With
   both padded to the same shape their aspect ratios agree to within 1%, so a
   single height governs the whole crowd. */
const REGARDO_SRC = { w: 491.52783, h: 788.49512 };
const CARLO_SRC   = { w: 579.04352, h: 781.15955 };
const REGARDO_BOX = { x: 0, y: 0, w: 491.52783, h: 788.49512 };
const CARLO_BOX   = { x: 0, y: -137.85, w: 579.04352, h: 919.01 };
const REGARDO_ASPECT = REGARDO_BOX.w / REGARDO_BOX.h;
const CARLO_ASPECT   = CARLO_BOX.w / CARLO_BOX.h;

/* ── Stage ──────────────────────────────────────────────────────────────────
   The illustration frame is h-[45%] of a 675px card, and the slot's p-5 leaves
   the graphic about 337 x 241. The viewBox matches that ratio to within half a
   percent, so the graphic all but fills the frame and nothing is letterboxed —
   which means the margin under the bottom step is the only space beneath the
   building, and it is deliberately thin. The frame is used end to end: crowd
   across the top, temple along the bottom. */
const VBW = 360;
const VBH = 256;
/* y1 is the lowest the feet may fall, and it stops clear of the pediment ridge
   at 154 so nobody stands on the roof. Stopping much higher than this, though,
   opens a dead band across the middle and the graphic reads as two stacked
   halves rather than as a crowd in front of a building. */
const CROWD = { x0: 16, y0: 10, x1: 344, y1: 142 };

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Everything is derived from this at module load, so the layout is identical
    on the server and in the browser. `Math.random()` during render is exactly
    what makes `AnimatedGiniCard` throw a hydration mismatch today. */
const SEED = 20260902;

/* ── The crowd ──────────────────────────────────────────────────────────────
   A seeded random scatter, relaxed until it spreads evenly. */
const PEOPLE_COUNT = 16;
const BODY_H = 34;
/** Even spacing comes from mutual repulsion, not from the grid the figures
    start on: scattering at random and then pushing every pair apart until they
    settle is what blue noise is, and it reads as evenly spread without ever
    reading as ordered. The ideal gap is elliptical because the figures are
    tall and narrow — side-by-side crowding looks wrong at a distance that
    vertically would be fine. */
const IDEAL_X = 52;
const IDEAL_Y = 42;
const PUSH = 0.5;
const SPREAD_PASSES = 220;

const PEOPLE = (() => {
  const rnd = mulberry32(SEED);

  /* Balanced classes, dealt from a shuffled deck. */
  const deck: boolean[] = Array.from({ length: PEOPLE_COUNT }, (_, i) => i < PEOPLE_COUNT / 2);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  const laid = deck.map((cap, i) => {
    /* A little size variance so the figures read as a crowd with depth rather
       than as a roster of identical cut-outs. */
    const h = BODY_H * (0.9 + rnd() * 0.2);
    return {
      i,
      cap,
      h,
      w: h * (cap ? REGARDO_ASPECT : CARLO_ASPECT),
      x: CROWD.x0 + rnd() * (CROWD.x1 - CROWD.x0),
      y: CROWD.y0 + rnd() * (CROWD.y1 - CROWD.y0),
      color: cap ? GOLD_COLOR : PURPLE_COLOR,
    };
  });

  /* Relax the scatter: any pair inside the ideal ellipse pushes apart, a
     fraction of the overlap per pass, until the whole crowd settles into an
     even spread. Clamping after each pass keeps everyone inside the box — and
     because y1 is the feet limit, it is also what guarantees the gap above the
     roof. */
  for (let pass = 0; pass < SPREAD_PASSES; pass++) {
    for (let i = 0; i < laid.length; i++) {
      for (let j = i + 1; j < laid.length; j++) {
        const a = laid[i];
        const b = laid[j];
        const nx = (b.x - a.x) / IDEAL_X;
        const ny = (b.y - a.y) / IDEAL_Y;
        let nd = Math.hypot(nx, ny);
        if (nd >= 1) continue;
        if (nd < 0.001) nd = 0.001;
        const f = ((1 - nd) * PUSH) / 2;
        a.x -= (nx / nd) * f * IDEAL_X;
        a.y -= (ny / nd) * f * IDEAL_Y;
        b.x += (nx / nd) * f * IDEAL_X;
        b.y += (ny / nd) * f * IDEAL_Y;
      }
    }
    laid.forEach((m) => {
      m.x = Math.min(Math.max(m.x, CROWD.x0 + m.w / 2), CROWD.x1 - m.w / 2);
      m.y = Math.min(Math.max(m.y, CROWD.y0 + m.h / 2), CROWD.y1 - m.h / 2);
    });
  }

  /* Painter's order by where the feet land: whoever stands lower is nearer the
     viewer, so they draw last and any overlap reads as depth, not collision. */
  return laid
    .sort((a, b) => a.y + a.h / 2 - (b.y + b.h / 2))
    .map((m) => ({
      ...m,
      x: +m.x.toFixed(2),
      y: +m.y.toFixed(2),
      /* Speech leaves from the head, which on a whole figure sits well above
         the body's centre — bubbles launched from the middle would come out
         of the chest. */
      mouth: { x: +m.x.toFixed(2), y: +(m.y - m.h * 0.28).toFixed(2) },
    }));
})();

/* ── Who talks to whom ──────────────────────────────────────────────────────
   Cross-class only, and only within arm's reach: with the crowd spread over
   the whole frame, unrestricted pairing sends every other bubble on a
   corner-to-corner journey and the traffic stops reading as conversation. */
const MAX_HOP = 150;
const PAIRS = PEOPLE.flatMap((a, ai) =>
  PEOPLE.flatMap((b, bi) =>
    b.cap !== a.cap && Math.hypot(b.mouth.x - a.mouth.x, b.mouth.y - a.mouth.y) < MAX_HOP
      ? [[ai, bi] as const]
      : [],
  ),
);
/* The list is built sender-major, so walking it one at a time launches several
   bubbles from the same mouth in a row and the traffic bunches in one corner.
   A stride coprime with the length still visits every pair exactly once per
   lap, but consecutive launches come from different people. */
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const PAIR_STRIDE = (() => {
  for (let s = Math.max(2, Math.floor(PAIRS.length / 3)); s < PAIRS.length; s++) {
    if (gcd(s, PAIRS.length) === 1) return s;
  }
  return 1;
})();

/* ── The temple ─────────────────────────────────────────────────────────────
   A Doric elevation along the bottom of the frame, drawn as line work rather
   than mass. Eight columns across 220 units leaves gaps wider than the shafts
   themselves, so the sky shows through the colonnade — which is the whole
   difference between an agora and a bank front. */
const T = {
  apexY: 154,
  /* The architrave is thinner than it was drawn in outline. A filled band
     reads at its mass where an outlined one reads at its edges, so the same
     nine units that looked right hollow sat on the colonnade like a lintel. */
  archY0: 183,
  archY1: 189,
  capY0: 189,
  capY1: 194,
  colY0: 194,
  colX0: 70,
  colX1: 290,
  /* The bottom step lands at stepY + 8, eight units off the bottom edge: enough
     that the building is not cropped, little enough that it reads as standing
     on the floor of the frame rather than floating above a margin. */
  stepY: 240,
  stepH: 4,
};
const COLUMN_COUNT = 8;
const STEP_COUNT = 3;
const BEAM_COUNT = 3;
const COL_PITCH = (T.colX1 - T.colX0) / COLUMN_COUNT;
const COL_W = Math.min(11, COL_PITCH * 0.42);
/** Shafts taper upward, the way a real one does. */
const COL_TOP_W = COL_W * 0.86;
const ARCH_X0 = T.colX0 - 8;
const ARCH_X1 = T.colX1 + 8;
/* The roof spans exactly the entablature it sits on. A real cornice does
   overhang the architrave, but drawn as bare line work the rake ends then stop
   in mid-air with nothing underneath and read as a mistake rather than as a
   cornice — and buying the overhang back would cost a horizontal geison line
   the elevation does not otherwise need. */
const PED_X0 = ARCH_X0;
const PED_X1 = ARCH_X1;

/* ── Solid members ──────────────────────────────────────────────────────────
   The building is filled, not outlined, because everything else on the deck is
   — every other card graphic is built from solid bars, chips and wedges, and a
   wireframe temple was the one drawing in the set that read as a diagram. What
   keeps the fill from turning the agora into a bank front is that the openings
   stay open: the gaps between columns are still wider than the shafts, and the
   pediment is a raking band with an empty tympanum, not a filled triangle. The
   mass is in the members; the light is in the voids.

   MEMBER_STROKE is not decoration. A part flies in shrunk to a fraction of its
   size, and at 0.11 a filled step is a fifth of a unit tall — invisible. The
   stroke does not scale, so a miniature member still draws as a line on the way
   down and thickens into its own mass as it lands. At full size it just softens
   the edge, which is why the filled dimensions below are trimmed to absorb it. */
const MEMBER_STROKE = 0.5;
/** Cut into a member wherever stone meets stone: the joints between the three
    architrave blocks, the cracks through a failing column, and the edges of the
    shards it falls into are all this wide, so the same gap runs through all
    three and the break stays continuous from crack to rubble. */
const SEAM = 0.55;
/** How wide a joint between two members reads. This is NOT SEAM, and the
    difference is the whole reason it exists.

    A joint used to be one SEAM, which comes out at half a device pixel once
    the 360-unit view box is fitted into the ~337px slot. At that size the
    pixel grid decides whether a line exists: measured through a capital, the
    joint under the architrave landed inside one row and rendered at luminance
    129, while the identical joint above it straddled two rows and rendered at
    193 — all but invisible. Same geometry, different phase, and the roof
    looked welded to the beam while the capitals hung visibly below it.

    So a structural joint is sized against the device grid rather than against
    the drawing: wide enough that no phase can swallow it. Cracks and shard
    edges keep SEAM, because they are fracture, they are read at a glance, and
    at this width they would be trenches. */
const JOINT_GAP = 1.8;
/** Cut wider than it reads, because the members on either side each paint
    MEMBER_STROKE / 2 back into the gap. Shards need no such allowance: their
    stroke is the frame colour, so it widens their gap instead of closing it. */
const JOINT = JOINT_GAP + MEMBER_STROKE;
const STEP_T = 1;
/** The abacus: distinctly wider than the shaft, and held off the architrave by
    a joint. Flush and filled, it merges into the beam and the colonnade loses
    its capitals — the one detail that makes solid columns read as carrying
    something rather than as bars propping up a slab. */
const CAP_HW = COL_W * 0.725;
const CAP_Y0 = T.capY0 + JOINT;
/** The shaft's foot, held off the top step by the same joint that holds the
    abacus off the architrave. Standing the columns directly on the stylobate
    fused the two — solid on solid, the base of the colonnade became one shape
    with the steps and the building lost its footing line. */
const COL_Y1 = T.stepY - STEP_T / 2 - JOINT;
/** The roof is one filled triangle, tympanum and all — which is what a real
    one is, a wall of stone between the rakes. It was drawn as a thin raking
    band for a while on the theory that an empty tympanum kept the building
    light, but at the size this renders the band all but vanishes and the
    temple loses its roof: a chevron of hairlines over eight solid columns
    reads as scaffolding. Solid, the silhouette is legible at a glance.

    It is held a joint clear of the architrave, like the abacus is. Flush, the
    triangle and the beam merge into one pentagon and the entablature stops
    existing — which is the exact moment the facade turns into a bank seal.
    The seam is what keeps the roof a thing resting on something. */
const PED_Y0 = T.archY0 - JOINT;
const PED_PATH = `M ${PED_X0} ${PED_Y0.toFixed(2)} L 180 ${T.apexY} L ${PED_X1} ${PED_Y0.toFixed(2)} Z`;

type PartKind = 'step' | 'column' | 'beam' | 'pediment';
type Pt = { x: number; y: number };
/** `mid` is the visual centre of the finished part — where the shrunken piece
    flies to, so it falls centred on itself. `root` is where it grows FROM: a
    column rises off the stylobate and a pediment off the architrave, so those
    scale about their base rather than their middle. Scaling everything about
    its centre leaves a half-grown column hanging in the air above its own
    footing. */
type Part =
  | { kind: 'step'; y: number; x0: number; x1: number; mid: Pt; root: Pt }
  | { kind: 'column'; cx: number; mid: Pt; root: Pt }
  | { kind: 'beam'; x0: number; x1: number; mid: Pt; root: Pt }
  | { kind: 'pediment'; mid: Pt; root: Pt };

/** Assembly order is construction order: you cannot raise a roof over columns
    that are not there, or stand columns on a stylobate that has not been laid.
    Bottom step first, pediment last — which also gives the build a real
    closing beat instead of ending on one more anonymous piece. */
const PARTS: Part[] = (() => {
  const out: Part[] = [];
  for (let s = STEP_COUNT - 1; s >= 0; s--) {
    const y = T.stepY + s * T.stepH;
    const grow = 8 + s * 9;
    out.push({ kind: 'step', y, x0: T.colX0 - grow, x1: T.colX1 + grow, mid: { x: 180, y }, root: { x: 180, y } });
  }
  for (let i = 0; i < COLUMN_COUNT; i++) {
    const cx = T.colX0 + COL_PITCH * (i + 0.5);
    out.push({ kind: 'column', cx, mid: { x: cx, y: (T.capY0 + COL_Y1) / 2 }, root: { x: cx, y: COL_Y1 } });
  }
  const beamW = (ARCH_X1 - ARCH_X0) / BEAM_COUNT;
  for (let i = 0; i < BEAM_COUNT; i++) {
    /* The joints are cut out of the blocks themselves rather than drawn over
       them, so three filled beams still read as three and the ends of the run
       stay flush with the roof above them. */
    const x0 = ARCH_X0 + beamW * i + (i ? JOINT / 2 : 0);
    const x1 = ARCH_X0 + beamW * (i + 1) - (i < BEAM_COUNT - 1 ? JOINT / 2 : 0);
    const bm = { x: (x0 + x1) / 2, y: (T.archY0 + T.archY1) / 2 };
    out.push({ kind: 'beam', x0, x1, mid: bm, root: bm });
  }
  out.push({ kind: 'pediment', mid: { x: 180, y: (T.apexY + PED_Y0) / 2 }, root: { x: 180, y: PED_Y0 } });
  return out;
})();

/** Columns are the only pieces the renewal cycle ever pulls down: a step or
    the roof coming out would leave everything above it standing on nothing. */
const COLUMN_PART_INDICES = PARTS.flatMap((p, i) => (p.kind === 'column' ? [i] : []));

/* ── Traffic ────────────────────────────────────────────────────────────────
   A new bubble launches every FLIGHT/CONCURRENT, and the oldest is dropped as
   it arrives. Widths vary so they read as utterances of different lengths
   rather than as identical loading chips. Endpoints are pulled back off each
   speaker so a bubble is never parked on the face saying it. */
const CONCURRENT = 6;
const FLIGHT_MS = 1700;
const LAUNCH_MS = FLIGHT_MS / CONCURRENT;
const BUBBLE_H = 10;
const BUBBLE_WIDTHS = [16, 21, 26, 31];
const MOUTH_OFFSET = 14;

/* ── Timing ─────────────────────────────────────────────────────────────────
   Fifteen pieces at one per DROP_MS, and then the building is finished for
   good — it is never cleared and never rebuilt. The clock only advances while
   the graphic runs. */
const DROP_MS = 1200;
/** One continuous arrival: a piece grows the whole way down and reaches full
    size exactly as it lands. Must stay under DROP_MS or arrivals overlap. */
const ARRIVE_MS = 1000;
/** How small each part starts. Chosen per kind so every piece is roughly the
    same size on the way down — a step is 240 units wide and a column 50 tall,
    so one shared factor would send a sliver and a boulder. */
const MINI_SCALE: Record<PartKind, number> = {
  step: 0.11,
  column: 0.48,
  beam: 0.32,
  pediment: 0.13,
};
const TOTAL_DROPS = PARTS.length;
/* Upkeep: once the temple stands, one column is replaced on this interval, the
   wait re-rolled inside the range every time so it never becomes a metronome.
   The order is strict — the old column comes apart and the rubble is gone
   before the new one starts down. Overlapping the two only muddled it.

   THESE TWO ARE THE DESIGN KNOB. Drop them to 3_000 / 5_000 to watch a break
   every few seconds while working on one; put them back before committing.
   Note the wait is counted in DROP_MS ticks and the clock only runs while the
   graphic does, so on desktop it is twenty to thirty seconds of hovering, not
   of sitting there. The floor is about 4 s: a break costs three ticks of its
   own (crack, fall, replacement) whatever this says. */
const RENEW_MIN_MS = 2_000;
const RENEW_MAX_MS = 3_000;

/* ── Demolition ─────────────────────────────────────────────────────────────
   A column does not shrink away, it breaks, and it breaks in two beats. First
   the fracture: cracks run through the standing shaft one after another until
   the whole network is drawn and you can see every piece the column is about
   to become. Only then does it let go, and the pieces drop straight down and
   dissolve as they reach the floor of the agora.

   The pieces come from splitting, not from dicing. Starting with the shaft and
   the capital as two polygons and repeatedly cutting one in half along a
   random line gives shards of genuinely different sizes and shapes — stone
   parts unevenly. A grid gives eighteen identical bricks, which is a wall, not
   a break. Which piece gets split is decided by a tournament of two on area:
   always taking the largest converges on uniform pieces, taking one at random
   leaves slivers.

   The fall runs top down: pieces are ranked by height and let go one stagger
   apart, so the column erodes downward. Each takes its own time, scaled by the
   square root of the distance the way a dropped thing does — with one shared
   duration a chip falling five units drifts while a shard falling fifty races,
   and the two never look like the same gravity. Sideways movement is kept
   small on purpose: they fall, they are not thrown.

   Each beat gets a whole DROP_MS tick — crack, fall, then the replacement. */
const RUBBLE_PIECES = 18;
/** The fracture finishes well inside its tick, leaving the fully cracked
    column standing for a beat before it goes. */
const CRACK_MS = 820;
/** How far a crack swings off square, and how often one runs lengthwise down
    the shaft instead of across it. All-across reads as courses of masonry;
    the odd upright split is what makes the break look like a break. */
const CRACK_SWING = 0.5;
const CRACK_UPRIGHT_CHANCE = 0.3;
/** Cracks wander. A cut made with a straight line leaves every piece a clean
    convex shard with ruler edges, and a column full of those reads as cracked
    glass or a mosaic — the geometry is right and the material is wrong. Stone
    fails along a jagged path, so each cut is a short polyline that wobbles off
    the straight run between its two ends and settles back onto them.

    The amplitude is a fraction of the crack's own length, capped, so a long
    cut across the shaft jags visibly while a short one between two chips does
    not fold over on itself. STEPS is how many kinks; three is enough to stop
    reading as a line and few enough to keep the shard count honest — every
    kink makes the pieces less convex, and the split routine can only cut a
    piece whose boundary a straight line crosses exactly twice. */
const CRACK_JAG_STEPS = 3;
const CRACK_JAG = 0.1;
const CRACK_JAG_MAX = 1.5;
/** Time for the longest fall — everything shorter is scaled down from it. */
const RUBBLE_FALL_MS = 620;
const RUBBLE_STAGGER_MS = 16;
/** A piece holds its ink until it is nearly down, then dissolves over the last
    stretch, so it is seen to arrive at the floor rather than to evaporate on
    the way there. */
const RUBBLE_FADE_AT = 0.8;
/** The floor of the agora — the bottom step, which is where rubble comes to
    rest and goes out. */
const RUBBLE_FLOOR = T.stepY + (STEP_COUNT - 1) * T.stepH;

type Pt2 = [number, number];

const polyArea = (p: Pt2[]) => {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[(i + 1) % p.length];
    a += p[i][0] * q[1] - q[0] * p[i][1];
  }
  return Math.abs(a) / 2;
};

const polyCentre = (p: Pt2[]): Pt2 => {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[(i + 1) % p.length];
    const w = p[i][0] * q[1] - q[0] * p[i][1];
    a += w;
    cx += (p[i][0] + q[0]) * w;
    cy += (p[i][1] + q[1]) * w;
  }
  a *= 0.5;
  return Math.abs(a) < 1e-6 ? p[0] : [cx / (6 * a), cy / (6 * a)];
};

/** Cut a convex polygon with the line through `o` with normal `n`. Returns the
    two halves and the chord between them — the chord is the crack, so the
    crack drawn in the first beat and the edge the pieces separate along in the
    second are the same line by construction. */
/** The kinks of one crack: points strung between its two ends, pushed off the
    straight run by an amount that tapers to nothing at either end — the ends
    are pinned to the boundary the cut starts and finishes on, so only the
    middle is free to wander. */
function jagBetween(from: Pt2, to: Pt2, rnd: () => number): Pt2[] {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy);
  if (len < 0.5) return [];
  const px = -dy / len;
  const py = dx / len;
  const amp = Math.min(CRACK_JAG_MAX, len * CRACK_JAG);
  const out: Pt2[] = [];
  for (let k = 1; k <= CRACK_JAG_STEPS; k++) {
    /* Kinks sit at uneven intervals as well as uneven depths; evenly spaced
       ones read as a zigzag ornament rather than as a fracture. */
    const t = (k + (rnd() - 0.5) * 0.6) / (CRACK_JAG_STEPS + 1);
    const off = (rnd() * 2 - 1) * amp * Math.sin(Math.PI * t);
    out.push([from[0] + dx * t + px * off, from[1] + dy * t + py * off]);
  }
  return out;
}

/** Splice a crack's kinks into one of the two rings that share it, in whatever
    direction that ring happens to traverse the cut. Both halves get the same
    points, so the two pieces still tile exactly along the jagged edge. */
function spliceJag(ring: Pt2[], from: Pt2, to: Pt2, jag: Pt2[]) {
  const i = ring.indexOf(from);
  if (i >= 0 && ring[(i + 1) % ring.length] === to) {
    ring.splice(i + 1, 0, ...jag);
    return;
  }
  const j = ring.indexOf(to);
  if (j >= 0) ring.splice(j + 1, 0, ...[...jag].reverse());
}

function halve(poly: Pt2[], o: Pt2, n: Pt2, rnd: () => number):
  { a: Pt2[]; b: Pt2[]; crack: Pt2[] } | null {
  const side = (p: Pt2) => (p[0] - o[0]) * n[0] + (p[1] - o[1]) * n[1];
  const a: Pt2[] = [];
  const b: Pt2[] = [];
  const hits: Pt2[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const dp = side(p);
    const dq = side(q);
    if (dp >= 0) a.push(p);
    if (dp <= 0) b.push(p);
    if ((dp > 0 && dq < 0) || (dp < 0 && dq > 0)) {
      const t = dp / (dp - dq);
      /* One object, pushed to both rings: the rings can then be found again by
         identity when the kinks are spliced in. */
      const x: Pt2 = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
      a.push(x);
      b.push(x);
      hits.push(x);
    }
  }
  /* More than two crossings means the straight probe re-entered the piece —
     which jagged, non-convex pieces let happen. The caller simply tries
     another cut. */
  if (hits.length !== 2 || a.length < 3 || b.length < 3) return null;
  const jag = jagBetween(hits[0], hits[1], rnd);
  spliceJag(a, hits[0], hits[1], jag);
  spliceJag(b, hits[0], hits[1], jag);
  return { a, b, crack: [hits[0], ...jag, hits[1]] };
}

/** One piece of a broken column. Positions are absolute in the view box;
    dx/dy/rot/dur are where it ends up and how long it takes, resolved once
    when the column cracks — never during render, or a re-render would retarget
    a falling piece (and re-renders happen every time a bubble launches). */
interface Fragment {
  d: string;
  ox: number;
  oy: number;
  dx: number;
  dy: number;
  rot: number;
  dur: number;
  delay: number;
}

/** A column's break: the cracks that appear first, and the pieces they leave. */
interface Break {
  cracks: string[];
  pieces: Fragment[];
}

const pathOf = (poly: Pt2[]) =>
  `M ${poly.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(' L ')} Z`;

/** Break a standing column apart. */
function shatter(cx: number, rnd: () => number): Break {
  const hwBot = COL_W / 2;
  const hwTop = COL_TOP_W / 2;
  /* The shaft and the capital, exactly as they are drawn standing, so the
     pieces put back together are the column that was there. */
  const parts: Pt2[][] = [
    [
      [cx - hwBot, COL_Y1],
      [cx - hwTop, T.colY0],
      [cx + hwTop, T.colY0],
      [cx + hwBot, COL_Y1],
    ],
    [
      [cx - CAP_HW, T.capY1],
      [cx - CAP_HW, CAP_Y0],
      [cx + CAP_HW, CAP_Y0],
      [cx + CAP_HW, T.capY1],
    ],
  ];

  const cracks: string[] = [];
  /* No piece may end up smaller than this, or the break sheds dust rather than
     shards. */
  const floor = (polyArea(parts[0]) + polyArea(parts[1])) / (RUBBLE_PIECES * 2.6);

  for (let guard = 0; parts.length < RUBBLE_PIECES && guard < RUBBLE_PIECES * 40; guard++) {
    const i = Math.floor(rnd() * parts.length);
    const j = Math.floor(rnd() * parts.length);
    const idx = polyArea(parts[i]) >= polyArea(parts[j]) ? i : j;
    const poly = parts[idx];
    const c = polyCentre(poly);
    const ang =
      rnd() < CRACK_UPRIGHT_CHANCE
        ? Math.PI / 2 + (rnd() * 2 - 1) * CRACK_SWING
        : (rnd() * 2 - 1) * CRACK_SWING;
    const hit = halve(
      poly,
      [c[0] + (rnd() * 2 - 1) * 1.6, c[1] + (rnd() * 2 - 1) * 2.2],
      [Math.sin(ang), Math.cos(ang)],
      rnd,
    );
    if (!hit || polyArea(hit.a) < floor || polyArea(hit.b) < floor) continue;
    parts.splice(idx, 1, hit.a, hit.b);
    cracks.push(
      `M ${hit.crack.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(' L ')}`,
    );
  }

  const maxDrop = RUBBLE_FLOOR - T.capY0;
  const pieces = parts
    .map((poly) => {
      const [ox, oy] = polyCentre(poly);
      const drop = RUBBLE_FLOOR - oy + rnd() * 2;
      return { poly, ox, oy, drop, lift: Math.max(0.06, drop / maxDrop) };
    })
    /* Highest first: the top of the column lets go first and the break runs
       down it. */
    .sort((l, r) => l.oy - r.oy)
    .map((p, rank) => ({
      d: pathOf(p.poly),
      ox: +p.ox.toFixed(2),
      oy: +p.oy.toFixed(2),
      /* Barely any: a piece that comes off a column drops, it is not thrown.
         Enough drift to keep the shards from falling as one solid stack. */
      dx: +((rnd() * 2 - 1) * (0.6 + 2.4 * p.lift)).toFixed(2),
      dy: +p.drop.toFixed(2),
      rot: +((rnd() * 2 - 1) * (5 + 20 * p.lift)).toFixed(1),
      dur: Math.round(RUBBLE_FALL_MS * Math.sqrt(p.lift)),
      delay: rank * RUBBLE_STAGGER_MS,
    }));

  return { cracks, pieces };
}

interface Bubble {
  id: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  width: number;
  tailDown: boolean;
  bornAt: number;
}
export default function RoundTable({ isHovered }: { isHovered: boolean }) {
  const uid = useId().replace(/:/g, '');
  /** Parts of the temple that have been dropped, each with the point in the air
      it was shed from, so it can fly in from there and grow into place. `gen`
      is bumped when a column is replaced, so the arriving column is keyed as a
      new element and plays its entrance from the start rather than being
      matched to the one that just came down. */
  const [built, setBuilt] = useState<{ i: number; from: { x: number; y: number }; gen: number }[]>([]);
  /** The column currently being broken, if one is: its cracks while they are
      still spreading through it, then its pieces once it lets go. */
  const [breaking, setBreaking] = useState<{ id: number; falling: boolean; b: Break } | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [reduced, setReduced] = useState(false);
  /** Latched when the last piece is laid, and never cleared — the settle pulse
      belongs to finishing the building, not to having all fifteen parts on
      screen. Counting parts would dip every time a column is knocked out and
      fire the pulse again while its replacement was still falling. */
  const [raised, setRaised] = useState(false);

  /* Drops read the live bubble list to find something to fall out of, but must
     not re-subscribe every time that list changes. */
  const bubblesRef = useRef<Bubble[]>([]);
  bubblesRef.current = bubbles;

  /* Reduced motion gets the finished temple and none of the build — the same
     bargain the other landing graphics strike. */
  useEffect(() => {
    if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    setReduced(true);
    setBuilt(PARTS.map((part, i) => ({ i, from: part.mid, gen: 0 })));
    setRaised(true);
  }, []);

  const running = isHovered && !reduced;

  /* ── Traffic loop ──────────────────────────────────────────────────────── */
  const launchRef = useRef(0);
  useEffect(() => {
    if (!running) return;
    const launch = () => {
      const n = launchRef.current++;
      const [fromI, toI] = PAIRS[(n * PAIR_STRIDE) % PAIRS.length];
      const a = PEOPLE[fromI].mouth;
      const b = PEOPLE[toI].mouth;
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const ux = (b.x - a.x) / len;
      const uy = (b.y - a.y) / len;
      setBubbles((list) =>
        [
          ...list,
          {
            id: n,
            from: { x: a.x + ux * MOUTH_OFFSET, y: a.y + uy * MOUTH_OFFSET },
            to: { x: b.x - ux * MOUTH_OFFSET, y: b.y - uy * MOUTH_OFFSET },
            color: PEOPLE[fromI].color,
            width: BUBBLE_WIDTHS[n % BUBBLE_WIDTHS.length],
            /* The tail points back at whoever is speaking. */
            tailDown: a.y > b.y,
            bornAt: performance.now(),
          },
        ].slice(-CONCURRENT),
      );
    };
    launch();
    const id = setInterval(launch, LAUNCH_MS);
    return () => clearInterval(id);
  }, [running]);

  /* ── Assembly and upkeep loop ──────────────────────────────────────────────
     A resumable clock rather than a fixed schedule: pausing has to leave the
     build exactly where it stood, so the phase lives in refs and the interval
     simply does not run while the card is idle. The one DROP_MS interval does
     both jobs — laying the fifteen pieces, then counting out the wait between
     column replacements. A tick is 1.2 s against a wait of twenty seconds or
     more, so the coarse granularity costs nothing and the graphic keeps a
     single clock. */
  const dropRef = useRef(0);
  const sinceRenewRef = useRef(0);
  const nextRenewRef = useRef(0);
  const genRef = useRef(0);
  const lastRenewedRef = useRef(-1);
  /** The demolition in progress, and which beat it is on. Held in a ref
      because the tick closure has to read it without being rebuilt. */
  const breakRef = useRef<{ i: number; gen: number; falling: boolean } | null>(null);
  useEffect(() => {
    if (!running) return;

    /** Where a piece is shed from: whichever bubble is nearest the middle of
        its flight — it is the one furthest from a speaker, so the fall reads
        cleanly. Falls back to the middle of the crowd when nothing is in the
        air, which only happens on the very first tick. */
    const shedPoint = () => {
      const now = performance.now();
      const live = bubblesRef.current
        .map((b) => ({ b, p: Math.min(1, (now - b.bornAt) / FLIGHT_MS) }))
        .filter(({ p }) => p > 0.15 && p < 0.85)
        .sort((l, r) => Math.abs(l.p - 0.5) - Math.abs(r.p - 0.5));

      return live.length
        ? {
            x: live[0].b.from.x + (live[0].b.to.x - live[0].b.from.x) * live[0].p,
            y: live[0].b.from.y + (live[0].b.to.y - live[0].b.from.y) * live[0].p,
          }
        : { x: (CROWD.x0 + CROWD.x1) / 2, y: (CROWD.y0 + CROWD.y1) / 2 };
    };

    const drop = (index: number) => {
      const src = shedPoint();
      setBuilt((list) =>
        list.some((b) => b.i === index) ? list : [...list, { i: index, from: src, gen: 0 }],
      );
    };

    /** Re-arm the wait, re-rolled each time inside the range. */
    const armRenew = () => {
      sinceRenewRef.current = 0;
      nextRenewRef.current = RENEW_MIN_MS + Math.random() * (RENEW_MAX_MS - RENEW_MIN_MS);
    };

    /** Beat one: crack a column. It goes on standing — only the fracture is
        drawn over it — and both the cracks and the pieces they will leave are
        resolved now, from one split, so the second beat separates the column
        along exactly the lines the first beat drew. Never the same column
        twice running, or the upkeep reads as one bad pillar rather than as a
        building being kept up. */
    const crack = () => {
      let pick = lastRenewedRef.current;
      while (pick === lastRenewedRef.current) {
        pick = COLUMN_PART_INDICES[Math.floor(Math.random() * COLUMN_PART_INDICES.length)];
      }
      lastRenewedRef.current = pick;
      const part = PARTS[pick];
      if (part.kind !== 'column') return;
      const gen = (genRef.current += 1);
      breakRef.current = { i: pick, gen, falling: false };
      setBreaking({ id: gen, falling: false, b: shatter(part.cx, Math.random) });
    };

    /** Beat two: let it go. The standing column is unmounted in the same
        commit that mounts its pieces, and the pieces start exactly where its
        outline and cracks were, so nothing moves until they fall. */
    const collapse = (b: { i: number }) => {
      setBreaking((cur) => (cur ? { ...cur, falling: true } : cur));
      setBuilt((list) => list.filter((x) => x.i !== b.i));
    };

    /** Beat three: send the replacement down and clear the wreckage. Parts are
        kept in construction order so paint order does not shuffle every time a
        column is renewed. */
    const rebuild = ({ i, gen }: { i: number; gen: number }) => {
      const src = shedPoint();
      setBreaking(null);
      setBuilt((list) => [...list, { i, from: src, gen }].sort((a, b) => a.i - b.i));
    };

    const tick = () => {
      if (dropRef.current < TOTAL_DROPS) {
        drop(dropRef.current);
        dropRef.current += 1;
        if (dropRef.current === TOTAL_DROPS) {
          armRenew();
          setRaised(true);
        }
        return;
      }
      const going = breakRef.current;
      if (going) {
        if (!going.falling) {
          going.falling = true;
          collapse(going);
        } else {
          breakRef.current = null;
          rebuild(going);
        }
        return;
      }
      sinceRenewRef.current += DROP_MS;
      if (sinceRenewRef.current < nextRenewRef.current) return;
      crack();
      armRenew();
    };

    const id = setInterval(tick, DROP_MS);
    return () => clearInterval(id);
  }, [running]);

  /* A part is ONE element for its whole life: it is the real geometry, shrunk,
     flown down from wherever the bubble shed it, and then scaled up to full
     size in place. An earlier version drew a separate little icon and swapped
     it for the real part on landing, which is a crossfade however you tune it
     — the small one popped and dissolved instead of growing. Keeping a single
     element means the growth is the same object the whole way.

     `vector-effect: non-scaling-stroke` is what makes that possible: without
     it, shrinking a 240-unit step to thumbnail size takes its 1.5-unit stroke
     down to 0.16 and the piece is invisible on the way down.

     The origin is given in user units against the view box rather than the
     shape's own bounding box, because a horizontal step has a zero-height
     bounding box and percentage origins against it are degenerate. */
  const arrive = (part: Part, from: { x: number; y: number }) => {
    const style = { transformBox: 'view-box' as const, transformOrigin: `${part.root.x}px ${part.root.y}px` };
    if (reduced) return { style, initial: false as const, animate: { x: 0, y: 0, scale: 1, opacity: 1 } };
    const mini = MINI_SCALE[part.kind];
    /* Scaling happens about `root`, so the offset that puts the shrunken
       piece's own centre on the shed point has to account for how far that
       centre has itself been pulled toward the root by the scale. */
    const ox = +(from.x - part.root.x - mini * (part.mid.x - part.root.x)).toFixed(2);
    const oy = +(from.y - part.root.y - mini * (part.mid.y - part.root.y)).toFixed(2);
    /* Position and scale run together over one duration, so the piece swells
       continuously on the way down and is full size at the moment it arrives.
       Splitting them — travel first, then grow — is what made pieces stop
       short and snap: at miniature scale the shape sits collapsed toward its
       root, so the end of the travel leg is nowhere near where the finished
       part's centre belongs, and the growth leg had to cover that gap in one
       jump. Interpolating both at once means the centre slides smoothly from
       the shed point to `mid` and lands there. */
    return {
      style,
      initial: { x: ox, y: oy, scale: mini, opacity: 0 },
      animate: { x: 0, y: 0, scale: 1, opacity: 1 },
      /* No exit: a part leaves by being unmounted on the spot. A demolished
         column is not animated away, it is handed over to its own falling
         blocks, and every other part stands for good. */
      transition: {
        default: { duration: ARRIVE_MS / 1000, ease: [0.4, 0, 0.2, 1] as const },
        opacity: { duration: 0.22 },
      },
    };
  };

  return (
    <svg
      viewBox={`0 0 ${VBW} ${VBH}`}
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="A crowd of Capitalists and Proletarians talking across the frame, raising an open temple along the bottom out of the pieces their exchanges drop. Once it stands the talking carries on, and every so often one of its columns is pulled down and replaced."
    >
      <defs>
        {/* The sprite: one whole Regardo and one whole Carlo, Carlo padded above
            by the height of Regardo's hat so the two bodies match at equal
            height. Never rendered — only referenced. */}
        <svg id={`rt-cap-${uid}`} viewBox={`${REGARDO_BOX.x} ${REGARDO_BOX.y} ${REGARDO_BOX.w} ${REGARDO_BOX.h}`} width={REGARDO_BOX.w} height={REGARDO_BOX.h}>
          <Regardo x={0} y={0} width={REGARDO_SRC.w} height={REGARDO_SRC.h} viewBox={`0 0 ${REGARDO_SRC.w} ${REGARDO_SRC.h}`} />
        </svg>
        <svg id={`rt-pro-${uid}`} viewBox={`${CARLO_BOX.x} ${CARLO_BOX.y} ${CARLO_BOX.w} ${CARLO_BOX.h}`} width={CARLO_BOX.w} height={CARLO_BOX.h}>
          <Carlo x={0} y={0} width={CARLO_SRC.w} height={CARLO_SRC.h} viewBox={`0 0 ${CARLO_SRC.w} ${CARLO_SRC.h}`} />
        </svg>
      </defs>

      {/* ── The temple ── */}
      <motion.g
        animate={raised ? { scale: [1, 1.025, 1] } : { scale: 1 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        <AnimatePresence>
          {built.map(({ i, from, gen }) => {
            const part = PARTS[i];
            const props = arrive(part, from);
            const key = `part-${i}-${gen}`;
            /* Solid stone. No per-part opacity: framer animates opacity to 1
               on arrival and writes it to style, which outranks the SVG
               presentation attribute — the old graded values had not been
               doing anything since the day the parts started flying in. */
            const stone = {
              fill: ORANGE_COLOR,
              stroke: ORANGE_COLOR,
              strokeWidth: MEMBER_STROKE,
              strokeLinejoin: 'round' as const,
              vectorEffect: 'non-scaling-stroke' as const,
            };
            if (part.kind === 'step') {
              return (
                <motion.rect
                  key={key}
                  {...props}
                  x={part.x0}
                  y={part.y - STEP_T / 2}
                  width={part.x1 - part.x0}
                  height={STEP_T}
                  rx={STEP_T / 2}
                  {...stone}
                />
              );
            }
            if (part.kind === 'column') {
              return (
                <motion.g key={key} {...props}>
                  <path
                    d={`M ${(part.cx - COL_W / 2).toFixed(2)} ${COL_Y1} L ${(part.cx - COL_TOP_W / 2).toFixed(2)} ${T.colY0} L ${(part.cx + COL_TOP_W / 2).toFixed(2)} ${T.colY0} L ${(part.cx + COL_W / 2).toFixed(2)} ${COL_Y1} Z`}
                    {...stone}
                  />
                  {/* The abacus: the one place a column is wider than its
                      shaft, and the whole reason a filled colonnade still
                      reads as columns carrying a beam. */}
                  <rect
                    x={part.cx - CAP_HW}
                    y={CAP_Y0}
                    width={CAP_HW * 2}
                    height={T.capY1 - CAP_Y0}
                    {...stone}
                  />
                </motion.g>
              );
            }
            if (part.kind === 'beam') {
              return (
                <motion.rect
                  key={key}
                  {...props}
                  x={part.x0}
                  y={T.archY0}
                  width={part.x1 - part.x0}
                  height={T.archY1 - T.archY0}
                  {...stone}
                />
              );
            }
            return <motion.path key={key} {...props} d={PED_PATH} {...stone} />;
          })}
        </AnimatePresence>

        {/* ── The break ──
            Beat one draws the cracks over the column, which is still standing
            and still one of the built parts. Beat two swaps it for the pieces
            those cracks cut it into: they mount exactly where the column's own
            outline was, so the swap is invisible, and then they fall.

            Each shard carries the seam as its own edge, so two neighbours give
            up half of it each and the gap between them is exactly the crack
            that was there a beat ago — and shards that overlap on the way down
            stay legible instead of fusing into one orange blob. */}
        {breaking && !breaking.falling &&
          breaking.b.cracks.map((d, k) => (
            <motion.path
              key={`crk-${breaking.id}-${k}`}
              d={d}
              stroke={FRAME_BG}
              fill="none"
              strokeWidth={SEAM}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                pathLength: {
                  duration: (CRACK_MS * 0.35) / 1000,
                  delay: ((k / breaking.b.cracks.length) * CRACK_MS * 0.65) / 1000,
                  ease: 'easeOut',
                },
                opacity: {
                  duration: 0.1,
                  delay: ((k / breaking.b.cracks.length) * CRACK_MS * 0.65) / 1000,
                },
              }}
            />
          ))}

        {breaking?.falling &&
          breaking.b.pieces.map((p, k) => (
            <motion.path
              key={`rub-${breaking.id}-${k}`}
              d={p.d}
              fill={ORANGE_COLOR}
              stroke={FRAME_BG}
              strokeWidth={SEAM}
              strokeLinejoin="round"
              style={{ transformBox: 'view-box', transformOrigin: `${p.ox}px ${p.oy}px` }}
              initial={{ x: 0, y: 0, rotate: 0, opacity: 0.95 }}
              animate={{ x: p.dx, y: p.dy, rotate: p.rot, opacity: 0 }}
              transition={{
                default: { duration: p.dur / 1000, delay: p.delay / 1000, ease: 'easeIn' },
                opacity: {
                  duration: (p.dur * (1 - RUBBLE_FADE_AT)) / 1000,
                  delay: (p.delay + p.dur * RUBBLE_FADE_AT) / 1000,
                },
              }}
            />
          ))}
      </motion.g>

      {/* ── Traffic ──
          Drawn beneath the crowd so a bubble emerges from behind one figure and
          disappears behind another. */}
      <AnimatePresence>
        {bubbles.map((b) => (
          <motion.g
            key={`bub-${b.id}`}
            initial={{ x: b.from.x, y: b.from.y, opacity: 0 }}
            animate={{ x: b.to.x, y: b.to.y, opacity: [0, 1, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{
              x: { duration: FLIGHT_MS / 1000, ease: 'linear' },
              y: { duration: FLIGHT_MS / 1000, ease: 'linear' },
              opacity: { duration: FLIGHT_MS / 1000, times: [0, 0.14, 0.82, 1] },
            }}
          >
            <path
              d={`M -2.8 ${(BUBBLE_H / 2) * (b.tailDown ? 1 : -1)} L 2.8 ${(BUBBLE_H / 2) * (b.tailDown ? 1 : -1)} L 0 ${(BUBBLE_H / 2 + 3.5) * (b.tailDown ? 1 : -1)} Z`}
              fill={CARD2_COLOR}
              stroke={b.color}
              strokeWidth="0.9"
              strokeOpacity="0.85"
            />
            <rect
              x={-b.width / 2}
              y={-BUBBLE_H / 2}
              width={b.width}
              height={BUBBLE_H}
              rx="3"
              fill={CARD2_COLOR}
              stroke={b.color}
              strokeWidth="1.1"
              strokeOpacity="0.85"
            />
          </motion.g>
        ))}
      </AnimatePresence>

      {/* ── The crowd ── */}
      {PEOPLE.map((p) => (
        <use
          key={`p-${p.i}`}
          href={`#rt-${p.cap ? 'cap' : 'pro'}-${uid}`}
          x={p.x - p.w / 2}
          y={p.y - p.h / 2}
          width={p.w}
          height={p.h}
        />
      ))}
    </svg>
  );
}
