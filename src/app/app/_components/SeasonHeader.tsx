// SeasonHeader.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { formatUnits } from 'viem';
import { useYieldTotals } from '@/hooks/useYieldTotals';

// ============================================================================
// 1. HELPER: COUNTDOWN HOOK
// ============================================================================
function useCountdown(targetTimestamp: number) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const update = () => {
      const now = Math.floor(Date.now() / 1000);
      if (!targetTimestamp || targetTimestamp <= now) {
        setTimeLeft("Finished");
        return;
      }
      const diff = targetTimestamp - now;
      const d = Math.floor(diff / 86400);
      const h = Math.floor((diff % 86400) / 3600);
      const m = Math.floor((diff % 3600) / 60);
      setTimeLeft(`${d}d ${h}h ${m}m`);
    };
    update();
    const id = setInterval(update, 60000); // Update every minute
    return () => clearInterval(id);
  }, [targetTimestamp]);

  return timeLeft;
}

// Props Interface
interface SeasonHeaderProps {
    seasonAddress: string;
    seasonName: string;
    prizePool: number;
    playerCount: number;
    currentPhase: string | null;
    isBootstrap: boolean;
    isPayout: boolean;
    isVictoryPending: boolean;
    tradingStart: number; // Unix timestamp
    seasonEnd: number; // Unix timestamp
}

// ============================================================================
// SeasonHeader Component
// ============================================================================
export function SeasonHeader({ 
    seasonAddress,
    seasonName, 
    prizePool, 
    playerCount, 
    currentPhase, 
    isBootstrap, 
    isPayout, 
    isVictoryPending, 
    tradingStart, 
    seasonEnd
}: SeasonHeaderProps) {
    
    const isAuction = currentPhase === "AUCTION";
    
    // FIX: logic to ignore isBootstrap visuals if we are in Auction mode
    const showBootstrapWarning = isBootstrap && !isAuction;

    // Determine target time: If Auction or Bootstrap, count to trading start. Else season end.
    const targetTime = (isAuction || isBootstrap) ? tradingStart : seasonEnd;
    const countdownText = useCountdown(targetTime);


    const { data: yieldTotals } = useYieldTotals(seasonAddress);

    // 2. Process Reinvestment Amount
    const rawReinvest = BigInt(yieldTotals?.reinvest || "0");
    const hasYield = isPayout && rawReinvest > 0n;

    // 3. Format the Reinvest amount (USDC 6 decimals)
    // We parse it to a float just for the locale string formatting
    const reinvestFormatted = parseFloat(formatUnits(rawReinvest, 6))
        .toLocaleString(undefined, { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        });

    return (
        <>
            {/* 1. HEADER */}
            <div className="lg:col-span-2 bg-card rounded-2xl p-4 md:p-6 shadow-sm flex flex-row justify-between items-center gap-2 h-full">
                <div className="flex flex-col items-start gap-1 md:gap-2">
                    <h1 className="text-lg md:text-3xl font-bold font-display uppercase tracking-tight text-text text-left">
                        {seasonName}
                    </h1>
                    <div className="flex items-center gap-1.5 px-2 md:px-3 py-0.5 md:py-1 bg-card2 rounded-full">
                        {/* FIX: Check showBootstrapWarning instead of isBootstrap */}
                        <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${showBootstrapWarning ? 'bg-danger' : isPayout ? 'bg-info' : 'bg-success'} animate-pulse`} />
                        <span className={`text-[9px] md:text-xs font-black ${showBootstrapWarning ? 'text-danger' : isPayout ? 'text-info' : 'text-success'} tracking-widest uppercase`}>
                            {currentPhase || "UNKNOWN"}
                        </span>
                    </div>
                </div>

                 <div className="flex flex-col items-center">
            
            {/* Dynamic Header */}
            <span className="h3-app mb-0.5 md:mb-1">
                {hasYield ? "Total Prize Pool + Yield Bonus" : "Total Prize Pool"}
            </span>
            
            {/* Value Row */}
            <div className="flex flex-wrap justify-center items-center gap-x-2 font-black leading-none">
                
                {/* Standard Prize Pool (Primary Color) */}
                <span className="text-primary text-lg md:text-3xl">
                    ${prizePool.toLocaleString(undefined, { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                    })}
                </span>

                {/* Reinvestment Bonus (Success Color) */}
                {hasYield && (
                    <span className="text-success whitespace-nowrap text-sm md:text-xl">
                        +${reinvestFormatted}
                    </span>
                )}
            </div>
        </div>

                <div className="flex flex-col items-end">
                    <span className="h3-app mb-0.5 md:mb-1">Participants</span>
                    <span className="text-lg md:text-3xl font-black text-text tracking-tighter block leading-none">
                        {playerCount.toLocaleString()}
                    </span>
                </div>
            </div>

            {/* 2. STATUS BOX */}
            <div className={`lg:col-span-1 bg-card rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center text-center h-full ${(showBootstrapWarning || isVictoryPending) ? 'border border-yellow-500/20 bg-yellow-500/5' : ''}`}>
                
                {/* Warning State: Only show if Victory Pending OR (Bootstrap AND NOT Auction) */}
                {(showBootstrapWarning || isVictoryPending) && (
                    <div className="space-y-1">
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span className="text-[10px] uppercase font-bold text-primary tracking-widest">
                                {isVictoryPending ? "Settlement Pending" : "Season On Hold"}
                            </span>
                        </div>
                        <p className="text-xs text-text2 font-bold max-w-50 mx-auto leading-tight">
                            {isVictoryPending ? "Victory condition met. Preparing for Payout Phase." : "Trading operations paused during gini verification."}
                        </p>
                    </div>
                )}

                {/* Payout State */}
                {isPayout && (
                    <div>
                        <span className="h3-app mb-1">Status</span>
                        <span className="text-2xl font-bold text-text font-display tracking-tight block">
                            Season Concluded
                        </span>
                    </div>
                )}

                {/* Standard Countdown State */}
                {/* FIX: Logic updated to show countdown if it's Auction, even if isBootstrap is true */}
                {(!showBootstrapWarning && !isVictoryPending && !isPayout) && (
                    <>
                        <span className="h3-app">
                            {isAuction ? "Auction Ends In" : "Season Ends In"}
                        </span>
                        <span className="text-lg md:text-3xl font-bold text-text font-display tracking-tight block">
                            {countdownText}
                        </span>
                    </>
                )}
            </div>
        </>
    );
}