import React from 'react';

interface LedgerLoaderProps {
  /**
   * `card` (default) — a flat `terminal-pane` card, max-width, centered on the
   * page. Use for standalone page/panel loading states.
   * `inline` — just the pulsating "Reading Ledger…" text, no card. Use inside a
   * widget that already supplies its own frame (chart, table, chat stream).
   */
  variant?: 'card' | 'inline';
  /**
   * `card` variant only: fill the vertical viewport and center the card in it
   * (full-page loads). Otherwise the card centers horizontally in its container.
   */
  fullPage?: boolean;
  /** Extra classes for the outer wrapper. */
  className?: string;
}

const LEDGER_TEXT = 'font-mono text-xs uppercase text-text2 tracking-widest';

/**
 * Canonical "Reading Ledger…" loading state — the single treatment every loading
 * state across the app should use, so they all read identically.
 */
export default function LedgerLoader({
  variant = 'card',
  fullPage = false,
  className = '',
}: LedgerLoaderProps) {
  if (variant === 'inline') {
    return (
      <span className={`${LEDGER_TEXT} animate-pulse${className ? ` ${className}` : ''}`}>
        Reading Ledger…
      </span>
    );
  }

  return (
    <div
      className={`flex w-full justify-center px-4${
        fullPage ? ' min-h-[60vh] items-center' : ' py-8'
      }${className ? ` ${className}` : ''}`}
    >
      <div className="terminal-pane w-full max-w-sm py-12 text-center animate-pulse">
        <span className={LEDGER_TEXT}>Reading Ledger…</span>
      </div>
    </div>
  );
}
