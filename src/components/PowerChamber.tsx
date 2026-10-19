// src/components/PowerChamber.tsx
"use client";

import React, { useEffect, useId, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ALLOCATIONS, COALITIONS, SEAT_CAPTION, allocationLit, coalitionLit, type ChamberFocus } from '@/config/distribution';

/* ---- Power chamber ----
   The rulebook's distribution of power as a chamber of 100 seats, one per
   percent of the initial supply. The two coalitions sit in their own wings of
   the hemicycle with an aisle between them, each on a ground one surface up
   from the page (card2), bracketed and named round its edge, with its seat
   count and its allocations beneath. Within a wing the seats fill by angle,
   so each allocation is a wedge, its sub-allocations finer wedges of its ink.

   Entrance: once `play` turns on, the seats are called in, whole and one at a
   time, left to right across each wing: the community first, a beat at the
   aisle, then Team & Operations, the counts ticking up as they go. Until then
   the chamber stands empty, its seats outlined; with reduced motion it is
   simply seated.

   Hovering an allocation or a coalition dims the rest and reads its seats in
   the hollow; once seated, a faint holographic foil lies over its seats, the
   site's spectrum in a pool round the pointer, its bands sliding as it moves
   (held still with reduced motion). The hover areas tile each wing, so moving
   between allocations never falls through a gap.

   Drawn in a 520-unit square that scales to the largest square its box holds:
   the SVG by its viewBox, the readouts in units of the drawing's width
   (--chamber, from the box's container size). `compact` is the phone-page
   cut: the drawing cropped to the hemicycle, without the coalition totals,
   the names round the wings or the caption, whose type would print too small
   to read there; the page's index carries them instead. */

const BOX = 520;
const CX = 260;
const CY = 318;
const ROWS = [130, 155, 180, 205, 230];
const AISLE = 14;
/* A seat's radius, and the clearance each wing's ground keeps round its seats:
   from the inner and outer arcs and from both straight edges alike. */
const SEAT = 9;
const PAD = 8;
const GROUND_IN = ROWS[0] - SEAT - PAD;
const GROUND_OUT = ROWS[ROWS.length - 1] + SEAT + PAD;

/* The roll call, in ms: how long each coalition takes to be called (in
   coalition order), the beat held at the aisle between them, and how long a
   called seat takes to grow to full size. */
const CALLS = [1800, 700];
const HOLD = 700;
const POP = 140;
const CALL_START = COALITIONS.map((_, k) => CALLS.slice(0, k).reduce((a, b) => a + b, 0) + HOLD * k);
const END = CALL_START[CALL_START.length - 1] + CALLS[CALLS.length - 1];

/* What isn't focused dims to DIM; the foil lies over the focused seats at HOLO. */
const DIM = 0.2;
const HOLO = 0.2;
const FOIL_POOL = 120;

/* The compact cut's band of the drawing, from the top of the wings' brackets
   to just under the baseline and the hollow's readout. */
const CROP = { top: 52, height: 292 };

/* Rounded so the server and the browser print the same coordinates. */
const f = (n: number) => Number(n.toFixed(2));
/* A chamber unit, as a share of the drawing's width. */
const u = (px: number) => `calc(var(--chamber) * ${f(px / BOX)})`;

function pt(r: number, deg: number): [number, number] {
  const t = (deg * Math.PI) / 180;
  return [CX + r * Math.cos(t), CY - r * Math.sin(t)];
}
/* An annular sector from angle a0 clockwise to a1 (degrees, a0 > a1). */
function sector(ri: number, ro: number, a0: number, a1: number) {
  const large = a0 - a1 > 180 ? 1 : 0;
  const [x0, y0] = pt(ro, a0), [x1, y1] = pt(ro, a1), [x2, y2] = pt(ri, a1), [x3, y3] = pt(ri, a0);
  return `M${f(x0)} ${f(y0)}A${ro} ${ro} 0 ${large} 1 ${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}A${ri} ${ri} 0 ${large} 0 ${f(x3)} ${f(y3)}Z`;
}
function arc(r: number, a0: number, a1: number) {
  const [x0, y0] = pt(r, a0), [x1, y1] = pt(r, a1);
  return `M${f(x0)} ${f(y0)}A${r} ${r} 0 ${a0 - a1 > 180 ? 1 : 0} 1 ${f(x1)} ${f(y1)}`;
}
/* The inverse of ease-in-out cubic: how far through a coalition's call (0-1)
   an eased sweep across its wing reaches a given share of the wing. */
