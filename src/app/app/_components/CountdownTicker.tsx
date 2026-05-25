'use client';

import { useState, useEffect } from 'react';

export function CountdownTicker({ targetTimestamp }: { targetTimestamp: number }) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  if (!targetTimestamp) {
    return <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-text2">SHORTLY</span>;
  }

  const remaining = Math.max(0, targetTimestamp - now);

  if (remaining === 0) {
    return (
      <div className="inline-countdown-wrapper text-text2 border border-border px-1.5 py-0.5 rounded bg-card2">
        Season Finalized
      </div>
    );
  }

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  const isCritical = days === 0;
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className={`inline-countdown-wrapper${isCritical ? ' time-urgency-critical' : ''}`}>
      <span className="time-segment-ticker">
        {pad(days)}<span className="text-[8px] text-text2 font-normal ml-0.5">d</span>
      </span>
      <span className="ticker-colon text-text2">:</span>
      <span className="time-segment-ticker">
        {pad(hours)}<span className="text-[8px] text-text2 font-normal ml-0.5">h</span>
      </span>
      <span className="ticker-colon text-text2">:</span>
      <span className="time-segment-ticker">
        {pad(minutes)}<span className="text-[8px] text-text2 font-normal ml-0.5">m</span>
      </span>
      {isCritical && (
        <>
          <span className="ticker-colon text-text2">:</span>
          <span className="time-segment-ticker">
            {pad(seconds)}<span className="text-[8px] text-text2 font-normal ml-0.5">s</span>
          </span>
        </>
      )}
    </div>
  );
}
