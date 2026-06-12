// src/components/NestedPieChart.tsx
"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '@/context/ThemeContext';
import RulebookCard from '@/components/RulebookCard';
import { motion } from 'framer-motion';

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

interface NestedPieChartProps {
  data: ChartDataItem[];
  /** Section is the active scroll-stop — drives the card fold + wheel sweep. */
  active?: boolean;
  /** Book page from the scroll system: 0 = Distribution, 1 = Campaign. */
  page?: number;
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
  const el = document.createElement('div');
  el.setAttribute('style', `position:fixed;width:0;height:0;background:${cssValue}`);
  document.body.appendChild(el);
  const resolved = getComputedStyle(el).backgroundColor;
  document.body.removeChild(el);
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
    className="flex-1 border-b border-dotted opacity-40 mb-[3px]"
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

/* Front-cover artwork: emblem + title. */
const coverArt = (
  <div className="flex flex-col items-center gap-3">
    <div
      className="w-7 h-7 rounded flex items-center justify-center font-black border"
      style={{ backgroundColor: 'var(--color-card3)', borderColor: 'var(--color-gold)', color: 'var(--color-gold-hover)' }}
    >
      <span className="font-sans text-xs">§</span>
    </div>
    <span className="font-display font-black uppercase tracking-[0.3em] text-2xl" style={{ color: 'var(--color-gold)' }}>
      Rulebook
    </span>
  </div>
);

/* Campaign Sequence roadmap — placeholder milestones, content TBD. */
const ROADMAP_POINTS = [
  { clause: '5.1', title: 'Phase I', status: 'Pending', desc: 'To be defined.' },
  { clause: '5.2', title: 'Phase II', status: 'Pending', desc: 'To be defined.' },
  { clause: '5.3', title: 'Phase III', status: 'Pending', desc: 'To be defined.' },
  { clause: '5.4', title: 'Phase IV', status: 'Pending', desc: 'To be defined.' },
];

/* Backside info buttons — placeholder targets/labels, content TBD. */
const BACK_INFO_BUTTONS = [
  { label: 'Distribution', href: '#' },
  { label: 'Roadmap', href: '#' },
];

/* Section heading row, rulebook style. */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[9px] font-black uppercase tracking-[0.25em] text-text2">{children}</span>
      <div className="border-b border-[var(--color-border2)] opacity-60" />
    </div>
  );
}

/* One milestone row on the Campaign Sequence page. */
function RoadmapEntry({ point, isLive, isLast }: { point: (typeof ROADMAP_POINTS)[number]; isLive: boolean; isLast: boolean }) {
  return (
    <div className="flex gap-2.5">
      {/* Rail: node + connector down to the next milestone */}
      <div className="flex flex-col items-center pt-[3px]">
        <span
          className="w-2 h-2 rounded-full shrink-0 border"
          style={isLive
            ? { backgroundColor: 'var(--color-gold)', borderColor: 'var(--color-gold)', boxShadow: '0 0 8px var(--color-gold-35)' }
            : { backgroundColor: 'transparent', borderColor: 'var(--color-border2)' }}
        />
        {!isLast && <span className="w-px flex-1 opacity-50" style={{ backgroundColor: 'var(--color-border2)' }} />}
      </div>
      <div className="flex flex-col gap-1 flex-1 pb-4 min-w-0">
        <div className="flex items-end gap-1.5">
          <span className="font-mono text-[10px] font-black tabular-nums shrink-0 mb-[1px] text-text">§ {point.clause}</span>
          <span className="font-display font-black text-[11px] uppercase tracking-widest leading-tight text-text">{point.title}</span>
          <DottedLeader />
          <span
            className="font-mono text-[8px] font-black uppercase tracking-widest px-1.5 py-[2px] rounded border shrink-0"
            style={isLive
              ? { color: 'var(--color-gold)', borderColor: 'var(--color-gold-35)', backgroundColor: 'var(--color-gold-15)' }
              : { color: 'var(--color-text2)', borderColor: 'var(--color-border)' }}
          >
            {point.status}
          </span>
        </div>
        <p className="font-sans text-[11px] text-text2 leading-relaxed">{point.desc}</p>
      </div>
    </div>
  );
}

