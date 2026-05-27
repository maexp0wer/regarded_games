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
  
  // Scale engine logic matching underlying system thresholds
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
    <div className="dark metric-bar-chassis">
      
      {/* ROW LAYER 1: ANCHORED FACTION TARGET IDENTITIES */}
      <div className="flex justify-between items-center border-b border-text2 pb-3">
        
        {/* Left Faction Anchor: Proletariat */}
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-full bg-[var(--color-card2)] grid place-items-center text-[var(--color-purple)]"
            style={{ 
              border: '2px solid var(--color-text2)',
              boxShadow: '0 0 12px var(--color-purple-15)'
            }}
          >
            <Carlo className="w-7 h-auto" viewBox="0 0 600 800" />
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-[10px] uppercase text-text2 tracking-wider">Proletarian Target</span>
            <span className="font-mono text-sm font-black text-[var(--color-purple)]">
              {Math.round(socTargetBps).toLocaleString()} <span className="text-[9px] text-text2 font-normal">BPS</span>
            </span>
          </div>
        </div>

        {/* Center Header */}
        <div className="hidden sm:flex flex-col items-center text-center gap-0.5">
          <span className="font-mono text-[9px] uppercase tracking-widest text-text2">Coefficient of Inequality</span>
          <span className="font-mono text-xs font-bold uppercase text-text">
            {isAuction ? 'Auction' : isTrading ? 'Live Gini' : 'Gini Score'}
          </span>
        </div>

        {/* Right Faction Anchor: Bourgeoisie */}
        <div className="flex items-center gap-3 text-right flex-row-reverse">
          <div 
            className="w-10 h-10 rounded-full bg-[var(--color-card2)] grid place-items-center text-[var(--color-gold)]"
            style={{ 
              border: '2px solid var(--color-text2)',
              boxShadow: '0 0 12px var(--color-gold-15)'
            }}
          >
            <Regardo className="w-7 h-auto" viewBox="0 0 600 800" />
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-[10px] uppercase text-text2 tracking-wider">Capitalist Target</span>
            <span className="font-mono text-sm font-black text-[var(--color-gold)]">
              {Math.round(capTargetBps).toLocaleString()} <span className="text-[9px] text-text2 font-normal">BPS</span>
            </span>
          </div>
        </div>

      </div>

      {/* ROW LAYER 2: THE DATA PROGRESSION TRACK */}
      <div className="px-2">
        <div className="live-rail-container">
          
          {/* BACKGROUND LAYOUT HARD TICKS */}
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
                    opacity: major ? 0.3 : 0.15 
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

          {/* SYSTEM PIN 1: PROLETARIAT WIN ZONE TARGET */}
          <div className="track-absolute-pin" style={{ left: `${toScalePct(socTargetBps)}%` }}>
            <div className="dial-knob purple" />
            <span
              className="absolute top-full mt-1 font-mono text-[9px] text-purple font-bold bg-bg px-1 rounded whitespace-nowrap"
              style={{ border: '1px solid var(--color-text2)' }}
            >
              SOC
            </span>
          </div>

          {/* SYSTEM PIN 2: INITIAL SYSTEM STATE BASELINE */}
          {gInitial > 0 && !isAuction && (
            <div className="track-absolute-pin" style={{ left: `${toScalePct(gInitial)}%` }}>
              <div className="w-2 h-2 rounded-full bg-text2/40 border border-text2" />
              <span className="absolute top-full mt-1 font-mono text-[8px] text-text2/60 uppercase whitespace-nowrap">Init</span>
            </div>
          )}

          {/* SYSTEM PIN 3: BOURGEOISIE WIN ZONE TARGET */}
          <div className="track-absolute-pin" style={{ left: `${toScalePct(capTargetBps)}%` }}>
            <div className="dial-knob gold" />
            <span
              className="absolute top-full mt-1 font-mono text-[9px] text-gold font-bold bg-bg px-1 rounded whitespace-nowrap"
              style={{ border: '1px solid var(--color-text2)' }}
            >
              CAP
            </span>
          </div>

          {/* SYSTEM PIN 4: LIVE RECORDED POSITION INDICATOR */}
          <div className="track-absolute-pin transition-all duration-700 ease-out" style={{ left: `${toScalePct(gCurrent)}%` }}>
            <div className="dial-knob current" />
            <div className="absolute bottom-full mb-1 z-40 bg-text text-bg font-mono font-black text-xs px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap">
              {gCurrent.toLocaleString()}
            </div>
          </div>

        </div>
      </div>

      {/* ROW LAYER 3: VELOCITY DELTAS & REAL-TIME LEAN */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-[11px] text-text2 border-t border-text2 pt-3 mt-1 items-center">
        
        <div className="text-left">
          <span className="text-[var(--color-purple)] font-bold">{socBpsAway.toLocaleString()} BPS</span>from Proletarian Target
        </div>

        <div className="text-center sm:border-x sm:border-text2 px-2">
          {winningSide !== 'none' ? (
            <span>
              Dominance Matrix Leans:{' '}
              <span className={`font-bold ${winningSide === 'soc' ? 'text-[var(--color-purple)]' : 'text-[var(--color-gold)]'}`}>
                {winningSide === 'soc' ? 'Proletariat' : 'Bourgeoisie'} ({progressPercent.toFixed(1)}%)
              </span>
            </span>
          ) : (
            <span className="text-text2/50 uppercase tracking-wider text-[10px]">Equilibrium Maintained</span>
          )}
        </div>

        <div className="text-right">
          <span className="text-[var(--color-gold)] font-bold">{capBpsAway.toLocaleString()} BPS</span> from Capitalist Target
        </div>

      </div>

    </div>
  );
}