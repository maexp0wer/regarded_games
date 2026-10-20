// src/components/CampaignTrack.tsx
"use client";

import React, { useEffect, useId, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { COVER_STOCK } from '@/lib/coverPlateArt';
import {
  DONE_ORDER,
  LIVE_PHASE,
  MILESTONES,
  NEXT_MILESTONE,
  PHASES,
  milestoneLit,
  milestoneStatus,
  milestonesDone,
  phaseLit,
  type CampaignFocus,
} from '@/config/campaign';

/* ---- Campaign track ----
   The rulebook's campaign sequence as a game-board track: one space per
   milestone, run along a route that crosses the page, turns at the right
   edge and comes back, each phase's spaces on a ground one surface up from
   the page (card2), numbered 1 to 5 with the phase names beside them.
   Expansion is the open end of the route: dashed, with no spaces yet. A
   completed space is struck solid (gold in the phase in progress), an open
   one is hollow, and the house coin stands on the first open space, the
   milestone in progress, carrying its half-struck mark.

   Entrance: once `play` turns on, the coin glides from the head of the track
   to its space in one eased pass, and each completed milestone is struck as
   the coin's centre crosses it, so struck spaces appear behind it. Until then
   the coin waits at the head and every space is hollow; with reduced motion
   the track is simply struck.

   Hovering a phase or a space dims the rest and reads it in the hollow of the
   turn; once struck, a faint holographic foil lies over its completed spaces
   (held still with reduced motion).

   Drawn in a 520-unit-wide box that scales to fit its container. `compact` is
   the phone-page cut: the drawing cropped to the track, the phases marked by
   their numbers alone and no key; the page's index carries the names. */

const VIEW = { x: 0, y: 88, w: 520, h: 330 };
const VIEW_COMPACT = { x: 30, y: 100, w: 480, h: 262 };

/* The route: a row left to right, a half-turn of radius TURN_R round the right
   edge, and a row back. Three analytic pieces, so a point at any length along
   it is a pure function and needs no DOM. */
const ROUTE = 'M70 150H400A80 80 0 0 1 400 310H50';
const ROW1 = 330;
const TURN_R = 80;
const TURN = Math.PI * TURN_R;
const TOTAL = ROW1 + TURN + 350;
const TURN_C = [400, 230] as const;

/* A space's radius, a phase ground's width, and where spaces sit along the
   route: PITCH apart, an AISLE more between phases, the first HEAD in. A
   ground runs PAD past its end spaces. */
const SPACE = 11;
const GROUND = 34;
const PITCH = 52;
const AISLE = 20;
const HEAD = 24;
const PAD = 22;

/* The coin's glide: a beat once the page lies flat, then one ease-in-out
   pass. */
const HOLD = 250;
const GLIDE = 2200;

/* What isn't focused dims to DIM; the foil lies over the focused spaces at
   HOLO. */
const DIM = 0.2;
const HOLO = 0.2;
const FOIL_POOL = 120;
const FOIL_STOPS = ['#FF6FD8', '#FFD36E', '#9CFF8A', '#62E6FF', '#8F7BFF', '#FF6FD8'];

/* Rounded so the server and the browser print the same coordinates. */
const f = (n: number) => Number(n.toFixed(2));

function at(s: number): [number, number] {
  if (s <= ROW1) return [70 + s, 150];
  if (s <= ROW1 + TURN) {
    const t = (s - ROW1) / TURN_R;
    return [TURN_C[0] + TURN_R * Math.sin(t), TURN_C[1] - TURN_R * Math.cos(t)];
  }
  return [400 - (s - ROW1 - TURN), 310];
}

/* The ground of the route between lengths a and b, `half` either side of its
   centre line, as one path: a band per row and an annular sector round the
   turn. Used for the hover areas, which tile the track. */
function band(a: number, b: number, half: number) {
  const parts: string[] = [];
  const row = (s0: number, s1: number) => {
    const [x0, y] = at(s0), [x1] = at(s1);
    const l = Math.min(x0, x1), r = Math.max(x0, x1);
    parts.push(`M${f(l)} ${f(y - half)}H${f(r)}V${f(y + half)}H${f(l)}Z`);
  };
  const r1 = [Math.max(a, 0), Math.min(b, ROW1)];
  if (r1[0] < r1[1]) row(r1[0], r1[1]);
  const t = [Math.max(a, ROW1), Math.min(b, ROW1 + TURN)];
  if (t[0] < t[1]) {
    const ro = TURN_R + half, ri = TURN_R - half;
    const p = (r: number, s: number) => {
      const th = (s - ROW1) / TURN_R;
      return `${f(TURN_C[0] + r * Math.sin(th))} ${f(TURN_C[1] - r * Math.cos(th))}`;
    };
    parts.push(`M${p(ro, t[0])}A${ro} ${ro} 0 0 1 ${p(ro, t[1])}L${p(ri, t[1])}A${ri} ${ri} 0 0 0 ${p(ri, t[0])}Z`);
  }
  const r2 = [Math.max(a, ROW1 + TURN), Math.min(b, TOTAL)];
  if (r2[0] < r2[1]) row(r2[0], r2[1]);
  return parts.join('');
}

/* Where the label of the ground between a and b goes: above the first row,
   inside the turn, or below the second row. */
function labelSpot(a: number, b: number): [number, number] {
  const mid = (a + b) / 2;
  if (mid <= ROW1) return [at(mid)[0], 112];
  if (mid <= ROW1 + TURN) return [405, 227];
  return [at(mid)[0], 346];
}

function wrap(text: string, max: number) {
  const lines = [''];
  for (const word of text.split(' ')) {
    const cur = lines[lines.length - 1];
    if (!cur) lines[lines.length - 1] = word;
    else if (`${cur} ${word}`.length <= max) lines[lines.length - 1] = `${cur} ${word}`;
    else lines.push(word);
  }
  return lines.slice(0, 3);
}

/* ---- Track geometry (fixed: built once from the campaign) ---- */

const N = MILESTONES.length;
const STRUCK = DONE_ORDER.length;
const SPACES = MILESTONES.map((m, i) => {
  const s = HEAD + PITCH * i + AISLE * m.phase;
  const [x, y] = at(s);
  return { s, x: f(x), y: f(y) };
});
/* The coin's resting place: the first open space, or the last one once every
   milestone has landed. */
const REST = SPACES[NEXT_MILESTONE < 0 ? N - 1 : NEXT_MILESTONE].s;
/* The coin's first place, at the head of the track. React prints it once and,
   since it never changes, never sets it again: the glide owns it after mount. */
const HEAD_AT = `translate(${at(0).map(f).join(' ')})`;
const LIVE = PHASES[Math.max(0, LIVE_PHASE)];

/* Each phase's run of the route: its ground, its hover area (tiling the track
   to the middle of each aisle), and its label's place. The open phase runs
   from past the last space to the end of the route, with no ground of its
   own. */
const RUNS = PHASES.map((p, k) => {
  const own = SPACES.filter((_, i) => MILESTONES[i].phase === k);
  const last = SPACES[N - 1].s;
  const [a, b] = own.length ? [own[0].s - PAD, own[own.length - 1].s + PAD] : [last + PAD + AISLE, TOTAL];
  return { a, b, hit: band(a - AISLE / 2 - 4, Math.min(b + AISLE / 2 + 4, TOTAL), 30), spot: labelSpot(a, b), open: !own.length };
});

const OPEN_END = (() => {
  const run = RUNS.find((r) => r.open);
  if (!run) return null;
  const x0 = f(at(run.a)[0]), x1 = f(at(TOTAL)[0]) - 6, top = 310 - GROUND / 2, bottom = 310 + GROUND / 2;
  return `M${x0} ${top}V${bottom}M${x0} ${top}H${x1}M${x0} ${bottom}H${x1}`;
})();

const DESCRIPTION = `Campaign sequence: a track of ${N} spaces, one per milestone, in ${PHASES.length} numbered phases. ${STRUCK} of ${N} milestones are completed; the coin stands in phase ${LIVE.n}, ${LIVE.title}. ${PHASES.map(
  (p) => `${p.n}, ${p.title}, ${p.when}: ${p.status}.`,
).join(' ')}`;

/* The mark of a milestone in progress: half struck, between the solid of a
   completed one and the hollow of an upcoming one, so it reads without a key.
   The coin carries it on the track and the index prints it as that
   milestone's tick, so both pages mark the same milestone the same way. Drawn
   round 0,0. */
export function HalfStruck({ r = 6.5 }: { r?: number }) {
  return (
    <g>
      <circle r={r} fill="none" className="stroke-gold" strokeWidth={1.4} />
      <path d={`M0 ${-r}A${r} ${r} 0 0 0 0 ${r}Z`} className="fill-gold" />
    </g>
  );
}

/* The house coin at its smallest cut: the plain gold ring and an inner rule on
   the stock, carrying the half-struck mark. */
function Coin() {
  return (
    <g>
      <circle r={14} fill={COVER_STOCK} className="stroke-gold" strokeWidth={1.4} />
      <circle r={10.5} fill="none" className="stroke-gold" strokeOpacity={0.45} strokeWidth={0.7} />
      <HalfStruck r={6.2} />
    </g>
  );
}

/* The key names the three marks. Gold marks the phase in progress, whose name
   prints in it too, so it needs no entry of its own. */
const KEY: { mark: 'completed' | 'progress' | 'upcoming'; label: string }[] = [
  { mark: 'completed', label: 'Completed' },
  { mark: 'progress', label: 'In progress' },
  { mark: 'upcoming', label: 'Upcoming' },
];
const KEY_CHAR = 6.4;
const KEY_GAP = 18;
const KEY_X = (() => {
  const widths = KEY.map((k) => 18 + k.label.length * KEY_CHAR);
  let x = 260 - (widths.reduce((a, b) => a + b, 0) + KEY_GAP * (KEY.length - 1)) / 2;
  return widths.map((w) => {
    const at0 = x;
    x += w + KEY_GAP;
    return f(at0);
  });
})();

export default function CampaignTrack({
  play,
  compact = false,
  focus,
  onHover,
  onLeave,
  onSelect,
}: {
  /** Glide the coin in. Off, it waits at the head of the track. */
  play: boolean;
  /** The phone-page cut: the track alone, phases by number. */
  compact?: boolean;
  focus: CampaignFocus;
  onHover: (focus: CampaignFocus) => void;
  onLeave: () => void;
  /** A click or tap: on a phase or a space, or on the empty page (null). */
  onSelect: (focus: CampaignFocus) => void;
}) {
  const id = `track-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const still = useReducedMotion() ?? false;
  const view = compact ? VIEW_COMPACT : VIEW;

  /* The glide writes the coin's place and the walked route straight to the
     elements; React never sets them, so a re-render can't reset them. It only
     re-renders as each space is struck. */
  const coinRef = useRef<SVGGElement>(null);
  const walkedRef = useRef<SVGPathElement>(null);
  const [count, setCount] = useState(0);
  useEffect(() => {
    const place = (s: number) => {
      const [x, y] = at(s);
      coinRef.current?.setAttribute('transform', `translate(${f(x)} ${f(y)})`);
      walkedRef.current?.setAttribute('stroke-dasharray', `${f(s)} ${f(TOTAL)}`);
    };
    if (!play) {
      setCount(0);
      place(0);
      return;
    }
    if (still) {
      setCount(STRUCK);
      place(REST);
      return;
    }
    setCount(0);
    place(0);
    const start = performance.now() + HOLD;
    let struck = 0;
    let frame = requestAnimationFrame(function tick(now) {
      const p = Math.max(0, Math.min(1, (now - start) / GLIDE));
      const eased = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      const s = REST * eased;
      place(s);
      let next = struck;
      while (next < STRUCK && SPACES[DONE_ORDER[next]].s <= s) next += 1;
      if (p >= 1) next = STRUCK;
      if (next !== struck) {
        struck = next;
        setCount(next);
      }
      if (p < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [play, still]);

  /* The foil follows the pointer, in drawing units, at most once a frame. It
     writes the gradients' attributes directly; no move re-renders. */
  const bandsRef = useRef<SVGLinearGradientElement>(null);
  const poolRef = useRef<SVGRadialGradientElement>(null);
  const pointRef = useRef<[number, number]>([260, 230]);
  const frameRef = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);
  const track = (e: React.PointerEvent<SVGSVGElement>) => {
    if (still || e.pointerType === 'touch') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scale = Math.min(rect.width / view.w, rect.height / view.h) || 1;
    const ox = (rect.width - view.w * scale) / 2, oy = (rect.height - view.h * scale) / 2;
    pointRef.current = [view.x + (e.clientX - rect.left - ox) / scale, view.y + (e.clientY - rect.top - oy) / scale];
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      const [x, y] = pointRef.current;
      poolRef.current?.setAttribute('cx', `${f(x)}`);
      poolRef.current?.setAttribute('cy', `${f(y)}`);
      bandsRef.current?.setAttribute('gradientTransform', `translate(${f(x * 0.35)} ${f(y * 0.2)})`);
    });
  };

  const struckAt = (i: number) => {
    const rank = DONE_ORDER.indexOf(i);
    return rank >= 0 && rank < count;
  };
  const seated = play && count >= STRUCK;

  /* The hollow of the turn reads the focus; at rest, the milestones completed
     and the phase in progress; during the glide, the count so far and the
     phase the coin is in. Empty before the glide. */
  let readout: { value: string; word: boolean; label: string; sub: string } | null = null;
  if (focus?.kind === 'milestone') {
    const m = MILESTONES[focus.index], p = PHASES[m.phase];
    readout = { value: milestoneStatus(focus.index).toUpperCase(), word: true, label: m.label, sub: `Phase ${p.n} · ${p.title}` };
  } else if (focus?.kind === 'phase') {
    const p = PHASES[focus.index];
    readout = p.milestones.length
      ? { value: `${milestonesDone(focus.index)}/${p.milestones.length}`, word: false, label: `${p.title} · ${p.status}`, sub: `Phase ${p.n} · ${p.when}` }
      : { value: '—', word: false, label: `${p.title} · ${p.status}`, sub: 'Decided by the DAO' };
  } else if (seated) {
    readout = { value: `${STRUCK}/${N}`, word: false, label: 'Milestones completed', sub: `${LIVE.title} in progress` };
  } else if (play) {
    const p = PHASES[count ? MILESTONES[DONE_ORDER[count - 1]].phase : 0];
    readout = { value: `${count}/${N}`, word: false, label: 'Milestones completed', sub: `Phase ${p.n} · ${p.title}` };
  }
  const R = compact
    ? { x: 215, y: 228, big: 46, word: 30, label: 14, sub: 12.5, lh: 17, off: 19, max: 28 }
    : { x: 205, y: 236, big: 52, word: 32, label: 9.5, sub: 9, lh: 12.5, off: 20, max: 26 };
  const lines = readout ? wrap(readout.label.toUpperCase(), R.max) : [];
  /* A status word shrinks to fit the hollow ("IN PROGRESS" is the longest). */
  const valueSize = readout?.word ? Math.min(R.word, 170 / (readout.value.length * 0.62)) : R.big;

  const foil = seated && focus
    ? SPACES.map((sp, i) => (struckAt(i) && milestoneLit(focus, i) ? `M${f(sp.x - SPACE)} ${sp.y}a${SPACE} ${SPACE} 0 1 0 ${2 * SPACE} 0a${SPACE} ${SPACE} 0 1 0 ${-2 * SPACE} 0` : '')).join('')
    : '';
  const targets = (target: CampaignFocus) => ({
    onMouseEnter: () => onHover(target),
    onMouseLeave: onLeave,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(target);
    },
  });

  return (
    <svg
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      className="absolute inset-0 size-full overflow-visible"
      role="img"
      aria-label={DESCRIPTION}
      onPointerMove={track}
      onClick={() => onSelect(null)}
    >
      <defs>
        <linearGradient ref={bandsRef} id={`${id}-foil`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="96" y2="44" spreadMethod="repeat">
          {FOIL_STOPS.map((color, i) => (
            <stop key={i} offset={i / (FOIL_STOPS.length - 1)} stopColor={color} />
          ))}
        </linearGradient>
        <radialGradient ref={poolRef} id={`${id}-pool-fill`} gradientUnits="userSpaceOnUse" cx={260} cy={230} r={still ? 600 : FOIL_POOL}>
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.35" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#000000" />
        </radialGradient>
        <mask id={`${id}-pool`} maskUnits="userSpaceOnUse" x="-100" y="0" width="720" height="520">
          <rect x="-100" y="0" width="720" height="520" fill={`url(#${id}-pool-fill)`} />
        </mask>
      </defs>

      {/* Grounds: the one route, stroked wide, a dash window per phase */}
      {RUNS.map((run, k) => run.open ? (
        OPEN_END && (
          <path key={k} d={OPEN_END} fill="none" className="stroke-text2 transition-opacity duration-250" strokeOpacity={0.45} strokeDasharray="3 3" style={{ opacity: phaseLit(focus, k) ? 1 : DIM }} />
        )
      ) : (
        <path
          key={k}
          d={ROUTE}
          fill="none"
          className="stroke-card2 transition-opacity duration-250"
          strokeWidth={GROUND}
          strokeDasharray={`${f(run.b - run.a)} ${f(TOTAL)}`}
          strokeDashoffset={f(-run.a)}
          style={{ opacity: phaseLit(focus, k) ? 1 : DIM }}
        />
      ))}

      {/* The route: dashed ahead of the coin, ruled behind it */}
      <path d={ROUTE} fill="none" className="stroke-text2" strokeOpacity={0.35} strokeDasharray="2 4" />
      <path ref={walkedRef} d={ROUTE} fill="none" className="stroke-text2" strokeOpacity={0.65} strokeDasharray={`0 ${f(TOTAL)}`} />

      {SPACES.map((sp, i) => {
        const struck = struckAt(i);
        const inProgress = MILESTONES[i].phase === LIVE_PHASE;
        return (
          <circle
            key={i}
            cx={sp.x}
            cy={sp.y}
            r={SPACE}
            className={`transition-opacity duration-250 ${struck ? (inProgress ? 'fill-gold' : 'fill-text') : 'fill-card2 stroke-text2'}`}
            strokeOpacity={struck ? undefined : 0.6}
            strokeWidth={struck ? undefined : 1.2}
            style={{ opacity: milestoneLit(focus, i) ? 1 : DIM }}
          />
        );
      })}
      <path
        d={foil}
        fill={`url(#${id}-foil)`}
        mask={`url(#${id}-pool)`}
        className="pointer-events-none transition-opacity duration-350 saturate-[1.15] brightness-[1.08]"
        style={{ opacity: foil ? HOLO : 0 }}
      />

      {/* The coin: placed by the glide (see the effect), never by React */}
      <g ref={coinRef} transform={HEAD_AT} className="pointer-events-none">
        <Coin />
      </g>

      {/* Phase numbers and names */}
      {RUNS.map((run, k) => {
        const p = PHASES[k];
        const [x, y] = run.spot;
        const ink = k === LIVE_PHASE ? 'fill-gold-hover' : p.state === 'open' ? 'fill-text2' : 'fill-text';
        return (
          <g key={k} className="pointer-events-none transition-opacity duration-250" style={{ opacity: phaseLit(focus, k) ? 1 : DIM }}>
            {compact ? (
              <text x={f(x)} y={f(y < 150 ? 116 : y > 300 ? 344 : 230)} textAnchor="middle" dominantBaseline="central" className={`${ink} font-mono font-extrabold`} style={{ fontSize: 17, letterSpacing: '0.06em' }}>
                {p.n}
              </text>
            ) : (
              <>
                <text x={f(x)} y={y} textAnchor="middle" className={`${ink} font-mono font-bold uppercase`} style={{ fontSize: 10, letterSpacing: '0.16em' }}>
                  {`${p.n} · ${p.title}`}
                </text>
                <text x={f(x)} y={y + 12} textAnchor="middle" className="fill-text2 font-mono font-medium uppercase" style={{ fontSize: 9, letterSpacing: '0.08em' }}>
                  {p.when}
                </text>
              </>
            )}
          </g>
        );
      })}

      {/* The hollow of the turn */}
      <g className="pointer-events-none transition-opacity duration-200" style={{ opacity: readout ? 1 : 0 }}>
        <text x={R.x} y={R.y} textAnchor="middle" className="fill-text font-display font-black" style={{ fontSize: valueSize }}>
          {readout?.value}
        </text>
        {lines.map((line, j) => (
          <text key={j} x={R.x} y={R.y + R.off + j * R.lh} textAnchor="middle" className="fill-text font-mono font-medium" style={{ fontSize: R.label, letterSpacing: '0.14em' }}>
            {line}
          </text>
        ))}
        <text x={R.x} y={R.y + R.off + lines.length * R.lh + 3} textAnchor="middle" className="fill-text2 font-mono font-semibold uppercase" style={{ fontSize: R.sub, letterSpacing: '0.14em' }}>
          {readout?.sub}
        </text>
      </g>

      {/* The key */}
      {!compact && (
        <g className="pointer-events-none">
          {KEY.map((k, j) => {
            const x = KEY_X[j], y = 400;
            return (
              <g key={k.mark}>
                {k.mark === 'completed' && <circle cx={x + 5} cy={y - 3} r={4.5} className="fill-text" />}
                {k.mark === 'progress' && (
                  <g transform={`translate(${x + 5} ${y - 3})`}>
                    <HalfStruck r={4.4} />
                  </g>
                )}
                {k.mark === 'upcoming' && <circle cx={x + 5} cy={y - 3} r={4} fill="none" className="stroke-text2" strokeOpacity={0.75} strokeWidth={1.2} />}
                <text x={f(x + 16)} y={y} className="fill-text2 font-mono font-semibold uppercase" style={{ fontSize: 8.5, letterSpacing: '0.14em' }}>
                  {k.label}
                </text>
              </g>
            );
          })}
        </g>
      )}

      {/* Hover areas: each phase's run of the track, then each space over it */}
      {RUNS.map((run, k) => (
        <path key={k} d={run.hit} fill="transparent" {...targets({ kind: 'phase', index: k })} />
      ))}
      {SPACES.map((sp, i) => (
        <circle key={i} cx={sp.x} cy={sp.y} r={15} fill="transparent" {...targets({ kind: 'milestone', index: i })} />
      ))}
    </svg>
  );
}