function RoadmapList({ from, to }: { from: number; to: number }) {
  const points = ROADMAP_POINTS.slice(from, to);
  return (
    <div className="flex flex-col">
      {points.map((p, i) => (
        <RoadmapEntry key={p.clause} point={p} isLive={from + i === 0} isLast={i === points.length - 1} />
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
      className="absolute bottom-0 inset-x-0 flex justify-between items-center px-3 pb-2 text-[9px] font-mono opacity-80 pointer-events-none z-20"
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
      className={`relative h-full w-full flex flex-col overflow-hidden p-3 pb-7 border-y ${isLeft ? 'rounded-l-md border-l' : 'rounded-r-md border-r'}`}
      style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-gold)' }}
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
        <div className="relative flex flex-col flex-1 p-4 md:p-5">
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
      className={`relative h-full w-full flex flex-col items-center justify-between p-6 overflow-hidden ${edge === 'left' ? 'rounded-l-md border-y border-l' : 'rounded-md border'}`}
      style={{ backgroundColor: 'var(--color-card2)', borderColor: 'var(--color-gold)' }}>
      <div className="absolute inset-2 rounded-sm border pointer-events-none" style={{ borderColor: 'rgba(212, 175, 55, 0.3)' }} />
      {/* Cross lines */}
      <div className="absolute inset-y-3 left-1/2 -translate-x-1/2 w-0.5 opacity-30 pointer-events-none" style={{ backgroundColor: 'var(--color-border2)' }} />
      <div className="absolute top-1/2 -translate-y-1/2 inset-x-3 h-0.5 opacity-30 pointer-events-none" style={{ backgroundColor: 'var(--color-border2)' }} />
      {/* Heavy corner brackets */}
      <div className="absolute top-1 left-1 w-8 h-8 border-t-4 border-l-4 pointer-events-none rounded-tl-sm" style={{ borderColor: 'var(--color-gold)' }} />
      <div className="absolute top-1 right-1 w-8 h-8 border-t-4 border-r-4 pointer-events-none rounded-tr-sm" style={{ borderColor: 'var(--color-gold)' }} />
      <div className="absolute bottom-1 left-1 w-8 h-8 border-b-4 border-l-4 pointer-events-none rounded-bl-sm" style={{ borderColor: 'var(--color-gold)' }} />
      <div className="absolute bottom-1 right-1 w-8 h-8 border-b-4 border-r-4 pointer-events-none rounded-br-sm" style={{ borderColor: 'var(--color-gold)' }} />

      {/* Top text — masks the horizontal line */}
      <div className="flex flex-col items-center justify-center font-mono text-[10px] tracking-[0.3em] font-bold uppercase select-none z-10 text-center px-4 py-1.5" style={{ backgroundColor: 'var(--color-card2)' }}>
        <div className="opacity-60 flex flex-col items-center gap-1 text-text2">
          <span>REGARDED</span>
          <span>GAMES</span>
        </div>
      </div>

      {/* Peanut capsule — two circles stacked vertically with a narrow waist.
          Built as: glow → masking pad → gradient ring → inner body with two
          circular i-buttons separated by a pinched gap. */}
      <div className="relative flex items-center justify-center z-10">
        {/* Pulsing glow */}
        <div className="absolute w-32 h-56 rounded-full blur-xl opacity-20 pointer-events-none animate-pulse" style={{ background: 'var(--color-gold)' }} />
        {/* Masking pad: round-pill shape covers the cross lines */}
        <div className="p-2.5 pointer-events-none" style={{
          borderRadius: '9999px',
          backgroundColor: 'var(--color-card2)',
        }}>
          {/* Gradient ring — pill matching the inner body */}
          <div className="p-[3px] shadow-lg" style={{
            borderRadius: '9999px',
            background: 'linear-gradient(180deg, var(--color-gold) 0%, var(--color-gold-15) 100%)',
          }}>
            {/* Inner body: two circles + pinched waist via SVG clip-path */}
            <div className="relative flex flex-col items-center pointer-events-auto"
              style={{ borderRadius: '9999px', backgroundColor: 'var(--color-card3)', border: '4px solid var(--color-border2)' }}>
              {/* Dashed inner outline following the peanut */}
              <div className="absolute inset-1.5 pointer-events-none" style={{
                borderRadius: '9999px',
                border: '1px dashed var(--color-text2)',
                opacity: 0.25,
              }} />
              {/* Top button */}
              <div className="flex flex-col items-center gap-1.5 z-10 px-6 pt-5 pb-2">
                <a
                  href={BACK_INFO_BUTTONS[0].href}
                  onClick={(e) => e.stopPropagation()}
                  className="w-16 h-16 rounded-full flex items-center justify-center border-2 hover:scale-110 active:scale-95 transition-all duration-300 shadow-md"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-gold)', color: 'var(--color-gold-hover)' }}
                >
                  <span className="text-3xl font-serif italic font-extrabold select-none">i</span>
                </a>
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-text2">{BACK_INFO_BUTTONS[0].label}</span>
              </div>
              {/* Waist pinch — narrow horizontal divider */}
              <div className="w-10 h-px opacity-40 pointer-events-none" style={{ backgroundColor: 'var(--color-border2)' }} />
              {/* Bottom button */}
              <div className="flex flex-col items-center gap-1.5 z-10 px-6 pt-2 pb-5">
                <a
                  href={BACK_INFO_BUTTONS[1].href}
                  onClick={(e) => e.stopPropagation()}
                  className="w-16 h-16 rounded-full flex items-center justify-center border-2 hover:scale-110 active:scale-95 transition-all duration-300 shadow-md"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-gold)', color: 'var(--color-gold-hover)' }}
                >
                  <span className="text-3xl font-serif italic font-extrabold select-none">i</span>
                </a>
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-text2">{BACK_INFO_BUTTONS[1].label}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom text — masks the horizontal line */}
      <div className="flex flex-col items-center justify-center font-mono text-[10px] tracking-[0.3em] font-bold uppercase select-none z-10 text-center px-4 py-1.5" style={{ backgroundColor: 'var(--color-card2)' }}>
        <div className="opacity-60 flex flex-col items-center gap-1 text-text2">
          <span>OFFICIAL</span>
          <span>RULEBOOK</span>
        </div>
      </div>
    </div>
  );
}

