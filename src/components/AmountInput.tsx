'use client';

import { useButtonHold } from '@/hooks/useButtonHold';
import { clampDecimals } from '@/utils/clampDecimals';
import PercentSlider from '../app/app/_components/PercentSlider';

export default function AmountInput({
  label,
  value,
  onChange,
  sliderValue,
  onSliderChange,
  balance,
  balanceLabel = 'WALLET',
  disabled,
  placeholder = '0.00',
  decimals = 18,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  sliderValue: number;
  onSliderChange: (pct: number) => void;
  balance?: string;
  // Caption before the balance figure. Defaults to WALLET; callers whose max is
  // constrained by something other than the wallet (e.g. staked-RGD headroom)
  // pass an alternative like "ELIGIBLE BY STAKE".
  balanceLabel?: string;
  disabled?: boolean;
  placeholder?: string;
  // Max fractional digits allowed, matching the token's on-chain precision
  // (USDC 6, FIM/RGD 18). Inputs are truncated to this on change.
  decimals?: number;
  max?: number;
}) {
  const handleChange = (next: string) => {
    const clamped = clampDecimals(next, decimals);
    if (max !== undefined && parseFloat(clamped) > max) {
      onChange(String(max));
    } else {
      onChange(clamped);
    }
  };

  // ▲/▼ step amount by ±1, clamped at 0; multiplier accelerates a sustained hold
  const { bind } = useButtonHold((mult, dir: 1 | -1) => {
    const next = Math.max(0, parseFloat(value || '0') + dir * mult);
    handleChange(String(max !== undefined ? Math.min(next, max) : next));
  });

  return (
    <div className="pt-5 flex flex-col gap-1 shrink-0">
      <div className="flex justify-between items-center w-full">
        <span className="mask-label text-left pl-2">
          {balance ? (
            <>{balanceLabel}&nbsp;<span className="text-text font-semibold">{balance}</span></>
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
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 min-w-0 bg-transparent text-input font-mono text-text outline-none placeholder:text-text2/40 tabular-nums no-spinners text-right"
        />
        <div className="flex flex-col gap-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            tabIndex={-1}
            className="btn-stepper select-none"
            disabled={disabled}
            {...bind(1)}
          >
            ▲
          </button>
          <button
            type="button"
            tabIndex={-1}
            className="btn-stepper select-none"
            disabled={disabled}
            {...bind(-1)}
          >
            ▼
          </button>
        </div>
      </div>

      <PercentSlider value={sliderValue} onChange={onSliderChange} disabled={disabled} />
    </div>
  );
}