'use client';

import React, { useState, useEffect } from 'react';

function useCountdown(targetTimestamp: number) {
  const [parts, setParts] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const update = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = Math.max(0, targetTimestamp - now);
      setParts({
        days:    Math.floor(diff / 86400),
        hours:   Math.floor((diff % 86400) / 3600),
        minutes: Math.floor((diff % 3600) / 60),
        seconds: diff % 60,
      });
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetTimestamp]);

  return parts;
}

const pad = (n: number) => String(n).padStart(2, '0');


export function CountdownCard({
  tradingStart,
  seasonEnd,
  isAuction,
  isBootstrap,
  isPayout,
  isVictoryPending,
  winningSide,
  progressPercent,
}: {
  tradingStart: number;
  seasonEnd: number;
  isAuction: boolean;
  isBootstrap: boolean;
  isPayout: boolean;
  isVictoryPending: boolean;
  winningSide: 'cap' | 'soc' | 'none';
  progressPercent: number;
}) {
  const showBootstrapWarning = isBootstrap && !isAuction;
  const targetTime = isAuction || isBootstrap ? tradingStart : seasonEnd;
  const { days, hours, minutes, seconds } = useCountdown(targetTime);

  const labelText = isAuction ? 'Auction Ends In' : 'Season Ends In';

  const winnerLabel = winningSide === 'cap' ? 'Bourgeoisie' : winningSide === 'soc' ? 'Proletariat' : 'Tie';
  const winnerColor = winningSide === 'cap' ? 'var(--color-blue)' : winningSide === 'soc' ? 'var(--color-pink)' : 'var(--color-text2)';  

  const factionGradientRgba = winningSide === 'cap'
    ? 'rgba(77, 159, 255, 0.07)'
    : winningSide === 'soc'
    ? 'rgba(255, 61, 138, 0.07)'
    : 'rgba(128, 128, 128, 0.07)';
  const factionTextShadow = winningSide === 'cap'
    ? '0 0 40px rgba(77, 159, 255, 0.25)'
    : winningSide === 'soc'
    ? '0 0 40px rgba(255, 61, 138, 0.25)'
    : 'none';

    const topLabelText = isPayout && progressPercent > 0 && progressPercent < 100 
    ? `Partial Winner (${Math.round(progressPercent * 10) / 10}%)` 
    : progressPercent > 0 
    ? 'Winner' 
    : 'Season concluded';


  return (
    <div
      className="card-app relative flex flex-col overflow-hidden text-center justify-between"
      style={isPayout && winnerLabel ? {
        background: `radial-gradient(400px 200px at 50% 100%, ${factionGradientRgba}, transparent 60%), linear-gradient(180deg, var(--color-card2), var(--color-card))`,
        borderColor: 'var(--color-border-bright)',
      } : {}}
    >
      {isPayout ? (
          <>
            <div className="relative section-label justify-center">
              <span className="tick" style={{ background: winnerColor }} />
              {topLabelText}
            </div>
            <p
              className="relative font-display font-extrabold leading-none tracking-[-0.04em] m-0"
              style={{
                fontSize: 'clamp(30px, 4vw, 84px)',
                color: winnerColor,
                textShadow: factionTextShadow,
              }}
            >
              {winnerLabel}
            </p>
            <div />
          </>
        
      ) : (
        <>
          <div className="section-label">
            <span className="tick" style={{ background: 'var(--color-pink)' }} />
            {labelText}
          </div>

          {showBootstrapWarning ? (
            <div className="flex flex-col gap-1">
              <p className="font-mono text-[11px] uppercase tracking-widest text-warning font-semibold m-0">
                Season On Hold
              </p>
              <p className="font-sans text-xs text-text2 leading-snug m-0">
                Trading paused during Gini verification.
              </p>
            </div>
          ) : isVictoryPending ? (
            <div className="flex flex-col gap-1">
              <p className="font-mono text-[11px] uppercase tracking-widest text-gold font-semibold m-0">
                Settlement Pending
              </p>
              <p className="font-sans text-xs text-text2 leading-snug m-0">
                Victory condition met. Preparing Payout Phase.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              <div className="cd-cell">
                <div className="cd-num">{pad(days)}</div>
                <div className="cd-unit">Days</div>
              </div>
              <div className="cd-cell">
                <div className="cd-num">{pad(hours)}</div>
                <div className="cd-unit">Hrs</div>
              </div>
              <div className="cd-cell">
                <div className="cd-num">{pad(minutes)}</div>
                <div className="cd-unit">Min</div>
              </div>
              <div className="cd-cell danger">
                <div className="cd-num">{pad(seconds)}</div>
                <div className="cd-unit">Sec</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}