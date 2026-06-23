// src/components/icons/CardEmblems.tsx
//
// Bespoke medallion-style emblems for the landing-page HeroCards. Each one is a
// self-contained circular crest sized to drop into HeroCard's illustrationSlot
// (the dark #0D0B14 graphic frame). They share a common chassis — a double ring
// with notched bezel, a soft inner glow, and a fine guilloche/tick detail — so
// the deck reads as one set, while every center motif is unique to its card.
//
// All geometry lives on a 200×200 viewBox. Color is driven by a single `accent`
// prop (the card's theme color) plus a darker `deep` shade for depth; every id
// is suffixed with a per-instance `uid` so multiple emblems can coexist without
// gradient/clip collisions.

import React from 'react';

interface EmblemProps {
  /** Bright theme accent (e.g. card themeColor). */
  accent: string;
  /** Darker shade of the accent for fills/shadows. */
  deep: string;
  /** Unique suffix so <defs> ids never collide across mounted emblems. */
  uid: string;
  className?: string;
}

/** Shared bezel: double ring, notched tick crown, corner rivets, inner glow. */
function Bezel({ accent, deep, uid }: { accent: string; deep: string; uid: string }) {
  const ticks = Array.from({ length: 60 });
  return (
    <g>
      {/* radial backdrop glow */}
      <circle cx="100" cy="100" r="92" fill={`url(#glow-${uid})`} opacity="0.5" />
      {/* outer ring */}
      <circle cx="100" cy="100" r="90" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.55" />
      <circle cx="100" cy="100" r="84" fill="none" stroke={accent} strokeWidth="3" opacity="0.9" />
      <circle cx="100" cy="100" r="84" fill="none" stroke={`url(#sheen-${uid})`} strokeWidth="3" />
      {/* tick crown between the two rings */}
      <g opacity="0.45">
        {ticks.map((_, i) => {
          const a = (i / ticks.length) * Math.PI * 2;
          const major = i % 5 === 0;
          const r1 = major ? 75 : 78;
          const r2 = 81;
          return (
            <line
              key={i}
              x1={100 + Math.cos(a) * r1}
              y1={100 + Math.sin(a) * r1}
              x2={100 + Math.cos(a) * r2}
              y2={100 + Math.sin(a) * r2}
              stroke={accent}
              strokeWidth={major ? 1.4 : 0.7}
            />
          );
        })}
      </g>
      {/* inner ring framing the motif */}
      <circle cx="100" cy="100" r="70" fill="none" stroke={deep} strokeWidth="1" opacity="0.7" />
      {/* four cardinal rivets */}
      {[0, 90, 180, 270].map((d) => {
        const a = (d * Math.PI) / 180;
        return <circle key={d} cx={100 + Math.cos(a) * 84} cy={100 + Math.sin(a) * 84} r="2.6" fill={accent} />;
      })}
    </g>
  );
}

/** Common <defs> for an emblem: backdrop glow, metal sheen, accent gradient. */
function EmblemDefs({ accent, deep, uid }: { accent: string; deep: string; uid: string }) {
  return (
    <defs>
      <radialGradient id={`glow-${uid}`} cx="50%" cy="42%" r="60%">
        <stop offset="0%" stopColor={accent} stopOpacity="0.55" />
        <stop offset="55%" stopColor={accent} stopOpacity="0.12" />
        <stop offset="100%" stopColor={accent} stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`sheen-${uid}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
        <stop offset="35%" stopColor="#ffffff" stopOpacity="0" />
        <stop offset="100%" stopColor={deep} stopOpacity="0.4" />
      </linearGradient>
      <linearGradient id={`fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={accent} />
        <stop offset="100%" stopColor={deep} />
      </linearGradient>
    </defs>
  );
}

const SVG_PROPS = {
  viewBox: '0 0 200 200',
  xmlns: 'http://www.w3.org/2000/svg',
} as const;

