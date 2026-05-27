'use client';

import React, { useState, useEffect } from 'react';
import Carlo from '@/components/icons/Carlo.svg';
import Regardo from '@/components/icons/Regardo.svg';

import { useSeasonPhase } from '@/hooks/useSeasonPhase';
import { useSeasonVictory } from '@/hooks/useSeasonVictory';
import { useSeasonGini } from '@/hooks/useSeasonGini';
import { SeasonPhasePills } from './SeasonPhasePills';

function useCountdown(targetTimestamp: number) {
  const [parts, setParts] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const update = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = Math.max(0, targetTimestamp - now);
      setParts({
        days:    Math.floor(diff / 86400),
        hours:   Math.floor((diff % 86400) / 3600),
        minutes: Math.floor((diff % 3600) / 60),
        seconds: diff % 60,
      });
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetTimestamp]);

  return parts;
}

const pad = (n: number) => String(n).padStart(2, '0');

interface GiniDisplayProps {
  seasonAddress: string;
  seasonName: string;
}

export function GiniDisplay({ seasonAddress, seasonName }: GiniDisplayProps) {
  const {
    currentPhase,
    isAuction,
    isBootstrap,
    isPayout,
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

  const isTrading = !isAuction && !isBootstrap && !isPayout;

  // ── Scale engine ──────────────────────────────────────────────────────────
  const useCompressedScale = isTrading || isPayout;
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

  // ── Countdown ─────────────────────────────────────────────────────────────
  const seasonNum = parseInt(seasonName.match(/\d+/)?.[0] ?? '1', 10);
  const countdownTarget = isAuctionOrBootstrap ? tradingStart : seasonEnd;
  const { days, hours, minutes, seconds } = useCountdown(countdownTarget);

  const footerMode: 'countdown' | 'warning' | 'winner' =
    effectiveVictoryPending || isTradingTimeExpired ? 'warning'
    : isPayout ? 'winner'
    : 'countdown';

  const footerMessage =
    footerMode === 'warning'
      ? effectiveVictoryPending ? 'Settlement Pending' : 'Time Limit Reached'
      : footerMode === 'winner'
      ? winningSide === 'cap' ? 'Bourgeoisie Wins'
        : winningSide === 'soc' ? 'Proletariat Wins'
        : 'Season Concluded'
      : '';

  const footerClass =
    footerMode === 'warning' ? 'text-[var(--color-red)] animate-pulse'
    : 'text-[var(--color-gold)] font-bold';

  const prizePool   = giniData?.prizePool   ?? 0;
  const playerCount = giniData?.playerCount ?? 0;

  return (
    <div className="dark relative h-full overflow-hidden min-h-75 rounded-lg bg-[#0D0B14] bg-(image:--sunset-glow) flex flex-col md:grid md:grid-cols-[1fr_22.75rem] md:grid-rows-[auto_1fr_auto]">

      {/* Vertical divider — desktop only */}
      <div className="hidden md:block absolute right-91 top-[10%] h-[80%] w-px bg-text2 z-10 pointer-events-none" />

      {/* ── 1. Season info — mobile order 1 | desktop col 2, row 1 ── */}
      <div className="order-1 md:col-start-2 md:row-start-1 relative shrink-0 px-15 pt-6 pb-5 flex justify-between items-center">
        <div className="flex flex-col text-left">
          <span className="font-display font-extrabold leading-none tracking-[-0.04em] text-text text-4xl">
            S<em className="not-italic font-medium text-text2">{String(seasonNum).padStart(2, '0')}</em>
          </span>
        </div>
        <div className="flex flex-col items-center justify-center px-2">
          <SeasonPhasePills
            phase={currentPhase ?? 'UNKNOWN'}
            isVictoryPending={effectiveVictoryPending}
          />
        </div>
        <div className="flex flex-col text-right">
          <span className="gini-label">Players</span>
          <span className="font-mono text-sm font-black text-text">
            {playerCount.toLocaleString()}
          </span>
        </div>
        <div className="absolute bottom-0 left-[5%] right-[5%] h-px bg-text2 md:left-5 md:right-5" />
      </div>

      {/* ── 2. Prize Pool — mobile order 2 | desktop col 2, row 2 ── */}
      <div className="order-2 md:col-start-2 md:row-start-2 relative shrink-0 flex flex-col items-center justify-center px-5 py-5">
        <span className="gini-label mb-1">Prize Pool</span>
        <div
          className="font-mono text-3xl font-black text-gold leading-none"
          style={{ textShadow: '0 0 16px var(--color-gold-15)' }}
        >
          {prizePool.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <span className="text-xs text-text2 font-normal ml-1">USDC</span>
        </div>
        <div className="absolute bottom-0 left-[5%] right-[5%] h-px bg-text2 md:left-5 md:right-5" />
      </div>

      {/* ── 3. Countdown — mobile order 3 (border-b) | desktop col 2, row 3 (no border-b) ── */}
      <div className="order-3 md:col-start-2 md:row-start-3 relative shrink-0 px-5 pt-5 pb-6">
        {footerMode === 'countdown' ? (
          <div className="flex flex-col gap-2">
            <span className="gini-label text-center">
              {isAuction ? 'Auction Ends In' : 'Season End'}
            </span>
            <div className="grid grid-cols-4 gap-1 px-14">
              {[
                { label: 'Days', v: days },
                { label: 'Hrs',  v: hours },
                { label: 'Min',  v: minutes },
                { label: 'Sec',  v: seconds },
              ].map((b) => (
                <div key={b.label} className="flex flex-col items-center gap-1 py-1 px-1">
                  <span className="font-mono font-semibold leading-none text-sm text-text tabular-nums">
                    {pad(b.v)}
                  </span>
                  <span className="gini-label opacity-60">
                    {b.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex h-full justify-center items-center">
            <span className={`font-mono text-[11px] uppercase tracking-wider ${footerClass}`}>
              {footerMessage}
            </span>
          </div>
        )}
        <div className="absolute bottom-0 left-[5%] right-[5%] h-px bg-text2 md:hidden" />
      </div>

      {/* ── 4. Faction anchors / Gini heading — mobile order 4 | desktop col 1, row 1 ── */}
      <div className="order-4 md:col-start-1 md:row-start-1 relative px-5 pt-6 pb-5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Carlo className="w-10 h-auto text-purple" viewBox="0 0 600 800" />
          <div className="flex flex-col">
            <span className="gini-label">Proletarian Target</span>
            <span className="font-mono text-sm font-black text-purple">
              {Math.round(socTargetBps).toLocaleString()} <span className="gini-label">BPS</span>
            </span>
          </div>
        </div>

        <div className="hidden sm:flex flex-col items-center text-center gap-0.5">
          <span className="font-sans text-lg font-bold uppercase tracking-widest text-text">Gini Score</span>
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
        <div className="absolute bottom-0 left-[5%] right-[5%] h-px bg-text2 md:left-5 md:right-5" />
      </div>

      {/* ── 5. BPS Track / Gauge — mobile order 5 | desktop col 1, row 2 ── */}
      <div className="order-5 md:col-start-1 md:row-start-2 relative px-5 flex items-center min-h-40">
        <div className="w-full px-2">
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
              <span className="absolute top-full mt-1 font-mono text-[9px] text-bg font-bold bg-purple px-1 rounded whitespace-nowrap">
                Proletarians
              </span>
            </div>

            {gInitial > 0 && !isAuction && (
              <div className="track-absolute-pin" style={{ left: `${toScalePct(gInitial)}%` }}>
                <div style={{ width: '3px', height: '1.5rem', backgroundColor: 'var(--color-text2)', opacity: 0.5 }} />
                <span className="absolute top-full mt-1 font-mono text-[8px] text-text2/60 uppercase whitespace-nowrap">Start</span>
              </div>
            )}

            <div className="track-absolute-pin" style={{ left: `${toScalePct(capTargetBps)}%` }}>
              <div style={{ width: '5px', height: '1.5rem', backgroundColor: 'var(--color-gold)', border: '1px solid var(--color-bg)', boxShadow: '0 0 6px var(--color-gold)' }} />
              <span className="absolute top-full mt-1 font-mono text-[9px] text-bg font-bold bg-gold px-1 rounded whitespace-nowrap">
                Capitalists
              </span>
            </div>

            <div className="track-absolute-pin transition-all duration-700 ease-out" style={{ left: `${toScalePct(gCurrent)}%` }}>
              <div className="dial-knob current" />
              <div className="absolute bottom-full mb-1 z-40 bg-text text-bg font-mono font-black text-xs px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap">
                {gCurrent.toLocaleString()}
              </div>
            </div>

          </div>
        </div>
        <div className="absolute bottom-0 left-[5%] right-[5%] h-px bg-text2 md:left-5 md:right-5" />
      </div>

      {/* ── 6. BPS Deltas — mobile order 6 | desktop col 1, row 3 ── */}
      <div className="order-6 md:col-start-1 md:row-start-3 px-5 pt-5 pb-6 grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-[11px] text-text2 content-start">
        <div className="text-left">
          <span className="text-purple font-bold">{socBpsAway.toLocaleString()} BPS</span>{' '}
          <span className="gini-label">from Proletariat Target</span>
        </div>
        <div className="text-center sm:border-x sm:border-text2 px-2 self-start">
          {winningSide !== 'none' ? (
            <span>
              <span className="gini-label">Dominance Matrix Leans:</span>{' '}
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
  );
}
