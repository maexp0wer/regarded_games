'use client';

import React, { useState, useEffect } from 'react';
import { formatUnits } from 'viem';
import Carlo from '@/components/icons/Carlo.svg';
import Regardo from '@/components/icons/Regardo.svg';

import { useSeasonPhase } from '@/hooks/useSeasonPhase';
import { useSeasonVictory } from '@/hooks/useSeasonVictory';
import { useSeasonGini } from '@/hooks/useSeasonGini';
import { useYieldTotals } from '@/hooks/useYieldTotals';
import { SeasonPhasePills } from './SeasonPhasePills';

function SeasonCountdown({ targetTimestamp, label }: { targetTimestamp: number; label: string }) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const pad = (n: number) => String(n).padStart(2, '0');

  if (!targetTimestamp) {
    return <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-text2">SHORTLY</span>;
  }

  const remaining = Math.max(0, targetTimestamp - now);
  if (remaining === 0) {
    return <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-text2">FINALIZING</span>;
  }

  const days    = Math.floor(remaining / 86400);
  const hours   = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  return (
    <div className="flex items-baseline gap-2">
      {[
        { val: pad(days),    unit: 'D' },
        { val: pad(hours),   unit: 'H' },
        { val: pad(minutes), unit: 'M' },
        { val: pad(seconds), unit: 'S' },
      ].map(({ val, unit }) => (
        <span key={unit} className="flex items-baseline gap-0.5">
          <span className="font-mono text-[11px] font-black text-text tabular-nums">{val}</span>
          <span className="font-mono text-[11px] font-bold uppercase text-text2">{unit}</span>
        </span>
      ))}
      <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-text2">{label}</span>
    </div>
  );
}

interface SeasonBandProps {
  seasonAddress: string;
  seasonName: string;
  className?: string;
}

/**
 * Unified season header band across all three phase layouts.
 *
 * One shared dark surface. Three logical rows separated by full-width dividers.
 * The horizontal dividers are `border-b` on the left gauge cells — they span the
 * full row height of the left column and the right column's `border-t` aligns to
 * the same visual line. This makes the dividers appear continuous across both
 * panes without needing any `col-span-full` trickery.
 *
 * Column ladder:
 *   xl+  → [4fr 1fr]
 *   lg   → [3fr 1fr]
 *   md   → [2fr 1fr]
 *   sm/xs → 1 column stacked, borders become top-separators on each section
 *
 * Vertical divider between gauge and info is absolutely positioned, inset 15%
 * from top and bottom so it doesn't touch the card's rounded corners.
 */
