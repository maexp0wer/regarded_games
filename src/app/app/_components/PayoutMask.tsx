'use client';

import React, { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';

// Hooks
import { usePayout } from '@/hooks/usePayout';



// Icons
import Regardo from '@/components/icons/Regardo.svg';
import Carlo from '@/components/icons/Carlo.svg';

interface PayoutMaskProps {
  seasonAddress: string;
}

export function PayoutMask({ seasonAddress }: PayoutMaskProps) {
  const { address, isConnected } = useAccount();

  // --- LOCAL STATE SNAPSHOT ---
  // We store the valid PnL here when the user clicks "Redeem".
  // If the live PnL drops (due to RPC/Ponder lag), we show this snapshot instead.
  const [snapshotPnL, setSnapshotPnL] = useState<number | null>(null);

  // Write Hook
  const { writeContract, data: hash, isPending, reset } = useWriteContract();
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

  // Data Fetching
  const { 
    payout, 
    pnl: livePnL, 
    userFim, 
    userNetContrib,
    realizedPayout,
    loading: calcLoading, 
    refetch: refetchPayout 
    
  } = usePayout(seasonAddress, address);
  
  // --- TRANSFORMATION MATH ---
  
  // Win Logic
  const winSide = isOligarchyWin ? "Capitalist" : "Socialist";
  const winColor = isOligarchyWin ? "text-info" : "text-danger";
  const progressPct = finalProgressBps ? Number(finalProgressBps) / 100 : 0;
  
  // Eligibility logic (User can claim if payout > 0)
  const canClaim = payout > 0;

  // --- EFFECT: HANDLE SUCCESS ---
  useEffect(() => {
    if (isSuccess) {
      refetchPayout();
      
      // Clear the snapshot after 10 seconds (Ponder should be synced by then)
      const timer = setTimeout(() => {
        setSnapshotPnL(null); 
        reset();
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [isSuccess, refetchPayout, reset]);


  // --- UI VALUES ---
  
  // Logic: If we have a snapshot and the live PnL dropped significantly below it (the glitch),
  // continue showing the snapshot. Otherwise show live.
  const displayPnL = (snapshotPnL !== null && livePnL < snapshotPnL) 
    ? snapshotPnL 
    : livePnL;

  const handleClaim = () => {
    // 1. Snapshot the current correct PnL before we burn the ticket
    setSnapshotPnL(livePnL);

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

  return (
    <div className="bg-card rounded-xl p-6 h-full flex flex-col shadow-sm animate-in fade-in">
      
      {/* HEADER */}
<div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 mb-6">
    {/* Left Side: Title */}
    <div>
        <h3 className="font-display text-xl font-bold uppercase text-text">
            Payout
        </h3>
    </div>

    {/* Right Side: Victory Details 
        - whitespace-nowrap here ensures "Partial Victory" stays together
        - The parent 'flex-wrap' ensures this whole block drops down if needed
    */}
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 ${winColor} whitespace-nowrap`}>
        <div className="flex items-center gap-1.5">
            <span className="text-lg font-bold uppercase">
                {winSide}
            </span>            
            <span className="text-lg font-bold uppercase">
                {progressPct < 100 ? "Partial Victory" : "Victory"}
            </span>  
        </div>

        <span className="text-xs font-mono font-bold text-text/80">
            ({progressPct ? `${progressPct.toFixed(1)}%` : "0%"})
        </span>  
    </div>
</div>
     


      {/* USER STATS - Standardized 2x2 Grid */}
      <div className="bg-card2 rounded-xl border border-white/5 overflow-hidden mb-6">
        
        {/* Main Stats Grid */}
        <div className="p-4 grid grid-cols-2 gap-y-6 gap-x-4">
            
            {/* 1. Your Holdings */}
            <div className="flex flex-col space-y-1.5">
                <span className="text-[10px] text-text2 font-black uppercase tracking-widest">Your Holdings</span>
                <span className="text-lg font-mono font-bold text-text leading-none">
                    {userFim.toLocaleString(undefined, {maximumFractionDigits: 2})} 
                    <span className="ml-1.5 text-[10px] text-text2 uppercase font-sans">Fim</span>
                </span>
            </div>

            {/* 2. Net Contribution (Now in Pill Style) */}
            <div className="flex flex-col space-y-1.5 items-end text-right">
                <span className="text-[10px] text-text2 font-black uppercase tracking-widest">Net Contribution</span>
                <div className={`px-2 py-1 rounded-md text-sm font-mono font-bold inline-flex items-center gap-1 border ${
                    userNetContrib > 0 
                    ? 'bg-success/10 text-success border-success/20' 
                    : userNetContrib < 0
                    ? 'bg-danger/10 text-danger border-danger/20'
                    : 'text-text2 border-border/20'

                    
                }`}>
                    {userNetContrib >= 0 ? '+' : ''}
                    {userNetContrib.toLocaleString(undefined, {maximumFractionDigits: 2})} 
                    <span className="text-[9px] opacity-70 ml-0.5">USDC</span>
                </div>
            </div>

            {/* Horizontal Divider spanning both columns */}
            <div className="col-span-2 h-px bg-white/5 -my-2" />

            {/* 3. Redeemable Payout */}
            {canClaim ? (
                
            <div className="flex flex-col space-y-1.5">
                <span className="text-[10px] text-primary font-black uppercase tracking-widest">Claimable</span>
                {calcLoading ? (
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
                <span className="text-[10px] text-primary font-black uppercase tracking-widest">Claimed</span>
                {calcLoading ? (
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
                {calcLoading ? (
                    <div className="h-6 w-20 bg-white/5 animate-pulse rounded" />
                ) : (
                    <div className={`px-2 py-1 rounded-md text-sm font-mono font-bold inline-flex items-center gap-1 border ${
                        displayPnL > 0 
                        ? 'bg-success/10 text-success border-success/20' 
                        : displayPnL < 0 
                            ? 'bg-danger/10 text-danger border-danger/20' 
                            : 'text-text2 border-border/20'
                    }`}>
                        {displayPnL >= 0 ? '+' : '-'} 
                        {Math.abs(displayPnL).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        <span className="text-[9px] opacity-70 ml-0.5">USDC</span>
                    </div>
                )}
            </div>
        </div>

      </div>

      {/* ACTION AREA */}
<div className="mt-auto space-y-3">
  {canClaim || snapshotPnL !== null ? (
    <>
      {snapshotPnL !== null && !canClaim ? (
        /* SUCCESS STATE: User has claimed, Ponder might be lagging */
        <div className="p-3 bg-success/10 border border-success/20 rounded-lg text-center animate-in zoom-in duration-300">
          <p className="text-[10px] font-bold text-success uppercase tracking-wider">
            Funds Sent to Wallet
          </p>
        </div>
      ) : (
        /* READY STATE: User has funds to claim */
        <>
          <div className="p-3 bg-success/10 border border-success/20 rounded-lg text-center">
            <p className="text-[10px] font-bold text-success uppercase tracking-wider">
              Allocation Confirmed
            </p>
          </div>
          <button
            onClick={handleClaim}
            disabled={isPending || isConfirming}
            className="w-full btn-primary py-4 shadow-lg shadow-primary/20"
          >
            {isPending || isConfirming ? "Processing..." : "Claim"}
          </button>
        </>
      )}
    </>
  ) : (
    /* TERMINAL STATES: No funds available to claim */
    <div className="p-6 bg-white/2 rounded-lg border border-white/5 border-dashed text-center flex flex-col items-center justify-center opacity-70">
      {/* Logic: If user has 0 holdings and 0 contribution, they didn't participate */}
      {userFim > 0 || Math.abs(userNetContrib) > 0 ? (
        <>
          <span className="text-xl mb-2 grayscale">🏁</span>
          <h4 className="text-xs font-bold text-text uppercase tracking-widest">Settled</h4>
          <p className="text-[10px] text-text2 mt-1">
            Payout has already been claimed.
          </p>
        </>
      ) : (
        <>
          <span className="text-xl mb-2 grayscale">👻</span>
          <h4 className="text-xs font-bold text-text uppercase tracking-widest">Ineligible</h4>
          <p className="text-[10px] text-text2 mt-1">
            You did not participate in this season.
          </p>
        </>
      )}
    </div>
  )}
</div>

    </div>
  );
}