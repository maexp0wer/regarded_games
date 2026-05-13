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
  const isTrading = !isAuction && !isBootstrap && !isPayout;

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

  // Compress scale in trading and payout phases so targets appear ~200 BPS from each end
  const useCompressedScale = isTrading || isPayout;
  const scaleMin = useCompressedScale ? Math.max(0, socTargetBps - 200) : 0;
  const scaleMax = useCompressedScale ? Math.min(10000, capTargetBps + 200) : 10000;

  const toScalePct = (bps: number) => {
    const clamped = Math.min(Math.max(bps, scaleMin), scaleMax);
    return `${((clamped - scaleMin) / (scaleMax - scaleMin)) * 100}%`;
  };

  // Ticks: in trading/payout phases use 1k major + 500 minor lines, skip start/end positions
  const scaleTicks: { value: number; major: boolean }[] = useCompressedScale
    ? (() => {
        const ticks: { value: number; major: boolean }[] = [];
        const first = Math.ceil(scaleMin / 500) * 500;
        const last = Math.floor(scaleMax / 500) * 500;
        for (let v = first; v <= last; v += 500) {
          if (v > scaleMin && v < scaleMax) {
            ticks.push({ value: v, major: v % 1000 === 0 });
          }
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

  return (
    <div
      className="card-app relative flex flex-col h-full"
      style={{
        minHeight: 300,
        background: 'linear-gradient(90deg, rgba(255,61,138,0.05) 20%, rgba(77,159,255,0.05) 80%)',
        borderColor: 'var(--color-border-bright)',
      }}
    >
      {/* ── Header ── */}
      <div className="font-mono text-[11px] font-semibold tracking-widest uppercase text-text2 mb-4">
        Gini BPS · Coefficient of Inequality
      </div>

      {/* ── Bar stage ── */}
      <div className="relative flex-1">
        <div
          className="w-full rounded-full"
          id="gini-bar"
          style={{
            position: 'absolute',
            top: '66.67%',
            left: 0,
            right: 0,
            height: 6,
            background:
              'linear-gradient(90deg, rgba(255,61,138,0.5) 0%, var(--color-border-bright) 40%, var(--color-border-bright) 60%, rgba(77,159,255,0.5) 100%)',
          }}
        >
          {/* Scale ticks + labels */}
          {scaleTicks.map(({ value: v, major }) => {
            const pct = ((v - scaleMin) / (scaleMax - scaleMin)) * 100;
            return (
              <React.Fragment key={v}>
                <div
                  className="absolute"
                  style={{
                    left: `${pct}%`,
                    top: major ? -4 : -1,
                    width: 1,
                    height: major ? 14 : 8,
                    background: 'var(--color-text)',
                    opacity: major ? 0.3 : 0.2,
                  }}
                />
                {major && (
                  <span
                    className="absolute font-mono text-text2/50"
                    style={{
                      left: `${pct}%`,
                      top: 18,
                      fontSize: 10,
                      transform: 'translateX(-50%)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatTick(v)}
                  </span>
                )}
              </React.Fragment>
            );
          })}

          {/* ── Proletariat (pink) marker ── */}
          <div className="gini-marker" style={{ left: toScalePct(socTargetBps) }}>
            <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,61,138,0.1) 0%, transparent 70%)', top: 12, left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />
            <div
              className="absolute flex flex-col items-center gap-1"
              style={{
                bottom: '100%',
                left: '50%',
                transform: 'translate(-50%, -8px)',
                textAlign: 'center',
              }}
            >
              <div
                style={{
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
              <span
                className="font-mono text-[10px] uppercase tracking-wider"
                style={{ color: 'var(--color-text2)' }}
              >
                Proletariat
              </span>
              <span
                className="font-mono text-sm font-semibold"
                style={{ color: 'var(--color-pink)', fontVariantNumeric: 'tabular-nums' }}
              >
                {Math.round(socTargetBps).toLocaleString()}
              </span>
              <span
                className="font-mono text-[10px]"
                style={{ color: 'var(--color-text2)', whiteSpace: 'nowrap' }}
              >
                {socBpsAway.toLocaleString()} BPS away
              </span>
            </div>
            <div className="gini-knob pink" />
          </div>

          {/* ── Initial marker: half-size neutral knob, labels above ── */}
          {gInitial > 0 && !isAuction && (
            <div
              className="gini-marker"
              style={{ left: toScalePct(gInitial), top: -3 }}
            >
              <div
                className="absolute flex flex-col items-center"
                style={{
                  bottom: '100%',
                  left: '50%',
                  transform: 'translate(-50%, -4px)',
                  textAlign: 'center',
                  gap: 2,
                }}
              >
                <span
                  className="font-mono uppercase"
                  style={{ fontSize: 8, letterSpacing: '0.15em', color: 'var(--color-text2)', opacity: 0.6 }}
                >
                  Initial
                </span>
                <span
                  className="font-mono text-[10px]"
                  style={{ color: 'var(--color-text2)', opacity: 0.6, fontVariantNumeric: 'tabular-nums' }}
                >
                  {gInitial.toLocaleString()}
                </span>
              </div>
              {/* Half-size neutral knob matching the faction dot style */}
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: 'var(--color-text2)',
                  border: '1.5px solid var(--color-bg)',
                  boxShadow: '0 0 0 1px var(--color-text2)',
                  opacity: 0.9,
                }}
              />
            </div>
          )}

          {/* ── Current (gold) marker: top overridden to center 28px dot ── */}
          <div
            className="gini-marker transition-all duration-700 ease-out"
            style={{ left: toScalePct(gCurrent), top: -11 }}
          >
            <div style={{ position: 'absolute', width: 60, height: 60, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,184,0,0.05) 45%, transparent 70%)', top: 14, left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />
            <div className="gini-knob gold" />
            {/* CURRENT label + BPS + progress below the track */}
            <div className="flex flex-col items-center" style={{ marginTop: 10, gap: 3 }}>
              <span
                className="font-mono text-[10px] uppercase tracking-wider"
                style={{ color: 'var(--color-text2)' }}
              >
                Current
              </span>
              <span
                className="font-mono text-sm font-semibold"
                style={{ color: 'var(--color-primary)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
              >
                {gCurrent.toLocaleString()}
              </span>
              {officialSide !== 'none' && (
                <span
                  className="font-mono text-[10px] text-center"
                  style={{ color: 'var(--color-text2)', whiteSpace: 'nowrap' }}
                >
                  {officialProgress.toFixed(1)}% to{' '}
                  <span
                    style={{
                      color: officialSide === 'soc' ? 'var(--color-pink)' : 'var(--color-blue)',
                      fontWeight: 'bold',
                    }}
                  >
                    {officialSide === 'soc' ? 'Proletariat' : 'Bourgeoisie'}
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* ── Bourgeoisie (blue) marker ── */}
          <div className="gini-marker" style={{ left: toScalePct(capTargetBps) }}>
            <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(77,159,255,0.1) 0%, transparent 70%)', top: 12, left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />
            <div
              className="absolute flex flex-col items-center gap-1"
              style={{
                bottom: '100%',
                left: '50%',
                transform: 'translate(-50%, -8px)',
                textAlign: 'center',
              }}
            >
              <div
                style={{
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
              <span
                className="font-mono text-[10px] uppercase tracking-wider"
                style={{ color: 'var(--color-text2)' }}
              >
                Bourgeoisie
              </span>
              <span
                className="font-mono text-sm font-semibold"
                style={{ color: 'var(--color-blue)', fontVariantNumeric: 'tabular-nums' }}
              >
                {Math.round(capTargetBps).toLocaleString()}
              </span>
              <span
                className="font-mono text-[10px]"
                style={{ color: 'var(--color-text2)', whiteSpace: 'nowrap' }}
              >
                {capBpsAway.toLocaleString()} BPS away
              </span>
            </div>
            <div className="gini-knob blue" />
          </div>
        </div>
      </div>
    </div>
  );
}
