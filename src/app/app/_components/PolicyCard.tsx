'use client';

import React from 'react';

interface PolicyCardProps {
  M_dynamic: number;
  config: {
    baseBeta: number;
    victoryThresholdBps: number;
  } | null;
}

export function PolicyCard({ M_dynamic, config }: PolicyCardProps) {
  return (
    <div className="terminal-pane h-full">
      <div className="terminal-pane-header">
        <span className="terminal-pane-title">Policy</span>
      </div>
      <div className="flex flex-col gap-3">
        <div className="kv-row">
          <span className="font-mono text-[11px] text-text2">Current Multiplier (M)</span>
          <span className="font-mono text-[13px] font-bold" style={{ color: 'var(--color-gold)', fontVariantNumeric: 'tabular-nums' }}>
            {M_dynamic.toFixed(3)}×
          </span>
        </div>
        <div className="kv-row">
          <span className="font-mono text-[11px] text-text2">Base Multiplier (Beta)</span>
          <span className="font-mono text-[12px] font-semibold text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {((config?.baseBeta || 0) / 10000).toFixed(2)}×
          </span>
        </div>
        <div className="kv-row">
          <span className="font-mono text-[11px] text-text2">Victory Threshold</span>
          <span className="font-mono text-[12px] font-semibold text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {((config?.victoryThresholdBps || 0) / 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}
