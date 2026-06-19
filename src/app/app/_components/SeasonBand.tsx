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
    return <span className="gini-label">SHORTLY</span>;
  }

  const remaining = Math.max(0, targetTimestamp - now);
  if (remaining === 0) {
    return <span className="gini-label">FINALIZING</span>;
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
          <span className="font-mono text-md font-bold text-text tabular-nums">{val}</span>
          <span className="gini-label">{unit}</span>
        </span>
      ))}
      <span className="gini-label">{label}</span>
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
 * Two visually distinct panels sharing one sunset gradient: the gradient lives on
 * the wrapper and shows through the gap (and the thin frame) between the panels,
 * so the band reads as two separate components carved from the same surface.
 *
 * Layout is derived from the season detail card grid (`xl:grid-cols-4`). The
 * narrow INFO panel takes a single column at every desktop size; the wide GAUGE
 * panel takes the rest:
 *   2xl → cols-5: info 1 + gauge 4
 *   xl  → cols-4: info 1 + gauge 3
 *   lg  → cols-3: info 1 + gauge 2
 *   md/sm/xs → stacked single column (info first, gauge below)
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
      : 'text-[var(--color-text)] font-bold';

  const prizePool      = giniData?.prizePool   ?? 0;
  const playerCount    = giniData?.playerCount ?? 0;
  const isPayoutPhase  = currentPhase === 'PAYOUT' || currentPhase === 'DISTRIBUTION';
  const distributable  = giniData?.distributablePayout ?? 0;
  const reinvestBonus  = parseFloat(formatUnits(BigInt(yieldTotals?.reinvest || '0'), 6));
  const inferredBonus  = Math.max(0, distributable - prizePool);
  const yieldBonus     = isPayoutPhase ? Math.max(inferredBonus, reinvestBonus) : 0;
  const hasYieldBonus  = yieldBonus > 0.01;
  const totalPrizePool = prizePool + (hasYieldBonus ? yieldBonus : 0);

  // One continuous gradient slice shared by both cards. Each card paints the SAME
  // gradient sized to the full band width (background-size: 100vw-ish via the shared
  // wrapper) and anchored to a fixed origin, so the right card simply continues
  // where the left card's slice leaves off — the gradient reads as one image even
  // though a real gap sits between them. The gap is the wrapper's bg-bg, giving a
  // clean separator. Gauge card left, info card right; mobile stacks info on top.
  //
  // background-attachment: fixed anchors the gradient to the band's nearest fixed
  // ancestor (the viewport), so both cards share one coordinate space and the slice
  // is continuous regardless of each card's width or position.
  const panel = 'overflow-hidden rounded-md';
  // background-attachment: fixed pins the gradient to the viewport, so both cards
  // sample one shared coordinate space — the right card continues the exact slice
  // the left card ends on, and the gap between them simply shows the bg-bg wrapper.
  const sharedGradient: React.CSSProperties = {
    backgroundImage: 'var(--sunset-15)',
    backgroundAttachment: 'fixed',
    backgroundSize: '100vw 100vh',
    backgroundPosition: 'left center',
  };

  return (
    <div className={`bg-bg ${className}`}>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">

        {/* ══ INFO PANEL — 1 column at lg→2xl; right on desktop, top on mobile ══ */}
        <div style={sharedGradient} className={`${panel} order-1 lg:order-2 lg:col-start-3 xl:col-start-4 2xl:col-start-5 flex flex-col justify-between gap-4 px-6 py-5`}>
          {/* Season # / pills */}
          <div className="flex items-center justify-between gap-3">
            <span className="font-display font-extrabold leading-none tracking-[-0.04em] text-text text-3xl">
              S<em className="not-italic font-medium text-text2">{String(seasonNum).padStart(2, '0')}</em>
            </span>
            <SeasonPhasePills
              phase={currentPhase ?? 'UNKNOWN'}
              isVictoryPending={effectiveVictoryPending}
            />
          </div>

          {/* Prize Pool + Players */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col">
              <span className="gini-label mb-2">Prize Pool</span>
              <div
                className="font-mono text-2xl font-bold text-text leading-none tabular-nums"
                style={{ textShadow: '0 0 16px var(--color-gold-15)' }}
              >
                {totalPrizePool.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="gini-label ml-1">USDC</span>
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
            <div className="flex flex-col text-right">
              <span className="gini-label mb-1">Players</span>
              <span className="font-mono text-xl font-black text-text leading-none tabular-nums">
                {playerCount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Countdown */}
          <div className="flex justify-start">
            <div className="text-left">
              {footerMode === 'countdown' ? (
                <SeasonCountdown targetTimestamp={countdownTarget} label={countdownLabel} />
              ) : (
                <span className={`font-mono font-bold text-[11px] uppercase tracking-wider ${footerClass}`}>
                  {footerMessage}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ══ GAUGE PANEL — gauge 2 (lg) / 3 (xl) / 4 (2xl) columns; left on desktop ══ */}
        <div style={sharedGradient} className={`${panel} order-2 lg:order-1 lg:col-start-1 lg:col-span-2 xl:col-span-3 2xl:col-span-4 flex flex-col`}>

          {/* Faction anchors + title */}
          <div className="px-6 pt-5 pb-4 flex justify-between items-center">
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
              <span className={`font-display text-2xl font-extrabold uppercase tracking-widest ${isPayout ? 'hero-gradient-text' : 'text-text2'}`}>
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

          {/* BPS Gauge */}
          <div className="relative px-4 py-3 flex items-center">
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

          {/* BPS Deltas */}
          <div className="px-6 pt-8 pb-5 grid grid-cols-3 gap-3 font-mono text-[11px] text-text2">
            <div className="text-left">
              <span className="text-purple font-bold">{socBpsAway.toLocaleString()} BPS</span>{' '}
              <span className="gini-label">from Proletarian Target</span>
            </div>
            <div className="text-center px-2">
              {winningSide !== 'none' ? (
                <span>
                  <span className="gini-label">
                    {isPayout ? (progressPercent >= 100 ? 'Victory:' : 'Partial Victory:') : 'Leader:'}
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
        </div>
      </div>
    </div>
  );
}
