'use client';

interface PercentSliderProps {
  value: number;
  onChange: (pct: number) => void;
  disabled?: boolean;
}

export default function PercentSlider({ value, onChange, disabled = false }: PercentSliderProps) {
  const clamped = Math.max(0, Math.min(100, value));

  // Handles text input changes, clamping the input strictly between 0 and 100
  const handleInputChange = (valStr: string) => {
    const num = Number(valStr);
    if (isNaN(num)) return;
    onChange(Math.max(0, Math.min(100, num)));
  };

  return (
    <div className={`flex items-center gap-3 py-1 select-none w-full ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      
      {/* ── Slider wrapper with absolute layers ── */}
      <div className="relative flex-1 h-5 flex items-center">
        
        {/* 1. Visual Track (Bottom layer: z-0) */}
        <div
          className="absolute inset-x-0 h-1.5 bg-card border border-border rounded-[3px] pointer-events-none z-0"
          style={{
            background: `linear-gradient(to right, var(--color-purple) ${clamped}%, var(--color-border2) ${clamped}%)`
          }}
        />

        {/* 2. Muted Tick Marks / Anchors (Middle layer: z-10) */}
        <div className="absolute inset-x-[7px] pointer-events-none h-0 flex items-center z-10">
          <div className="absolute left-[25%] -translate-x-1/2 w-2 h-2 rounded-[2px] bg-text2" />
          <div className="absolute left-[50%] -translate-x-1/2 w-2 h-2 rounded-[2px] bg-text2" />
          <div className="absolute left-[75%] -translate-x-1/2 w-2 h-2 rounded-[2px] bg-text2" />
          <div className="absolute left-[100%] -translate-x-1/2 w-2 h-2 rounded-[2px] bg-text2" />
        </div>

        {/* 3. Native Slider + Solid Thumb (Top layer: z-20) */}
        <input
          type="range"
          min={0}
          max={100}
          step={0.01}
          value={clamped}
          onChange={(e) => onChange(Number(e.target.value))}
          className="relative appearance-none w-full h-5 bg-transparent border-none outline-none cursor-pointer z-20 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-[3px] [&::-webkit-slider-thumb]:bg-text [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-border2 [&::-webkit-slider-thumb]:shadow-[0_0_6px_color-mix(in_srgb,var(--color-purple)_40%,transparent)] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb:hover]:scale-[1.15] [&::-webkit-slider-thumb:hover]:bg-purple [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-[3px] [&::-moz-range-thumb]:bg-text [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-border2 [&::-moz-range-thumb]:shadow-[0_0_6px_color-mix(in_srgb,var(--color-purple)_40%,transparent)] [&::-moz-range-thumb:hover]:scale-[1.15] [&::-moz-range-thumb:hover]:bg-purple [&::-moz-range-track]:bg-transparent [&::-moz-range-track]:border-none [&::-moz-range-progress]:bg-transparent"
        />
      </div>

      {/* ── Compact percentage numeric input field ── */}
      <div className="flex items-center gap-1 shrink-0 bg-card3 border border-border2 rounded-[3px] px-2 py-0.5 w-16">
        <input
          type="number"
          min={0}
          max={100}
          value={Math.round(clamped)}
          onChange={(e) => handleInputChange(e.target.value)}
          className="w-full bg-transparent text-[0.75rem] font-mono text-text outline-none text-right no-spinners"
        />
        <span className="text-[0.65rem] font-mono text-text2 select-none">%</span>
      </div>

    </div>
  );
}