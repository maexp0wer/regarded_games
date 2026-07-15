// src/components/Rulebook.tsx
"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '@/context/ThemeContext';
import RulebookCard from '@/components/RulebookCard';
import { motion, useMotionValue, useTransform, animate, type ValueAnimationTransition } from 'framer-motion';

/* Docs subdomain base, derived the same way page.tsx / useDocNavigation do: the
   main domain with a `docs.` prefix (e.g. http://docs.localhost:3000 locally,
   https://docs.<domain> in prod). The back-cover info buttons render as raw
   <a href> on the main app domain, so a bare "intro#..." would resolve against
   the app domain and 404 — these must be absolute docs URLs. */
const MAIN_DOMAIN = process.env.NEXT_PUBLIC_MAIN_DOMAIN || '';
const DOCS_URL = MAIN_DOMAIN.replace('://', '://docs.');

interface Tier3Child {
  name: string;
  percentage: number;
  color: string;
}

interface ChartDataItem {
  name: string;
  percentage: number;
  color: string;
  explanation?: string;
  parentName: string;
  parentPercentage: number;
  parentColor: string;
  parentExplanation?: string;
  subChildren: Tier3Child[];
}

const TABLE_DATA: ChartDataItem[] = [
  {
    parentName: "Community Controlled",
    parentPercentage: 75,
    parentColor: "var(--color-card3)",
    parentExplanation: "75% of the initial $RGD supply is directly controlled by you, the DAO members.",
    name: "DAO Treasury Reserve",
    percentage: 40,
    color: "var(--color-green)",
    explanation: "Long-Term Capital. Controlled entirely by governance for future growth, acquisitions, or diversification. Subject to a 5-year linear unlock.",
    subChildren: []
  },
  {
    parentName: "Community Controlled",
    parentPercentage: 75,
    parentColor: "var(--color-card3)",
    name: "Growth & Ecosystem",
    percentage: 20,
    color: "var(--color-magenta)",
    explanation: "Funds Active Incentives and marketing. Released based on DAO-approved milestones.",
    subChildren: [
      { name: "Merkl Rewards", percentage: 5, color: "var(--color-magenta-70)" },
      { name: "User Acquisition", percentage: 15, color: "var(--color-magenta)" }
    ]
  },
  {
    parentName: "Community Controlled",
    parentPercentage: 75,
    parentColor: "var(--color-card3)",
    name: "Market Formation",
    percentage: 15,
    color: "var(--color-orange)",
    explanation: "Distributed to early community participants and used to provide initial exchange liquidity to ensure Day 1 market stability.",
    subChildren: [
      { name: "Genesis Program", percentage: 3, color: "var(--color-orange-35)" },
      { name: "Capital Auction", percentage: 6, color: "var(--color-orange-70)" },
      { name: "Liquidity Pool", percentage: 6, color: "var(--color-orange)" },
    ]
  },
  {
    parentName: "Team & Operations",
    parentPercentage: 25,
    parentColor: "var(--color-border)",
    parentExplanation: "only 25% of the initial $RGD supply is not directly controlled by you, but distributed to the non-profit DAO LLC and vested among the founding Team for longterm alignment.",
    name: "Team",
    percentage: 15,
    color: "var(--color-gold)",
    explanation: "Incentivizes the founding team. Subject to a 4-year vesting schedule with a 12-month cliff.",
    subChildren: []
  },
  {
    parentName: "Team & Operations",
    parentPercentage: 25,
    parentColor: "var(--color-border)",
    name: "Operational Reserve",
    percentage: 10,
    color: "var(--color-purple)",
    explanation: "Allocated to the non-profit Regarded DAO LLC to cover real-world costs (legal compliance, audits, hosting). Managed via multi-sig with strict spending rules.",
    subChildren: []
  },
];

interface RulebookProps {
  /** Section is the active scroll-stop — drives the card fold + wheel sweep. */
  active?: boolean;
  /** Book page from the scroll system: 0 = Distribution, 1 = Campaign. */
  page?: number;
  /** Live scroll direction: 1 = scrolling down, -1 = scrolling up. Drives the
      slide-in side and the entry/exit backside flash. */
  dir?: 1 | -1;
}

interface Group {
  parentName: string;
  parentPercentage: number;
  parentColor: string;
  parentExplanation?: string;
  items: Array<ChartDataItem & { globalIndex: number }>;
}

function resolveColor(cssValue: string): string {
  if (typeof window === 'undefined') return '#888888';
  if (!cssValue.startsWith('var(')) return cssValue;
  /* The rulebook always renders with dark-mode tokens (see the forced-dark
     wrapper in page.tsx), so the probe must resolve under `.dark` too — the
     ECharts wheel reads its colors through here, and the probe is appended to
     document.body (outside the wrapper), which carries the live page theme. */
  const host = document.createElement('div');
  host.className = 'dark';
  host.style.cssText = 'position:fixed;width:0;height:0';
  const el = document.createElement('div');
  el.setAttribute('style', `position:fixed;width:0;height:0;background:${cssValue}`);
  host.appendChild(el);
  document.body.appendChild(host);
  const resolved = getComputedStyle(el).backgroundColor;
  document.body.removeChild(host);
  return resolved || '#888888';
}

/* var(--color-x) → var(--color-x-hover); resolveColor falls back to the base
   color when no hover token exists (the var resolves to transparent). */
function getHoverColor(cssVar: string): string {
  if (typeof cssVar === 'string' && cssVar.startsWith('var(')) {
    return cssVar.replace(/\)$/, '-hover)');
  }
  return cssVar;
}

function resolveHoverColor(cssVar: string, fallback: string): string {
  const resolved = resolveColor(getHoverColor(cssVar));
  if (resolved === 'rgba(0, 0, 0, 0)' || resolved === 'transparent') return fallback;
  return resolved;
}

/* Dotted clause leader, rulebook table-of-contents style. */
const DottedLeader = () => (
  <span
    className="flex-1 border-b border-dotted opacity-40 mb-0.75"
    style={{ borderColor: 'var(--color-text2)' }}
  />
);

/* Corner brackets for the thin golden inner panels. */
const cornerBrackets = (
  <>
    <div className="absolute top-1 left-1 w-3 h-3 border-t border-l pointer-events-none z-20" style={{ borderColor: 'rgba(212, 175, 55, 0.5)' }} />
    <div className="absolute top-1 right-1 w-3 h-3 border-t border-r pointer-events-none z-20" style={{ borderColor: 'rgba(212, 175, 55, 0.5)' }} />
    <div className="absolute bottom-1 left-1 w-3 h-3 border-b border-l pointer-events-none z-20" style={{ borderColor: 'rgba(212, 175, 55, 0.5)' }} />
    <div className="absolute bottom-1 right-1 w-3 h-3 border-b border-r pointer-events-none z-20" style={{ borderColor: 'rgba(212, 175, 55, 0.5)' }} />
  </>
);

/* Gold chassis gradient — same metal as the Regardo HeroCard frame. */
const GOLD_CHASSIS_GRADIENT = 'linear-gradient(135deg, #7c6225 0%, #dfc482 25%, #977636 50%, #ebdba4 75%, #6a501c 100%)';

/* Thick gradient frame for the book's outer edges: a transparent border
   painted by a border-box gradient layer beneath a padding-box surface fill.
   Survives border-radius, and per-side widths keep the spine edge open. */
const goldFrame = (surface: string, widths: string): React.CSSProperties => ({
  borderStyle: 'solid',
  borderColor: 'transparent',
  borderWidth: widths,
  background: `linear-gradient(${surface}, ${surface}) padding-box, ${GOLD_CHASSIS_GRADIENT} border-box`,
});

/* Cover variant of goldFrame: the page FACE itself is the gold metal (front &
   back covers), not just the edge. Same transparent-border frame so the corner
   radii survive, but the padding-box surface is the chassis gradient too — so
   the whole cover reads as one continuous sheet of gold. */