/* ─────────────────────────────────────────────────────────────────────────
   1. JOIN THE DAO — a governance council seal: balance scale at the core,
   ringed by member seats wired into a shared assembly.
   ───────────────────────────────────────────────────────────────────────── */
export function DaoEmblem({ accent, deep, uid, className }: EmblemProps) {
  const seats = Array.from({ length: 8 });
  return (
    <svg {...SVG_PROPS} className={className}>
      <EmblemDefs accent={accent} deep={deep} uid={uid} />
      <Bezel accent={accent} deep={deep} uid={uid} />

      {/* assembly ring the seats sit on */}
      <circle cx="100" cy="100" r="52" fill="none" stroke={accent} strokeWidth="0.8" opacity="0.4" />
      {seats.map((_, i) => {
        const a = (i / seats.length) * Math.PI * 2 - Math.PI / 2;
        const sx = 100 + Math.cos(a) * 52;
        const sy = 100 + Math.sin(a) * 52;
        return (
          <g key={i}>
            <line x1="100" y1="100" x2={sx} y2={sy} stroke={accent} strokeWidth="0.8" opacity="0.3" />
            <circle cx={sx} cy={sy} r="6.5" fill={`url(#fill-${uid})`} stroke={accent} strokeWidth="1" />
            <circle cx={sx} cy={sy} r="2.5" fill="#0D0B14" />
          </g>
        );
      })}

      {/* central balance scale (governance) */}
      <g stroke={accent} strokeWidth="2.4" strokeLinecap="round" fill="none">
        <line x1="100" y1="80" x2="100" y2="116" />
        <line x1="78" y1="86" x2="122" y2="86" />
        <line x1="86" y1="116" x2="114" y2="116" />
        {/* pans */}
        <path d="M70 86 L86 86 L78 100 Z" fill={`url(#fill-${uid})`} stroke={accent} strokeWidth="1.5" />
        <path d="M114 86 L130 86 L122 100 Z" fill={`url(#fill-${uid})`} stroke={accent} strokeWidth="1.5" />
        {/* hangers */}
        <line x1="78" y1="86" x2="78" y2="100" strokeWidth="1" opacity="0.6" />
        <line x1="122" y1="86" x2="122" y2="100" strokeWidth="1" opacity="0.6" />
      </g>
      <circle cx="100" cy="80" r="4" fill={accent} />
      <circle cx="100" cy="80" r="1.5" fill="#0D0B14" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   2. CAPTURE VALUE — a yield engine: a vault core feeding a recirculating
   value loop, with growth columns climbing inside.
   ───────────────────────────────────────────────────────────────────────── */
export function YieldEmblem({ accent, deep, uid, className }: EmblemProps) {
  return (
    <svg {...SVG_PROPS} className={className}>
      <EmblemDefs accent={accent} deep={deep} uid={uid} />
      <Bezel accent={accent} deep={deep} uid={uid} />

      <defs>
        <marker id={`yh-${uid}`} markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0 0 L8 4 L0 8 Z" fill={accent} />
        </marker>
      </defs>

      {/* recirculation loop — two arcs forming a closed cycle around the core */}
      <g fill="none" stroke={accent} strokeWidth="2.6" strokeLinecap="round">
        <path d="M100 44 A56 56 0 0 1 148 128" markerEnd={`url(#yh-${uid})`} />
        <path d="M100 156 A56 56 0 0 1 52 72" markerEnd={`url(#yh-${uid})`} opacity="0.85" />
      </g>

      {/* vault / strongbox core */}
      <g>
        <rect x="74" y="74" width="52" height="52" rx="7" fill={`url(#fill-${uid})`} stroke={accent} strokeWidth="2" />
        <rect x="74" y="74" width="52" height="52" rx="7" fill="#0D0B14" opacity="0.35" />
        {/* growth columns inside the vault */}
        <rect x="82" y="106" width="7" height="12" rx="1.5" fill={accent} />
        <rect x="93" y="98" width="7" height="20" rx="1.5" fill={accent} />
        <rect x="104" y="90" width="7" height="28" rx="1.5" fill={accent} />
        {/* rising trend tick */}
        <path d="M82 100 L96 92 L110 84" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
        <circle cx="110" cy="84" r="2.4" fill="#ffffff" />
      </g>
      {/* value marks riding the loop */}
      <circle cx="148" cy="128" r="3" fill={accent} />
      <circle cx="52" cy="72" r="3" fill={accent} />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   3. REDEFINE MARKETS — a paradigm sigil: an infinity core breaking through a
   fractured grid, with new orbital nodes forming around the rupture.
   ───────────────────────────────────────────────────────────────────────── */
export function ParadigmEmblem({ accent, deep, uid, className }: EmblemProps) {
  return (
    <svg {...SVG_PROPS} className={className}>
      <EmblemDefs accent={accent} deep={deep} uid={uid} />
      <Bezel accent={accent} deep={deep} uid={uid} />

      <defs>
        <clipPath id={`disc-${uid}`}>
          <circle cx="100" cy="100" r="66" />
        </clipPath>
      </defs>

      {/* the old grid (the status quo) — faint, clipped to the inner disc */}
      <g clipPath={`url(#disc-${uid})`} stroke={accent} strokeWidth="0.6" opacity="0.18">
        {[-2, -1, 0, 1, 2].map((n) => (
          <React.Fragment key={n}>
            <line x1={100 + n * 22} y1="34" x2={100 + n * 22} y2="166" />
            <line x1="34" y1={100 + n * 22} x2="166" y2={100 + n * 22} />
          </React.Fragment>
        ))}
      </g>

      {/* rupture — a jagged break splitting the grid */}
      <path
        d="M64 56 L92 92 L80 104 L110 138 L96 150"
        fill="none"
        stroke={accent}
        strokeWidth="1.4"
        opacity="0.35"
        clipPath={`url(#disc-${uid})`}
      />

      {/* infinity core — the new paradigm */}
      <path
        d="M70 100 C70 84 82 84 90 92 C96 98 104 102 110 108 C118 116 130 116 130 100 C130 84 118 84 110 92 C104 98 96 102 90 108 C82 116 70 116 70 100 Z"
        fill="none"
        stroke={`url(#fill-${uid})`}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M70 100 C70 84 82 84 90 92 C96 98 104 102 110 108 C118 116 130 116 130 100 C130 84 118 84 110 92 C104 98 96 102 90 108 C82 116 70 116 70 100 Z"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1"
        strokeLinejoin="round"
        opacity="0.4"
      />

      {/* new orbital nodes forming around the rupture */}
      {[
        [142, 70],
        [150, 110],
        [58, 132],
        [62, 78],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="4.5" fill={`url(#fill-${uid})`} stroke={accent} strokeWidth="1" />
          <circle cx={x} cy={y} r="9" fill="none" stroke={accent} strokeWidth="0.8" opacity="0.4" />
        </g>
      ))}
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   4. CAPITAL AUCTION — an auction seal: a gavel struck across a podium, with
   rising bid columns and a burst of impact at the strike point.
   ───────────────────────────────────────────────────────────────────────── */
export function AuctionEmblem({ accent, deep, uid, className }: EmblemProps) {
  return (
    <svg {...SVG_PROPS} className={className}>
      <EmblemDefs accent={accent} deep={deep} uid={uid} />
      <Bezel accent={accent} deep={deep} uid={uid} />

      {/* rising bid columns behind the gavel */}
      <g>
        <rect x="56" y="118" width="12" height="22" rx="2" fill={accent} opacity="0.35" />
        <rect x="72" y="106" width="12" height="34" rx="2" fill={accent} opacity="0.5" />
        <rect x="120" y="100" width="12" height="40" rx="2" fill={accent} opacity="0.6" />
        <rect x="136" y="112" width="12" height="28" rx="2" fill={accent} opacity="0.4" />
      </g>

      {/* sound block / podium */}
      <rect x="74" y="138" width="52" height="9" rx="3" fill={`url(#fill-${uid})`} stroke={accent} strokeWidth="1.5" />
      <rect x="84" y="130" width="32" height="9" rx="2" fill={`url(#fill-${uid})`} stroke={accent} strokeWidth="1.2" />

      {/* gavel, angled mid-strike */}
      <g transform="rotate(-32 100 96)">
        {/* head */}
        <rect x="76" y="74" width="48" height="26" rx="6" fill={`url(#fill-${uid})`} stroke={accent} strokeWidth="2" />
        <rect x="82" y="74" width="3.5" height="26" fill="#0D0B14" opacity="0.35" />
        <rect x="114.5" y="74" width="3.5" height="26" fill="#0D0B14" opacity="0.35" />
        {/* handle */}
        <rect x="97" y="98" width="6" height="44" rx="3" fill={`url(#fill-${uid})`} stroke={accent} strokeWidth="1.5" />
        <circle cx="100" cy="146" r="5" fill={accent} />
      </g>

      {/* impact burst at the strike point */}
      <g stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.8">
        <line x1="62" y1="120" x2="54" y2="114" />
        <line x1="66" y1="128" x2="56" y2="128" />
        <line x1="62" y1="136" x2="54" y2="142" />
      </g>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   5. TESTNET QUESTS — a quest sigil: a crest shield carrying a waypoint path
   that climbs to a completion star, flanked by progress notches.
   ───────────────────────────────────────────────────────────────────────── */
export function QuestEmblem({ accent, deep, uid, className }: EmblemProps) {
  return (
    <svg {...SVG_PROPS} className={className}>
      <EmblemDefs accent={accent} deep={deep} uid={uid} />
      <Bezel accent={accent} deep={deep} uid={uid} />

      {/* shield body */}
      <path
        d="M100 50 L138 64 V104 C138 126 120 142 100 150 C80 142 62 126 62 104 V64 Z"
        fill={`url(#fill-${uid})`}
        stroke={accent}
        strokeWidth="2"
      />
      <path
        d="M100 50 L138 64 V104 C138 126 120 142 100 150 C80 142 62 126 62 104 V64 Z"
        fill="#0D0B14"
        opacity="0.35"
      />

      {/* dashed waypoint path climbing the shield */}
      <path
        d="M76 128 L90 116 L84 104 L102 92 L96 80 L116 70"
        fill="none"
        stroke={accent}
        strokeWidth="1.6"
        strokeDasharray="3 4"
        strokeLinecap="round"
        opacity="0.85"
      />

      {/* completed waypoints (filled) and the pending one (hollow) */}
      <circle cx="76" cy="128" r="3.4" fill={accent} />
      <circle cx="90" cy="116" r="3.4" fill={accent} />
      <circle cx="84" cy="104" r="3.4" fill={accent} />
      <circle cx="102" cy="92" r="3.4" fill="none" stroke={accent} strokeWidth="1.6" />

      {/* completion star at the summit */}
      <g transform="translate(116 70)">
        <path
          d="M0 -11 L3.2 -3.4 L11 -3.4 L4.8 1.4 L7.2 9 L0 4.4 L-7.2 9 L-4.8 1.4 L-11 -3.4 L-3.2 -3.4 Z"
          fill="#ffffff"
          stroke={accent}
          strokeWidth="1"
        />
      </g>

      {/* progress notches flanking the shield */}
      <g fill={accent}>
        <rect x="48" y="92" width="4" height="8" rx="1" />
        <rect x="48" y="104" width="4" height="8" rx="1" opacity="0.6" />
        <rect x="48" y="116" width="4" height="8" rx="1" opacity="0.3" />
        <rect x="148" y="92" width="4" height="8" rx="1" />
        <rect x="148" y="104" width="4" height="8" rx="1" opacity="0.6" />
        <rect x="148" y="116" width="4" height="8" rx="1" opacity="0.3" />
      </g>
    </svg>
  );
}
