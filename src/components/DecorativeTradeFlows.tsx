'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

/**
 * Decorative capital-flow chord chart for the landing page's OUTPLAY MARKET
 * card. Fully self-contained: it generates its own mock transaction matrix,
 * animates transactions in, and draws the chord web with d3 — no live data,
 * no shared `minimal` coupling with the production `TradeFlows`.
 *
 * Animation: starts with a sparse web (some transactions already present); on
 * hover it continuously adds transactions toward the full dense web, then
 * breathes. On unhover the chart freezes exactly as-is; the next hover resumes
 * from where it left off.
 */

function getCSSVar(name: string): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Unbiased Fisher-Yates shuffle (returns a new array). */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const CLASS_GROUPS_20: { isCapitalist: boolean }[] = [
  ...Array.from({ length: 10 }, () => ({ isCapitalist: true })),
  ...Array.from({ length: 10 }, () => ({ isCapitalist: false })),
];

const generateBase20Matrix = (): number[][] => {
  // Every pair trades, with a random weight independent of how far apart the
  // groups sit on the 200% circle — so a 50% cap is as likely to trade with a
  // 30% soc as with a 50% soc. The matrix is symmetric (bidirectional flow)
  // so each chord connects its actual two groups rather than collapsing onto
  // the diametrically-opposite point.
  const matrix: number[][] = Array.from({ length: 20 }, () => new Array(20).fill(0));
  for (let r = 0; r < 20; r++) {
    for (let c = r + 1; c < 20; c++) {
      const val = Math.floor(200 + Math.random() * 1300);
      matrix[r][c] = val;
      matrix[c][r] = val;
    }
  }
  return matrix;
};

const BASE_FLOW_MATRIX_20 = generateBase20Matrix();

const getTopConnections = (matrix: number[][]) => {
  const capitalists: { r: number; c: number; target: number }[] = [];
  const socialists: { r: number; c: number; target: number }[] = [];
  const crossClass: { r: number; c: number; target: number }[] = [];

  for (let r = 0; r < 20; r++) {
    for (let c = 0; c < 20; c++) {
      if (r === c) continue;

      const isCapR = r < 10;
      const isCapC = c < 10;
      const target = matrix[r][c];

      if (isCapR && isCapC) {
        capitalists.push({ r, c, target });
      } else if (!isCapR && !isCapC) {
        socialists.push({ r, c, target });
      } else {
        crossClass.push({ r, c, target });
      }
    }
  }

  // Randomly pick a spread across each faction (rather than always the
  // highest-volume connections) so the web doesn't fill in the same order
  // every time, then shuffle the combined order.
  const capSubset = shuffle(capitalists).slice(0, 12);
  const socSubset = shuffle(socialists).slice(0, 12);
  const crossSubset = shuffle(crossClass).slice(0, 8);

  return shuffle([...capSubset, ...socSubset, ...crossSubset]);
};

/** Every off-diagonal cell of the 20×20 matrix, as a connection toward its
 *  base value, in randomized order. Used to keep extending the web past the
 *  curated queue so the animation builds more and more transactions — in a
 *  scattered order rather than a row-major sweep — for as long as the user
 *  hovers. */
const ALL_CONNECTIONS: { r: number; c: number; target: number }[] = (() => {
  const conns: { r: number; c: number; target: number }[] = [];
  for (let r = 0; r < 20; r++) {
    for (let c = 0; c < 20; c++) {
      if (r === c) continue;
      conns.push({ r, c, target: BASE_FLOW_MATRIX_20[r][c] });
    }
  }
  return shuffle(conns);
})();

// How many of the queued connections are already present at rest (sparse start).
const CHORD_RESTING_CONNS = 8;

/** Build a matrix with the first `drawnCount` queued connections at full value
 *  and a `partial` growth value applied to the next one. `t` drives a subtle
 *  breathing on the already-drawn connections so the web feels alive. */
const buildChordMatrix = (
  queue: { r: number; c: number; target: number }[],
  drawnCount: number,
  partial: number,
  t: number,
): number[][] => {
  const empty = BASE_FLOW_MATRIX_20.map(row => row.map(() => 0));
  for (let i = 0; i < drawnCount && i < queue.length; i++) {
    const { r, c, target } = queue[i];
    const breathing = 1 + Math.sin(t / 8 + r * c) * 0.03;
    const val = Math.floor(target * breathing);
    // Set both directions so the chord stays symmetric and connects its two
    // actual groups (an asymmetric cell collapses an arc onto the opposite side).
    empty[r][c] = val;
    empty[c][r] = val;
  }
  if (drawnCount < queue.length && partial > 0) {
    const { r, c } = queue[drawnCount];
    empty[r][c] = partial;
    empty[c][r] = partial;
  }
  return empty;
};

