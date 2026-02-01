// SeasonDetails.tsx (Updated with Season Start and Base Multiplier)
import React from 'react';

// Props Interface - UPDATED
interface SeasonDetailsProps {
    tradingStart: number; // Unix timestamp
    seasonEnd: number; // Unix timestamp
    M_dynamic: number; // Current Multiplier (M)
    config: {
        createdAt: number; // ADDED: Season Start Time
        victoryThresholdBps: number;
        baseBeta: number; // ADDED: Base Multiplier (Beta)
        buybackBps: number;
        liquidityBps: number;
        reinvestBps: number;
        daoBps: number;
    } | null;
}

// ============================================================================
// HELPER: FORMAT DATE
// ============================================================================
const formatDate = (ts: number) => ts ? new Date(ts * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' }) : "TBD";


// ============================================================================
// SeasonDetails Component
// ============================================================================
export function SeasonDetails({
    tradingStart,
    seasonEnd,
    M_dynamic,
    config
}: SeasonDetailsProps) {

    // Logic for economicItems
    const economicItems = config ? [
        { label: "Buyback", value: config.buybackBps },
        { label: "Liquidity", value: config.liquidityBps },
        { label: "Reinvestment", value: config.reinvestBps },
        { label: "DAO Treasury", value: config.daoBps },
    ].filter(item => item.value > 0) : [];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
            
            {/* Card 1: Schedule - UPDATED */}
            <div className="card-app">
                <h3 className="h3-app cardline-app">Schedule</h3>
                <div className="flex justify-between text-xs">
                    <span className="text-text2">Season Start</span> 
                    {/* Using config.createdAt for the absolute start of the season */}
                    <span className="font-bold text-text">{formatDate(config?.createdAt || 0)}</span>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-text2">Trading Start</span>
                    <span className="font-bold text-text">{formatDate(tradingStart)}</span>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-text2">Season End</span>
                    <span className="font-bold text-text">{formatDate(seasonEnd)}</span>
                </div>
            </div>
            
            {/* Card 2: Policy - UPDATED */}
            <div className="bg-card rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="h3-app border-b border-border/50 pb-2">Policy</h3>
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-text2">Current Multiplier (M)</span>
                        <span className="text-sm font-bold text-text">
                            {M_dynamic.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}x
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-text2">Base Multiplier (Beta)</span> 
                        <span className="text-sm font-bold text-text">
                             {/* Converting BPS (10000) to X factor (1) */}
                            {((config?.baseBeta || 0) / 10000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}x
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-text2">Victory Threshold</span>
                        <span className="text-sm font-bold text-text">{((config?.victoryThresholdBps || 0) / 100).toFixed(0)}%</span>
                    </div>
                </div>
            </div>
            
            {/* Card 3: Lending Distribution (Remains the same) */}
            <div className="bg-card rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="h3-app border-b border-border/50 pb-2">Lending Distribution</h3>
                <div className="space-y-3">
                    {economicItems.length > 0 ? (
                        economicItems.map((item) => (
                            <div key={item.label} className="flex justify-between items-center">
                                <span className="text-xs text-text2">{item.label}</span>
                                <span className="text-sm font-bold text-text">{(item.value / 100)}%</span>
                            </div>
                        ))
                    ) : (
                        <span className="text-xs text-text2 block text-center pt-2">No active distribution.</span>
                    )}
                </div>
            </div>
        </div>
    );
}