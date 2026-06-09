'use client';

import PercentSlider from '../app/app/_components/PercentSlider';

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
    <div className="pt-5 flex flex-col gap-1 shrink-0">
      <div className="flex justify-between items-center w-full">
        <span className="mask-label text-left pl-2">
          {balance ? (
            <>WALLET&nbsp;<span className="text-text font-semibold">{balance}</span></>
          ) : (
            <>&nbsp;</>
          )}
        </span>
        <span className="mask-label text-right pr-9">SIZE</span>
      </div>

      <div className="group flex items-center gap-2 bg-card3 border border-border2 rounded p-2">
        <span className="text-lg font-mono font-bold text-text2 shrink-0">{label}</span>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 min-w-0 bg-transparent text-input font-mono text-text outline-none placeholder:text-text2/40 tabular-nums no-spinners text-right"
        />
        <div className="flex flex-col gap-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            className="btn-stepper" 
            disabled={disabled} 
            onClick={() => onChange(String(Math.max(0, parseFloat(value || '0') + 1)))}
          >
            ▲
          </button>
          <button 
            className="btn-stepper" 
            disabled={disabled} 
            onClick={() => onChange(String(Math.max(0, parseFloat(value || '0') - 1)))}
          >
            ▼
          </button>
        </div>
      </div>

      <PercentSlider value={sliderValue} onChange={onSliderChange} disabled={disabled} />
    </div>
  );
}