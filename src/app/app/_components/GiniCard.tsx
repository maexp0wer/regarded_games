'use client';

import React, { useMemo } from 'react';
import { useSeasonVictory } from '@/hooks/useSeasonVictory';
import { useSeasonPhase } from '@/hooks/useSeasonPhase';
import { CandleData } from '@/utils/chartData';
import { Timeframe } from './CandlestickChart';

interface GiniCardProps {
  seasonAddress: string;
  /** Same per-candle series the chart plots; each candle carries `giniBps`. */
  candles: CandleData[];
  timeframe: Timeframe;
  /** A clicked candle, as `{ start, end }` in ms (start === candle.time * 1000). */
  selectedRange: { start: number; end: number } | null;
  onClearSelection: () => void;
  /** True when no candle is selected (the gauge tracks the live Gini). */
  isLive: boolean;
}

const TF_LABEL: Record<Timeframe, string> = { '5m': '5M', '1h': '1H', '4h': '4H', '1d': '1D' };

/**
 * Gauge-only Gini panel for the trading panel menu — the same compressed BPS rail
 * as the SeasonBand, stripped of the band's prize/countdown chrome. Oriented
 * VERTICALLY: the value axis runs bottom→top (low Gini / Proletariat at the
 * bottom, high Gini / Capitalist at the top). Value pills sit to the LEFT of the
 * rail; the distance connectors and their BPS labels extend to the RIGHT.
 *
 * Interacts with the chart like TradeFlows: clicking a candle pins the gauge to
 * the Gini at the end of that candle's period and the header shows the change
 * within that bar. Live (no selection) the gauge tracks the current Gini and the
 * header shows the change over the most recent timeframe bar.
 */
