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
    <div className={`terminal-slider-container select-none ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>

      <input
        type="range"
        min={0}
        max={100}
        step={0.01}
        value={clamped}
        onChange={(e) => onChange(Number(e.target.value))}
        className="terminal-range-slider"
        style={{
          background: `linear-gradient(to right, var(--color-purple) ${clamped}%, var(--color-card2) ${clamped}%)`
        }}
      />

      <div className="terminal-pct-rail">
        {PRESETS.map((snap) => (
          <button
            key={snap}
            onClick={() => onChange(snap)}
            className={`btn-terminal-pct ${clamped === snap ? 'active' : ''}`}
          >
            {snap}%
          </button>
        ))}
      </div>

    </div>
  );
}