export default function DecorativeTradeFlows({ isHovered }: { isHovered: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<d3.Selection<HTMLDivElement, unknown, HTMLElement, unknown> | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [size, setSize] = useState(250);

  const [matrix, setMatrix] = useState<number[][]>(() => BASE_FLOW_MATRIX_20.map(row => row.map(() => 0)));

  // Persisted across hover/unhover so the web freezes on unhover and resumes
  // (continues adding transactions) from exactly where it left off on re-hover.
  const queueRef = useRef<{ r: number; c: number; target: number }[]>([]);
  const drawnCountRef = useRef<number>(0);     // connections fully drawn so far
  const growthValueRef = useRef<number>(0);    // in-progress growth of the next conn
  const tickCountRef = useRef<number>(0);

  // ── Track container size for a square, responsive chart ───────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setSize(Math.floor(Math.min(width, height)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Track dark mode so the chord colors stay theme-correct ────────────────
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    const mo = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    const t = d3.select('body').append('div')
      .style('position', 'fixed')
      .style('pointer-events', 'none')
      .style('font-family', 'var(--font-mono)')
      .style('font-size', '11px')
      .style('padding', '0')
      .style('border-radius', '4px')
      .style('display', 'none')
      .style('z-index', '9999');
    tooltipRef.current = t;
    return () => { t.remove(); tooltipRef.current = null; };
  }, []);

  // ── Intro (once): a curated transaction order + a sparse starting web ─────
  useEffect(() => {
    queueRef.current = getTopConnections(BASE_FLOW_MATRIX_20);
    drawnCountRef.current = Math.min(CHORD_RESTING_CONNS, queueRef.current.length);
    growthValueRef.current = 0;
    setMatrix(buildChordMatrix(queueRef.current, drawnCountRef.current, 0, 0));
  }, []);

  // ── Hover: keep adding transactions, building more and more of the web for
  // as long as the user hovers (the curated queue is extended with fresh
  // connections once exhausted, until the whole matrix is filled). On unhover
  // the interval clears and the matrix is left as-is (frozen); the next hover
  // resumes from the saved cursor. ──────────────────────────────────────────
  useEffect(() => {
    if (!isHovered) return;

    const interval = setInterval(() => {
      tickCountRef.current += 1;
      const t = tickCountRef.current;
      const queue = queueRef.current;
      const idx = drawnCountRef.current;

      // Queue exhausted → keep building: append the next not-yet-drawn
      // connection so the web densifies for as long as the user keeps hovering.
      if (idx >= queue.length) {
        const drawn = new Set(queue.map(q => `${q.r},${q.c}`));
        const next = ALL_CONNECTIONS.find(q => !drawn.has(`${q.r},${q.c}`));
        if (next) {
          queue.push(next);
        } else {
          // Full matrix reached → settle into a gentle breathing pulse.
          setMatrix(buildChordMatrix(queue, queue.length, 0, t));
          return;
        }
      }

      // Grow the current connection toward its target, then advance the cursor.
      const { target } = queue[drawnCountRef.current];
      const step = Math.max(100, Math.floor(target / 6));
      const nextVal = Math.min(target, growthValueRef.current + step);
      growthValueRef.current = nextVal;

      setMatrix(buildChordMatrix(queue, idx, nextVal, t));

      if (nextVal >= target) {
        drawnCountRef.current += 1;
        growthValueRef.current = 0;
      }
    }, 55);

    return () => clearInterval(interval);
  }, [isHovered]);

  // ── Draw the chord web with d3 whenever the matrix / size / theme change ──
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const groups = CLASS_GROUPS_20;
    if (groups.length === 0) return;

    const CAP_COLOR     = getCSSVar('--color-gold')    || '#FFC300';
    const SOC_COLOR     = getCSSVar('--color-purple')  || '#9D4EDD';
    const MAGENTA_COLOR = getCSSVar('--color-magenta') || '#D81B60';
    const ORANGE_COLOR  = getCSSVar('--color-orange')  || '#FF8C00';
    const BG_COLOR      = getCSSVar('--color-card')    || '#15120f';
    const BG3_COLOR     = getCSSVar('--color-card3')   || '#221d18';
    const TXT_COLOR     = getCSSVar('--color-text2')   || '#8a8378';
    const TXT1_COLOR    = getCSSVar('--color-text')    || '#f4ede0';
    const BORDER2_COLOR = getCSSVar('--color-border2') || '#4C3F7A';
    const IN_COLOR      = getCSSVar('--color-green')   || '#00F5A0';
    const OUT_COLOR     = getCSSVar('--color-red')     || '#FF4D6D';

    const N = groups.length;
    const cyberStops = [
      { pos: 0,    color: SOC_COLOR     },
      { pos: 0.45, color: MAGENTA_COLOR },
      { pos: 0.75, color: ORANGE_COLOR  },
      { pos: 1,    color: CAP_COLOR     },
    ];
    const groupColor = (idx: number) => {
      const t = N > 1 ? 1 - idx / (N - 1) : 1;
      let s = 0;
      while (s < cyberStops.length - 2 && t > cyberStops[s + 1].pos) s++;
      const lo = cyberStops[s], hi = cyberStops[s + 1];
      const span = hi.pos - lo.pos;
      return d3.interpolateRgb(lo.color, hi.color)(span > 0 ? (t - lo.pos) / span : 0);
    };
    const numCap = groups.filter(g => g.isCapitalist).length;
    const numSoc = N - numCap;

    const outVol = Array.from({ length: N }, (_, i) => {
      let v = 0; for (let j = 0; j < N; j++) v += matrix[i][j]; return v;
    });
    const inVol = Array.from({ length: N }, (_, i) => {
      let v = 0; for (let j = 0; j < N; j++) v += matrix[j][i]; return v;
    });
    const totalVol = Array.from({ length: N }, (_, i) => inVol[i] + outVol[i]);

    const capTotal = totalVol.slice(0, numCap).reduce((s, v) => s + v, 0);
    const socTotal = totalVol.slice(numCap).reduce((s, v) => s + v, 0);

    const innerRadius = Math.max(0, size / 2 - 36);
    const outerRadius = Math.max(0, size / 2 - 18);

    const GAP      = 0.5;
    const BAND_PAD = 0.01;
    const HALF_ARC = Math.PI - GAP / 2;
    const RR = Math.max(0, innerRadius - 1);
    const MIN_DRAW = 0.02;
    const MIN_SLOT = MIN_DRAW + BAND_PAD;

    function computeArcs(
      vols: number[], factionTotal: number, n: number, startAngle: number
    ): { start: number; end: number }[] {
      const arcs: { start: number; end: number }[] = [];
      const zeroCount = vols.filter(v => v === 0).length;
      const activeCount = n - zeroCount || 1;
      const activeArc = HALF_ARC - zeroCount * MIN_SLOT;
      const extraArc = Math.max(0, activeArc - activeCount * MIN_SLOT);
      let a = startAngle;
      for (let k = 0; k < n; k++) {
        if (vols[k] === 0) {
          arcs.push({ start: a, end: a + MIN_DRAW });
          a += MIN_SLOT;
        } else {
          const frac = factionTotal > 0 ? vols[k] / factionTotal : 1 / activeCount;
          const totalSpan = extraArc > 0
            ? MIN_SLOT + frac * extraArc
            : activeArc / activeCount;
          const drawSpan = totalSpan - BAND_PAD;
          arcs.push({ start: a, end: a + drawSpan });
          a += totalSpan;
        }
      }
      return arcs;
    }

    const capArcs = computeArcs(totalVol.slice(0, numCap), capTotal, numCap, GAP / 2);
    const socArcs = computeArcs(totalVol.slice(numCap), socTotal, numSoc, Math.PI);
    const arcAngles = [...capArcs, ...socArcs];

    const subArcs: { start: number; end: number }[][] = Array.from({ length: N }, (_, i) => {
      const arcs: { start: number; end: number }[] = new Array(N);
      let pos = arcAngles[i].start;
      const span = arcAngles[i].end - arcAngles[i].start;
      for (let j = 0; j < N; j++) {
        const bidir = matrix[i][j] + matrix[j][i];
        const subSpan = totalVol[i] > 0 ? (bidir / totalVol[i]) * span : 0;
        arcs[j] = { start: pos, end: pos + subSpan };
        pos += subSpan;
      }
      return arcs;
    });

    const root = svg
      .attr('viewBox', `0 0 ${size} ${size}`)
      .append('g')
      .attr('transform', `translate(${size / 2},${size / 2})`);

    const ribbon = d3.ribbon().radius(RR);
    const arcGen = d3.arc<{ start: number; end: number }>()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius)
      .startAngle(d => d.start)
      .endAngle(d => d.end);

    // Central ribbons (the transaction web).
    for (let i = 0; i < N; i++) {
      for (let j = i; j < N; j++) {
        const bidir = matrix[i][j] + matrix[j][i];
        if (bidir === 0) continue;
        const src = subArcs[i][j];
        const tgt = subArcs[j][i];
        if (src.end <= src.start && tgt.end <= tgt.start) continue;

        const netFlow = matrix[i][j] - matrix[j][i];
        const chordColor = groupColor(netFlow >= 0 ? i : j);

        root.append('path')
          .attr('d', ribbon({
            source: { startAngle: src.start, endAngle: Math.max(src.start + 0.001, src.end), radius: Math.max(0, RR) },
            target: { startAngle: tgt.start, endAngle: Math.max(tgt.start + 0.001, tgt.end), radius: Math.max(0, RR) },
          }) as unknown as string)
          .attr('fill', chordColor)
          .attr('fill-opacity', 0.4)
          .attr('stroke', chordColor)
          .attr('stroke-opacity', 0.15)
          .attr('stroke-width', 0.5);
      }
    }

    if (!tooltipRef.current) return;
    const tooltip = tooltipRef.current
      .style('background', BG3_COLOR)
      .style('border', `1px solid ${BORDER2_COLOR}`)
      .style('color', TXT1_COLOR)
      .style('display', 'none');

    // Outer segments.
    for (let i = 0; i < N; i++) {
      const color = groupColor(i);
      const a = arcAngles[i];
      const isEmpty = totalVol[i] === 0;
      const isCapitalist = i < numCap;
      const bandIndex = isCapitalist ? i : i - numCap;
      const pctLow  = bandIndex * 10;
      const pctHigh = (bandIndex + 1) * 10;
      const factionName = isCapitalist ? 'Capitalists' : 'Proletarians';
      const factionPct  = `${pctLow}–${pctHigh}%`;

      const arc = root.append('path')
        .datum(a)
        .attr('d', arcGen)
        .attr('fill', color)
        .attr('fill-opacity', isEmpty ? 0.8 : 0.9)
        .attr('stroke', BG_COLOR)
        .attr('stroke-width', isEmpty ? 0 : 1);

      if (!isEmpty) arc
        .on('mouseover', () => {
          const net = inVol[i] - outVol[i];
          const netColor = net >= 0 ? IN_COLOR : OUT_COLOR;
          const netSign  = net >= 0 ? '+' : '-';
          const divider  = `<div style="border-top:1px solid ${BORDER2_COLOR};margin:4px 0;"></div>`;
          tooltip.style('display', 'block').html(
            `<div style="padding:6px 10px 0">${factionName}</div>` +
            `<div style="padding:0 10px 0;color:${TXT_COLOR}">${factionPct}</div>` +
            divider +
            `<div style="padding:0 10px"><span style="color:${IN_COLOR}">IN</span> ${inVol[i].toFixed(1)} FIM</div>` +
            `<div style="padding:0 10px"><span style="color:${OUT_COLOR}">OUT</span> ${outVol[i].toFixed(1)} FIM</div>` +
            divider +
            `<div style="padding:0 10px 6px"><span style="color:${netColor}">${netSign}${Math.abs(net).toFixed(1)} FIM</span></div>`
          );
        })
        .on('mousemove', (event: MouseEvent) => {
          tooltip.style('left', `${event.clientX + 12}px`).style('top', `${event.clientY - 28}px`);
        })
        .on('mouseleave', () => tooltip.style('display', 'none'));
    }

    // Axis labels (100%, 0%).
    const labelR = outerRadius + 10;
    const yTop = -labelR;
    const axisLabels = [
      { x:  25, y: yTop,   text: '100%', anchor: 'start', color: CAP_COLOR, fontSize: '14px', weight: 'bold' },
      { x: -25, y: yTop,   text: '100%', anchor: 'end',   color: SOC_COLOR, fontSize: '14px', weight: 'bold' },
      { x: -10, y: labelR, text: '0%',   anchor: 'start', color: TXT_COLOR, fontSize: '14px', weight: 'bold' },
    ];

    for (const { x, y, text, anchor, color, fontSize, weight } of axisLabels) {
      root.append('text')
        .attr('x', x)
        .attr('y', y)
        .attr('text-anchor', anchor)
        .attr('dominant-baseline', 'middle')
        .attr('fill', color)
        .style('font-family', 'var(--font-mono)')
        .attr('font-size', fontSize)
        .attr('font-weight', weight)
        .text(text);
    }
  }, [matrix, size, isDark]);

  return (
    <div className="w-full h-full p-1 flex items-center justify-center">
      <div ref={containerRef} className="flex items-center justify-center h-full w-full min-w-0 min-h-0 select-none">
        <svg ref={svgRef} className="block pointer-events-auto" width={size} height={size} />
      </div>
    </div>
  );
}