function unease(p: number) {
  return p < 0.5 ? Math.cbrt(p / 4) : 1 - Math.cbrt(2 * (1 - p)) / 2;
}

interface Seat {
  coalition: number;
  r: number;
  deg: number;
  x: number;
  y: number;
  /** When, in the roll call, the seat is called. */
  at: number;
}

function circles(seats: Seat[], r: number) {
  return seats.map((s) => `M${f(s.x - r)} ${s.y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`).join('');
}
/* The seats called by `t`, each whole: it pops in a little small and grows to
   full size over POP. */
function calledCircles(seats: Seat[], t: number) {
  return seats.filter((s) => s.at <= t).map((s) => {
    const age = t - s.at;
    const r = f(SEAT * (age >= POP ? 1 : 0.6 + 0.4 * (1 - Math.pow(1 - age / POP, 3))));
    return `M${f(s.x - r)} ${s.y}a${r} ${r} 0 1 0 ${f(2 * r)} 0a${r} ${r} 0 1 0 ${f(-2 * r)} 0`;
  }).join('');
}

/* ---- Chamber geometry (fixed: built once from the distribution) ---- */

/* Each coalition's wing, an aisle between them, from the left end (180°)
   clockwise to the right (0°). */
const WINGS = (() => {
  const span = 180 - AISLE;
  let a = 180;
  return COALITIONS.map((c) => {
    const a0 = a, a1 = a - (span * c.share) / 100;
    a = a1 - AISLE;
    return { a0, a1 };
  });
})();

/* A coalition's seats per row: the gaps between seats are shared out in
   proportion to each row's length between its end seats, so every row is
   spaced alike (largest remainder; on a tie the outer row takes the seat). */
function rowCounts(total: number, spanDeg: number) {
  const len = ROWS.map((r) => (r * spanDeg * Math.PI) / 180 - 2 * (SEAT + PAD));
  const sum = len.reduce((a, b) => a + b, 0), gaps = total - ROWS.length;
  const raw = len.map((l) => 1 + (gaps * l) / sum);
  const out = raw.map(Math.floor);
  const left = total - out.reduce((a, b) => a + b, 0);
  raw.map((v, i) => [v - Math.floor(v), i])
    .sort((a, b) => b[0] - a[0] || b[1] - a[1])
    .slice(0, left)
    .forEach(([, i]) => { out[i] += 1; });
  return out;
}

/* Every seat, wing by wing, ordered by angle so allocations fill as wedges.
   Each row's end seats sit SEAT + PAD in from its wing's straight edges. A
   seat is called as an eased sweep across its wing would reach it. */
const SEATS: Seat[] = COALITIONS.flatMap((c, k) => {
  const { a0, a1 } = WINGS[k];
  const counts = rowCounts(c.share, a0 - a1);
  const seats: Seat[] = [];
  ROWS.forEach((r, ri) => {
    const inset = (Math.asin((SEAT + PAD) / r) * 180) / Math.PI;
    const from = a0 - inset, to = a1 + inset, n = counts[ri];
    for (let j = 0; j < n; j++) {
      const deg = n === 1 ? (from + to) / 2 : from - (j * (from - to)) / (n - 1);
      const [x, y] = pt(r, deg);
      seats.push({ coalition: k, r, deg, x: f(x), y: f(y), at: CALL_START[k] + CALLS[k] * unease((a0 - deg) / (a0 - a1)) });
    }
  });
  return seats.sort((p, q) => q.deg - p.deg || p.r - q.r);
});

/* The seats in allocation order, each allocation (or its sub-allocations)
   taking the next run of seats; and each allocation's angular extent. */
const { PARTS, EXTENTS } = (() => {
  const parts: { allocation: number; color: string; seats: Seat[]; d: string }[] = [];
  const extents = ALLOCATIONS.map(() => ({ max: -Infinity, min: Infinity }));
  let next = 0;
  ALLOCATIONS.forEach((a, i) => {
    const pieces = a.subs.length ? a.subs.map((s) => ({ share: s.share, color: s.color })) : [{ share: a.share, color: a.ink }];
    pieces.forEach((p) => {
      const seats = SEATS.slice(next, next + p.share);
      next += p.share;
      seats.forEach((s) => {
        extents[i].max = Math.max(extents[i].max, s.deg);
        extents[i].min = Math.min(extents[i].min, s.deg);
      });
      parts.push({ allocation: i, color: p.color, seats, d: circles(seats, SEAT) });
    });
  });
  return { PARTS: parts, EXTENTS: extents };
})();

