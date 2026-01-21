'use client';

export function SeasonManifest({ config }: { config: any }) {
  const formatBps = (bps: number) => (bps / 100).toFixed(0) + '%';
  
  // Format Beta: 14000 -> 1,4 (using German/European comma if preferred, or point)
  const multiplier = (config.baseBeta / 10000).toLocaleString(undefined, { 
    minimumFractionDigits: 1, 
    maximumFractionDigits: 1 
  });

  const policyItems = [
    { label: "Buyback", value: config.buybackBps },
    { label: "Reinvest", value: config.reinvestBps },
    { label: "Liquidity", value: config.liquidityBps },
    { label: "DAO Treasury", value: config.daoBps },
  ].filter(item => item.value > 0); // Logic: Don't show 0s

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="p-6 rounded-xl border border-border bg-card">
        <h3 className="text-xs font-bold uppercase text-text2 mb-4">Treasury Policy</h3>
        <div className="space-y-3">
          {policyItems.map(item => (
            <div key={item.label} className="flex justify-between items-center border-b border-border/50 pb-2">
              <span className="text-sm text-text2">{item.label} Percentage</span>
              <span className="text-lg font-bold text-text">{formatBps(item.value)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 rounded-xl border border-border bg-card">
        <h3 className="text-xs font-bold uppercase text-text2 mb-4">Game Parameters</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-text2">Compensation Multiplier</span>
            <span className="text-xl font-bold text-primary">{multiplier}x</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-text2">Victory Threshold</span>
            <span className="text-xl font-bold text-text">+{config.victoryThresholdBps} BPS</span>
          </div>
        </div>
      </div>
    </div>
  );
}