export function GiniCard({
  seasonAddress,
  candles,
  timeframe,
  selectedRange,
  onClearSelection,
  isLive,
}: GiniCardProps) {
  const { isAuction } = useSeasonPhase(seasonAddress);
  const { gInitial, capTargetBps, socTargetBps } = useSeasonVictory(seasonAddress);

  // Resolve which Gini the gauge reflects and the BPS change to report over the
  // relevant period — selected candle, or the latest (current) candle when live.
  // In both cases the gauge shows that period's END Gini and the delta is its
  // change across the period (end minus the previous period's end). Read entirely
  // from the candle series, which is block time and live-polled, so it is both the
  // fresh "now" and the period boundaries with no separate block fetch.
  const { displayGini, deltaBps, hasDelta } = useMemo(() => {
    const withGini = candles.filter((c) => c.giniBps > 0);
    // The most recent Gini at or before index `idx` (inclusive). Gini is a state
    // that persists between trades, so an empty bar (giniBps === 0) carries forward
    // the last sampled value — that's the Gini "as of the end of" that bar.
    const giniAsOf = (idx: number): number | null => {
      for (let i = idx; i >= 0; i--) {
        if (candles[i].giniBps > 0) return candles[i].giniBps;
      }
      return null;
    };

    // Both states report the BPS change OVER a period, read entirely from the
    // candle series — which is block time and live (useSeasonCandles polls every
    // 5s), so it doubles as the fresh "now" and needs no separate block fetch:
    //   - selected: the clicked candle's period;
    //   - trailing: the latest (current) candle's period.
    // A candle stores only its CLOSE Gini (giniBps = last trade in the bucket), so
    // the period's change = this period's close minus the previous period's close
    // (the value carried into the bar). giniAsOf carries forward across empty bars.
    const periodIdx = selectedRange
      ? candles.findIndex((c) => c.time * 1000 === selectedRange.start)
      : (withGini.length > 0 ? candles.lastIndexOf(withGini[withGini.length - 1]) : -1);

    if (periodIdx >= 0) {
      const end = giniAsOf(periodIdx);
      if (end !== null) {
        // The value carried INTO this period: the prior sampled bar's close, or the
        // season's starting Gini when this is the first sampled bar. Either way the
        // header always shows the change over the period.
        const prior = giniAsOf(periodIdx - 1) ?? gInitial;
        return {
          displayGini: end,
          deltaBps: end - prior,
          hasDelta: true,
        };
      }
    }

    // No trade-derived Gini yet (no candles with a sample): fall back to the
    // season's starting Gini, never the live gCurrent — gCurrent folds in resting
    // sell-order escrow and so moves when orders are merely placed/cancelled. This
    // gauge must only move when trades actually fill, which is exactly what the
    // candle giniBps captures. No trades → no change to report.
    return { displayGini: gInitial, deltaBps: 0, hasDelta: false };
  }, [candles, selectedRange, gInitial]);

  // Human-readable label for the selected candle's period, mirroring TradeFlows.
  const candleRangeLabel = useMemo(() => {
    if (!selectedRange) return null;
    const start = new Date(selectedRange.start);
    const end = new Date(selectedRange.end);
    if (timeframe === '1d') {
      return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    const timeFmt: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
    const dateFmt: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return (
      start.toLocaleDateString('en-US', dateFmt) + ' ' +
      start.toLocaleTimeString('en-US', timeFmt) + ' – ' +
      end.toLocaleTimeString('en-US', timeFmt)
    );
  }, [selectedRange, timeframe]);

  // Compressed scale: zoom to the window between the two targets with a small
  // margin, matching the SeasonBand gauge so both read the same position.
  const scaleMin = Math.max(0, socTargetBps - 200);
  const scaleMax = Math.min(10000, capTargetBps + 200);

  const toScalePct = (bps: number) => {
    const clamped = Math.min(Math.max(bps, scaleMin), scaleMax);
    return ((clamped - scaleMin) / (scaleMax - scaleMin)) * 100;
  };

  const scaleTicks = (() => {
    const ticks: { value: number; major: boolean }[] = [];
    const first = Math.ceil(scaleMin / 500) * 500;
    const last = Math.floor(scaleMax / 500) * 500;
    for (let v = first; v <= last; v += 500) {
      if (v > scaleMin && v < scaleMax) ticks.push({ value: v, major: v % 1000 === 0 });
    }
    return ticks;
  })();

  const formatTick = (v: number) => {
    if (v === 0) return '0';
    if (v % 1000 === 0) return `${v / 1000}k`;
    return `${(v / 1000).toFixed(1)}k`;
  };

  const socBpsAway = Math.round(Math.abs(displayGini - socTargetBps));
  const capBpsAway = Math.round(Math.abs(capTargetBps - displayGini));

  // Vertical positions (percent from the BOTTOM of the rail). Higher Gini sits
  // higher up, so the Capitalist target lands near the top.
  const curPct = toScalePct(displayGini);
  const socPct = toScalePct(socTargetBps);
  const capPct = toScalePct(capTargetBps);

  // Each connector is a horizontal arm extending to the RIGHT of the rail at the
  // ARM distance, joined to the rail by two vertical risers: one at the current
  // Gini, one at the faction target. Spanning from the lower to the higher of the
  // two positions keeps the riser height positive.
  const socBottom = Math.min(curPct, socPct);
  const socSpan = Math.abs(curPct - socPct);
  const capBottom = Math.min(curPct, capPct);
  const capSpan = Math.abs(curPct - capPct);

  // Which side of the current position each target sits on, so the live-Gini
  // riser of each connector can be nudged toward its own target — giving the two
  // risers (both anchored at the current position) a small gap between them.
  const socIsBelow = socPct <= curPct;
  const capIsBelow = capPct <= curPct;

  // Geometry. The "arm" runs sideways (was the vertical LINE); the risers run
  // along the value axis (were the horizontal connector lines). Risers stop short
  // (RISER_GAP) of the rail so they don't touch the knob or pins.
  const ARM = '2.6rem';      // horizontal distance from the rail to the connector arm
  const RISER_GAP = '1.5rem'; // gap between a riser's inner end and the rail
  const RISER_W = `calc(${ARM} - ${RISER_GAP})`; // visible riser length
  const NUDGE = '0.10rem';   // live-Gini riser inset, so the two risers don't overlap
  // The vertical arm is shortened by NUDGE on the live-Gini end so it meets the
  // inset riser rather than overshooting to the connector's raw edge.

  return (
    <div className="terminal-pane h-full overflow-hidden" style={{ border: 'none' }}>
      {/* Header mirrors Capital Flow: title left, period info on the right. The
          delta is the Gini change across the relevant bar — the selected candle, or
          the latest one when live. Live reads "±BPS LAST {tf}" with a pulse dot;
          a selected candle reads "±BPS {range}" with an ⨯ clear button, matching
          how TradeFlows presents its live vs. selected states. */}
      <div className="terminal-pane-header">
        <span className="terminal-pane-title">Gini Score</span>
        <div className="flex items-center gap-2">
          {isLive && !selectedRange && (
            <span className="w-1.5 h-1.5 rounded-full bg-[--color-green] animate-pulse" />
          )}
          {hasDelta && (
            <span
              className={`font-mono text-[12px] font-bold leading-none tabular-nums uppercase ${
                deltaBps > 0 ? 'text-gold' : deltaBps < 0 ? 'text-purple' : 'text-text2'
              }`}
            >
              {deltaBps > 0 ? '+' : ''}{deltaBps.toLocaleString()}{' '}
              <span className="font-bold">BPS</span>
            </span>
          )}
          <span className="terminal-pane-title">
            {selectedRange ? candleRangeLabel : 'LAST'}
          </span>
          {!selectedRange && (
            <span className="terminal-pane-title" style={{ color: 'var(--color-text2)' }}>
              {TF_LABEL[timeframe]}
            </span>
          )}
          {selectedRange && (
            <button
              onClick={onClearSelection}
              className="px-1 text-[11px] font-mono font-bold uppercase tracking-widest rounded transition-all duration-150 active:scale-[0.98] border bg-card2 border-border text-text2 hover:border-border2 hover:text-text"
            >
              ⨯
            </button>
          )}
        </div>
      </div>

      {/* BPS gauge — vertical. Minimal vertical padding so the rail uses as much
          of the available height as possible; the small my-2 keeps the topmost /
          bottommost pills from clipping the header and pane edges. */}
      <div className="relative flex flex-1 items-stretch justify-center px-4 py-2">
        {/* Vertical rail with a relative track for bottom%-anchored children. */}
        <div className="relative my-2">
          <div
            className="relative h-full w-2.5 rounded-full border border-bg"
            style={{
              // Vertical sunset: purple (low Gini) at the bottom → gold (high) at
              // the top, matching the pin positions. The shared --sunset token is
              // 90deg (horizontal) and used app-wide, so we rotate it locally.
              background: 'linear-gradient(0deg, var(--color-purple) 0%, var(--color-magenta) 45%, var(--color-orange) 75%, var(--color-gold) 100%)',
            }}
          >
            {scaleTicks.map(({ value: v, major }) => {
              const pct = ((v - scaleMin) / (scaleMax - scaleMin)) * 100;
              return (
                <React.Fragment key={v}>
                  <div
                    className="absolute bg-text2"
                    style={{
                      bottom: `${pct}%`,
                      left: '50%',
                      transform: 'translate(-50%, 50%)',
                      height: '1px',
                      width: major ? '16px' : '8px',
                      opacity: major ? 0.3 : 0.15,
                    }}
                  />
                  {major && (
                    <span
                      className="absolute font-mono text-[9px] tracking-tighter text-text2/60 tabular-nums"
                      style={{ bottom: `${pct}%`, left: '16px', transform: 'translateY(50%)' }}
                    >
                      {formatTick(v)}
                    </span>
                  )}
                </React.Fragment>
              );
            })}

            {/* Connector: current → Proletarian target. Vertical arm at ARM
                distance to the right, with horizontal risers at each end (stopping
                short of the rail and the pins), BPS number to the right of the arm.
                The live-Gini riser is nudged toward its target so it doesn't sit on
                the Capitalist one. */}
            <div
              className="absolute z-30"
              style={{ bottom: `${socBottom}%`, height: `${socSpan}%`, left: '50%', width: ARM }}
            >
              {/* arm at the far (right) end: shortened by NUDGE on the live-Gini end */}
              <div
                className="absolute right-0 w-px bg-purple/60"
                style={{ [socIsBelow ? 'bottom' : 'top']: '0', [socIsBelow ? 'top' : 'bottom']: NUDGE }}
              />
              {/* target-end riser: rail side (left, inset by RISER_GAP) → arm */}
              <div
                className="absolute h-px bg-purple/60"
                style={{ [socIsBelow ? 'bottom' : 'top']: '0', right: '0', width: RISER_W }}
              />
              {/* live-Gini-end riser, nudged inward toward the target */}
              <div
                className="absolute h-px bg-purple/60"
                style={{ [socIsBelow ? 'top' : 'bottom']: NUDGE, right: '0', width: RISER_W }}
              />
              <span className="absolute left-full ml-1 top-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[11px] font-bold leading-none text-purple tabular-nums">
                {socBpsAway.toLocaleString()}
              </span>
            </div>

            {/* Connector: current → Capitalist target (same arm distance). */}
            <div
              className="absolute z-30"
              style={{ bottom: `${capBottom}%`, height: `${capSpan}%`, left: '50%', width: ARM }}
            >
              {/* arm at the far (right) end: shortened by NUDGE on the live-Gini end */}
              <div
                className="absolute right-0 w-px bg-gold/60"
                style={{ [capIsBelow ? 'bottom' : 'top']: '0', [capIsBelow ? 'top' : 'bottom']: NUDGE }}
              />
              {/* target-end riser: rail side (left, inset by RISER_GAP) → arm */}
              <div
                className="absolute h-px bg-gold/60"
                style={{ [capIsBelow ? 'bottom' : 'top']: '0', right: '0', width: RISER_W }}
              />
              {/* live-Gini-end riser, nudged inward toward the target */}
              <div
                className="absolute h-px bg-gold/60"
                style={{ [capIsBelow ? 'top' : 'bottom']: NUDGE, right: '0', width: RISER_W }}
              />
              <span className="absolute left-full ml-1 top-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[11px] font-bold leading-none text-gold tabular-nums">
                {capBpsAway.toLocaleString()}
              </span>
            </div>

            {/* Proletarian target pin + value pill (pill to the LEFT of the rail).
                Tick straddles the value line via translate-y-1/2, matching the
                knob and risers; pill is centered on the same line. */}
            <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: `${socPct}%` }}>
              <div className="translate-y-1/2" style={{ width: '1.5rem', height: '5px', backgroundColor: 'var(--color-purple)', border: '1px solid var(--color-bg)', boxShadow: '0 0 6px var(--color-purple)' }} />
              <span className="absolute right-full bottom-0 z-40 translate-y-1/2 mr-2 whitespace-nowrap rounded bg-purple px-1.5 py-0.5 font-mono text-xs font-black tabular-nums text-border shadow-lg">
                {Math.round(socTargetBps).toLocaleString()}
              </span>
            </div>

            {/* Initial baseline pin */}
            {gInitial > 0 && !isAuction && (
              <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: `${toScalePct(gInitial)}%` }}>
                <div className="translate-y-1/2" style={{ width: '1.5rem', height: '3px', backgroundColor: 'var(--color-text2)', opacity: 0.5 }} />
                <span className="absolute right-full bottom-0 translate-y-1/2 mr-2 whitespace-nowrap font-mono text-[8px] uppercase text-text2/60">Start</span>
              </div>
            )}

            {/* Capitalist target pin + value pill (pill to the LEFT of the rail) */}
            <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: `${capPct}%` }}>
              <div className="translate-y-1/2" style={{ width: '1.5rem', height: '5px', backgroundColor: 'var(--color-gold)', border: '1px solid var(--color-bg)', boxShadow: '0 0 6px var(--color-gold)' }} />
              <span className="absolute right-full bottom-0 z-40 translate-y-1/2 mr-2 whitespace-nowrap rounded bg-gold px-1.5 py-0.5 font-mono text-xs font-black tabular-nums text-border shadow-lg">
                {Math.round(capTargetBps).toLocaleString()}
              </span>
            </div>

            {/* Current Gini value pill + live knob. Centered on the rail like the
                target pins (left-1/2 wrapper, inner element self-centers on both
                axes). The pill hangs off right-full with the same mr-2 so all three
                value pills share a right edge. */}
            <div
              className="absolute left-1/2 z-40 -translate-x-1/2 transition-all duration-700 ease-out"
              style={{ bottom: `${curPct}%` }}
            >
              <div className="dial-knob current translate-y-1/2" />
              <span className="absolute right-full bottom-0 mr-2 translate-y-1/2 whitespace-nowrap rounded bg-text px-1.5 py-0.5 font-mono text-xs font-black tabular-nums text-bg shadow-lg">
                {displayGini.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
