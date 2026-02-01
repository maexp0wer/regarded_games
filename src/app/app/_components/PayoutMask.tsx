'use client';

import React, { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';

// Hooks
import { usePayout } from '@/hooks/usePayout';
import { usePlayerPercentile } from '@/hooks/usePlayerPercentile';

// Icons
import Ritardo from '@/components/icons/Ritardo.svg';
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
  });
  const { data: finalProgressBps } = useReadContract({
    address: seasonAddress as `0x${string}`,
    abi: GameSeasonAbi as any,
    functionName: 'finalProgressBps',
  });

  // Data Fetching
  const { 
    payout, 
    pnl: livePnL, 
    userFim, 
    userNetContrib, 
    loading: calcLoading, 
    refetch: refetchPayout 
  } = usePayout(seasonAddress, address);
  
  const { data: rankData } = usePlayerPercentile(seasonAddress, address);

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

  // Win Logic
  const winSide = isOligarchyWin ? "Capitalist" : "Socialist";
  const winColor = isOligarchyWin ? "text-info" : "text-danger";
  const progressPct = finalProgressBps ? Number(finalProgressBps) / 100 : 0;
  
  // Eligibility logic (User can claim if payout > 0)
  const canClaim = payout > 0;

  // Determine Faction Status for Wealth Bar
  const isWinningFaction = rankData 
    ? (isOligarchyWin ? (100 - rankData.percentile < 50) : (100 - rankData.percentile >= 50)) 
    : false; // Simplified logic, adjust based on exact massThreshold if needed

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
      <div className="bg-card rounded-xl border border-border p-6 text-center h-full flex flex-col items-center justify-center">
        <p className="text-text2 text-sm">Connect wallet to check payout.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6 h-full flex flex-col shadow-sm animate-in fade-in">
      
      {/* HEADER */}
      <div className="flex justify-between items-start mb-6">
        <div>
            <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <span className="text-[10px] font-black uppercase text-text2 tracking-widest">Season Concluded</span>
            </div>
            <h3 className="font-display text-xl font-bold uppercase text-text">Payout Desk</h3>
        </div>
        
        <div className={`flex flex-col items-end ${winColor}`}>
            <span className="text-[9px] font-bold uppercase opacity-70 tracking-widest">Victor</span>
            <div className="flex items-center gap-1.5">
                <span className="text-lg font-black uppercase">{winSide}</span>
                {isOligarchyWin ? <Ritardo className="w-6 h-6" /> : <Carlo className="w-6 h-6" />}
            </div>
        </div>
      </div>

      {/* WEALTH BAR */}
      {rankData && (
        <div className="mb-6 bg-card2/30 p-3 rounded-lg border border-border/50">
           <div className="flex justify-between text-[10px] text-text2 uppercase mb-1">
             <span>Your Rank</span>
             <span className="text-text font-bold">Top {(100 - rankData.percentile).toFixed(1)}%</span>
           </div>
           <div className="relative w-full h-2 bg-card rounded-full overflow-hidden border border-border mt-1">
              <div className="absolute inset-0 bg-gradient-to-r from-danger/20 to-info/20"></div>
              <div 
                className="absolute top-0 bottom-0 w-1 bg-text z-10 shadow-sm"
                style={{ left: `${rankData.percentile}%` }}
              />
           </div>
        </div>
      )}

      {/* USER STATS */}
      <div className="bg-card2 rounded-lg p-4 space-y-3 mb-6 border border-border">
        
        <div className="flex justify-between items-center">
            <span className="text-xs text-text2 font-bold uppercase">Your Holdings</span>
            <span className="text-sm font-mono font-bold text-text">{userFim.toLocaleString(undefined, {maximumFractionDigits: 2})} FIM</span>
        </div>

        <div className="flex justify-between items-center">
            <span className="text-xs text-text2 font-bold uppercase">Net Contribution</span>
            <span className={`text-sm font-mono font-bold ${userNetContrib >= 0 ? 'text-success' : 'text-danger'}`}>
                {userNetContrib.toLocaleString(undefined, {maximumFractionDigits: 2})} USDC
            </span>
        </div>
        
        <div className="h-px bg-border/50 w-full my-2"></div>
        
        <div className="flex justify-between items-center">
            <span className="text-xs text-text2 font-bold uppercase">Redeemable</span>
            {calcLoading ? (
                <span className="text-xs animate-pulse text-text2">Syncing...</span>
            ) : (
                <span className="text-lg font-black text-primary tracking-tight">
                    ${payout.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </span>
            )}
        </div>

        {/* PNL ROW (Uses Smoothed Value) */}
        <div className="flex justify-between items-center bg-card p-2 rounded border border-border/50">
            <span className="text-[10px] text-text2 font-bold uppercase">Season PnL</span>
            {calcLoading ? (
                <span className="text-[10px] text-text2">...</span>
            ) : (
                <div className={`flex items-center gap-1 ${displayPnL >= 0 ? 'text-success' : 'text-danger'}`}>
                    <span className="text-sm font-black">
                        {displayPnL >= 0 ? '+' : ''}{displayPnL.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </span>
                    <span className="text-[10px] font-bold">USDC</span>
                </div>
            )}
        </div>

        <div className="h-px bg-border/50 w-full my-2"></div>

        <div className="flex justify-between items-center">
            <span className="text-xs text-text2 font-bold uppercase">Win Strength</span>
            <span className="text-xs font-mono text-text">
                {progressPct ? `${progressPct.toFixed(1)}%` : "0%"}
            </span>
        </div>
      </div>

      {/* ACTION AREA */}
      <div className="mt-auto space-y-3">
        {canClaim || snapshotPnL !== null ? (
            <>
                {snapshotPnL !== null && !canClaim ? (
                    <div className="p-3 bg-success/10 border border-success/20 rounded-lg text-center animate-in zoom-in duration-300">
                        <p className="text-[10px] font-bold text-success uppercase tracking-wider">
                            Funds Sent to Wallet
                        </p>
                    </div>
                ) : (
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
                            {isPending || isConfirming ? "Processing..." : "Redeem USDC"}
                        </button>
                    </>
                )}
            </>
        ) : (
            <div className="p-6 bg-card2 rounded-lg border border-border border-dashed text-center flex flex-col items-center justify-center opacity-70">
                <span className="text-xl mb-2 grayscale">🏁</span>
                <h4 className="text-xs font-bold text-text uppercase">Settled</h4>
                <p className="text-[10px] text-text2 mt-1">
                    No active payout available.
                </p>
            </div>
        )}
      </div>

    </div>
  );
}