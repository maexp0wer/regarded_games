'use client';

import { useState, useEffect } from 'react';

export function CountdownTicker({
  targetTimestamp,
  label = 'Trading Ends',
  large = false,
  alwaysShowSeconds = false,
  transparent = false,
}: {
  targetTimestamp: number;
  label?: string;
  large?: boolean;
  alwaysShowSeconds?: boolean;
  transparent?: boolean;
}) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const pad = (n: number) => String(n).padStart(2, '0');

  if (!targetTimestamp) {
    return (
      <div className="terminal-countdown-wrapper">
        <div className="terminal-countdown-label">{label}</div>
        <div className="terminal-countdown-track">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-text2">SHORTLY</span>
        </div>
      </div>
    );
  }

  const remaining = Math.max(0, targetTimestamp - now);

  if (remaining === 0) {
    return (
      <div className="terminal-countdown-wrapper">
        <div className="terminal-countdown-label">{label}</div>
        <div className="terminal-countdown-track">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-text2">FINALIZED</span>
        </div>
      </div>
    );
  }

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  const isCritical = days === 0;
  const showSeconds = isCritical || alwaysShowSeconds;

  const valStyle  = large ? { fontSize: '1.125rem', lineHeight: 1 } : {};
  const unitStyle = large ? { fontSize: '0.75rem' }                 : {};
  const sepStyle  = large ? { fontSize: '1.125rem' }                : {};
  const boxStyle  = transparent ? { background: 'transparent', border: 'none', boxShadow: 'none' } : {};

  return (
    <div className="terminal-countdown-wrapper">
      <div className="terminal-countdown-label">{label}</div>
      <div className="terminal-countdown-track">
        <div className="terminal-countdown-box" style={boxStyle}>
          <span className="tcb-val" style={valStyle}>{pad(days)}</span>
          <span className="tcb-unit" style={unitStyle}>D</span>
        </div>
        <div className="terminal-countdown-sep" style={{ ...sepStyle, animationDelay: '0s' }}>:</div>
        <div className="terminal-countdown-box" style={boxStyle}>
          <span className="tcb-val" style={valStyle}>{pad(hours)}</span>
          <span className="tcb-unit" style={unitStyle}>H</span>
        </div>
        <div className="terminal-countdown-sep" style={{ ...sepStyle, animationDelay: '0.04s' }}>:</div>
        <div className="terminal-countdown-box" style={boxStyle}>
          <span className="tcb-val" style={valStyle}>{pad(minutes)}</span>
          <span className="tcb-unit" style={unitStyle}>M</span>
        </div>
        {showSeconds && (
          <>
            <div className="terminal-countdown-sep" style={{ ...sepStyle, animationDelay: '0.08s' }}>:</div>
            <div className="terminal-countdown-box" style={boxStyle}>
              <span className="tcb-val" style={valStyle}>{pad(seconds)}</span>
              <span className="tcb-unit" style={unitStyle}>S</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
