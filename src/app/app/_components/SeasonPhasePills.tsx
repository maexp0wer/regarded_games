
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

  if (isOnHold) {
    const reason = isBootstrap ? 'Bootstrapping' : 'Settlement';
    return (
      <div className={className}>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--color-red-35)] bg-[var(--color-red-15)] font-mono text-[11px] font-semibold text-red tracking-[0.08em] uppercase shadow-sm">
          <span className="w-1.5 h-1.5 bg-red shadow-[0_0_8px_var(--color-red-35)] shrink-0" />
          On Hold: {reason}
        </span>
      </div>
    );
  }

  if (isPayout) {
    return (
      <div className={className}>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--color-purple)] bg-[var(--color-purple-15)] font-mono text-[11px] font-semibold text-purple tracking-[0.08em] uppercase shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-purple shadow-[0_0_8px_var(--color-purple)] shrink-0" />
          Payout
        </span>
      </div>
    );
  }

  if (isAuction) {
    return (
      <div className={className}>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--color-gold-35)] bg-[var(--color-gold-15)] font-mono text-[11px] font-semibold text-gold tracking-[0.08em] uppercase shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-gold shadow-[0_0_8px_var(--color-gold-35)] shrink-0" />
          Auction
        </span>
      </div>
    );
  }

  if (isTrading) {
    return (
      <div className={className}>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--color-green-35)] bg-[var(--color-green-15)] font-mono text-[11px] font-semibold text-green tracking-[0.08em] uppercase shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-green shadow-[0_0_8px_var(--color-green-35)] animate-pulse shrink-0" />
          Trading
        </span>
      </div>
    );
  }

  // Fallback for unknown phases
  const label = phase.charAt(0) + phase.slice(1).toLowerCase();
  return (
    <div className={className}>
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--color-border2)] bg-[var(--color-card2)] font-mono text-[11px] font-semibold text-[var(--color-text-muted)] tracking-[0.08em] uppercase shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)] shrink-0" />
        {label}
      </span>
    </div>
  );
}
