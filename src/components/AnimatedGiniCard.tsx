'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';

// Icons
import Carlo from '@/components/icons/Carlo.svg';
import Regardo from '@/components/icons/Regardo.svg';

interface AnimatedGiniCardProps {
  /** Mock Proletarian target BPS. Defaults to 3500 */
  socTargetBps?: number;
  /** Mock Capitalist target BPS. Defaults to 6500 */
  capTargetBps?: number;
  /** Mock starting Gini BPS. Defaults to 5000 */
  gInitial?: number;
  /** Mock current Gini BPS. Defaults to 4820 */
  currentGini?: number;
  /** Driven by the parent card's hover state. If not provided, uses internal state. */
  isHovered?: boolean;

  /**
   * Override for the left (Carlo) faction icon. The landing page injects the
   * traveling layoutId character here; pass `null` for an empty dock while the
   * character lives elsewhere. Omit entirely for the default static icon.
   */
  leftIcon?: React.ReactNode;
  /** Override for the right (Regardo) faction icon — same contract as leftIcon. */
  rightIcon?: React.ReactNode;
}

export default function AnimatedGiniCard({
  socTargetBps = 3500,
  capTargetBps = 6500,
  gInitial = 5000,
  currentGini = 4820,
  isHovered: parentHovered,
  leftIcon,
  rightIcon,
}: AnimatedGiniCardProps) {
  // --- Scale Calculations for the Horizontal Track ---
  const scaleMin = Math.max(0, socTargetBps - 200);
  const scaleMax = Math.min(10000, capTargetBps + 200);

  const toScalePct = (bps: number) => {
    const clamped = Math.min(Math.max(bps, scaleMin), scaleMax);
    return ((clamped - scaleMin) / (scaleMax - scaleMin)) * 100;
  };

  const scaleTicks = useMemo(() => {
    const ticks: { value: number; major: boolean }[] = [];
    const first = Math.ceil(scaleMin / 500) * 500;
    const last = Math.floor(scaleMax / 500) * 500;
    for (let v = first; v <= last; v += 500) {
      if (v > scaleMin && v < scaleMax) {
        ticks.push({ value: v, major: v % 1000 === 0 });
      }
    }
    return ticks;
  }, [scaleMin, scaleMax]);

  const formatTick = (v: number) => {
    if (v === 0) return '0';
    if (v % 1000 === 0) return `${v / 1000}k`;
    return `${(v / 1000).toFixed(1)}k`;
  };

  // --- Hover Physics and State Management ---
  const [isInternalHovered, setIsInternalHovered] = useState(false);
  const isHovered = parentHovered !== undefined ? parentHovered : isInternalHovered;

  const [animatedGini, setAnimatedGini] = useState(currentGini);

  const currentPositionRef = useRef(currentGini);
  const targetPositionRef = useRef(currentGini);

  // Smooth, frame-by-frame rendering loop (No CSS transitions to prevent lag)
  useEffect(() => {
    let animationFrameId: number;

    const tick = (timestamp: number) => {
      if (isHovered) {
        // Multi-frequency harmonic wave superposition
        const mid = (socTargetBps + capTargetBps) / 2;
        const amp = (capTargetBps - socTargetBps) / 2;
        const time = timestamp / 1000;

        const wave = 
          Math.sin(time * 1.4) * 0.45 +          
          Math.sin(time * 0.6 + 1.8) * 0.35 +    
          Math.sin(time * 2.8 + 3.2) * 0.20;     

        targetPositionRef.current = mid + wave * amp;
      } else {
        targetPositionRef.current = currentGini;
      }

      // Linear interpolation (LERP) easing
      const easeFactor = isHovered ? 0.08 : 0.12;
      const diff = targetPositionRef.current - currentPositionRef.current;

      if (Math.abs(diff) > 0.05) {
        currentPositionRef.current += diff * easeFactor;
        setAnimatedGini(currentPositionRef.current);
      } else {
        currentPositionRef.current = targetPositionRef.current;
        setAnimatedGini(currentPositionRef.current);
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isHovered, currentGini, socTargetBps, capTargetBps]);

  // --- Dynamic Distance Calculations (Syncs with the LERP coordinates) ---
  const socBpsAway = Math.round(Math.abs(animatedGini - socTargetBps));
  const capBpsAway = Math.round(Math.abs(capTargetBps - animatedGini));

  const curPct = toScalePct(animatedGini);
  const socPct = toScalePct(socTargetBps);
  const capPct = toScalePct(capTargetBps);

  const socLeft = Math.min(curPct, socPct);
  const socWidth = Math.abs(curPct - socPct);
  const capLeft = Math.min(curPct, capPct);
  const capWidth = Math.abs(curPct - capPct);

  const socIsLeft = socPct <= curPct;
  const capIsLeft = capPct <= curPct;

  const NUDGE = '0.10rem'; // Alignment nudge for the overlapping risers

  return (
    <div
      className="terminal-pane w-full h-full flex flex-col justify-center p-2 pb-6"
      style={{ border: 'none', backgroundColor: '#0D0B14' }}
      onMouseEnter={() => setIsInternalHovered(true)}
      onMouseLeave={() => setIsInternalHovered(false)}
    >
      {/* Top Header Row */}
      <div className="w-full px-2 pb-4 flex justify-between items-end flex-shrink-0">

        {/* Left Faction Block (Carlo / Marx) — the w-12 h-14 box is always present
            to preserve centering even while the traveling character is elsewhere. */}
        <div className="w-12 h-14 flex items-end justify-start">
          {leftIcon === undefined ? (
            <Carlo className="w-auto h-12" style={{ color: '#9D4EDD' }} viewBox="0 0 579.04352 781.15955" />
          ) : (
            leftIcon
          )}
        </div>

        {/* Central Title */}
        <div className="flex flex-col items-center pb-1">
          <span className="font-display text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9E97BD' }}>
            GINI COEFFICIENT
          </span>
        </div>

        {/* Right Faction Block (Regardo) — same dock contract as the left. */}
        <div className="w-12 h-14 flex items-end text-right justify-end">
          {rightIcon === undefined ? (
            <Regardo className="w-auto h-12" style={{ color: '#FFC300' }} viewBox="0 0 491.52783 788.49512" />
          ) : (
            rightIcon
          )}
        </div>
      </div>

      {/* Full-width gauge viewport container with explicit height to prevent clipping */}
      <div className="relative w-full h-24 flex items-center">
        
        {/* 1. Underlying Track Rail */}
        <div 
          className="absolute left-4 right-4 h-2 rounded-full border border-bg" 
          style={{ 
            background: 'linear-gradient(90deg, #9D4EDD 0%, #D81B60 45%, #FF8C00 75%, #FFC300 100%)' 
          }} 
        />

        {/* 2. Absolute overlay for ticks, pins, and distance connectors */}
        <div className="absolute left-4 right-4 top-0 bottom-0 pointer-events-none">
          
          {/* Scale Ticks */}
          {scaleTicks.map(({ value: v, major }) => {
            const pct = ((v - scaleMin) / (scaleMax - scaleMin)) * 100;
            return (
              <React.Fragment key={v}>
                <div
                  className="absolute"
                  style={{
                    left: `${pct}%`,
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '1px',
                    height: major ? '12px' : '6px',
                    opacity: major ? 0.3 : 0.15,
                    backgroundColor: '#9E97BD',
                  }}
                />
                {major && (
                  <span
                    className="absolute font-mono text-[8px] tracking-tighter"
                    style={{ color: 'rgba(158,151,189,0.4)', left: `${pct}%`, top: '50%', marginTop: '8px', transform: 'translateX(-50%)' }}
                  >
                    {formatTick(v)}
                  </span>
                )}
              </React.Fragment>
            );
          })}

          {/* --- Distance Indicators (Connector Lines below track) with numeric BPS distances --- */}
          
          {/* Proletarian distance bracket */}
          <div
            className="absolute z-20"
            style={{
              left: `${socLeft}%`,
              width: `${socWidth}%`,
              height: '0.6rem',
              top: '50%',
              marginTop: '1.2rem',
            }}
          >
            <div
              className="absolute bottom-0 h-px"
              style={{ 
                left: socIsLeft ? '0' : NUDGE, 
                right: socIsLeft ? NUDGE : '0',
                backgroundColor: '#9D4EDD',
                boxShadow: '0 0 2px #9D4EDD'
              }}
            />
            <div
              className="absolute w-px"
              style={{ [socIsLeft ? 'left' : 'right']: '0', top: '0', bottom: '0', backgroundColor: '#9D4EDD' }}
            />
            <div
              className="absolute w-px"
              style={{ [socIsLeft ? 'right' : 'left']: NUDGE, top: '0', bottom: '0', backgroundColor: '#9D4EDD' }}
            />
            {/* Value in Proletarian purple */}
            <span 
              className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 whitespace-nowrap font-mono text-[9px] font-bold tracking-tight tabular-nums"
              style={{ color: '#9D4EDD' }}
            >
              {socBpsAway.toLocaleString()} BPS
            </span>
          </div>

          {/* Capitalist distance bracket */}
          <div
            className="absolute z-20"
            style={{
              left: `${capLeft}%`,
              width: `${capWidth}%`,
              height: '0.6rem',
              top: '50%',
              marginTop: '1.2rem',
            }}
          >
            <div
              className="absolute bottom-0 h-px"
              style={{ 
                left: capIsLeft ? '0' : NUDGE, 
                right: capIsLeft ? NUDGE : '0',
                backgroundColor: '#FFC300',
                boxShadow: '0 0 2px #FFC300'
              }}
            />
            <div
              className="absolute w-px"
              style={{ [capIsLeft ? 'left' : 'right']: '0', top: '0', bottom: '0', backgroundColor: '#FFC300' }}
            />
            <div
              className="absolute w-px"
              style={{ [capIsLeft ? 'right' : 'left']: NUDGE, top: '0', bottom: '0', backgroundColor: '#FFC300' }}
            />
            {/* Value in Capitalist gold */}
            <span 
              className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 whitespace-nowrap font-mono text-[9px] font-bold tracking-tight tabular-nums"
              style={{ color: '#FFC300' }}
            >
              {capBpsAway.toLocaleString()} BPS
            </span>
          </div>

          {/* --- Target pins and Labels (Moved ABOVE Rail to clear bracket distances) --- */}

          {/* Proletarian target goal indicator */}
          <div className="absolute top-1/2 -translate-y-1/2" style={{ left: `${toScalePct(socTargetBps)}%`, transform: 'translateX(-50%)' }}>
            <div style={{ width: '4px', height: '1.2rem', backgroundColor: '#9D4EDD', border: '1px solid #0D0B14' }} />
            <span className="absolute bottom-full mb-1 z-40 font-mono font-black text-[9px] px-1 py-0.5 rounded shadow whitespace-nowrap" style={{ backgroundColor: '#9D4EDD', color: '#251F3D' }}>
              {Math.round(socTargetBps).toLocaleString()}
            </span>
          </div>

          {/* Start value baseline */}
          {gInitial > 0 && (
            <div className="absolute top-1/2 -translate-y-1/2" style={{ left: `${toScalePct(gInitial)}%`, transform: 'translateX(-50%)' }}>
              <div style={{ width: '2px', height: '1.2rem', backgroundColor: '#9E97BD', opacity: 0.4 }} />
              <span className="absolute bottom-full mb-1 font-mono text-[8px] uppercase whitespace-nowrap" style={{ color: 'rgba(158,151,189,0.5)' }}>Start</span>
            </div>
          )}

          {/* Capitalist target goal indicator */}
          <div className="absolute top-1/2 -translate-y-1/2" style={{ left: `${toScalePct(capTargetBps)}%`, transform: 'translateX(-50%)' }}>
            <div style={{ width: '4px', height: '1.2rem', backgroundColor: '#FFC300', border: '1px solid #0D0B14' }} />
            <span className="absolute bottom-full mb-1 z-40 font-mono font-black text-[9px] px-1 py-0.5 rounded shadow whitespace-nowrap" style={{ backgroundColor: '#FFC300', color: '#251F3D' }}>
              {Math.round(capTargetBps).toLocaleString()}
            </span>
          </div>

          {/* --- Animated Pointer Knob (Above Rail) --- */}
          <div 
            className="absolute top-1/2 -translate-y-1/2" 
            style={{ left: `${toScalePct(animatedGini)}%`, transform: 'translateX(-50%)' }}
          >
            <div className="dial-knob current" style={{ width: '12px', height: '12px' }} />
            <span className="absolute bottom-full mb-1 z-50 font-mono font-black text-[10px] px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap" style={{ backgroundColor: '#FFFFFF', color: '#0D0B14' }}>
              {Math.round(animatedGini).toLocaleString()}
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}