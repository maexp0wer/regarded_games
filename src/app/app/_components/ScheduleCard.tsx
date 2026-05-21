'use client';

import React from 'react';

const formatDate = (ts: number) =>
  ts
    ? new Date(ts * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'TBD';

interface ScheduleCardProps {
  tradingStart: number;
  seasonEnd: number;
  config: { auctionStartTime: number } | null;
}

export function ScheduleCard({ tradingStart, seasonEnd, config }: ScheduleCardProps) {
  return (
    <div className="card-app flex flex-col gap-3 h-full border-border2">
      <p className="section-label pb-2">Schedule</p>
      {[
        { label: 'Season Start',  value: formatDate(config?.auctionStartTime || 0) },
        { label: 'Trading Start', value: formatDate(tradingStart) },
        { label: 'Season End',    value: formatDate(seasonEnd) },
      ].map(({ label, value }) => (
        <div key={label} className="kv-row">
          <span className="font-mono text-[11px] text-text2">{label}</span>
          <span className="font-mono text-[12px] font-semibold text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}
