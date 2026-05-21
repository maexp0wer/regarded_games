
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
  const isPayout = phase === 'PAYOUT' || phase === 'ENDED';
  const isAuction = phase === 'AUCTION';

  const phaseLabel = (isBootstrap || isVictoryPending)
    ? 'On Hold'
    : isPayout
      ? 'Payout'
      : phase.charAt(0) + phase.slice(1).toLowerCase();

  const subPhaseLabel = isBootstrap
    ? 'Bootstrap'
    : isVictoryPending
      ? 'Settlement'
      : null;

  const phaseColor = (isBootstrap || isVictoryPending)
    ? 'var(--color-purple)'
    : isAuction
      ? 'var(--color-gold)'
      : isPayout
        ? 'var(--color-gold)'
        : 'var(--color-green)';

  const pillClass = (isBootstrap || isVictoryPending)
    ? 'pill-phase-soc'
    : isAuction
      ? 'pill-phase-gold'
      : isPayout
        ? 'pill-phase-cap'
        : 'pill-phase-green';

  const phaseDotGlow = `0 0 8px ${phaseColor}`;

  return (
    <div className={className}>
      <div className={`pill border ${pillClass}`}>
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: phaseColor, boxShadow: phaseDotGlow }}
        />
        {phaseLabel}
      </div>

      {subPhaseLabel && (
        <div
          className="pill border pill-phase-gold"
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0 bg-gold"
            style={{ boxShadow: '0 0 8px var(--color-gold)' }}
          />
          {subPhaseLabel}
        </div>
      )}
    </div>
  );
}
