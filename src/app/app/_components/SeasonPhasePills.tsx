
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
  // Hold states that now last hours-to-weeks: on-chain settlement crank, then the
  // two-stage sybil review (ADR-0008). Red = "nothing tradeable, wait it out",
  // matching the existing On Hold treatment.
  const isSettling = phase === 'SETTLING' || phase === 'CALCULATING';
  const isTriage = phase === 'TRIAGE';
  const isInvestigation = phase === 'INVESTIGATION';
  const isOnHold = isBootstrap || (isVictoryPending && isTrading);

  // Solid pill: the per-phase accent fills the background (see `.pill-solid` in
  // globals.css for the shared shape + typography); the accent is set per-phase.
  const pill = 'pill-solid';
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

  if (isSettling || isTriage || isInvestigation) {
    const label = isSettling ? 'Settling' : isTriage ? 'Triage' : 'Under Review';
    return (
      <div className={className}>
        <span className={pill} style={pillStyle('var(--color-red)')}>
          {label}
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
