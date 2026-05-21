'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { SeasonTrade } from '@/hooks/useSeasonTrades';
import { buildChordData } from '@/utils/chartData';

function getCSSVar(name: string): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

interface ChordDiagramProps {
  trades: SeasonTrade[];
  timeWindowMs: number;
  selectedRange: { start: number; end: number } | null;
  onClearSelection: () => void;
  isLive: boolean;
}

export function ChordDiagram({
  trades,
  timeWindowMs,
  selectedRange,
  onClearSelection,
  isLive,
}: ChordDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<d3.Selection<HTMLDivElement, unknown, HTMLElement, unknown> | null>(null);
  const [size, setSize] = useState(250);

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

  useEffect(() => {
    const t = d3.select('body').append('div')
      .style('position', 'fixed')
      .style('pointer-events', 'none')
      .style('font-family', 'JetBrains Mono, monospace')
      .style('font-size', '11px')
      .style('padding', '6px 10px')
      .style('border-radius', '4px')
      .style('display', 'none')
      .style('z-index', '9999');
    tooltipRef.current = t;
    return () => { t.remove(); tooltipRef.current = null; };
  }, []);

  const { timeStart, timeEnd } = useMemo(() => {
    if (selectedRange) {
      return { timeStart: selectedRange.start, timeEnd: selectedRange.end };
    }
    let latestMs = 0;
    for (const t of trades) {
      const ms = Number(BigInt(t.timestamp)) * 1000;
      if (ms > latestMs) latestMs = ms;
    }
    const now = latestMs || Date.now();
    return { timeStart: now - timeWindowMs, timeEnd: now };
  }, [selectedRange, timeWindowMs, trades]);

  const chordData = useMemo(
    () => buildChordData(trades, timeStart, timeEnd),
    [trades, timeStart, timeEnd]
  );

  const tradeCount = useMemo(() => {
    const startSec = timeStart / 1000;
    const endSec = timeEnd / 1000;
    return trades.filter((t) => {
      const ts = Number(BigInt(t.timestamp));
      return ts >= startSec && ts <= endSec;
    }).length;
  }, [trades, timeStart, timeEnd]);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    if (chordData.groups.length === 0 || tradeCount === 0) return;

    const CAP_COLOR   = getCSSVar('--color-gold')    || '#D4AF37';
    const SOC_COLOR   = getCSSVar('--color-purple')  || '#9D4EDD';
    const BG_COLOR    = getCSSVar('--color-card')    || '#15120f';
    const BG2_COLOR   = getCSSVar('--color-card2')   || '#1b1814';
    const TXT_COLOR   = getCSSVar('--color-text2')   || '#8a8378';
    const TXT1_COLOR  = getCSSVar('--color-text')    || '#f4ede0';

    const { groups, matrix } = chordData;
    const N = groups.length;
    const groupColor = (idx: number) =>
      d3.interpolateRgb(CAP_COLOR, SOC_COLOR)(N > 1 ? idx / (N - 1) : 0);
    const numCap = groups.filter(g => g.isCapitalist).length;
    const numSoc = N - numCap;

    // totalVol[i] = FIM traded where group i was buyer OR seller (outflow + inflow)
    const totalVol = Array.from({ length: N }, (_, i) => {
      let v = 0;
      for (let j = 0; j < N; j++) v += matrix[i][j] + matrix[j][i];
      return v;
    });

    const capTotal = totalVol.slice(0, numCap).reduce((s, v) => s + v, 0);
    const socTotal = totalVol.slice(numCap).reduce((s, v) => s + v, 0);

    const innerRadius = size / 2 - 36;
    const outerRadius = size / 2 - 18;

    const GAP      = 0.5;   // radians gap at 12 o'clock only (between 100% cap and 100% soc)
    const BAND_PAD = 0.01;  // trailing gap after every band (active and empty)
    const HALF_ARC = Math.PI - GAP / 2; // each half runs to the bottom with no gap there
    const RR = innerRadius - 1;
    const MIN_DRAW = 0.02;             // visible arc width for zero-volume groups
    const MIN_SLOT = MIN_DRAW + BAND_PAD; // slot = draw + gap, same trailing gap as active bands

    // Compute arcs for one faction. Zero-volume groups get MIN_SLOT so every band
    // has the same BAND_PAD trailing gap; active groups get at least MIN_SLOT so
    // no active band is ever smaller than an empty tick.
    function computeArcs(
      vols: number[], factionTotal: number, n: number, startAngle: number
    ): { start: number; end: number }[] {
      const arcs: { start: number; end: number }[] = [];
      const zeroCount = vols.filter(v => v === 0).length;
      const activeCount = n - zeroCount || 1;
      const activeArc = HALF_ARC - zeroCount * MIN_SLOT;
      // Each active band gets MIN_SLOT as a floor; remaining arc split by volume.
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
          const drawSpan = totalSpan - BAND_PAD; // always >= MIN_DRAW since totalSpan >= MIN_SLOT
          arcs.push({ start: a, end: a + drawSpan });
          a += totalSpan;
        }
      }
      return arcs;
    }

    // Cap: 12 o'clock right → 6 o'clock (bottom), clockwise down right side
    const capArcs = computeArcs(
      totalVol.slice(0, numCap), capTotal, numCap, GAP / 2
    );
    // Soc: 6 o'clock (bottom) → 12 o'clock left, clockwise up left side (no gap at bottom)
    const socArcs = computeArcs(
      totalVol.slice(numCap), socTotal, numSoc, Math.PI
    );
    const arcAngles = [...capArcs, ...socArcs];

    // Sub-arc allocation: for each group i, divide its arc proportionally among
    // bidirectional flows to all groups j. This gives each chord a fixed width at
    // both endpoints that is proportional to how much flow that pair represents.
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

    if (!tooltipRef.current) return;
    const tooltip = tooltipRef.current
      .style('background', BG2_COLOR)
      .style('border', `1px solid ${TXT_COLOR}`)
      .style('color', TXT1_COLOR)
      .style('display', 'none');

    // Draw chord ribbons — upper triangular, one ribbon per (i,j) pair
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
            source: { startAngle: src.start, endAngle: Math.max(src.start + 0.001, src.end), radius: RR },
            target: { startAngle: tgt.start, endAngle: Math.max(tgt.start + 0.001, tgt.end), radius: RR },
          }) as unknown as string)
          .attr('fill', chordColor)
          .attr('fill-opacity', 0.4)
          .attr('stroke', chordColor)
          .attr('stroke-opacity', 0.15)
          .attr('stroke-width', 0.5);
      }
    }

    // Draw arcs and labels
    for (let i = 0; i < N; i++) {
      const g = groups[i];
      const color = groupColor(i);
      const a = arcAngles[i];
      const isEmpty = totalVol[i] === 0;

      const arc = root.append('path')
        .datum(a)
        .attr('d', arcGen)
        .attr('fill', color)
        .attr('fill-opacity', isEmpty ? 0.8 : 0.9)
        .attr('stroke', BG_COLOR)
        .attr('stroke-width', isEmpty ? 0 : 1);

      if (!isEmpty) arc
        .on('mouseover', (_event: MouseEvent) => {
          tooltip.style('display', 'block').html(
            `${g.label}<br/>${g.playerCount} player${g.playerCount !== 1 ? 's' : ''}<br/>${totalVol[i].toFixed(1)} FIM`
          );
        })
        .on('mousemove', (event: MouseEvent) => {
          tooltip.style('left', `${event.clientX + 12}px`).style('top', `${event.clientY - 28}px`);
        })
        .on('mouseleave', () => tooltip.style('display', 'none'));

    }

    // Fixed axis labels: 0% at bottom (6 o'clock), 100% Cap/Soc split at top (12 o'clock)
    const labelR = outerRadius + 10;
    const yTop = -labelR;
    const axisLabels = [
      { x:  25,  y: yTop,   text: '100%', anchor: 'start',  color: CAP_COLOR, fontSize: '14px', weight: 'bold' },
      { x: -25,  y: yTop,   text: '100%',  anchor: 'end',    color: SOC_COLOR, fontSize: '14px', weight: 'bold' },
      { x:  -10,  y: labelR,   text: '0%', anchor: 'start',  color: TXT_COLOR, fontSize: '14px', weight: 'bold' },
    ];

    for (const { x, y, text, anchor, color, fontSize, weight } of axisLabels) {
      root.append('text')
        .attr('x', x)
        .attr('y', y)
        .attr('text-anchor', anchor)
        .attr('dominant-baseline', 'middle')
        .attr('fill', color)
        .attr('font-family', 'JetBrains Mono, monospace')
        .attr('font-size', fontSize)
        .attr('font-weight', weight)
        .text(text);
    }

  }, [chordData, tradeCount, size]);

  const modeLabel = useMemo(() => {
    if (selectedRange) {
      const start = new Date(selectedRange.start);
      const end = new Date(selectedRange.end);
      const fmt = (d: Date) =>
        d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
        ' ' +
        d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      return `${fmt(start)} – ${fmt(end)} • ${tradeCount} trade${tradeCount !== 1 ? 's' : ''}`;
    }
    const mins = timeWindowMs / 60_000;
    const hours = timeWindowMs / 3_600_000;
    const label = mins < 60 ? `${mins}m` : hours < 24 ? `${hours}h` : `${hours / 24}d`;
    return `Last ${label} • live`;
  }, [selectedRange, timeWindowMs, tradeCount]);

  return (
    <div
      className="p-6 rounded-lg bg-card flex flex-col gap-2 h-full"
    >
      <div className="flex items-center justify-between">
        <span className="h4-app">Trade Flows</span>
        <div className="flex items-center gap-2 text-xs font-mono text-text2 ">
          <span>{modeLabel}</span>
          {isLive && !selectedRange && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          )}
          {selectedRange && (
            <button
              onClick={onClearSelection}
              className="text-text2 hover:text-text1 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {tradeCount === 0 ? (
        <div className="flex items-center justify-center h-full text-sm text-text2 font-mono">
          No trades in this window
        </div>
      ) : (
        <div ref={containerRef} className="flex items-center justify-center h-full w-full rounded-lg">
          <svg ref={svgRef} width={size} height={size} />
        </div>
      )}
    </div>
  );
}