/* Each allocation's hover area runs to the midpoint between it and its
   neighbours, and to its wing's edges at either end, so the areas tile the
   wing. */
const ALLOCATION_HITS = ALLOCATIONS.map((a, i) => {
  const { a0, a1 } = WINGS[a.coalition];
  const prev = i > 0 && ALLOCATIONS[i - 1].coalition === a.coalition ? EXTENTS[i - 1] : null;
  const next = i < ALLOCATIONS.length - 1 && ALLOCATIONS[i + 1].coalition === a.coalition ? EXTENTS[i + 1] : null;
  return sector(GROUND_IN, GROUND_OUT, prev ? (prev.min + EXTENTS[i].max) / 2 : a0, next ? (EXTENTS[i].min + next.max) / 2 : a1);
});

/* Each wing's ground, its bracket just outside it, the arc its name is set
   along, and the band round that name that focuses the coalition. */
const WING_SHAPES = WINGS.map(({ a0, a1 }) => {
  const [t0x, t0y] = pt(GROUND_OUT, a0), [t1x, t1y] = pt(GROUND_OUT, a1);
  return {
    ground: sector(GROUND_IN, GROUND_OUT, a0, a1),
    bracket: `M${f(t0x)} ${f(t0y)}${arc(GROUND_OUT + 6, a0, a1).replace(/^M/, 'L')}L${f(t1x)} ${f(t1y)}`,
    nameArc: arc(GROUND_OUT + 14, a0, a1),
    hit: sector(GROUND_OUT, GROUND_OUT + 28, a0, a1),
  };
});

const EMPTY = circles(SEATS, SEAT - 0.5);
const FOIL_ALLOCATION = ALLOCATIONS.map((_, i) => PARTS.filter((p) => p.allocation === i).map((p) => p.d).join(''));
const FOIL_COALITION = COALITIONS.map((_, k) => circles(SEATS.filter((s) => s.coalition === k), SEAT));
const COALITION_SEATS = COALITIONS.map((_, k) => SEATS.filter((s) => s.coalition === k));

const FOIL_STOPS = ['#FF6FD8', '#FFD36E', '#9CFF8A', '#62E6FF', '#8F7BFF', '#FF6FD8'];

const DESCRIPTION = `Distribution of power: a chamber of 100 seats, one per percent of the initial supply. ${COALITIONS.map(
  (c) => `${c.name} holds ${c.share} seats: ${c.allocations.map((a) => `${a.name} ${a.share}`).join(', ')}.`,
).join(' ')}`;

