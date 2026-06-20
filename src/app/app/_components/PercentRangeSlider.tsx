'use client';

import type { CSSProperties } from 'react';

interface PercentRangeSliderProps {
  min: number;
  max: number;
  onChangeMin: (pct: number) => void;
  onChangeMax: (pct: number) => void;
  faction?: 'proletariat' | 'capitalist';
  disabled?: boolean;
}

// Dual-thumb range slider. Two overlapping native range inputs share one visual
// track; the active fill spans [min, max]. A span of at least 1 is preserved
// between the thumbs to match the stepper collision logic in OrderBook.
export default function PercentRangeSlider({
  min, max, onChangeMin, onChangeMax, faction = 'proletariat', disabled = false,
}: PercentRangeSliderProps) {
  const clampedMin = Math.max(0, Math.min(100, min));
  const clampedMax = Math.max(0, Math.min(100, max));

  // Faction gradient painted full-width behind the track; the active span
  // [min, max] reveals a slice of it while the inactive ends are masked.
  const factionGradient = faction === 'capitalist'
    ? 'linear-gradient(to right, var(--color-orange), var(--color-gold))'
    : 'linear-gradient(to right, var(--color-purple), var(--color-magenta))';
  const accentColor = faction === 'capitalist' ? 'var(--color-gold)' : 'var(--color-purple)';

  // Dragging one thumb into the other pushes it ahead, keeping a span of at
  // least 1 — mirrors the stepper push/pull logic in OrderBook. At the ceiling
  // (max can't be pushed past 100) min holds at 99 instead of overlapping.
  const handleMin = (raw: number) => {
    const next = Math.max(0, Math.min(100, raw));
    if (next >= clampedMax) {
      const pushedMax = Math.min(100, next + 1);
      onChangeMin(pushedMax - 1);
      onChangeMax(pushedMax);
    } else {
      onChangeMin(next);
    }
  };
  const handleMax = (raw: number) => {
    const next = Math.max(0, Math.min(100, raw));
    if (next <= clampedMin) {
      const pulledMin = Math.max(0, next - 1);
      onChangeMax(pulledMin + 1);
      onChangeMin(pulledMin);
    } else {
      onChangeMax(next);
    }
  };

  // Thumb glow/hover read the faction accent via the --thumb-accent custom
  // property set on the wrapper below, so both factions reuse one class string.
  const thumbClasses =
    '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-[3px] [&::-webkit-slider-thumb]:bg-text [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-border2 [&::-webkit-slider-thumb]:shadow-[0_0_6px_color-mix(in_srgb,var(--thumb-accent)_40%,transparent)] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb:hover]:scale-[1.15] [&::-webkit-slider-thumb:hover]:bg-[var(--thumb-accent)] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-[3px] [&::-moz-range-thumb]:bg-text [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-border2 [&::-moz-range-thumb]:shadow-[0_0_6px_color-mix(in_srgb,var(--thumb-accent)_40%,transparent)] [&::-moz-range-thumb:hover]:scale-[1.15] [&::-moz-range-thumb:hover]:bg-[var(--thumb-accent)] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-track]:bg-transparent [&::-moz-range-track]:border-none [&::-moz-range-progress]:bg-transparent';

  return (
    <div
      className={`relative flex-1 h-[26px] flex items-center select-none px-1.5 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
      style={{ '--thumb-accent': accentColor } as CSSProperties}
    >

      {/* 1. Track: full-width faction gradient painted behind, with border2
          masks over the inactive ends so only the active span [min, max]
          reveals a slice of the gradient (bottom layer). */}
      <div className="absolute inset-x-0 h-1.5 border border-border rounded-[3px] overflow-hidden pointer-events-none z-0">
        {/* Full gradient base */}
        <div className="absolute inset-0" style={{ background: factionGradient }} />
        {/* Mask the inactive left end [0, min] */}
        <div className="absolute inset-y-0 left-0 bg-border2" style={{ width: `${clampedMin}%` }} />
        {/* Mask the inactive right end [max, 100] */}
        <div className="absolute inset-y-0 right-0 bg-border2" style={{ width: `${100 - clampedMax}%` }} />
      </div>

      {/* 2. Two overlapping range inputs (top layer). Tracks ignore pointer
          events so clicks fall through to whichever thumb is nearer; only the
          thumbs themselves re-enable pointer-events. */}
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={clampedMin}
        onChange={(e) => handleMin(Number(e.target.value))}
        aria-label="Minimum percentile"
        className={`absolute inset-x-0 w-full h-5 bg-transparent border-none outline-none appearance-none pointer-events-none z-20 ${thumbClasses}`}
      />
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={clampedMax}
        onChange={(e) => handleMax(Number(e.target.value))}
        aria-label="Maximum percentile"
        className={`absolute inset-x-0 w-full h-5 bg-transparent border-none outline-none appearance-none pointer-events-none z-20 ${thumbClasses}`}
      />
    </div>
  );
}