/* Cover hold + book-fold first; the wheel begins painting as the page settles flat. */
const SWEEP_DELAY_MS = 1250;
/* Clockwise arc-grow from the 9 o'clock mark (startAngle 180). */
const SWEEP_DURATION_MS = 1000;
/* Bezel ticks fade in over this duration after the sweep lands. */
const BEZEL_FADE_MS = 600;

const NestedPieChart: React.FC<NestedPieChartProps> = ({ data, active = false, page = 0 }) => {
  const { darkMode } = useTheme();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredParent, setHoveredParent] = useState<string | null>(null);

  /* Backside of the book, reached by turning the remaining pages on click.
     The next click turns them back to the scroll-current page; resets when
     the section deactivates or the scroll system flips the page. */
  const [showBack, setShowBack] = useState(false);

  /* z-choreography for the cover leaf: it must stay above the whole right
     stack while the book is closed AND during the opening fold — dropping it
     at the instant `active` flips would hide the cover behind the right-page
     leaves before it ever moves. It sinks under the stack only once it lies
     flat (fold complete), so turned pages can land on top of it. */
  const [coverDown, setCoverDown] = useState(active);
  useEffect(() => { if (!active) setCoverDown(false); }, [active]);

  /* True from the moment the book turns to the backside until the backside
     leaf has finished flipping home again — keeps that leaf painted on top of
     the stack for the whole round trip, and marks the return riffle (so leaf2
     waits for it) as opposed to a plain scroll page-flip. */
  const [backOnTop, setBackOnTop] = useState(false);
  useEffect(() => { if (showBack) setBackOnTop(true); }, [showBack]);
  useEffect(() => {
    setShowBack(false);
    if (!active) setBackOnTop(false);
  }, [active, page]);

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
    }, SWEEP_DELAY_MS);

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
        name: hoveredParent.trim() || (pData?.parentPercentage === 75 ? 'Community Controlled' : 'Team & Operations'),
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

    const tier1Items = parentData.map((d, index) => {
      const sliceColor = index === 0 ? borderColor : border2Color;

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
              `{t1n|${params.name.trim() ? params.name.toUpperCase() : ''}}\n{t1p|${params.value}%}`,
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
  }, [data, parentData, borderColor, border2Color, sweeping, bezelOpacity]);

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
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[9px] font-black uppercase tracking-[0.25em] text-text2">
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
          symbol={<span className="font-sans text-xs">§</span>}
          pageNumber=""
          footerLeftText=""
          footerMiddleText=""
          footerRightText=""

          detailsSlot={
            <div className="flex flex-col flex-grow gap-3 w-full">
              {sectionHeading}

              {/* Both branches stay in the DOM at all times so the container is
                  always sized to whichever is taller — no layout jump on hover.
                  The inactive layer is invisible but still occupies its space. */}
              <div className="relative w-full">

                {/* Resting state — always reserves its space */}
                <div
                  className="flex flex-col gap-4 w-full transition-opacity duration-150"
                  style={{ opacity: activeDisplay ? 0 : 1, pointerEvents: activeDisplay ? 'none' : 'auto' }}
                  aria-hidden={!!activeDisplay}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-end gap-1.5">
                      <span className="font-mono text-[10px] font-black tabular-nums shrink-0 mb-[1px] text-text">§ 4.1</span>
                      <span className="font-display font-black text-[11px] uppercase tracking-widest leading-tight text-text">Community Controlled</span>
                      <DottedLeader />
                      <span className="font-mono font-bold text-sm tabular-nums shrink-0 text-text">75%</span>
                    </div>
                    <p className="font-sans text-[11px] text-text2 leading-relaxed">
                      DAO Treasury, Ecosystem Incentives & Day-1 Market Stability.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-end gap-1.5">
                      <span className="font-mono text-[10px] font-black tabular-nums shrink-0 mb-[1px] text-text">§ 4.2</span>
                      <span className="font-display font-black text-[11px] uppercase tracking-widest leading-tight text-text">Team & Operations</span>
                      <DottedLeader />
                      <span className="font-mono font-bold text-sm tabular-nums shrink-0 text-text">25%</span>
                    </div>
                    <p className="font-sans text-[11px] text-text2 leading-relaxed">
                      Operational Reserve LLC & Founding Team long-term alignment.
                    </p>
                  </div>

                  {/* Hidden on mobile — the wheel already shows all slices */}
                  <div className="hidden md:flex flex-col gap-1.5 pt-2 border-t border-[var(--color-border)]">
                    <span className="font-mono text-[9px] font-black uppercase tracking-[0.25em] text-text2">Allocation Index</span>
                    {data.map((d, i) => (
                      <div key={i} className="flex items-end gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0 mb-[3px]" style={{ backgroundColor: d.color }} />
                        <span className="font-mono text-[10px] tabular-nums shrink-0 text-text2">§ {clauses.byName[d.name]}</span>
                        <span className="font-mono text-[10px] uppercase tracking-wider leading-tight text-text">{d.name}</span>
                        <DottedLeader />
                        <span className="font-mono text-[10px] tabular-nums shrink-0 text-text">{d.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hover detail — absolutely overlaid so it doesn't add height */}
                <div
                  className="absolute inset-0 flex flex-col gap-2 w-full transition-opacity duration-150"
                  style={{ opacity: activeDisplay ? 1 : 0, pointerEvents: activeDisplay ? 'auto' : 'none' }}
                  aria-hidden={!activeDisplay}
                >
                  {activeDisplay && (
                    <>
                      <div className="flex items-end gap-1.5">
                        {activeDisplay.clause && (
                          <span className="font-mono text-[10px] font-black tabular-nums shrink-0 mb-[1px]" style={{ color: activeDisplay.color }}>
                            § {activeDisplay.clause}
                          </span>
                        )}
                        <span className="font-display font-black text-[11px] uppercase tracking-widest leading-tight" style={{ color: activeDisplay.color }}>
                          {activeDisplay.name}
                        </span>
                        <DottedLeader />
                        {activeDisplay.percentage != null && (
                          <span className="font-mono font-bold text-sm tabular-nums shrink-0" style={{ color: activeDisplay.color }}>
                            {activeDisplay.percentage}%
                          </span>
                        )}
                      </div>
                      <p className="font-sans text-[11px] text-text2 leading-relaxed">
                        {activeDisplay.explanation ?? 'No additional information available.'}
                      </p>
                      {activeDisplay.subChildren && activeDisplay.subChildren.length > 0 && (
                        <div className="flex flex-col gap-1 pt-1.5 border-t border-[var(--color-border)]">
                          {activeDisplay.subChildren.map((sub, sIdx) => (
                            <div key={sIdx} className="flex items-end gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0 mb-[3px]" style={{ backgroundColor: sub.color }} />
                              <span className="font-mono text-[10px] uppercase tracking-wider text-text2 leading-tight">{sub.name}</span>
                              <DottedLeader />
                              <span className="font-mono text-[10px] tabular-nums shrink-0 text-text2">{sub.percentage}%</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

              </div>

              <div className="flex-grow" />

              <p className="font-mono text-[8px] uppercase tracking-widest text-text2 opacity-60">
                Hover the wheel to inspect a clause
              </p>
            </div>
          }
        />
  );

  return (
    <div className="w-full relative py-6">
      <div className="flex flex-col items-center justify-center">
        <motion.div
          className="relative w-full flex flex-col cursor-pointer select-none"
          style={{ maxWidth: '880px', pointerEvents: active ? 'auto' : 'none' }}
          initial={false}
          animate={{ opacity: active ? 1 : 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          onClick={() => { if (active) setShowBack((b) => !b); }}
        >

          {/* Desktop spread — two facing pages meeting at the spine */}
          <div className="hidden lg:flex relative items-stretch" style={{ perspective: 2200 }}>

            {/* leaf1 — left page. Front = wheel; back = book cover. Closed
                (inactive) the leaf lies on the right half showing the cover;
                on entry it folds open around the spine. It never moves for
                showBack — the backside lands on top of it via leaf3. */}
            <motion.div
              className="relative w-1/2"
              style={{ transformOrigin: 'right center', transformStyle: 'preserve-3d', zIndex: coverDown ? 20 : 50 }}
              initial={false}
              animate={{ rotateY: active ? 0 : 180 }}
              transition={active
                ? { duration: 1.05, delay: 0.25, ease: [0.45, 0, 0.25, 1] }
                : { duration: 0.45, ease: 'easeIn' }}
              onAnimationComplete={() => { if (active) setCoverDown(true); }}
            >
              {/* Front face: wheel page */}
              <div
                className="relative h-full flex flex-col p-3 pb-7 rounded-l-md border-y border-l overflow-hidden"
                style={{
                  backgroundColor: 'var(--color-card)',
                  borderColor: 'var(--color-gold)',
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
                <PageFooter left="Official Rulebook" right="004 /" />
              </div>

              {/* Back face at rotateY(180deg): cover art — visible on entry fold,
                  and again when the leaf swings past 90° on the way to -180. */}
              <div
                className="absolute inset-0 rounded-r-md border flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--color-card2)',
                  borderColor: 'var(--color-gold)',
                  transform: 'rotateY(180deg)',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
              >
                <div className="absolute inset-2 rounded-sm border pointer-events-none" style={{ borderColor: 'rgba(212, 175, 55, 0.3)' }} />
                {coverArt}
              </div>
            </motion.div>

            {/* Right half — leaf stack. When showBack every right leaf has
                turned over onto the left half, leaving the right side empty:
                only the left side of the book remains. */}
            <div className="relative w-1/2">

              {/* leaf3: front = roadmap right page; back = the book's backside.
                  On showBack it turns over the spine and lands on the LEFT
                  half (on top of the stack) displaying BackCoverDesign. Going
                  back it flips first, then leaf2 follows (riffle). */}
              <motion.div
                className="absolute inset-0"
                style={{ transformOrigin: 'left center', transformStyle: 'preserve-3d', zIndex: backOnTop ? 35 : 25 }}
                initial={false}
                animate={{ rotateY: showBack ? 180 : 0 }}
                transition={{ duration: 1.0, ease: [0.45, 0, 0.25, 1], delay: showBack && page < 1 ? 0.4 : 0 }}
                onAnimationComplete={() => { if (!showBack) setBackOnTop(false); }}
              >
                <div
                  className="absolute inset-0"
                  style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', pointerEvents: showBack ? 'none' : 'auto' }}
                >
                  <PageFace side="right" footer={<PageFooter left="005" right="Campaign Sequence ↗" />}>{roadmapRightContent}</PageFace>
                </div>
                <div
                  className="absolute inset-0"
                  style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', pointerEvents: showBack ? 'auto' : 'none' }}
                >
                  <BackCoverDesign />
                </div>
              </motion.div>

              {/* leaf2: front = clauses page, back = roadmap left page.
                  In normal flow so it defines the spread height. On the return
                  riffle it waits for leaf3 (roadmap folds first, then the
                  Distribution pages come back). */}
              <motion.div
                className="relative w-full h-full z-30"
                style={{ transformOrigin: 'left center', transformStyle: 'preserve-3d' }}
                initial={false}
                animate={{ rotateY: page >= 1 || showBack ? 180 : 0 }}
                transition={{ duration: 1.0, ease: [0.45, 0, 0.25, 1], delay: backOnTop && !showBack && page < 1 ? 0.4 : 0 }}
              >
                <div
                  className="relative h-full flex pb-4 rounded-r-md border-y border-r overflow-hidden"
                  style={{
                    backgroundColor: 'var(--color-card)',
                    borderColor: 'var(--color-gold)',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    pointerEvents: page >= 1 || showBack ? 'none' : 'auto',
                  }}
                >
                  {/* Page-edge stack on the fore-edge (outer right edge) */}
                  <div
                    className="absolute inset-y-1 right-0 w-[5px] pointer-events-none z-10"
                    style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent 0px, transparent 1.5px, rgba(0,0,0,0.22) 1.5px, rgba(0,0,0,0.22) 2.5px)' }}
                  />
                  {rulebookCard}
                  <PageFooter left="005" right="Allocation Map ↗" />
                </div>
                <div
                  className="absolute inset-0"
                  style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', pointerEvents: page >= 1 && !showBack ? 'auto' : 'none' }}
                >
                  <PageFace side="left" footer={<PageFooter left="Official Rulebook" right="005 /" />}>{roadmapLeftContent}</PageFace>
                </div>
              </motion.div>
            </div>

            {/* Spine — binding shadow between the pages, no hard border.
                Hidden on the backside (only the lone left page remains). */}
            <motion.div
              className="absolute inset-y-0 left-1/2 -ml-2 w-4 pointer-events-none z-40"
              initial={false}
              animate={{ opacity: active && !showBack ? 1 : 0 }}
              transition={active && !showBack ? { duration: 0.5, delay: 0.85, ease: 'easeOut' } : { duration: 0.3, ease: 'easeIn' }}
              style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.32) 50%, transparent 100%)' }}
            />
          </div>

          {/* Mobile — single-page book: every leaf folds to the BACK around
              the left edge (single-faced, backface-hidden, so it vanishes past
              90° revealing the page beneath). page1 stays in flow so the book
              keeps one constant page size. */}
          <div className="lg:hidden relative" style={{ perspective: 1600 }}>

            {/* page1 — wheel + clauses */}
            <motion.div
              className="relative z-30"
              style={{
                transformOrigin: 'left center',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                pointerEvents: page >= 1 || showBack ? 'none' : 'auto',
              }}
              initial={false}
              animate={{ rotateY: page >= 1 || showBack ? -180 : 0 }}
              transition={{ duration: 0.9, ease: [0.45, 0, 0.25, 1] }}
            >
              <div className="relative flex flex-col h-full rounded-md border overflow-hidden" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-gold)' }}>
                {/* Page-edge stack on the fore-edge (outer right edge) */}
                <div
                  className="absolute inset-y-1 right-0 w-[5px] pointer-events-none z-10"
                  style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent 0px, transparent 1.5px, rgba(0,0,0,0.22) 1.5px, rgba(0,0,0,0.22) 2.5px)' }}
                />
                <div className="px-3 pt-3">
                  <div className="relative w-full aspect-square rounded-sm border" style={{ borderColor: 'rgba(212, 175, 55, 0.3)' }}>
                    {cornerBrackets}
                    {chartCanvas}
                  </div>
                </div>
                {rulebookCard}

                {/* Running footer — inside the gold frame */}
                <div className="flex justify-between items-center px-3 pb-2 text-[9px] font-mono opacity-80" style={{ color: 'var(--color-text2)' }}>
                  <span>Official Rulebook</span>
                  <span>004 / 005</span>
                  <span>Allocation Map ↗</span>
                </div>
              </div>
            </motion.div>

            {/* Cover — folds to the back on section entry */}
            <motion.div
              className="absolute inset-0 z-40"
              style={{
                transformOrigin: 'left center',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                pointerEvents: active ? 'none' : 'auto',
              }}
              initial={false}
              animate={{ rotateY: active ? -180 : 0 }}
              transition={active
                ? { duration: 0.9, delay: 0.25, ease: [0.45, 0, 0.25, 1] }
                : { duration: 0.45, ease: 'easeIn' }}
            >
              <div className="relative h-full rounded-md border flex items-center justify-center" style={{ backgroundColor: 'var(--color-card2)', borderColor: 'var(--color-gold)' }}>
                <div className="absolute inset-2 rounded-sm border pointer-events-none" style={{ borderColor: 'rgba(212, 175, 55, 0.3)' }} />
                {coverArt}
              </div>
            </motion.div>

            {/* page2 — Campaign Sequence roadmap */}
            <motion.div
              className="absolute inset-0 z-20"
              style={{
                transformOrigin: 'left center',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                pointerEvents: showBack ? 'none' : 'auto',
              }}
              initial={false}
              animate={{ rotateY: showBack ? -180 : 0 }}
              transition={{ duration: 0.9, ease: [0.45, 0, 0.25, 1], delay: showBack ? 0.15 : 0 }}
            >
              <div className="h-full flex flex-col rounded-md border overflow-hidden" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-gold)' }}>
                <div className="relative flex-1 flex flex-col p-3 pb-1">
                  <div className="relative flex-1 rounded-sm border overflow-hidden flex flex-col" style={{ borderColor: 'rgba(212, 175, 55, 0.3)' }}>
                    {cornerBrackets}
                    <div className="relative flex flex-col flex-1 p-4">
                      {roadmapMobileContent}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center px-3 pb-2 pt-1 text-[9px] font-mono opacity-80" style={{ color: 'var(--color-text2)' }}>
                  <span>Official Rulebook</span>
                  <span>005 / 005</span>
                  <span>Campaign Sequence ↗</span>
                </div>
              </div>
            </motion.div>

            {/* Back page — static base, the backside of the book */}
            <div className="absolute inset-0 z-10">
              <BackCoverDesign edge="full" />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default NestedPieChart;
