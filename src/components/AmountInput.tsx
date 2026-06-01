'use client';

import PercentSlider from './PercentSlider';

export default function AmountInput({
  label,
  value,
  onChange,
  sliderValue,
  onSliderChange,
  balance,
  disabled,
  placeholder = '0.00',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  sliderValue: number;
  onSliderChange: (pct: number) => void;
  balance?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="rounded-lg overflow-hidden bg-bg border border-border">
      <div className="flex flex-col px-4 pt-4 pb-2 gap-2">
        {balance && (
          <span className="font-mono text-[10px] text-text2 text-right">Bal: {balance}</span>
        )}
        <div className="group flex items-center gap-2">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 min-w-0 bg-bg border-none p-0 font-mono font-bold text-text outline-none focus:ring-0 text-input no-spinners"
          />
          <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="btn-stepper" disabled={disabled} onClick={() => onChange(String(Math.max(0, parseFloat(value || '0') + 1)))}>▲</button>
            <button className="btn-stepper" disabled={disabled} onClick={() => onChange(String(Math.max(0, parseFloat(value || '0') - 1)))}>▼</button>
          </div>
          <span className="text-input font-mono font-bold text-text2 shrink-0">{label}</span>
        </div>
        <PercentSlider value={sliderValue} onChange={onSliderChange} disabled={disabled} />
      </div>
    </div>
  );
}
