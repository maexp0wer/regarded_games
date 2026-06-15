
export function SeasonPhasePills({
  phase,
  isVictoryPending,
  className
}: {
  phase: string;
  isVictoryPending: boolean;
  className?: string;
}) {
  const isBootstrap = phase === 'BOOTSTRAP';
  const isPayout = phase === 'PAYOUT' || phase === 'DISTRIBUTION';
  const isAuction = phase === 'AUCTION';
  const isTrading = phase === 'TRADING';
  const isOnHold = isBootstrap || isVictoryPending;

  // Solid pill: the per-phase accent fills the background, text drops to the
  // page canvas color so it reads against the saturated fill.
  const pill = 'font-mono text-[10px] px-2 py-0.5 rounded text-[var(--color-bg)] uppercase tracking-wider font-bold';
  const pillStyle = (accent: string) => ({
    backgroundColor: accent,
  } as const);

  if (isOnHold) {
    const reason = isBootstrap ? 'Bootstrapping' : 'Settlement';
    return (
      <div className={className}>
        <span className={pill} style={pillStyle('var(--color-red)')}>
          On Hold: {reason}
        </span>
      </div>
    );
  }

  if (isPayout) {
    return (
      <div className={className}>
        <span className={pill} style={pillStyle('var(--color-purple)')}>
          Payout
        </span>
      </div>
    );
  }

  if (isAuction) {
    return (
      <div className={className}>
        <span className={pill} style={pillStyle('var(--color-gold)')}>
          Auction
        </span>
      </div>
    );
  }

  if (isTrading) {
    return (
      <div className={className}>
        <span className={pill} style={pillStyle('var(--color-green)')}>
          LIVE
        </span>
      </div>
    );
  }

  // Fallback for unknown phases
  const label = phase.charAt(0) + phase.slice(1).toLowerCase();
  return (
    <div className={className}>
      <span className={pill} style={pillStyle('var(--color-text2)')}>
        {label}
      </span>
    </div>
  );
}
