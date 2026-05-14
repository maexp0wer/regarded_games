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

  // Unified centered label text
  const labelText = isPayout
    ? progressPercent > 0 && progressPercent < 100
      ? `Partial Winner (${Math.round(progressPercent * 10) / 10}%)`
      : progressPercent > 0
      ? 'Winner'
      : 'Season concluded'
    : isAuction
    ? 'Auction Ends In'
    : isBootstrap || isVictoryPending
    ? 'On Hold'
    : 'Season Ends In';

  const winnerLabel = winningSide === 'cap' ? 'Bourgeoisie' : winningSide === 'soc' ? 'Proletariat' : 'Tie';
  const winnerColor = winningSide === 'cap' ? 'var(--color-blue)' : winningSide === 'soc' ? 'var(--color-pink)' : 'var(--color-text2)';

  const factionBgClass = winningSide === 'cap' ? 'faction-bg-cap' : winningSide === 'soc' ? 'faction-bg-soc' : 'faction-bg-none';
  const factionTextShadow = winningSide === 'cap'
    ? '0 0 40px var(--color-blue-a25)'
    : winningSide === 'soc'
    ? '0 0 40px var(--color-pink-a25)'
    : 'none';

  // Apply payout faction background OR default to proletarian background (faction-bg-soc) for pending/bootstrap 
  const activeBgClass = isPayout && winnerLabel
    ? factionBgClass
    : (showBootstrapWarning || isVictoryPending)
    ? 'faction-bg-soc'
    : '';

  const tickColor = isPayout ? winnerColor : 'var(--color-pink)';

  return (
    <div
      className={`card-app relative flex flex-col overflow-hidden text-center justify-between ${activeBgClass}`}
      style={isPayout && winnerLabel ? { borderColor: 'var(--color-border-bright)' } : {}}
    >
      {/* Universally centered label text */}
      <div className="relative section-label justify-center">
        <span className="tick" style={{ background: tickColor }} />
        {labelText}
      </div>

      {isPayout ? (
        <>
          <p
            className="relative font-display font-extrabold leading-none tracking-[-0.04em] m-0 text-display-prize"
            style={{
              color: winnerColor,
              textShadow: factionTextShadow,
            }}
          >
            {winnerLabel}
          </p>
          <div /> {/* Empty div used to maintain exact middle vertical centering via justify-between */}
        </>
      ) : showBootstrapWarning ? (
        <div className="flex flex-col items-center justify-center h-full gap-1">
          <p
            className="font-display font-extrabold m-0 text-display-counter"
            style={{
              color: 'var(--color-pink)',
              lineHeight: '1',
              textShadow: '0 0 40px var(--color-pink-a25)',
            }}
          >
            Bootstrapping
          </p>
          <p className="font-sans text-xs text-text2 leading-snug m-0">
            Trading paused during Gini calculation.
          </p>
        </div>
      ) : isVictoryPending ? (
        <div className="flex flex-col items-center justify-center h-full gap-1">
          <p
            className="font-display font-extrabold m-0 text-display-counter"
            style={{
              color: 'var(--color-pink)',
              lineHeight: '1',
              textShadow: '0 0 40px var(--color-pink-a25)',
            }}
          >
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
    </div>
  );
}