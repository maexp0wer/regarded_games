'use client';

import React from 'react';
import { useReadContract } from 'wagmi';
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';
import Carlo from '@/components/icons/Carlo.svg';
import Regardo from '@/components/icons/Regardo.svg';

interface GiniDisplayProps {
  seasonAddress: string;
  gCurrent: number;
  gInitial: number;
  socTargetBps: number;
  capTargetBps: number;
  winningSide: 'soc' | 'cap' | 'none';
  progressPercent: number;
  currentPhase: string | null;
  isAuction: boolean;
  isBootstrap: boolean;
}

const SCALE_TICKS = [0, 2500, 5000, 7500, 10000];

function toBpsPct(bps: number) {
  return `${Math.min(100, Math.max(0, (bps / 10000) * 100))}%`;
}

export function GiniDisplay({
  seasonAddress,
  gCurrent,
  gInitial,
  socTargetBps,
  capTargetBps,
  winningSide,
  progressPercent,
  currentPhase,
  isAuction,
  isBootstrap,
}: GiniDisplayProps) {
  const { data: finalProgressBps } = useReadContract({
    address: seasonAddress as `0x${string}`,
    abi: GameSeasonAbi as any,
    functionName: 'finalProgressBps',
    query: { enabled: !!seasonAddress },
  });
  const { data: isOligarchyWin } = useReadContract({
    address: seasonAddress as `0x${string}`,
    abi: GameSeasonAbi as any,
    functionName: 'isOligarchyWin',
    query: { enabled: !!seasonAddress },
  });

  const isPayout = currentPhase === 'PAYOUT' || currentPhase === 'DISTRIBUTION';
  const isFinal = isPayout;

  const officialProgress =
    isPayout && finalProgressBps !== undefined
      ? Number(finalProgressBps) / 100
      : progressPercent;

  const officialSide =
    isPayout && isOligarchyWin !== undefined
      ? isOligarchyWin
        ? 'cap'
        : 'soc'
      : winningSide;

  const distToSoc = gCurrent - socTargetBps;
  const distToCap = capTargetBps - gCurrent;
  const fmtDist = (v: number) =>
    (v >= 0 ? '+' : '') + Math.round(v).toLocaleString();

  return (
    <div
      className="card-app relative flex flex-col h-full"
      style={{
        background: `
          radial-gradient(500px 300px at 25% 30%, rgba(255,61,138,0.06), transparent 60%),
          radial-gradient(500px 300px at 75% 30%, rgba(77,159,255,0.06), transparent 60%),
          var(--color-card)`,
        borderColor: 'var(--color-border-bright)',
      }}
    >
      {/* ── Header ── */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <div className="flex items-center gap-2 font-mono text-[11px] font-semibold tracking-widest uppercase text-text2">
          <span
            className="rounded px-1.5 py-0.5 text-white font-bold"
            style={{ background: 'var(--color-pink)', fontSize: 9, letterSpacing: '0.1em' }}
          >
            ● LIVE
          </span>
          Gini BPS · Coefficient of Inequality
        </div>
        <div className="hidden sm:flex items-center gap-4 font-mono text-[11px] text-text2">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--color-pink)', boxShadow: '0 0 8px var(--color-pink)' }} />
            Proletariat target
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--color-gold)', boxShadow: '0 0 8px var(--color-gold)' }} />
            Current
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--color-blue)', boxShadow: '0 0 8px var(--color-blue)' }} />
            Bourgeoisie target
          </span>
        </div>
      </div>

      {/* ── Centre figure ── */}
      <div className="text-center mb-4">
        <div
          className="font-display font-extrabold tracking-[-0.04em] inline-block relative"
          style={{
            fontSize: 'clamp(52px, 7vw, 96px)',
            lineHeight: 0.9,
            color: 'var(--color-gold)',
            textShadow: '0 0 50px rgba(245,184,0,0.3)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {gCurrent.toLocaleString()}
          <span
            className="absolute font-mono font-medium text-text2"
            style={{ fontSize: 13, right: -38, bottom: 10, letterSpacing: '0.1em' }}
          >
            BPS
          </span>
        </div>
        <p className="font-mono text-[11px] tracking-widest uppercase text-text2 mt-2 m-0">
          {isFinal ? 'Final Coefficient' : 'Current Coefficient'}
          {!isAuction && gInitial > 0 && (
            <span className="ml-3 opacity-50">
              · Initial: {gInitial.toLocaleString()}
            </span>
          )}
        </p>
      </div>

      {/* ── Bar stage ── */}
      {/* pt gives space for avatars above; pb gives space for labels below */}
      <div className="relative flex-1" style={{ paddingTop: 88, paddingBottom: 64 }}>
        {/* Track */}
        <div
          className="relative w-full rounded-full"
          id="gini-bar"
          style={{
            height: 6,
            background:
              'linear-gradient(90deg, rgba(255,61,138,0.5) 0%, var(--color-border-bright) 40%, var(--color-border-bright) 60%, rgba(77,159,255,0.5) 100%)',
          }}
        >
          {/* Scale ticks + labels */}
          {SCALE_TICKS.map((v) => {
            const pct = (v / 10000) * 100;
            return (
              <React.Fragment key={v}>
                <div
                  className="absolute"
                  style={{
                    left: `${pct}%`,
                    top: -4,
                    width: 1,
                    height: 14,
                    background: 'var(--color-border-bright)',
                  }}
                />
                <span
                  className="absolute font-mono text-text2/40"
                  style={{
                    left: `${pct}%`,
                    top: 18,
                    fontSize: 10,
                    transform: 'translateX(-50%)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {v === 0 ? '0' : `${(v / 1000).toFixed(0)}k`}
                </span>
              </React.Fragment>
            );
          })}

          {/* ── Proletariat (pink) marker ── */}
          <div className="gini-marker" style={{ left: toBpsPct(socTargetBps) }}>
            {/* Avatar */}
            <div
              className="absolute"
              style={{
                bottom: '100%',
                left: '50%',
                transform: 'translate(-50%, -8px)',
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'var(--color-card2)',
                border: '2px solid rgba(255,61,138,0.4)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--color-pink)',
              }}
            >
              <Carlo className="w-9 h-auto" viewBox="0 0 600 800" />
            </div>
            <div className="gini-knob pink" />
            <div className="gini-stem pink" />
            {/* Label */}
            <div
              className="absolute text-center"
              style={{ top: 56, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}
            >
              <span className="block font-mono font-semibold text-base tracking-tight" style={{ color: 'var(--color-pink)', fontVariantNumeric: 'tabular-nums' }}>
                {Math.round(socTargetBps).toLocaleString()}
              </span>
              <span className="block font-mono text-[9px] uppercase font-medium mt-0.5" style={{ color: 'rgba(255,61,138,0.6)', letterSpacing: '0.16em' }}>
                Proletariat
              </span>
              {officialSide === 'soc' && (
                <span className="block font-mono text-[9px] mt-0.5 px-1.5 py-0.5 rounded text-white font-bold animate-pulse" style={{ background: 'var(--color-pink)', fontSize: 8 }}>
                  {officialProgress.toFixed(1)}%
                </span>
              )}
            </div>
          </div>

          {/* ── Current (gold) marker ── */}
          <div
            className="gini-marker transition-all duration-700 ease-out"
            style={{ left: toBpsPct(gCurrent) }}
          >
            <div className="gini-knob gold" />
            <div className="gini-stem gold" />
          </div>

          {/* ── Bourgeoisie (blue) marker ── */}
          <div className="gini-marker" style={{ left: toBpsPct(capTargetBps) }}>
            {/* Avatar */}
            <div
              className="absolute"
              style={{
                bottom: '100%',
                left: '50%',
                transform: 'translate(-50%, -8px)',
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'var(--color-card2)',
                border: '2px solid rgba(77,159,255,0.4)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--color-blue)',
              }}
            >
              <Regardo className="w-9 h-auto" viewBox="0 0 600 800" />
            </div>
            <div className="gini-knob blue" />
            <div className="gini-stem blue" />
            {/* Label */}
            <div
              className="absolute text-center"
              style={{ top: 56, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}
            >
              <span className="block font-mono font-semibold text-base tracking-tight" style={{ color: 'var(--color-blue)', fontVariantNumeric: 'tabular-nums' }}>
                {Math.round(capTargetBps).toLocaleString()}
              </span>
              <span className="block font-mono text-[9px] uppercase font-medium mt-0.5" style={{ color: 'rgba(77,159,255,0.6)', letterSpacing: '0.16em' }}>
                Bourgeoisie
              </span>
              {officialSide === 'cap' && (
                <span className="block font-mono text-[9px] mt-0.5 px-1.5 py-0.5 rounded text-white font-bold animate-pulse" style={{ background: 'var(--color-blue)', fontSize: 8 }}>
                  {officialProgress.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer stats ── */}
      <div
        className="flex flex-wrap justify-between gap-4 pt-4 mt-auto"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <div className="flex flex-col gap-1">
          <span className="section-label">Dist. to Proletariat</span>
          <span className="font-mono text-sm font-semibold" style={{ color: 'var(--color-pink)' }}>
            {fmtDist(distToSoc)} BPS
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="section-label">Dist. to Bourgeoisie</span>
          <span className="font-mono text-sm font-semibold" style={{ color: 'var(--color-blue)' }}>
            {fmtDist(distToCap)} BPS
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="section-label">
            {isAuction || isBootstrap ? 'Phase' : 'Progress'}
          </span>
          <span className="font-mono text-sm font-semibold text-text">
            {isAuction || isBootstrap ? 'Auction' : `${officialProgress.toFixed(1)}%`}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="section-label">{isFinal ? 'Outcome' : 'Leading'}</span>
          <span
            className="font-mono text-sm font-semibold"
            style={{
              color:
                officialSide === 'soc'
                  ? 'var(--color-pink)'
                  : officialSide === 'cap'
                  ? 'var(--color-blue)'
                  : 'var(--color-text2)',
            }}
          >
            {officialSide === 'soc'
              ? 'Proletariat'
              : officialSide === 'cap'
              ? 'Bourgeoisie'
              : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
