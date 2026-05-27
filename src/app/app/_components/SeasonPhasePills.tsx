
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
  const isPayout = phase === 'PAYOUT' || phase === 'ENDED' || phase === 'DISTRIBUTION';
  const isAuction = phase === 'AUCTION';
  const isTrading = phase === 'TRADING';
  const isOnHold = isBootstrap || isVictoryPending;
  const isActive = (isTrading || isAuction) && !isOnHold;

  const phaseLabel = isOnHold
    ? 'On Hold'
    : isPayout
      ? 'Payout'
      : phase.charAt(0) + phase.slice(1).toLowerCase();

  const pillVariant = isPayout
    ? 'phase-completed'
    : isOnHold
    ? 'phase-on-hold'
    : isAuction
    ? 'phase-auction'
    : 'phase-active';

  const subPhaseLabel = isBootstrap ? 'Bootstrap' : isVictoryPending ? 'Settlement' : null;

  return (
    <div className={className}>
      <span className={`phase-pill ${pillVariant}`}>
        {!isOnHold && !isPayout && (
          <span className={`h-1.5 w-1.5 rounded-full animate-pulse shrink-0 ${isAuction ? 'bg-gold' : 'bg-green'}`} />
        )}
        {phaseLabel}
      </span>
      {subPhaseLabel && (
        <span className="phase-pill phase-on-hold">
          {subPhaseLabel}
        </span>
      )}
    </div>
  );
}