export default function PowerChamber({
  play,
  compact = false,
  focus,
  onHover,
  onLeave,
  onSelect,
}: {
  /** Call the seats in. Off, the chamber stands empty. */
  play: boolean;
  /** The phone-page cut: the hemicycle alone. */
  compact?: boolean;
  focus: ChamberFocus;
  onHover: (focus: ChamberFocus) => void;
  onLeave: () => void;
  /** A click or tap: on a coalition or allocation, or on the empty chamber (null). */
  onSelect: (focus: ChamberFocus) => void;
}) {
  const id = `chamber-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const still = useReducedMotion() ?? false;
  const { top, height } = compact ? CROP : { top: 0, height: BOX };

  /* The roll call's clock, ms since it began. */
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!play) {
      setT(0);
      return;
    }
    if (still) {
      setT(END);
      return;
    }
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const elapsed = Math.min(END, now - start);
      setT(elapsed);
      if (elapsed < END) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [play, still]);

  /* The foil follows the pointer, in chamber units (the landing may zoom the
     section), at most once a frame. It writes the gradients' attributes
     directly; React never sets them after mount, so a re-render can't reset
     them, and no move re-renders. */
  const bandsRef = useRef<SVGLinearGradientElement>(null);
  const poolRef = useRef<SVGRadialGradientElement>(null);
  const pointRef = useRef<[number, number]>([CX, 220]);
  const frameRef = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);
  const track = (e: React.PointerEvent<SVGSVGElement>) => {
    if (still || e.pointerType === 'touch') return;
    const rect = e.currentTarget.getBoundingClientRect();
    pointRef.current = [((e.clientX - rect.left) * BOX) / (rect.width || 1), top + ((e.clientY - rect.top) * height) / (rect.height || 1)];
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      const [x, y] = pointRef.current;
      poolRef.current?.setAttribute('cx', `${f(x)}`);
      poolRef.current?.setAttribute('cy', `${f(y)}`);
      bandsRef.current?.setAttribute('gradientTransform', `translate(${f(x * 0.35)} ${f(y * 0.2)})`);
    });
  };

  const seated = play && t >= END;
  const counts = COALITION_SEATS.map((seats) => (play ? seats.filter((s) => s.at <= t).length : 0));

  /* The hollow reads the focus; at rest, the whole chamber; during the call,
     the seats called so far and whose they are. Empty before the call. */
  let readout: { value: number; label: string } | null = null;
  if (focus) {
    const held = focus.kind === 'allocation' ? ALLOCATIONS[focus.index] : COALITIONS[focus.index];
    readout = { value: held.share, label: `seats · ${held.name}` };
  } else if (seated) {
    readout = { value: 100, label: 'seats in the chamber' };
  } else if (play) {
    const calling = COALITIONS.findIndex((c, k) => counts[k] < c.share);
    readout = {
      value: counts.reduce((a, b) => a + b, 0),
      label: calling > 0 && counts[calling] === 0 ? `${COALITIONS[calling - 1].name} seated` : `seats called · ${COALITIONS[Math.max(0, calling)].name}`,
    };
  }

  const foil = seated && focus ? (focus.kind === 'allocation' ? FOIL_ALLOCATION[focus.index] : FOIL_COALITION[focus.index]) : '';
  const targets = (target: ChamberFocus) => ({
    onMouseEnter: () => onHover(target),
    onMouseLeave: onLeave,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(target);
    },
  });

  return (
    <div className="relative size-full" style={{ containerType: 'size' }}>
      {/* Centred by margin, not translate: inside the rulebook's 3D scene
          Chrome doesn't hit-test a transformed layer, so a translated square
          would never see the pointer. */}
      <div
        className="absolute inset-0 m-auto"
        style={{ '--chamber': `min(100cqw, ${f((100 * BOX) / height)}cqh)`, width: 'var(--chamber)', height: u(height) } as React.CSSProperties}
      >
        <svg
          viewBox={`0 ${top} ${BOX} ${height}`}
          className="absolute inset-0 size-full overflow-visible"
          role="img"
          aria-label={DESCRIPTION}
          onPointerMove={track}
          onClick={() => onSelect(null)}
        >
          <defs>
            {WING_SHAPES.map((w, k) => (
              <path key={k} id={`${id}-name-${k}`} d={w.nameArc} />
            ))}
            <linearGradient ref={bandsRef} id={`${id}-foil`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="96" y2="44" spreadMethod="repeat">
              {FOIL_STOPS.map((color, i) => (
                <stop key={i} offset={i / (FOIL_STOPS.length - 1)} stopColor={color} />
              ))}
            </linearGradient>
            <radialGradient ref={poolRef} id={`${id}-pool-fill`} gradientUnits="userSpaceOnUse" cx={CX} cy={220} r={still ? BOX : FOIL_POOL}>
              <stop offset="0" stopColor="#FFFFFF" />
              <stop offset="0.35" stopColor="#FFFFFF" />
              <stop offset="1" stopColor="#000000" />
            </radialGradient>
            <mask id={`${id}-pool`} maskUnits="userSpaceOnUse" x="0" y="0" width={BOX} height={BOX}>
              <rect width={BOX} height={BOX} fill={`url(#${id}-pool-fill)`} />
            </mask>
          </defs>

          {WING_SHAPES.map((w, k) => (
            <path key={k} d={w.ground} className="fill-card2 transition-opacity duration-250" style={{ opacity: coalitionLit(focus, k) ? 1 : DIM }} />
          ))}
          <path d={`M16 ${CY + 14}L${BOX - 16} ${CY + 14}`} className="stroke-text2" strokeOpacity={0.3} />
          <path d={EMPTY} fill="none" className="stroke-text2" strokeOpacity={0.18} style={{ opacity: seated ? 0 : 1 }} />
          {PARTS.map((p, k) => (
            <path
              key={k}
              d={!play ? '' : seated ? p.d : calledCircles(p.seats, t)}
              fill={p.color}
              className="transition-opacity duration-250"
              style={{ opacity: allocationLit(focus, p.allocation) ? 1 : DIM }}
            />
          ))}
          <path
            d={foil}
            fill={`url(#${id}-foil)`}
            mask={`url(#${id}-pool)`}
            className="pointer-events-none transition-opacity duration-350 saturate-[1.15] brightness-[1.08]"
            style={{ opacity: foil ? HOLO : 0 }}
          />
          {WING_SHAPES.map((w, k) => {
            const called = counts[k] === COALITIONS[k].share;
            const opacity = called ? (coalitionLit(focus, k) ? 1 : DIM) : 0.15;
            return (
              <g key={k} className="pointer-events-none transition-opacity duration-250" style={{ opacity }}>
                <path d={w.bracket} fill="none" className="stroke-text" strokeOpacity={0.6} strokeWidth={1.5} />
                {!compact && (
                  <text className="fill-text font-mono font-bold uppercase" style={{ fontSize: 10, letterSpacing: '0.16em' }}>
                    <textPath href={`#${id}-name-${k}`} startOffset="50%" textAnchor="middle">
                      {COALITIONS[k].name}
                    </textPath>
                  </text>
                )}
              </g>
            );
          })}
          {WING_SHAPES.map((w, k) => (
            <path key={k} d={w.hit} fill="transparent" {...targets({ kind: 'coalition', index: k })} />
          ))}
          {ALLOCATION_HITS.map((d, i) => (
            <path key={i} d={d} fill="transparent" {...targets({ kind: 'allocation', index: i })} />
          ))}
        </svg>

        <div
          className="absolute inset-x-0 flex flex-col items-center pointer-events-none transition-opacity duration-200"
          style={{ top: u(238 - top), gap: u(6), opacity: readout ? 1 : 0 }}
        >
          <span className="font-display font-black leading-none tabular-nums text-text" style={{ fontSize: u(56) }}>
            {readout?.value}
          </span>
          <span
            className="font-mono font-medium uppercase text-center text-text2"
            style={{ fontSize: `max(9px, ${u(10)})`, letterSpacing: '0.14em', lineHeight: 1.35, maxWidth: u(190) }}
          >
            {readout?.label}
          </span>
        </div>

        {!compact && COALITIONS.map((c, k) => {
          const right = k > 0;
          return (
            <div
              key={c.name}
              className={`absolute flex flex-col cursor-default transition-opacity duration-250 ${right ? 'items-end text-right' : 'items-start'}`}
              style={{ ...(right ? { right: u(20) } : { left: u(20) }), top: u(344), gap: u(7), opacity: coalitionLit(focus, k) ? 1 : DIM }}
              {...targets({ kind: 'coalition', index: k })}
            >
              <div className={`flex items-baseline ${right ? 'flex-row-reverse' : ''}`} style={{ gap: u(8) }}>
                <span className="font-display font-black leading-none tabular-nums text-text" style={{ fontSize: u(52) }}>
                  {counts[k]}
                </span>
                <span className="font-mono font-bold uppercase text-text2" style={{ fontSize: u(10), letterSpacing: '0.16em' }}>
                  seats
                </span>
              </div>
              <span className="font-mono font-bold uppercase text-text" style={{ fontSize: u(10), letterSpacing: '0.16em', lineHeight: 1.2 }}>
                {c.name}
              </span>
              <span className="flex font-mono uppercase text-text2" style={{ gap: u(12), fontSize: u(10), letterSpacing: '0.06em' }}>
                {c.allocations.map((a) => (
                  <span key={a.name} className="inline-flex items-center" style={{ gap: u(5) }}>
                    <span className="block rounded-full shrink-0" style={{ width: u(7), height: u(7), backgroundColor: a.ink }} />
                    {a.short}
                  </span>
                ))}
              </span>
            </div>
          );
        })}

        {!compact && (
          <p
            className="absolute inset-x-0 text-center font-mono uppercase text-text2 opacity-75 pointer-events-none"
            style={{ top: u(494), fontSize: u(9), letterSpacing: '0.14em', lineHeight: 1 }}
          >
            {SEAT_CAPTION}
          </p>
        )}
      </div>
    </div>
  );
}
