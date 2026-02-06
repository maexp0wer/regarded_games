// components/SeasonDetails.tsx
"use client";

import React from 'react';
import { formatUnits } from 'viem';
import { useYieldTotals } from '@/hooks/useYieldTotals';

interface SeasonDetailsProps {
    tradingStart: number;
    seasonEnd: number;
    M_dynamic: number;
    config: {
        createdAt: number;
        victoryThresholdBps: number;
        baseBeta: number;
        buybackBps: number;
        liquidityBps: number;
        reinvestBps: number;
        daoBps: number;
    } | null;
    seasonAddress: string;
}

// ============================================================================
// HELPERS
// ============================================================================

const formatDate = (ts: number) => 
    ts ? new Date(ts * 1000).toLocaleDateString(undefined, { 
        month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' 
    }) : "TBD";

const formatUSDC = (val: string) => {
    try {
        const amt = BigInt(val || "0");
        return parseFloat(formatUnits(amt, 6)).toLocaleString(undefined, { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        });
    } catch {
        return "0.00";
    }
};

// ============================================================================
// COMPONENT
// ============================================================================

export function SeasonDetails({
    tradingStart,
    seasonEnd,
    M_dynamic,
    config,
    seasonAddress
}: SeasonDetailsProps) {

    // Fetch yield data (defaults to "0" if loading or empty)
    const { data: yieldTotals } = useYieldTotals(seasonAddress);

    // Filter out items that have 0% allocation in the config
    const economicItems = config ? [
        { label: "Buyback", value: config.buybackBps, amt: yieldTotals.buyback },
        { label: "Liquidity", value: config.liquidityBps, amt: yieldTotals.liquidity },
        { label: "Prize Pool Bonus", value: config.reinvestBps, amt: yieldTotals.reinvest },
        { label: "DAO Treasury", value: config.daoBps, amt: yieldTotals.dao },
    ].filter(item => item.value > 0) : [];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
            
            {/* Card 1: Schedule */}
            <div className="bg-card rounded-2xl p-6 shadow-sm space-y-3">
                <h3 className="h3-app cardline-app">Schedule</h3>
                <div className="flex justify-between">
                    <span className="text-text2 text-xs">Season Start</span> 
                    <span className="font-bold text-text text-sm">{formatDate(config?.createdAt || 0)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-text2 text-xs">Trading Start</span>
                    <span className="font-bold text-text text-sm">{formatDate(tradingStart)}</span>
                </div>
                <div className="flex justify-between ">
                    <span className="text-text2 text-xs">Season End</span>
                    <span className="font-bold text-text text-sm">{formatDate(seasonEnd)}</span>
                </div>
            </div>
            
            {/* Card 2: Policy */}
            <div className="bg-card rounded-2xl p-6 shadow-sm space-y-3">
                <h3 className="h3-app cardline-app">Policy</h3>
                
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-text2">Current Multiplier (M)</span>
                        <span className="text-sm font-bold text-text">{M_dynamic.toFixed(3)}x</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-text2">Base Multiplier (Beta)</span> 
                        <span className="text-sm font-bold text-text">
                            {((config?.baseBeta || 0) / 10000).toFixed(2)}x
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-text2">Victory Threshold</span>
                        <span className="text-sm font-bold text-text">{((config?.victoryThresholdBps || 0) / 100).toFixed(0)}%</span>
                    </div>
                
            </div>
            
            {/* Card 3: Lending Distribution (Logic Updated) */}
            <div className="bg-card rounded-2xl p-6 shadow-sm space-y-3">
                <h3 className="h3-app cardline-app">Lending Distribution</h3>
                
                    {economicItems.map((item) => {
                        // Logic: Does this specific item have a dollar amount > 0?
                        const rawAmount = BigInt(item.amt || "0");
                        const hasAmount = rawAmount > 0n;
                        const percentage = item.value / 100;

                        return (
                            <div key={item.label} className="flex justify-between items-center">
                                {/* Label (Left) */}
                                <span className="text-xs text-text2">{item.label}</span>
                                
                                {/* Value (Right) */}
                                <div className="text-right">
                                    {hasAmount ? (
                                        // Case A: We have money -> "$100 (10%)"
                                        <div className="flex items-baseline justify-end gap-1">
                                            <span className="text-sm font-bold text-text">
                                                ${formatUSDC(item.amt)}
                                            </span>
                                            <span className="text-xs text-text2">
                                                ({percentage}%)
                                            </span>
                                        </div>
                                    ) : (
                                        // Case B: No money yet -> "10%"
                                        <span className="text-sm font-bold text-text">
                                            {percentage}%
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    
                    {economicItems.length === 0 && (
                        <span className="text-xs text-text2 block text-center pt-2">No active distribution.</span>
                    )}
                
            </div>
        </div>
    );
}