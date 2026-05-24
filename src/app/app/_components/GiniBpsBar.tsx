'use client';

import React from 'react';
import Carlo from '@/components/icons/Carlo.svg';
import Regardo from '@/components/icons/Regardo.svg';

interface GiniBpsBarProps {
  gCurrent: number;
  gInitial: number;
  capTargetBps: number;
  socTargetBps: number;
  isAuction: boolean;
  isTrading: boolean;
  isPayout: boolean;
  winningSide: 'soc' | 'cap' | 'none';
  progressPercent: number;
}

export function GiniBpsBar({
  gCurrent,
  gInitial,
  capTargetBps,
  socTargetBps,
  isAuction,
  isTrading,
  isPayout,
  winningSide,
  progressPercent,
}: GiniBpsBarProps) {
  const useCompressedScale = isTrading || isPayout;
  const scaleMin = useCompressedScale ? Math.max(0, socTargetBps - 200) : 0;
  const scaleMax = useCompressedScale ? Math.min(10000, capTargetBps + 200) : 10000;

  const toScalePct = (bps: number) => {
    const clamped = Math.min(Math.max(bps, scaleMin), scaleMax);
    return `${((clamped - scaleMin) / (scaleMax - scaleMin)) * 100}%`;
  };

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
      className="w-full rounded-full"
      id="gini-bar"
      style={{
        position: 'absolute',
        top: '66.67%',
        left: 0,
        right: 0,
        height: 6,
        background:
          'linear-gradient(90deg, var(--color-purple-70) 0%, var(--color-border2) 40%, var(--color-border2) 60%, var(--color-gold-70) 100%)',
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
                className="absolute font-mono text-text2/50 text-tick-label"
                style={{
                  left: `${pct}%`,
                  top: 18,
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

      {/* Proletariat (purple) marker */}
      <div className="gini-marker" style={{ left: toScalePct(socTargetBps) }}>
        <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, var(--color-purple-15) 0%, transparent 70%)', top: 12, left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />
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
              border: '2px solid var(--color-purple-35)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--color-purple)',
            }}
          >
            <Carlo className="w-9 h-auto" viewBox="0 0 600 800" />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-text2">
            Proletariat
          </span>
          <span
            className="font-mono text-sm font-semibold tabular-nums"
            style={{ color: 'var(--color-purple)' }}
          >
            {Math.round(socTargetBps).toLocaleString()}
          </span>
          <span className="font-mono text-[10px] text-text2 whitespace-nowrap">
            {socBpsAway.toLocaleString()} BPS away
          </span>
        </div>
        <div className="gini-knob soc" />
      </div>

      {/* Initial marker */}
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
              className="font-mono uppercase text-marker-micro"
              style={{ letterSpacing: '0.15em', color: 'var(--color-text2)', opacity: 0.6 }}
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

      {/* Current (gold) marker */}
      <div
        className="gini-marker transition-all duration-700 ease-out"
        style={{ left: toScalePct(gCurrent), top: -11 }}
      >
        <div style={{ position: 'absolute', width: 60, height: 60, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 45%, transparent 70%)', top: 14, left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />
        <div className="gini-knob gold" />
        <div className="flex flex-col items-center" style={{ marginTop: 10, gap: 3 }}>
          <span
            className="font-mono text-[10px] uppercase tracking-wider"
            style={{ color: 'var(--color-text2)' }}
          >
            Current
          </span>
          <span
            className="font-mono text-sm font-semibold"
            style={{ color: 'var(--color-gold)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
          >
            {gCurrent.toLocaleString()}
          </span>
          {winningSide !== 'none' && (
            <span className="font-mono text-[10px] text-center text-text2 whitespace-nowrap">
              {progressPercent.toFixed(1)}% to{' '}
              <span
                className="font-bold"
                style={{ color: winningSide === 'soc' ? 'var(--color-purple)' : 'var(--color-gold)' }}
              >
                {winningSide === 'soc' ? 'Proletariat' : 'Bourgeoisie'}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Bourgeoisie (gold) marker */}
      <div className="gini-marker" style={{ left: toScalePct(capTargetBps) }}>
        <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, var(--color-gold-15) 0%, transparent 70%)', top: 12, left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />
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
              border: '2px solid var(--color-gold-35)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--color-gold)',
            }}
          >
            <Regardo className="w-9 h-auto" viewBox="0 0 600 800" />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-text2">
            Bourgeoisie
          </span>
          <span
            className="font-mono text-sm font-semibold tabular-nums"
            style={{ color: 'var(--color-gold)' }}
          >
            {Math.round(capTargetBps).toLocaleString()}
          </span>
          <span className="font-mono text-[10px] text-text2 whitespace-nowrap">
            {capBpsAway.toLocaleString()} BPS away
          </span>
        </div>
        <div className="gini-knob cap" />
      </div>
    </div>
  );
}
