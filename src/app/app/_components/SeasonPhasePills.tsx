
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

  // Calculate Labels
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

  // Calculate Colors
  const phaseColor = (isBootstrap || isVictoryPending)
    ? 'var(--color-pink)'
    : isAuction
      ? 'var(--color-gold)'
      : isPayout
        ? 'var(--color-blue)'
        : 'var(--color-green)';

  const pillClass = (isBootstrap || isVictoryPending)
    ? 'pill-phase-pink'
    : isAuction
      ? 'pill-phase-gold'
      : isPayout
        ? 'pill-phase-blue'
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
          className="pill border"
          style={{
            color: 'var(--color-gold)',
            borderColor: 'var(--color-gold-a30)',
            background: 'var(--color-gold-a08)',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: 'var(--color-gold)', boxShadow: '0 0 8px var(--color-gold)' }}
          />
          {subPhaseLabel}
        </div>
      )}
    </div>
  );
}