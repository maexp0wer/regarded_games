'use client';

interface PercentSliderProps {
  value: number;
  onChange: (pct: number) => void;
  disabled?: boolean;
}

const PRESETS = [25, 50, 75, 100];

export default function PercentSlider({ value, onChange, disabled = false }: PercentSliderProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={`flex flex-col gap-2 py-2 select-none ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>

      <input
        type="range"
        min={0}
        max={100}
        step={0.01}
        value={clamped}
        onChange={(e) => onChange(Number(e.target.value))}
        className="appearance-none w-full h-1.5 bg-card2 border border-border rounded-[3px] outline-none cursor-pointer transition-[background,border-color] duration-150 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-[3px] [&::-webkit-slider-thumb]:bg-text [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-border2 [&::-webkit-slider-thumb]:shadow-[0_0_6px_color-mix(in_srgb,var(--color-purple)_40%,transparent)] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb:hover]:scale-[1.15] [&::-webkit-slider-thumb:hover]:bg-purple [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-[3px] [&::-moz-range-thumb]:bg-text [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-border2 [&::-moz-range-thumb]:shadow-[0_0_6px_color-mix(in_srgb,var(--color-purple)_40%,transparent)] [&::-moz-range-thumb:hover]:scale-[1.15] [&::-moz-range-thumb:hover]:bg-purple [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-[3px] [&::-moz-range-track]:bg-card2 [&::-moz-range-track]:border [&::-moz-range-track]:border-border [&::-moz-range-progress]:h-1.5 [&::-moz-range-progress]:rounded-[3px_0_0_3px] [&::-moz-range-progress]:bg-purple [&::-moz-range-progress]:shadow-[0_0_6px_color-mix(in_srgb,var(--color-purple)_40%,transparent)]"
        style={{
          background: `linear-gradient(to right, var(--color-purple) ${clamped}%, var(--color-card2) ${clamped}%)`
        }}
      />

      <div className="flex justify-between gap-1">
        {PRESETS.map((snap) => (
          <button
            key={snap}
            onClick={() => onChange(snap)}
            className={`flex-1 py-1 px-0 font-mono text-[0.65rem] font-bold text-center border rounded-sm cursor-pointer transition-all duration-100 ease-in-out ${clamped === snap ? 'text-purple border-[color-mix(in_srgb,var(--color-purple)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-purple)_8%,transparent)] shadow-[inset_0_-2px_0_0_var(--color-purple)]' : 'text-text2 border-border bg-transparent hover:text-text hover:border-border2 hover:bg-card2'}`}
          >
            {snap}%
          </button>
        ))}
      </div>

    </div>
  );
}