export function SeasonBand({ seasonAddress, seasonName, className = '' }: SeasonBandProps) {
  const {
    currentPhase,
    isPayout,
    isAuction,
    isAuctionOrBootstrap,
    tradingStart,
    seasonEnd,
    isTradingTimeExpired,
  } = useSeasonPhase(seasonAddress);

  const {
    gCurrent,
    gInitial,
    capTargetBps,
    socTargetBps,
    winningSide,
    progressPercent,
    effectiveVictoryPending,
  } = useSeasonVictory(seasonAddress);

  const { data: giniData } = useSeasonGini(seasonAddress);
  const { data: yieldTotals } = useYieldTotals(seasonAddress, currentPhase);

  // Scale engine
  const useCompressedScale = true;
  const scaleMin = useCompressedScale ? Math.max(0, socTargetBps - 200) : 0;
  const scaleMax = useCompressedScale ? Math.min(10000, capTargetBps + 200) : 10000;

  const toScalePct = (bps: number) => {
    const clamped = Math.min(Math.max(bps, scaleMin), scaleMax);
    return ((clamped - scaleMin) / (scaleMax - scaleMin)) * 100;
  };

  const scaleTicks = useCompressedScale
    ? (() => {
        const ticks: { value: number; major: boolean }[] = [];
        const first = Math.ceil(scaleMin / 500) * 500;
        const last  = Math.floor(scaleMax / 500) * 500;
        for (let v = first; v <= last; v += 500) {
          if (v > scaleMin && v < scaleMax) ticks.push({ value: v, major: v % 1000 === 0 });
        }
        return ticks;
      })()
    : [0, 2500, 5000, 7500, 10000].map((v) => ({ value: v, major: true }));

  const formatTick = (v: number) => {
    if (v === 0) return '0';
    if (v % 1000 === 0) return `${v / 1000}k`;
    return `${(v / 1000).toFixed(1)}k`;
  };

  const socBpsAway = Math.round(Math.abs(gCurrent - socTargetBps));
  const capBpsAway = Math.round(Math.abs(capTargetBps - gCurrent));

  // Info column
  const seasonNum       = parseInt(seasonName.match(/\d+/)?.[0] ?? '1', 10);
  const countdownTarget = isAuctionOrBootstrap ? tradingStart : seasonEnd;
  const countdownLabel  = isAuctionOrBootstrap ? 'until Live' : 'until Payout';

  const footerMode: 'countdown' | 'warning' | 'winner' =
    effectiveVictoryPending || isTradingTimeExpired ? 'warning'
    : isPayout ? 'winner'
    : 'countdown';

  const footerMessage =
    footerMode === 'warning'
      ? effectiveVictoryPending ? 'Settlement Pending' : 'Time Limit Reached'
      : 'Season Concluded';

  const footerClass =
    footerMode === 'warning'
      ? 'text-[var(--color-red)] animate-pulse'
      : 'text-[var(--color-gold)] font-bold';

  const prizePool      = giniData?.prizePool   ?? 0;
  const playerCount    = giniData?.playerCount ?? 0;
  const isPayoutPhase  = currentPhase === 'PAYOUT' || currentPhase === 'DISTRIBUTION';
  const distributable  = giniData?.distributablePayout ?? 0;
  const reinvestBonus  = parseFloat(formatUnits(BigInt(yieldTotals?.reinvest || '0'), 6));
  const inferredBonus  = Math.max(0, distributable - prizePool);
  const yieldBonus     = isPayoutPhase ? Math.max(inferredBonus, reinvestBonus) : 0;
  const hasYieldBonus  = yieldBonus > 0.01;
  const totalPrizePool = prizePool + (hasYieldBonus ? yieldBonus : 0);

  // Right cells get a left border (vertical divider between gauge and info at md+).
  // Horizontal dividers are separate col-span-full elements so they always span
  // the full card width regardless of how many columns are active.
  const rightCell = 'lg:border-l lg:border-text2/20';

  return (
    <div className={`dark relative overflow-hidden rounded-md bg-[#0D0B14] bg-(image:--sunset-35) ${className}`}>
      <div className="flex flex-col lg:grid lg:grid-cols-[2fr_1fr] xl:grid-cols-[3fr_1fr] 2xl:grid-cols-[4fr_1fr]">

        {/* ── ROW 1 LEFT: Faction anchors — mobile order 4 ── */}
        <div className="order-4 lg:order-1 px-6 pt-5 pb-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Carlo className="w-10 h-auto text-purple" viewBox="0 0 600 800" />
            <div className="flex flex-col">
              <span className="gini-label">Proletarian Target</span>
              <span className="font-mono text-sm font-black text-purple">
                {Math.round(socTargetBps).toLocaleString()} <span className="gini-label">BPS</span>
              </span>
            </div>
          </div>

          <div className={`flex-col items-center text-center ${isPayout && winningSide === 'none' ? 'hidden lg:flex' : 'hidden sm:flex'}`}>
            <span className="font-display text-lg font-bold uppercase tracking-widest text-text">
              {isPayout
                ? (winningSide === 'soc' ? 'Proletariat Wins' : winningSide === 'cap' ? 'Capitalists Win' : 'Season Concluded')
                : 'Gini Score'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-right flex-row-reverse">
            <Regardo className="w-10 h-auto text-gold" viewBox="0 0 600 800" />
            <div className="flex flex-col">
              <span className="gini-label">Capitalist Target</span>
              <span className="font-mono text-sm font-black text-gold">
                {Math.round(capTargetBps).toLocaleString()} <span className="gini-label">BPS</span>
              </span>
            </div>
          </div>
        </div>

        {/* ── ROW 1 RIGHT: Season # / pills / players — mobile order 1 ── */}
        <div className={`${rightCell} order-1 lg:order-2 px-6 pt-5 pb-4 flex justify-between items-center`}>
          <span className="font-display font-extrabold leading-none tracking-[-0.04em] text-text text-4xl">
            S<em className="not-italic font-medium text-text2">{String(seasonNum).padStart(2, '0')}</em>
          </span>
          <SeasonPhasePills
            phase={currentPhase ?? 'UNKNOWN'}
            isVictoryPending={effectiveVictoryPending}
          />
          <div className="flex flex-col text-right">
            <span className="gini-label">Players</span>
            <span className="font-mono text-sm font-black text-text">
              {playerCount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* ── DIVIDER 1 — mobile order 5 ── */}
        <div className="order-5 lg:order-3 lg:col-span-full h-px bg-text2/20" aria-hidden="true" />

        {/* ── ROW 2 LEFT: BPS Gauge — mobile order 6 ── */}
        <div className="order-6 lg:order-4 relative px-4 py-3 flex items-center">
          <div className="w-full px-8">
            <div className="live-rail-container">
              {scaleTicks.map(({ value: v, major }) => {
                const pct = ((v - scaleMin) / (scaleMax - scaleMin)) * 100;
                return (
                  <React.Fragment key={v}>
                    <div
                      className="absolute bg-text2"
                      style={{
                        left: `${pct}%`,
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '1px',
                        height: major ? '16px' : '8px',
                        opacity: major ? 0.3 : 0.15,
                      }}
                    />
                    {major && (
                      <span
                        className="absolute font-mono text-[9px] text-text2/60 tracking-tighter"
                        style={{ left: `${pct}%`, top: '16px', transform: 'translateX(-50%)' }}
                      >
                        {formatTick(v)}
                      </span>
                    )}
                  </React.Fragment>
                );
              })}

              <div className="track-absolute-pin" style={{ left: `${toScalePct(socTargetBps)}%` }}>
                <div style={{ width: '5px', height: '1.5rem', backgroundColor: 'var(--color-purple)', border: '1px solid var(--color-bg)', boxShadow: '0 0 6px var(--color-purple)' }} />
                <span className="absolute top-full mt-1 z-40 bg-purple text-border font-mono font-black text-xs px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap">{Math.round(socTargetBps).toLocaleString()}</span>
              </div>

              {gInitial > 0 && !isAuction && (
                <div className="track-absolute-pin" style={{ left: `${toScalePct(gInitial)}%` }}>
                  <div style={{ width: '3px', height: '1.5rem', backgroundColor: 'var(--color-text2)', opacity: 0.5 }} />
                  <span className="absolute top-full mt-1 font-mono text-[8px] text-text2/60 uppercase whitespace-nowrap">Start</span>
                </div>
              )}

              <div className="track-absolute-pin" style={{ left: `${toScalePct(capTargetBps)}%` }}>
                <div style={{ width: '5px', height: '1.5rem', backgroundColor: 'var(--color-gold)', border: '1px solid var(--color-bg)', boxShadow: '0 0 6px var(--color-gold)' }} />
                <span className="absolute top-full mt-1 z-40 bg-gold text-border font-mono font-black text-xs px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap">{Math.round(capTargetBps).toLocaleString()}</span>
              </div>

              <div className="track-absolute-pin transition-all duration-700 ease-out" style={{ left: `${toScalePct(gCurrent)}%` }}>
                <div className="dial-knob current" />
                <div className="absolute bottom-full mb-1 z-40 bg-text text-bg font-mono font-black text-xs px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap">
                  {gCurrent.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── ROW 2 RIGHT: Prize Pool — mobile order 2 ──
            The yield-bonus line only renders in payout phases. When it's absent we
            add half its reserved height (mt-1 0.25rem + 10px line ≈ 1.125rem, so
            ≈ 0.5625rem) as symmetric top/bottom padding, keeping the label+number
            group centred and the band's row height consistent across every phase. */}
        <div className={`${rightCell} order-2 lg:order-5 flex flex-col items-center justify-center px-6 ${hasYieldBonus ? 'py-3' : 'py-5.25'}`}>
          <span className="gini-label mb-1">{hasYieldBonus ? 'Prize Pool + Yield' : 'Prize Pool'}</span>
          <div
            className="font-display text-lg font-black text-gold leading-none"
            style={{ textShadow: '0 0 16px var(--color-gold-15)' }}
          >
            {totalPrizePool.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-xs text-text2 font-normal ml-1">USDC</span>
          </div>
          {hasYieldBonus && (
            <div className="mt-1 flex items-baseline gap-2">
              <span className="gini-label">Yield Bonus</span>
              <span className="font-display text-sm font-semibold text-green">
                ${yieldBonus.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>

        {/* ── DIVIDER 2 — mobile order 7 ── */}
        <div className="order-7 lg:order-6 lg:col-span-full h-px bg-text2/20" aria-hidden="true" />

        {/* ── ROW 3 LEFT: BPS Deltas — mobile order 8 ── */}
        <div className="order-8 lg:order-7 px-6 pt-3 pb-5 grid grid-cols-3 gap-3 font-mono text-[11px] text-text2">
          <div className="text-left">
            <span className="text-purple font-bold">{socBpsAway.toLocaleString()} BPS</span>{' '}
            <span className="gini-label">from Proletariat Target</span>
          </div>
          <div className="text-center px-2">
            {winningSide !== 'none' ? (
              <span>
                <span className="gini-label">
                  {isPayout ? (progressPercent >= 100 ? 'Victory:' : 'Partial Victory:') : 'Leading:'}
                </span>{' '}
                <span className={`font-bold ${winningSide === 'soc' ? 'text-purple' : 'text-gold'}`}>
                  {winningSide === 'soc' ? 'Proletariat' : 'Bourgeoisie'} ({progressPercent.toFixed(1)}%)
                </span>
              </span>
            ) : (
              <span className="gini-label opacity-50">Equilibrium Maintained</span>
            )}
          </div>
          <div className="text-right">
            <span className="text-gold font-bold">{capBpsAway.toLocaleString()} BPS</span>{' '}
            <span className="gini-label">from Capitalist Target</span>
          </div>
        </div>

        {/* ── ROW 3 RIGHT: Countdown — mobile order 3 ── */}
        <div className={`${rightCell} order-3 lg:order-8 flex justify-center items-center px-6 pt-3 pb-5`}>
          {footerMode === 'countdown' ? (
            <SeasonCountdown targetTimestamp={countdownTarget} label={countdownLabel} />
          ) : (
            <span className={`font-mono text-[11px] uppercase tracking-wider ${footerClass}`}>
              {footerMessage}
            </span>
          )}
        </div>
      </div>

    </div>
  );
}
