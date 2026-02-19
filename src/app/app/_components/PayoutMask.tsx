'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';

// Hooks
import { usePayout } from '@/hooks/usePayout'; // Assuming this path is correct

// Icons
import Regardo from '@/components/icons/Regardo.svg';
import Carlo from '@/components/icons/Carlo.svg';

interface PayoutMaskProps {
  seasonAddress: string;
}

export function PayoutMask({ seasonAddress }: PayoutMaskProps) {
  const { address, isConnected } = useAccount();

  // --- LOCAL STATE MANAGEMENT ---
  // 1. Tracks the PnL snapshot *at the moment the transaction was sent* to protect against Ponder/RPC lag.
  const [snapshotPnL, setSnapshotPnL] = useState<number | null>(null);
  
  // 2. Tracks if a transaction has been sent but not yet confirmed/indexed.
  const [transactionSent, setTransactionSent] = useState(false);

  // Write Hook
  const { writeContract, data: hash, isPending: isWritePending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Read State
  const { data: isOligarchyWin } = useReadContract({
    address: seasonAddress as `0x${string}`,
    abi: GameSeasonAbi as any,
    functionName: 'isOligarchyWin',
    query: { enabled: !!seasonAddress }
  });
  const { data: finalProgressBps } = useReadContract({
    address: seasonAddress as `0x${string}`,
    abi: GameSeasonAbi as any,
    functionName: 'finalProgressBps',
    query: { enabled: !!seasonAddress }
  });

  // Data Fetching (Ensure realizedPayout is also destructured if needed for 'Claimed' state)
  const { 
    payout, 
    pnl: livePnL, 
    userFim, 
    userNetContrib,
    realizedPayout, // <-- Make sure your usePayout returns this!
    loading: calcLoading, 
    refetch: refetchPayout 
    
  } = usePayout(seasonAddress, address);
  
  // --- TRANSFORMATION MATH ---
  
  const finalProgressValue: bigint = (finalProgressBps as unknown as bigint) ?? 0n; 

  let winDisplay: { side: string; color: string; text: string; pct: number };

  // Assuming 10000n represents 100% completion/victory condition
  const HUNDRED_PERCENT_BPS = 10000n; 

  if (finalProgressValue === 0n) {
    // *** NEW: Tie/Inconclusive State ***
    winDisplay = { 
        side: "Faction TIE", 
        color: "text-yellow-500", 
        text: "", 
        pct: 0 
    };
  } else if (finalProgressValue < HUNDRED_PERCENT_BPS) {
    // Partial Victory
    winDisplay = { 
        side: isOligarchyWin ? "Capitalist" : "Socialist", 
        color: isOligarchyWin ? "text-info" : "text-danger", 
        text: "Partial Victory", 
        pct: Number(finalProgressValue) / 100 
    };
  } else { // finalProgressValue >= HUNDRED_PERCENT_BPS
    // Full Victory
    winDisplay = { 
        side: isOligarchyWin ? "Capitalist" : "Socialist", 
        color: isOligarchyWin ? "text-info" : "text-danger", 
        text: "Victory", 
        pct: 100 
    };
  }

  const winSide = winDisplay.side;
  const winColor = winDisplay.color;
  const progressPct = winDisplay.pct;
  
  // Eligibility logic (User can claim if payout > 0)
  const canClaim = payout > 0;

  // --- EFFECT: HANDLE TRANSACTION LIFECYCLE ---
  useEffect(() => {
    if (isWritePending) {
        // User has clicked the button and the transaction is being broadcasted
        setTransactionSent(true);
        // Snapshot the PnL *before* we start waiting/refetching in case of lag
        setSnapshotPnL(livePnL); 
    }

    if (isSuccess) {
      // 1. Immediately force a full refetch (RPC + Ponder) to update all states
      refetchPayout(); 
      
      // 2. Clear tracking states after a short delay (10s) to allow UI to settle/refetches to complete
      const timer = setTimeout(() => {
        setSnapshotPnL(null); // Clear PnL snapshot
        setTransactionSent(false); // Clear transaction pending state
        reset(); // Clear wagmi write state
      }, 10000);

      return () => clearTimeout(timer);
    }
    
    if (userFim > 0 && transactionSent) {
        refetchPayout();
    }

  }, [isWritePending, isSuccess, refetchPayout, reset, transactionSent, livePnL, userFim]);


  // --- UI VALUES ---
  
  // Logic: Show snapshot PnL if it exists AND the live PnL has dropped below it (glitch protection).
  // If transactionSent is true AND payout is 0 (meaning it was claimed and Ponder hasn't caught up), 
  // we need a clearer way to show 'Claimed'.
  const displayPnL = useMemo(() => {
    if (snapshotPnL !== null && livePnL < snapshotPnL) {
        return snapshotPnL; // Glitch protection
    }
    return livePnL;
  }, [snapshotPnL, livePnL]);


  // **NEW: Override State Logic**
  const hasClaimed = useMemo(() => {
      // Case 1: Ponder confirms > 0 claimed payout (Normal state after indexer catches up)
      if (realizedPayout > 0) return true;
      
      // Case 2: A transaction was sent, and the live redeemable payout is now 0. 
      // This suggests the user *just* claimed, even if Ponder hasn't updated `realizedPayout` yet.
      if (transactionSent && payout === 0) return true;
      
      return false;
  }, [realizedPayout, transactionSent, payout]);

  const handleClaim = () => {
    if (!canClaim || isWritePending || isConfirming) return;

    // 1. Set transaction tracking state
    setTransactionSent(true);

    // 2. Send Tx
    writeContract({
      address: seasonAddress as `0x${string}`,
      abi: GameSeasonAbi as any,
      functionName: 'claimPayout',
      args: []
    });
  };

  if (!isConnected) {
    return (
      <div className="bg-card rounded-xl  p-10 text-center h-full flex flex-col items-center justify-center">
        <p className="text-text2 text-sm">Connect wallet to check if you are eligible for a payout.</p>
      </div>
    );
  }

  // Determine if the Claim button should be disabled
  const isButtonDisabled = isWritePending || isConfirming || !canClaim || hasClaimed;

  return (
    <div className="bg-card rounded-xl p-6 h-full flex flex-col shadow-sm animate-in fade-in">
      
      {/* HEADER - (Unchanged) */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 mb-6">
        <div>
            <h3 className="font-display text-xl font-bold uppercase text-text">
                Payout
            </h3>
        </div>
      {/* Right Side: Victory Details */}
      <div className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 ${winColor} whitespace-nowrap`}>
          <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold uppercase">
                  {winSide}
              </span>            
              <span className="text-lg font-bold uppercase">
                  {winDisplay.text} 
              </span>  
          </div>

          {/* CONDITIONAL RENDERING: Only show the parentheses if the percentage text exists */}
          {progressPct > 0 && (
              <span className="text-xs font-mono font-bold text-text/80">
                  ({`${progressPct.toFixed(1)}%`}) 
              </span>  
          )}
      </div>
    </div>
     
      {/* USER STATS - Standardized 2x2 Grid - (Unchanged) */}
      <div className="bg-card2 rounded-xl  overflow-hidden mb-6">
        <div className="p-4 grid grid-cols-2 gap-y-6 gap-x-4">
            
            <div className="flex flex-col space-y-1.5">
                <span className="text-[10px] text-text2 font-black uppercase tracking-widest">Your Holdings</span>
                <span className="text-lg font-mono font-bold text-text leading-none">
                    {userFim.toLocaleString(undefined, {maximumFractionDigits: 2})} 
                    <span className="ml-1.5 text-[10px] text-text2 uppercase font-sans">Fim</span>
                </span>
            </div>

            <div className="flex flex-col space-y-1.5 items-end text-right">
                <span className="text-[10px] text-text2 font-black uppercase tracking-widest">Net Contribution</span>
                <div className={`px-2 py-1 rounded-md text-sm font-mono font-bold inline-flex items-center gap-1 border ${
                    userNetContrib > 0 
                    ? 'bg-success/10 text-success border-success/20' 
                    : userNetContrib < 0
                    ? 'bg-danger/10 text-danger border-danger/20'
                    : 'text-text2 border-border/20'
                }`}>
                    {userNetContrib > 0 ? '+ ' : userNetContrib == 0 ? '' : '-'}
                    {userNetContrib.toLocaleString(undefined, {maximumFractionDigits: 2})} 
                    <span className="text-[9px] opacity-70 ml-0.5">USDC</span>
                </div>
            </div>

            <div className="col-span-2 h-px bg-white/5 -my-2" />

            {/* 3. Redeemable Payout / Claimed Status */}
            {canClaim && !hasClaimed ? (
                <div className="flex flex-col space-y-1.5">
                    <span className="text-[10px] text-primary font-black uppercase tracking-widest">Claimable Now</span>
                    {calcLoading || isWritePending ? (
                        <div className="h-6 w-24 bg-white/5 animate-pulse rounded" />
                    ) : (
                        <span className="text-lg font-mono font-bold text-text leading-none">
                            ${payout.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            <span className="ml-1.5 text-[10px] text-text2 uppercase font-sans">Usdc</span>
                        </span>
                    )}
                </div>
            ) : (
                <div className="flex flex-col space-y-1.5">
                    <span className="text-[10px] text-primary font-black uppercase tracking-widest">Total Claimed</span>
                    {calcLoading || isWritePending ? (
                        <div className="h-6 w-24 bg-white/5 animate-pulse rounded" />
                    ) : (
                        <span className="text-lg font-mono font-bold text-text leading-none">
                            ${realizedPayout.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            <span className="ml-1.5 text-[10px] text-text2 uppercase font-sans">Usdc</span>
                        </span>
                    )}
                </div>
            )}

            {/* 4. Season PnL (Pill Style + USDC Included) */}
            <div className="flex flex-col space-y-1.5 items-end text-right">
                <span className="text-[10px] text-text2 font-black uppercase tracking-widest">Season PnL</span>
                {calcLoading || isWritePending ? (
                    <div className="h-6 w-20 bg-white/5 animate-pulse rounded" />
                ) : (
                    <div className={`px-2 py-1 rounded-md text-sm font-mono font-bold inline-flex items-center gap-1 border ${
                        displayPnL > 0 
                          ? 'bg-success/10 text-success border-success/20' 
                          : displayPnL < 0
                          ? 'bg-danger/10 text-danger border-danger/20'
                          : 'text-text2 border-border/20'
                        }`}>
                        
                        {displayPnL > 0 ? '+ ' : displayPnL == 0 ? '' : '-'}
                        {Math.abs(displayPnL).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        <span className="text-[9px] opacity-70 ml-0.5">USDC</span>
                    </div>
                )}
            </div>
        </div>

      </div>

      {/* ACTION AREA */}
      <div className="mt-auto space-y-3">
        {canClaim ? (
            /* READY STATE: User has funds to claim */
            <>
                {/* The button is the ONLY action needed if funds are available */}
                <button
                    onClick={handleClaim}
                    disabled={isButtonDisabled}
                    className={`w-full btn-primary py-4 shadow-lg shadow-primary/20 ${isButtonDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                    {isWritePending || isConfirming ? "Confirming on Chain..." : "Claim Payout"}
                </button>
            </>
        ) : !hasClaimed ? (
            /* TERMINAL STATES: No funds available to claim (and hasn't successfully claimed before) */
            <div className="p-6 bg-white/2 rounded-lg border border-white/5 border-dashed text-center flex flex-col items-center justify-center opacity-70">
              <span className="text-xl mb-2 grayscale">🏁</span>
              <h4 className="text-xs font-bold text-text uppercase tracking-widest">Ineligible</h4>
              <p className="text-[10px] text-text2 mt-1">
                You did not participate in this season
              </p>
            </div>
        ) : (
             /* CASE: hasClaimed is TRUE, but canClaim is FALSE (payout is 0). 
                Since 'Total Claimed' is shown above, we show nothing here. */
             null
        )}
      </div>
    </div>
  );
}