const goldCoverFrame = (widths: string): React.CSSProperties => ({
  borderStyle: 'solid',
  borderColor: 'transparent',
  borderWidth: widths,
  background: `${GOLD_CHASSIS_GRADIENT} padding-box, ${GOLD_CHASSIS_GRADIENT} border-box`,
});

/* Front-cover artwork: studio name + title. Printed on the gold-gradient
   cover, so both read in the page canvas color (--color-bg). */
const coverArt = (
  <div className="flex flex-col items-center gap-3">
    <span className="font-mono text-[13px] font-bold uppercase tracking-[0.3em]" style={{ color: 'var(--color-bg)', opacity: 0.8 }}>
      Regarded Games
    </span>
    <span className="font-display font-black uppercase tracking-[0.3em] text-3xl" style={{ color: 'var(--color-bg)' }}>
      Rulebook
    </span>
  </div>
);

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
    clause: '5.1',
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
    clause: '5.2',
    phase: 'Phase II',
    title: 'Build',
    when: 'Q1–Q2 2026',
    status: 'In Progress',
    state: 'live',
    items: [
      { label: 'Core smart contracts on Base', done: true },
      { label: 'dApp build-out (Exchange, Terminal, Community)', done: true },
      { label: 'Pre-launch community seeding', done: false },
    ],
  },
  {
    clause: '5.3',
    phase: 'Phase III',
    title: 'Testnet',
    when: 'Q3 2026',
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
    clause: '5.4',
    phase: 'Phase IV',
    title: 'Mainnet',
    when: 'Q4 2026',
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

/* Backside info buttons — the two rulebook pages each link to their explainer
   section in the docs intro (Distribution of Power → #distribution, Campaign
   Sequence → #roadmap). Opened in a new tab, like the HeroCard info buttons. */
const BACK_INFO_BUTTONS = [
  { label: 'Distribution', href: `${DOCS_URL}/intro#distribution` },
  { label: 'Campaign', href: `${DOCS_URL}/intro#roadmap` },
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

/* State-driven palette for the rail node + status pill. `done` reads green
   (settled), `live` pulses gold (the current phase), `upcoming` is muted. */
const ROADMAP_STATE_STYLE: Record<RoadmapState, { accent: string; tint: string; ring: string }> = {
  done: { accent: 'var(--color-green)', tint: 'var(--color-green-15)', ring: 'var(--color-green-35)' },
  live: { accent: 'var(--color-gold)', tint: 'var(--color-gold-15)', ring: 'var(--color-gold-35)' },
  upcoming: { accent: 'var(--color-text2)', tint: 'transparent', ring: 'var(--color-border)' },
};

/* A single milestone tick: a small filled green disc with a centred check when
   done, an empty muted ring when still pending — the compact treatment, with a
   tight 3px tint ring. Display only — reflects real progress. The check svg is
   `block` + viewBox-fitted so it sits cleanly inside the circle (no inline-svg
   baseline gap, no overflow). */
function MilestoneCheck({ item }: { item: RoadmapItem }) {
  return (
    <li className="flex items-start gap-2.5">
      {item.done ? (
        <span
          className="grid place-items-center w-3.5 h-3.5 rounded-full shrink-0 mt-1"
          style={{ backgroundColor: 'var(--color-green)', boxShadow: '0 0 0 3px var(--color-green-35)' }}
        >
          <svg viewBox="0 0 10 10" className="block w-2 h-2" fill="none" stroke="var(--color-card)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 5.2 L4.2 7.4 L8 3" />
          </svg>
        </span>
      ) : (
        <span
          className="w-3.5 h-3.5 rounded-full shrink-0 mt-1 border-2"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card2)' }}
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

/* Rail node: the larger phase marker — a filled disc + tick for a done phase, a
   pulsing filled dot for the live phase, a hollow ring for an upcoming one, with
   a soft 2px halo. */
function RailNode({ state }: { state: RoadmapState }) {
  const s = ROADMAP_STATE_STYLE[state];
  if (state === 'done') {
    return (
      <span
        className="grid place-items-center w-4.25 h-4.25 rounded-full shrink-0"
        style={{ backgroundColor: s.accent, boxShadow: '0 0 0 2px var(--color-green-15)' }}
      >
        <svg viewBox="0 0 12 12" className="block w-2.5 h-2.5" fill="none" stroke="var(--color-card)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6.3 L5.2 8.4 L9 3.6" />
        </svg>
      </span>
    );
  }
  if (state === 'live') {
    return (
      <span className="relative grid place-items-center w-4.25 h-4.25 shrink-0">
        <span className="absolute inset-0 rounded-full animate-ping opacity-60" style={{ backgroundColor: s.accent }} />
        <span className="relative w-3 h-3 rounded-full" style={{ backgroundColor: s.accent, boxShadow: `0 0 8px ${s.ring}` }} />
      </span>
    );
  }
  return (
    <span
      className="w-4.25 h-4.25 rounded-full shrink-0 border-2"
      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border2)' }}
    />
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
        {!isLast && (
          <span
            className="w-px flex-1 mt-1"
            style={{ backgroundColor: point.state === 'done' ? s.accent : 'var(--color-border2)', opacity: point.state === 'done' ? 0.5 : 0.4 }}
          />
        )}
      </div>
      <div className="flex flex-col gap-1.5 flex-1 pb-5 min-w-0">
        {/* Eyebrow: clause + phase tag + timeframe chip */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-black tabular-nums shrink-0 tracking-wider" style={{ color: live ? s.accent : 'var(--color-text2)' }}>§ {point.clause}</span>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-text2 opacity-70">{point.phase}</span>
          <DottedLeader />
          <span
            className="font-mono text-[11px] font-bold tabular-nums tracking-wider px-2.5 py-0.5 rounded-full border shrink-0"
            style={{ color: 'var(--color-text2)', backgroundColor: 'var(--color-card2)', borderColor: 'var(--color-border)' }}
          >
            {point.when}
          </span>
        </div>
        {/* Title + status pill + progress counter */}
        <div className="flex items-center gap-2">
          <span
            className="font-display font-black text-[15px] uppercase tracking-widest leading-tight"
            style={{ color: point.state === 'upcoming' ? 'var(--color-text)' : s.accent }}
          >
            {point.title}
          </span>
          <span
            className="font-mono text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border shrink-0 flex items-center gap-1.5"
            style={{ color: s.accent, borderColor: s.ring, backgroundColor: s.tint }}
          >
            {live && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: s.accent }} />}
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

/* Half of the running footer, printed on a single page face so it turns with
   the page. The near-spine slot carries the split page number ("004 /" left
   page, "005" right page) so the spread reads as one centered line. */
function PageFooter({ left, right }: { left: string; right: string }) {
  return (
    <div
      className="absolute bottom-0 inset-x-0 flex justify-between items-center px-4 pb-2.5 text-[14px] font-mono opacity-80 pointer-events-none z-20"
      style={{ color: 'var(--color-text2)' }}
    >
      <span>{left}</span>
      <span>{right}</span>
    </div>
  );
}

/* Bespoke book page: paper surface + thin golden inner panel with corner
   brackets — matches the RulebookCard page chrome. The pb-7 leaves the
   printed-footer strip clear inside the gold frame. */
function PageFace({ side, footer, children }: { side: 'left' | 'right'; footer?: React.ReactNode; children: React.ReactNode }) {
  const isLeft = side === 'left';
  return (
    <div
      className={`relative h-full w-full flex flex-col overflow-hidden p-4 pb-9 ${isLeft ? 'rounded-l-md' : 'rounded-r-md'}`}
      style={goldFrame('var(--color-card)', isLeft ? '3px 0 3px 3px' : '3px 3px 3px 0')}
    >
      {/* Paper grain */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05] mix-blend-overlay"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 3px)' }}
      />
      {/* Page-edge stack on the fore-edge (outer edge) */}
      <div
        className={`absolute inset-y-1 ${isLeft ? 'left-0' : 'right-0'} w-[5px] pointer-events-none z-10`}
        style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent 0px, transparent 1.5px, rgba(0,0,0,0.22) 1.5px, rgba(0,0,0,0.22) 2.5px)' }}
      />
      <div className="relative flex-1 rounded-sm border overflow-hidden flex flex-col" style={{ borderColor: 'rgba(212, 175, 55, 0.3)' }}>
        {cornerBrackets}
        <div className="relative flex flex-col flex-1 p-5 md:p-6">
          {children}
        </div>
      </div>
      {footer}
    </div>
  );
}

const roadmapLeftContent = (
  <div className="flex flex-col flex-grow gap-3 w-full">
    <SectionHeading>Sec. 05 — Campaign Sequence</SectionHeading>
    <RoadmapList from={0} to={2} />
  </div>
);

const roadmapRightContent = (
  <div className="flex flex-col flex-grow gap-3 w-full">
    <SectionHeading>Sec. 05 — Continued</SectionHeading>
    <RoadmapList from={2} to={4} />
  </div>
);

const roadmapMobileContent = (
  <div className="flex flex-col flex-grow gap-3 w-full">
    <SectionHeading>Sec. 05 — Campaign Sequence</SectionHeading>
    <RoadmapList from={0} to={4} />
  </div>
);

/* Backside of the book — adapted from the HeroCard back: cross lines, heavy
   gold corner brackets, and the two info buttons stacked vertically inside one
   peanut capsule (two rounds joined by a narrow waist). On desktop this is the
   back face of the last right leaf, landing on the left half (edge="left");
   on mobile it is the full single back page (edge="full"). */
function BackCoverDesign({ edge = 'left' }: { edge?: 'left' | 'full' }) {
  return (
    <div
      className={`relative h-full w-full flex flex-col items-center justify-between p-7 overflow-hidden ${edge === 'left' ? 'rounded-l-md' : 'rounded-md'}`}
      style={goldCoverFrame(edge === 'left' ? '3px 0 3px 3px' : '3px')}>
      <div className="absolute inset-2 rounded-sm border pointer-events-none" style={{ borderColor: 'var(--color-bg)', opacity: 0.4 }} />
      {/* Heavy corner brackets — tucked just inside the thin inset-2 border */}
      <div className="absolute top-3 left-3 w-8 h-8 border-t-4 border-l-4 pointer-events-none rounded-tl-sm" style={{ borderColor: 'var(--color-bg)' }} />
      <div className="absolute top-3 right-3 w-8 h-8 border-t-4 border-r-4 pointer-events-none rounded-tr-sm" style={{ borderColor: 'var(--color-bg)' }} />
      <div className="absolute bottom-3 left-3 w-8 h-8 border-b-4 border-l-4 pointer-events-none rounded-bl-sm" style={{ borderColor: 'var(--color-bg)' }} />
      <div className="absolute bottom-3 right-3 w-8 h-8 border-b-4 border-r-4 pointer-events-none rounded-br-sm" style={{ borderColor: 'var(--color-bg)' }} />

      {/* Top text — sits in the clear gap above the shortened cross line. */}
      <div className="flex flex-col items-center justify-center font-mono text-[13px] tracking-[0.3em] font-bold uppercase select-none z-10 text-center px-5 py-2">
        <div className="opacity-80 flex flex-col items-center gap-1.5" style={{ color: 'var(--color-bg)' }}>
          <span>REGARDED</span>
          <span>GAMES</span>
        </div>
      </div>

      {/* Stadium capsule — rounded pill: gold-gradient ring over a dark fill,
          no heavy border. Two i-buttons + labels stacked inside. */}
      <div className="relative flex items-center justify-center z-10">
        {/* Pulsing glow */}
        <div className="absolute w-32 h-56 rounded-full blur-xl opacity-20 pointer-events-none animate-pulse" style={{ background: 'var(--color-gold)' }} />
        {/* Gradient ring — thin pill frame */}
        <div className="p-[3px] shadow-lg" style={{
          borderRadius: '9999px',
          background: 'linear-gradient(180deg, var(--color-gold) 0%, var(--color-gold-15) 100%)',
        }}>
          {/* Inner body */}
          <div className="relative flex flex-col items-center pointer-events-auto"
            style={{ borderRadius: '9999px', backgroundColor: 'var(--color-card3)' }}>
            {/* Dashed inner outline following the pill */}
            <div className="absolute inset-1.5 pointer-events-none" style={{
              borderRadius: '9999px',
              border: '1px dashed var(--color-text2)',
              opacity: 0.25,
            }} />
            {/* Top button */}
            <div className="flex flex-col items-center gap-2 z-10 px-7 pt-6 pb-2.5">
              <a
                href={BACK_INFO_BUTTONS[0].href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="w-16 h-16 rounded-full flex items-center justify-center border-2 hover:scale-110 active:scale-95 transition-all duration-300 shadow-md"
                style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-gold)', color: 'var(--color-gold-hover)' }}
              >
                <span className="text-3xl font-serif italic font-extrabold select-none">i</span>
              </a>
              <span className="font-mono text-[14px] font-bold uppercase tracking-widest text-text2">{BACK_INFO_BUTTONS[0].label}</span>
            </div>
            {/* Waist divider */}
            <div className="w-10 h-px opacity-40 pointer-events-none" style={{ backgroundColor: 'var(--color-gold)' }} />
            {/* Bottom button */}
            <div className="flex flex-col items-center gap-2 z-10 px-7 pt-2.5 pb-6">
              <a
                href={BACK_INFO_BUTTONS[1].href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="w-16 h-16 rounded-full flex items-center justify-center border-2 hover:scale-110 active:scale-95 transition-all duration-300 shadow-md"
                style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-gold)', color: 'var(--color-gold-hover)' }}
              >
                <span className="text-3xl font-serif italic font-extrabold select-none">i</span>
              </a>
              <span className="font-mono text-[14px] font-bold uppercase tracking-widest text-text2">{BACK_INFO_BUTTONS[1].label}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom text — sits in the clear gap below the shortened cross line. */}
      <div className="flex flex-col items-center justify-center font-mono text-[13px] tracking-[0.3em] font-bold uppercase select-none z-10 text-center px-5 py-2">
        <div className="opacity-80 flex flex-col items-center gap-1.5" style={{ color: 'var(--color-bg)' }}>
          <span>CLASS WAR</span>
          <span>THE GAME</span>
        </div>
      </div>
    </div>
  );
}

/* The closed book slides in from the right before anything else happens; the
   cover-fold, wheel sweep and bezel all wait out this slide. */
const SLIDE_IN_S = 0.6;
const SLIDE_OUT_S = 0.7;
const SLIDE_IN_MS = SLIDE_IN_S * 1000;

/* Click riffle to/from the backside: the follower leaf starts when the leader
   is this far through its turn, so the two pages cascade over and a static Sec
   05 spread is never shown. */
const RIFFLE_STAGGER = 0.35;

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
const Z_LEAF3 = 1;        // backside leaf, resting (under leaf2)
const Z_LEAF2 = 2;        // Sec04/005 leaf
const Z_BACK_TOP = 4;     // backside leaf lifted on top of the stack
const Z_COVER_DOWN = 0.5; // cover sunk flat under the right leaves
const Z_COVER_UP = 6;     // cover closed / opening, above everything

/* Depth wrapper transform: push to depth z AND counter-scale by (P-z)/P so the
   page's APPARENT size is constant at every depth — without this, a leaf pushed
   toward the viewer (higher z) renders larger and visibly "grows" as it changes
   depth during a turn. The two cancel: perspective magnifies by P/(P-z), the
   scale shrinks by (P-z)/P. */
const tz = (z: number) => `translateZ(${z}px) scale(${(SCENE_PERSPECTIVE - z) / SCENE_PERSPECTIVE})`;

/* Cover hold + book-fold first; the wheel begins painting as the page settles flat. */
const SWEEP_DELAY_MS = 1250;
/* Clockwise arc-grow from the 9 o'clock mark (startAngle 180). */
const SWEEP_DURATION_MS = 1000;
/* Bezel ticks fade in over this duration after the sweep lands. */
const BEZEL_FADE_MS = 600;

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

const Rulebook: React.FC<RulebookProps> = ({ active = false, page = 0, dir = 1 }) => {
  const data = TABLE_DATA;
  const { darkMode } = useTheme();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredParent, setHoveredParent] = useState<string | null>(null);

  /* Backside of the book, reached by turning the remaining pages on click.
     The next click turns them back to the scroll-current page; resets when
     the section deactivates or the scroll system flips the page. */
  const [showBack, setShowBack] = useState(false);

  /* The direction the book LEAVES in is frozen the instant it deactivates —
     later `dir` flips (the scroll system stepping between other sections) must
     not retarget a parked book. Mirrors CardThrow's exitDir pattern. */
  const [exitDir, setExitDir] = useState<1 | -1>(1);
  const [prevActive, setPrevActive] = useState(active);
  /* Until the book has been active once it sits parked off-screen right (hidden)
     so its first entrance always slides in rather than fading from center. */
  const [everActive, setEverActive] = useState(active);

  /* Scroll-driven backside flash, distinct from the click `showBack`:
       enter-up   — the book lands showing its back, then turns to Sec 05.
       exit-down  — the book flashes its back, then slides off to the left.
     `flashBack` turns the same leaves as `showBack`; `exiting` gates the
     slide so it waits for that flash. */
  const [flashBack, setFlashBack] = useState(false);
  const [exiting, setExiting] = useState(false);
  /* On an up-entrance the leaves must START on the back (no front→back turn) so
     only the backside shows, then turn open to Sec 05. While this is true the
     turn TO the back is instant; the turn back to the page animates. */
  const [enteredUp, setEnteredUp] = useState(false);

  /* z-choreography for the cover leaf: it must stay above the whole right
     stack while the book is closed AND during the opening fold — dropping it
     at the instant `active` flips would hide the cover behind the right-page
     leaves before it ever moves. It sinks under the stack only once it lies
     flat (fold complete), so turned pages can land on top of it. Declared above
     the render-time transition block, which pre-sinks it on enter-up. */
  const [coverDown, setCoverDown] = useState(active);

  /* Leaf turn duration — shared by scroll page-flips and the backside flips so
     every page-turn reads identically (see leaf transitions below). */
  const TURN_MS = 1000;
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
           open to Sec 05. Cover is pre-opened + sunk so no cover-fold shows. */
        setEnteredUp(true);
        setFlashBack(true);
        setCoverDown(true);
        flashTimersRef.current.push(
          setTimeout(() => { setFlashBack(false); setEnteredUp(false); }, SLIDE_IN_MS + FLASH_HOLD_MS)
        );
      } else {
        /* Enter-down: normal cover-open fold to Sec 04, no backside flash. */
        setEnteredUp(false);
        setFlashBack(false);
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

  /* Either trigger turns the book to its backside. */
  const backShown = showBack || flashBack;

  /* True from the moment the book turns to the backside until the backside
     leaf has finished flipping home again — keeps that leaf painted on top of
     the stack for the whole round trip, and marks the return riffle (so leaf2
     waits for it) as opposed to a plain scroll page-flip. */
  const [backOnTop, setBackOnTop] = useState(false);
  /* The backside leaf is painted on top once it BEGINS its turn. On the forward
     click riffle the 005 leaf (leaf2) leads, so the backside leaf must stay
     UNDER it until its own (staggered) turn starts — otherwise it pops above
     and shows Sec 05 before any page has turned. Deferred by the same stagger.
     On exit/enter flash and reverse it goes on top immediately. */
  const backLiftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (backLiftTimerRef.current) { clearTimeout(backLiftTimerRef.current); backLiftTimerRef.current = null; }
    if (!backShown) return;
    if (showBack && !flashBack && page < 1) {
      // forward click riffle: lift the backside leaf only when its turn starts.
      backLiftTimerRef.current = setTimeout(() => setBackOnTop(true), TURN_MS * RIFFLE_STAGGER);
    } else {
      setBackOnTop(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backShown]);
  /* A scroll page-flip resets a click-opened backside, but never an entry/exit
     flash (which owns its own page). */
  useEffect(() => { setShowBack(false); }, [page]);

  /* Two-stage entrance, both reset on section exit so each entry re-sweeps:
       sweeping    — arc data is live and growing clockwise from 9 o'clock.
       bezelOpacity — 0→1 ramp driven by rAF, starts when the sweep lands. */
  const [sweeping, setSweeping] = useState(false);
  const [bezelOpacity, setBezelOpacity] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      setSweeping(false);
      setBezelOpacity(0);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      return;
    }
    let revealTimer: ReturnType<typeof setTimeout>;
    const sweepTimer = setTimeout(() => {
      setSweeping(true);
      revealTimer = setTimeout(() => {
        /* rAF ramp: 0 → 1 over BEZEL_FADE_MS, updating ECharts opacity each frame. */
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min((now - start) / BEZEL_FADE_MS, 1);
          setBezelOpacity(t);
          if (t < 1) rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      }, SWEEP_DURATION_MS);
    }, SLIDE_IN_MS + SWEEP_DELAY_MS);

    return () => {
      clearTimeout(sweepTimer);
      clearTimeout(revealTimer);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  const groups = useMemo<Group[]>(() => {
    const map: Record<string, Group> = {};
    data.forEach((item, index) => {
      const key = item.parentName;
      if (!map[key]) {
        map[key] = {
          parentName: key,
          parentPercentage: item.parentPercentage,
          parentColor: item.parentColor,
          parentExplanation: item.parentExplanation,
          items: [],
        };
      }
      map[key].items.push({ ...item, globalIndex: index });
    });
    return Object.values(map);
  }, [data]);

  /* Rulebook clause numbers: groups are §4.1 / §4.2, slices §4.x.y. */
  const clauses = useMemo(() => {
    const byName: Record<string, string> = {};
    const byParent: Record<string, string> = {};
    groups.forEach((g, gi) => {
      byParent[g.parentName] = `4.${gi + 1}`;
      g.items.forEach((item, ii) => {
        byName[item.name] = `4.${gi + 1}.${ii + 1}`;
      });
    });
    return { byName, byParent };
  }, [groups]);

  const parentData = useMemo(() =>
    groups.map(g => ({ name: g.parentName, value: g.parentPercentage, color: g.parentColor })),
    [groups]
  );

  const borderColor = useMemo(() => {
    const c1 = resolveColor('var(--color-border)');
    if (c1 !== '#888888') return c1;
    const c2 = resolveColor('var(--border)');
    if (c2 !== '#888888') return c2;
    return '#3f3f46';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [darkMode]);

  const border2Color = useMemo(() => {
    const c1 = resolveColor('var(--color-border-2)');
    if (c1 !== '#888888') return c1;
    const c2 = resolveColor('var(--border-2)');
    if (c2 !== '#888888') return c2;
    const c3 = resolveColor('var(--color-border2)');
    if (c3 !== '#888888') return c3;
    return '#27272a';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [darkMode]);

  /* Mobile overlay swap — slice hover, falling back to the inner (parent) ring
     so the inner pie reveals its group details just like the outer slices. */
  const activeDisplay = useMemo(() => {
    if (hoveredIndex !== null) {
      const item = data[hoveredIndex];
      return {
        clause: clauses.byName[item.name],
        name: item.name,
        explanation: item.explanation,
        color: item.color,
        percentage: item.percentage,
        subChildren: item.subChildren,
      };
    }
    if (hoveredParent !== null) {
      const pData = data.find(d => d.parentName === hoveredParent);
      return {
        clause: clauses.byParent[hoveredParent],
        name: hoveredParent,
        explanation: pData?.parentExplanation,
        color: 'var(--color-text)',
        percentage: pData?.parentPercentage,
        subChildren: [] as Tier3Child[],
      };
    }
    return null;
  }, [hoveredIndex, hoveredParent, data, clauses]);

  /* Slice + parent ring — used by the desktop inline hover only. */
  const activeDisplayDesktop = useMemo(() => {
    if (hoveredIndex !== null) {
      const item = data[hoveredIndex];
      return {
        clause: clauses.byName[item.name],
        name: item.name,
        explanation: item.explanation,
        color: item.color,
        percentage: item.percentage,
        subChildren: item.subChildren,
      };
    }
    if (hoveredParent !== null) {
      const pData = data.find(d => d.parentName === hoveredParent);
      return {
        clause: clauses.byParent[hoveredParent],
        name: hoveredParent,
        explanation: pData?.parentExplanation,
        color: 'var(--color-text)',
        percentage: pData?.parentPercentage,
        subChildren: [] as Tier3Child[],
      };
    }
    return null;
  }, [hoveredIndex, hoveredParent, data, clauses]);

  const option = useMemo(() => {
    if (typeof window === 'undefined') return {};

    /* The wheel is printed on the paper page, so slice gaps and tick
       marks match the page surface. */
    const canvasColor = resolveColor('var(--color-card)');
    const textColor = resolveColor('var(--color-text)');
    const ringColor = resolveColor('var(--color-text2)');

    const tier1Items = parentData.map((d) => {
      const sliceColor = resolveColor(d.color);

      return {
        name: d.name,
        value: d.value,
        itemStyle: {
          color: sliceColor,
        },
        emphasis: {
          scale: false,
          itemStyle: {
            color: sliceColor,
          }
        }
      };
    });

    const tier2Items = data.map((d) => {
      const words = d.name.split(' ');
      const isLong = d.name.length > 12 && words.length > 1;
      let labelText: string;
      if (isLong) {
        const mid = Math.ceil(words.length / 2);
        const l1 = words.slice(0, mid).join(' ').toUpperCase();
        const l2 = words.slice(mid).join(' ').toUpperCase();
        labelText = `{n|${l1}}\n{n|${l2}}\n{p|${d.percentage}%}`;
      } else {
        labelText = `{n|${d.name.toUpperCase()}}\n{p|${d.percentage}%}`;
      }

      const baseColor = resolveColor(d.color);
      const hoverColor = resolveHoverColor(d.color, baseColor);

      // Bake per-slice label offsets directly into the item so ECharts applies
      // them from frame 1 of the sweep — labelLayout is a post-process and
      // causes a position jump after the animation settles.
      const nameUpper = d.name.toUpperCase();
      const labelOffset: [number, number] =
        nameUpper.includes('DAO TREASURY') ? [0, 10] :
        nameUpper.includes('GROWTH') ? [-3, 0] :
        [0, 0];

      return {
        name: d.name,
        value: d.percentage,
        label: {
          formatter: () => labelText,
          offset: labelOffset,
        },
        itemStyle: {
          color: baseColor,
          borderColor: canvasColor,
          borderWidth: 6,
          borderRadius: 8
        },
        emphasis: {
          scale: false,
          itemStyle: {
            color: hoverColor,
            borderColor: canvasColor,
            borderWidth: 6,
            borderRadius: 8
          }
        }
      };
    });

    return {
      // Off for hover re-renders so they apply instantly. On only during the
      // entrance sweep so hover never re-triggers it.
      animation: sweeping && bezelOpacity === 0,
      animationDuration: SWEEP_DURATION_MS,
      animationEasing: 'cubicOut',
      series: [
        {
          type: 'pie',
          radius: ['0%', '28%'],
          startAngle: 180,
          animationType: 'expansion',
          data: sweeping ? tier1Items : [],
          emphasis: { scale: false },
          label: {
            show: true,
            position: 'inside',
            formatter: (params: { name: string; value: number }) =>
              `{t1p|${params.value}%}`,
            rich: {
              t1n: { fontSize: 9, fontWeight: 900, color: textColor, lineHeight: 14 },
              t1p: { fontSize: 9, fontWeight: 700, color: textColor, lineHeight: 12 },
            },
          },
          labelLine: { show: false },
          itemStyle: {
            borderColor: canvasColor,
            borderWidth: 6,
            borderRadius: 4
          },
        },
        {
          type: 'pie',
          radius: ['31%', '90%'],
          startAngle: 180,
          animationType: 'expansion',
          data: sweeping ? tier2Items : [],
          emphasis: { scale: false },
          label: {
            show: true,
            position: 'inside',
            rich: {
              n: { fontSize: 10, fontWeight: 900, color: canvasColor, lineHeight: 14 },
              p: { fontSize: 9, fontWeight: 700, color: canvasColor, lineHeight: 12 },
            },
          },
          labelLine: { show: false },
        },
        {
          type: 'gauge',
          center: ['50%', '50%'],
          radius: '96%',
          z: 10,
          startAngle: 90,
          endAngle: -270,
          splitNumber: 12,
          // Always rendered; opacity ramps 0→1 via bezelOpacity so the ring and
          // ticks fade in smoothly rather than snapping on.
          axisLine: {
            show: true,
            lineStyle: {
              color: [[1, ringColor]],
              width: 1,
              opacity: 0.25 * bezelOpacity,
            }
          },
          pointer: { show: false },
          axisTick: {
            show: true,
            lineStyle: { color: canvasColor, opacity: bezelOpacity, width: 1 },
            length: 5,
            splitNumber: 3
          },
          splitLine: {
            show: true,
            lineStyle: { color: canvasColor, opacity: bezelOpacity, width: 1.5 },
            length: 12
          },
          axisLabel: { show: false },
          detail: { show: false },
          title: { show: false }
        }
      ],
    };
  }, [data, parentData, sweeping, bezelOpacity]);

  const onEvents = useMemo(() => ({
    mouseover: (params: { seriesIndex: number; name: string }) => {
      if (params.seriesIndex === 0) {
        setHoveredParent(params.name);
        setHoveredIndex(null);
      } else if (params.seriesIndex === 1) {
        const index = data.findIndex(d => d.name === params.name);
        setHoveredIndex(index >= 0 ? index : null);
        setHoveredParent(null);
      }
    },
    mouseout: () => {
      setHoveredParent(null);
      setHoveredIndex(null);
    },
  }), [data]);

  const sectionHeading = (
    <div className="hidden md:flex flex-col gap-1">
      <span className="font-mono text-[14px] font-black uppercase tracking-[0.25em] text-text2">
        Sec. 04 — Distribution of Power
      </span>
      <div className="border-b border-[var(--color-border2)] opacity-60" />
    </div>
  );

  /* The ECharts canvas — shared between the standalone desktop column and the
     embedded mobile slot inside the card. Hidden until the sweep fires. */
  const chartCanvas = (
    <div
      className="w-full aspect-square transition-opacity duration-150"
      style={{ opacity: sweeping ? 1 : 0, pointerEvents: sweeping ? 'auto' : 'none', visibility: sweeping ? 'visible' : 'hidden' }}
    >
      {active && (
        <ReactECharts
          option={option}
          onEvents={onEvents}
          style={{ height: '100%', width: '100%' }}
          notMerge={false}
          lazyUpdate
        />
      )}
    </div>
  );

  /* Right page — shared by the desktop spread and the mobile stack. */
  const rulebookCard = (
        <RulebookCard
          themeColor="var(--color-gold)"
          themeColorHover="var(--color-gold-hover)"
          themeColorRgba="212, 175, 55"
          chassisGradient=""
          noBezel
          noBorder
          maxWidth="none"
          width="100%"
          minHeight="0"
          headerTag="Rulebook"
          title="DISTRIBUTION OF POWER"
          symbol={<span className="font-sans text-[15px]">§</span>}
          pageNumber=""
          footerLeftText=""
          footerMiddleText=""
          footerRightText=""

          detailsSlot={
            <div className="relative flex flex-col grow gap-3 w-full">

              {/* ── DESKTOP layout ── */}
              <div className="hidden md:flex flex-col grow gap-3 w-full">
                {sectionHeading}

                {/* Group summaries */}
                <div className="flex flex-col gap-5 w-full">
                  {groups.map((g, gi) => {
                    const groupClause = clauses.byParent[g.parentName];
                    const isThisGroupHovered = hoveredParent === g.parentName;
                    return (
                      <div key={gi} className="flex flex-col gap-1">
                        <div className="flex items-end gap-1.5">
                          <span className="font-mono text-[13px] font-black tabular-nums shrink-0 mb-px text-text">§ {groupClause}</span>
                          <span className="font-display font-black text-[14px] uppercase tracking-widest leading-tight text-text">{g.parentName}</span>
                          <DottedLeader />
                          <span className="font-mono font-bold text-[17px] tabular-nums shrink-0 text-text">{g.parentPercentage}%</span>
                        </div>
                        {isThisGroupHovered && (
                          <p className="font-sans text-[14px] text-text2 leading-relaxed pl-4">{g.parentExplanation ?? ''}</p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Allocation index with per-row inline swap */}
                <div className="flex flex-col gap-2 pt-2.5 border-t border-border">
                  <span className="font-mono text-[14px] font-black uppercase tracking-[0.25em] text-text2">Allocation Index</span>
                  {data.map((d, i) => {
                    const itemClause = clauses.byName[d.name];
                    const isSliceHovered = hoveredIndex !== null && data[hoveredIndex]?.name === d.name;
                    return (
                      <div key={i} className="flex flex-col gap-0.5">
                        {isSliceHovered && activeDisplay ? (
                          <>
                            <div className="flex items-end gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0 mb-0.75" style={{ backgroundColor: activeDisplay.color }} />
                              <span className="font-mono text-[13px] font-black tabular-nums shrink-0 mb-px" style={{ color: activeDisplay.color }}>§ {activeDisplay.clause}</span>
                              <span className="font-display font-black text-[14px] uppercase tracking-widest leading-tight" style={{ color: activeDisplay.color }}>{activeDisplay.name}</span>
                              <DottedLeader />
                              {activeDisplay.percentage != null && (
                                <span className="font-mono font-bold text-[17px] tabular-nums shrink-0" style={{ color: activeDisplay.color }}>{activeDisplay.percentage}%</span>
                              )}
                            </div>
                            <div className="pl-5 flex flex-col gap-1.5">
                              <p className="font-sans text-[14px] text-text2 leading-relaxed">{activeDisplay.explanation ?? 'No additional information available.'}</p>
                              {activeDisplay.subChildren && activeDisplay.subChildren.length > 0 && (
                                <div className="flex flex-col gap-1.5 pt-1.5 border-t border-border">
                                  {activeDisplay.subChildren.map((sub, sIdx) => (
                                    <div key={sIdx} className="flex items-end gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full shrink-0 mb-0.75" style={{ backgroundColor: sub.color }} />
                                      <span className="font-mono text-[13px] uppercase tracking-wider text-text2 leading-tight">{sub.name}</span>
                                      <DottedLeader />
                                      <span className="font-mono text-[13px] tabular-nums shrink-0 text-text2">{sub.percentage}%</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="flex items-end gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0 mb-0.75" style={{ backgroundColor: d.color }} />
                            <span className="font-mono text-[13px] tabular-nums shrink-0 text-text2">§ {itemClause}</span>
                            <span className="font-mono text-[13px] uppercase tracking-wider leading-tight text-text">{d.name}</span>
                            <DottedLeader />
                            <span className="font-mono text-[13px] tabular-nums shrink-0 text-text">{d.percentage}%</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <p className="font-mono text-[10px] uppercase tracking-widest text-text2 opacity-60 mt-auto pt-2 transition-opacity duration-150" style={{ opacity: activeDisplayDesktop ? 0 : undefined }}>
                  Hover the wheel to inspect a clause
                </p>
              </div>

              {/* ── MOBILE layout ── */}
              <div className="md:hidden relative flex flex-col grow gap-3 w-full">
                {sectionHeading}

                {/* Groups with slices indented beneath, no allocation index header or border */}
                <div className="flex flex-col gap-3 w-full">
                  {groups.map((g, gi) => {
                    const groupClause = clauses.byParent[g.parentName];
                    return (
                      <div key={gi} className="flex flex-col gap-1">
                        {/* Group heading */}
                        <div className="flex items-end gap-1.5">
                          <span className="font-mono text-[13px] font-black tabular-nums shrink-0 mb-px text-text">§ {groupClause}</span>
                          <span className="font-display font-black text-[14px] uppercase tracking-widest leading-tight text-text">{g.parentName}</span>
                          <DottedLeader />
                          <span className="font-mono font-bold text-[17px] tabular-nums shrink-0 text-text">{g.parentPercentage}%</span>
                        </div>
                        {/* Indented slices */}
                        <div className="flex flex-col gap-1 pl-4 border-l border-border">
                          {g.items.map((d) => {
                            const itemClause = clauses.byName[d.name];
                            return (
                              <div key={d.name} className="flex items-end gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full shrink-0 mb-0.75" style={{ backgroundColor: d.color }} />
                                <span className="font-mono text-[13px] tabular-nums shrink-0 text-text2">§ {itemClause}</span>
                                <span className="font-mono text-[13px] uppercase tracking-wider leading-tight text-text">{d.name}</span>
                                <DottedLeader />
                                <span className="font-mono text-[13px] tabular-nums shrink-0 text-text">{d.percentage}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="font-mono text-[10px] uppercase tracking-widest text-text2 opacity-60 mt-auto pt-2">
                  Hover the wheel to inspect a clause
                </p>

                {/* Hover overlay — fades over the whole mobile content on slice hover */}
                <div
                  className="absolute inset-0 flex flex-col gap-2 transition-opacity duration-150"
                  style={{ opacity: activeDisplay ? 1 : 0, pointerEvents: activeDisplay ? 'auto' : 'none', backgroundColor: 'var(--color-card)' }}
                  aria-hidden={!activeDisplay}
                >
                  {activeDisplay && (
                    <>
                      <div className="flex items-end gap-1.5">
                        {activeDisplay.clause && (
                          <span className="font-mono text-[13px] font-black tabular-nums shrink-0 mb-px" style={{ color: activeDisplay.color }}>§ {activeDisplay.clause}</span>
                        )}
                        <span className="font-display font-black text-[14px] uppercase tracking-widest leading-tight" style={{ color: activeDisplay.color }}>{activeDisplay.name}</span>
                        <DottedLeader />
                        {activeDisplay.percentage != null && (
                          <span className="font-mono font-bold text-[17px] tabular-nums shrink-0" style={{ color: activeDisplay.color }}>{activeDisplay.percentage}%</span>
                        )}
                      </div>
                      <p className="font-sans text-[14px] text-text2 leading-relaxed">{activeDisplay.explanation ?? 'No additional information available.'}</p>
                      {activeDisplay.subChildren && activeDisplay.subChildren.length > 0 && (
                        <div className="flex flex-col gap-1.5 pt-2 border-t border-border">
                          {activeDisplay.subChildren.map((sub, sIdx) => (
                            <div key={sIdx} className="flex items-end gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0 mb-0.75" style={{ backgroundColor: sub.color }} />
                              <span className="font-mono text-[13px] uppercase tracking-wider text-text2 leading-tight">{sub.name}</span>
                              <DottedLeader />
                              <span className="font-mono text-[13px] tabular-nums shrink-0 text-text2">{sub.percentage}%</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

            </div>
          }
        />
  );

  /* ---- Book slide choreography ----
     Enters from the right edge (both scroll directions), parks centered, and
     leaves to the left after the exit-down backside flash. Exit-up reverses the
     entrance back off to the right. The slide offset clears the widest viewport;
     the book is centered, so one screen-width always pushes it fully off. */
  const slideOffset = typeof window !== 'undefined' ? window.innerWidth : 1600;

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
  const [parkedRight, setParkedRight] = useState(false);
  useEffect(() => {
    if (active) { setParkedRight(false); return; }
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

  /* Inner fold + wheel sweep wait for the slide-in to settle on entry. */
  const innerDelay = active ? SLIDE_IN_S : 0;

  /* The book holds its open spread through the exit-down backside flash so the
     cover/spine don't snap shut before the back has shown — they reset only as
     the book slides away. */
  const bookOpen = active || backShown;

  /* The backside leaves' turn transition. Normally a full page-turn; on an
     up-entrance the turn ONTO the back is instant (the book must appear already
     showing only its back) while the subsequent turn open to Sec 05 animates. */
  const turnDur = TURN_MS / 1000;
  const turnEase = [0.45, 0, 0.25, 1] as const;

  /* Click riffle (request #2/#4): reaching the backside from Sec 04 riffles two
     leaves over toward the back — the 005 leaf (Sec 04 → 005) leads and the
     backside leaf follows a beat later, OVERLAPPING so a static Sec 05 spread is
     never shown. Reversed on click-back: the backside leaf leads, the 005 leaf
     follows. Gated on the click `showBack` round-trip (backOnTop) so plain
     scroll flips and the entry/exit flash stay simultaneous. */
  const riffle = !flashBack && page < 1 && (backShown || backOnTop);
  // leaf2 = the 005/Sec-04 leaf, leaf3 = the backside leaf.
  const leaf2Delay = riffle && !backShown ? turnDur * RIFFLE_STAGGER : 0; // reverse: follows leaf3
  const leaf3Delay = riffle && backShown ? turnDur * RIFFLE_STAGGER : 0;  // forward: follows leaf2

  const turnInstant = enteredUp && flashBack;
  const leaf2TurnT = turnInstant ? { duration: 0 } : { duration: turnDur, ease: turnEase, delay: leaf2Delay };
  const leaf3TurnT = turnInstant ? { duration: 0 } : { duration: turnDur, ease: turnEase, delay: leaf3Delay };

  /* Mobile equivalents (single-page book, 0.9s turns). page1 = Sec-04 leaf,
     page2 = roadmap/back leaf. Same overlapping riffle and up-entry instant. */
  const mTurnDur = 0.9;
  const mPage1Delay = riffle && !backShown ? mTurnDur * RIFFLE_STAGGER : 0; // reverse: follows page2
  const mPage2Delay = riffle && backShown ? mTurnDur * RIFFLE_STAGGER : 0;  // forward: follows page1
  const mInstant = enteredUp && flashBack;
  const mPage1TurnT = mInstant ? { duration: 0 } : { duration: mTurnDur, ease: turnEase, delay: mPage1Delay };
  const mPage2TurnT = mInstant ? { duration: 0 } : { duration: mTurnDur, ease: turnEase, delay: mPage2Delay };

  const mCoverAway = bookOpen;
  const mPage1Away = page >= 1 || backShown;
  /* page1 + cover fold ~270° onto the back via useFoldLeaf: an animated rotateY
     whose derived zIndex drops the leaf behind the back cover the exact frame it
     crosses M_FOLD_BEHIND_DEG (no state-flip lag). page2 does NOT fold — it flips
     in place to reveal its own backside (see the mobile page2 leaf). */
  const mCoverTurnT = mInstant
    ? { duration: 0 }
    : mCoverAway
      ? { duration: 0.9, delay: innerDelay + 0.25, ease: [0.45, 0, 0.25, 1] as const }
      : { duration: 0.45, ease: 'easeIn' as const };
  const mPage1Fold = useFoldLeaf(mPage1Away, mPage1TurnT, 30, 0);
  const mCoverFold = useFoldLeaf(mCoverAway, mCoverTurnT, 40, 1);
  /* Cover sinks under the stack once flat, and only pops back up when the book
     is fully closed AND gone (not merely mid-exit-flash). */
  useEffect(() => { if (!bookOpen) setCoverDown(false); }, [bookOpen]);

  return (
    <div className="w-full h-full relative">
      <div className="h-full flex flex-col items-center justify-center">
        <motion.div
          className="relative w-full h-full flex flex-col cursor-pointer select-none"
          style={{ maxWidth: '1100px', pointerEvents: active ? 'auto' : 'none' }}
          initial={false}
          animate={{ x: bookX, opacity: bookOpacity }}
          transition={bookTransition}
          onClick={() => { if (active) setShowBack((b) => !b); }}
        >

          {/* Desktop spread — two facing pages meeting at the spine. One shared
              3D scene: perspective + preserve-3d, so all leaves fold in the same
              space and stack by translateZ (not z-index, which preserve-3d
              ignores). */}
          <div className="hidden lg:flex relative items-stretch h-full" style={{ perspective: 2200, transformStyle: 'preserve-3d' }}>

            {/* leaf1 — left page. Front = wheel; back = book cover. Closed
                (inactive) the leaf lies on the right half showing the cover;
                on entry it folds open around the spine. It never moves for
                showBack — the backside lands on top of it via leaf3. The
                non-rotating wrapper carries the cover's depth slot so its
                stacking holds through the open/close fold. */}
            <div className="relative w-1/2 h-full" style={{ transformStyle: 'preserve-3d', transform: tz(coverDown ? Z_COVER_DOWN : Z_COVER_UP) }}>
            <motion.div
              className="absolute inset-0"
              style={{ transformOrigin: 'right center', transformStyle: 'preserve-3d' }}
              initial={false}
              animate={{ rotateY: bookOpen ? 0 : 180 }}
              transition={turnInstant
                ? { duration: 0 }
                : bookOpen
                  ? { duration: 1.05, delay: innerDelay + 0.25, ease: [0.45, 0, 0.25, 1] }
                  : { duration: 0.45, ease: 'easeIn' }}
              onAnimationComplete={() => { if (bookOpen) setCoverDown(true); }}
            >
              {/* Front face: wheel page */}
              <div
                className="relative h-full flex flex-col p-4 pb-9 rounded-l-md overflow-hidden"
                style={{
                  ...goldFrame('var(--color-card)', '3px 0 3px 3px'),
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
              >
                <div
                  className="absolute inset-0 pointer-events-none opacity-[0.05] mix-blend-overlay"
                  style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 3px)' }}
                />
                <div
                  className="absolute inset-y-1 left-0 w-[5px] pointer-events-none z-10"
                  style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent 0px, transparent 1.5px, rgba(0,0,0,0.22) 1.5px, rgba(0,0,0,0.22) 2.5px)' }}
                />
                <div className="relative flex-1 rounded-sm border flex items-center justify-center" style={{ borderColor: 'rgba(212, 175, 55, 0.3)' }}>
                  {cornerBrackets}
                  {chartCanvas}
                </div>
                <PageFooter left="001" right="Rulebook" />
              </div>

              {/* Back face at rotateY(180deg): cover art — visible on entry fold,
                  and again when the leaf swings past 90° on the way to -180. */}
              <div
                className="absolute inset-0 rounded-r-md flex items-center justify-center"
                style={{
                  ...goldCoverFrame('3px'),
                  transform: 'rotateY(180deg)',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
              >
                <div className="absolute inset-2 rounded-sm border pointer-events-none" style={{ borderColor: 'var(--color-bg)', opacity: 0.4 }} />
                {coverArt}
              </div>
            </motion.div>
            </div>

            {/* Right half — leaf stack. preserve-3d so its leaves share the
                spread's 3D scene and stack by translateZ. h-full so both halves
                are the same definite height (no content-driven resize). */}
            <div className="relative w-1/2 h-full" style={{ transformStyle: 'preserve-3d' }}>

              {/* leaf3: front = roadmap right page; back = the book's backside.
                  On backShown it turns over the spine and lands on the LEFT
                  half (on top of the stack) displaying BackCoverDesign. Reaching
                  the back from Sec 04 (page 0) is a two-stage riffle: leaf2 turns
                  Sec 04 → 005 first (a real page-turn, identical to a scroll
                  flip), then leaf3 turns 005 → back. Reversed on click-back. The
                  leaf2/leaf3 delays (leaf3TurnT/leaf2TurnT) sequence the stages.
                  Depth lives on the non-rotating wrapper (translateZ, lifted to
                  the top via backOnTop) so culling stays correct and stacking
                  holds through the turn. */}
              <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d', transform: tz(backOnTop ? Z_BACK_TOP : Z_LEAF3) }}>
              <motion.div
                className="absolute inset-0"
                style={{ transformOrigin: 'left center', transformStyle: 'preserve-3d' }}
                initial={false}
                animate={{ rotateY: backShown ? -180 : 0 }}
                transition={leaf3TurnT}
                onAnimationComplete={() => { if (!backShown) setBackOnTop(false); }}
              >
                <div
                  className="absolute inset-0"
                  style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', pointerEvents: backShown ? 'none' : 'auto' }}
                >
                  <PageFace side="right" footer={<PageFooter left="Campaign Sequence ↗" right="004" />}>{roadmapRightContent}</PageFace>
                </div>
                <div
                  className="absolute inset-0"
                  style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', pointerEvents: backShown ? 'auto' : 'none' }}
                >
                  <BackCoverDesign />
                </div>
              </motion.div>
              </div>

              {/* leaf2: front = clauses page (Sec 04), back = roadmap left page.
                  Fills the half (absolute inset-0) so it never defines height —
                  the spread height is the container's definite h-full, identical
                  for both halves and stable through the turn. Turns for a scroll
                  page-flip (page ≥ 1) AND when reaching the backside from Sec 04 —
                  see leaf2TurnT for the riffle ordering. Non-rotating wrapper
                  carries its depth slot. */}
              <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d', transform: tz(Z_LEAF2) }}>
              <motion.div
                className="absolute inset-0"
                style={{ transformOrigin: 'left center', transformStyle: 'preserve-3d' }}
                initial={false}
                animate={{ rotateY: page >= 1 || backShown ? -180 : 0 }}
                transition={leaf2TurnT}
              >
                <div
                  className="relative h-full flex flex-col p-4 pb-9 rounded-r-md overflow-hidden"
                  style={{
                    ...goldFrame('var(--color-card)', '3px 3px 3px 0'),
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    pointerEvents: page >= 1 || backShown ? 'none' : 'auto',
                  }}
                >
                  {/* Page-edge stack on the fore-edge (outer right edge) */}
                  <div
                    className="absolute inset-y-1 right-0 w-[5px] pointer-events-none z-10"
                    style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent 0px, transparent 1.5px, rgba(0,0,0,0.22) 1.5px, rgba(0,0,0,0.22) 2.5px)' }}
                  />
                  {rulebookCard}
                  <PageFooter left="Distribution of Power ↗" right="002" />
                </div>
                <div
                  className="absolute inset-0"
                  style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', pointerEvents: page >= 1 && !backShown ? 'auto' : 'none' }}
                >
                  <PageFace side="left" footer={<PageFooter left="003" right="Rulebook" />}>{roadmapLeftContent}</PageFace>
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

          {/* Mobile — single-page book. page1 + cover fold ~270° onto the back
              (M_FOLD_DEG). Showing the backside is different: page2 (005) flips
              180° over its left edge to reveal its OWN back face (the info
              buttons) while this whole container slides one page-width LEFT,
              bringing the flipped backside (which lands one page-width right of
              its hinge) into frame. The slide uses page2's turn transition so
              they stay in sync. */}
          <motion.div
            className="lg:hidden relative h-full"
            style={{ perspective: 1600 }}
            initial={false}
            animate={{ x: backShown ? '-100%' : '0%' }}
            transition={mPage2TurnT}
          >

            {/* page1 — wheel + clauses. Folds away with a near-full spin onto the
                back (M_FOLD_DEG), visible throughout; drops behind once landed. */}
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
              <div className="relative flex flex-col h-full rounded-md overflow-hidden" style={goldFrame('var(--color-card)', '3px')}>
                {/* Page-edge stack on the fore-edge (outer right edge) */}
                <div
                  className="absolute inset-y-1 right-0 w-[5px] pointer-events-none z-10"
                  style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent 0px, transparent 1.5px, rgba(0,0,0,0.22) 1.5px, rgba(0,0,0,0.22) 2.5px)' }}
                />
                {/* 3/5 chart + 2/5 text split of the available height */}
                <div className="min-h-0 px-4 pt-4" style={{ flex: '3 1 0' }}>
                  <div className="relative w-full h-full rounded-sm border" style={{ borderColor: 'rgba(212, 175, 55, 0.3)' }}>
                    {cornerBrackets}
                    <div
                      className="w-full h-full transition-opacity duration-150"
                      style={{ opacity: sweeping ? 1 : 0, pointerEvents: sweeping ? 'auto' : 'none', visibility: sweeping ? 'visible' : 'hidden' }}
                    >
                      {active && (
                        <ReactECharts
                          option={option}
                          onEvents={onEvents}
                          style={{ height: '100%', width: '100%' }}
                          notMerge={false}
                          lazyUpdate
                        />
                      )}
                    </div>
                  </div>
                </div>
                <div className="min-h-0 overflow-hidden" style={{ flex: '2 1 0' }}>
                  {rulebookCard}
                </div>

                {/* Running footer — inside the gold frame */}
                <div className="flex justify-between items-center px-4 pb-2.5 text-[14px] font-mono opacity-80" style={{ color: 'var(--color-text2)' }}>
                  
                  <span>Distribution of Power ↗</span>
                  <span>001</span>
                </div>
              </div>
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
              <div className="relative h-full rounded-md flex items-center justify-center" style={goldCoverFrame('3px')}>
                <div className="absolute inset-2 rounded-sm border pointer-events-none" style={{ borderColor: 'var(--color-bg)', opacity: 0.4 }} />
                {coverArt}
              </div>
            </motion.div>

            {/* page2 — Campaign Sequence roadmap (front) + the book's backside
                with the info buttons (back). Two-faced: showing the backside
                flips this leaf 180° over its LEFT edge (the left edge is the one
                that lifts and crosses → hinge on the RIGHT, rotate -180) while
                the whole mobile book slides one page-width LEFT, bringing the
                flipped backside (which lands one page-width right of its hinge)
                into frame. Reverse mirrors it. */}
            <motion.div
              className="absolute inset-0 z-20"
              style={{
                transformOrigin: 'right center',
                transformStyle: 'preserve-3d',
                pointerEvents: page >= 1 ? 'auto' : 'none',
              }}
              initial={false}
              animate={{ rotateY: backShown ? -180 : 0 }}
              transition={mPage2TurnT}
            >
              {/* Front face — Sec 05 roadmap */}
              <div
                className="absolute inset-0 h-full flex flex-col rounded-md overflow-hidden"
                style={{ ...goldFrame('var(--color-card)', '3px'), backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
              >
                <div className="relative flex-1 flex flex-col p-4 pb-1.5">
                  <div className="relative flex-1 rounded-sm border overflow-hidden flex flex-col" style={{ borderColor: 'rgba(212, 175, 55, 0.3)' }}>
                    {cornerBrackets}
                    <div className="relative flex flex-col flex-1 p-5">
                      {roadmapMobileContent}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center px-4 pb-2.5 pt-1.5 text-[14px] font-mono opacity-80" style={{ color: 'var(--color-text2)' }}>
                  <span>Campaign Sequence ↗</span>
                  <span>002</span>
                </div>
              </div>
              {/* Back face — the book's backside with the info buttons */}
              <div
                className="absolute inset-0"
                style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
              >
                <BackCoverDesign edge="full" />
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Rulebook;
