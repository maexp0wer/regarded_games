'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  useAccount, 
  useReadContract, 
  useWriteContract, 
  useWaitForTransactionReceipt 
} from 'wagmi';
import { parseUnits, formatUnits } from 'viem';

import ERC20AbiRaw from '@/deployments/abis/MockUSDC.json';
import StakingAbiRaw from '@/deployments/abis/Staking.json';
import coreAddresses from '@/deployments/core.json';
import { WalletButton } from './WalletButton';

const ERC20Abi = ERC20AbiRaw as any;
const StakingAbi = StakingAbiRaw as any;

export function Stake() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<'stake' | 'unstake'>('stake');
  
  // Ref to track if the current transaction is just an approval
  const isApprovalTx = useRef(false);

  // --- Contract Reads ---
  const { data: stakedBalances, refetch: refetchStaked } = useReadContract({
    address: coreAddresses.Staking as `0x${string}`,
    abi: StakingAbi,
    functionName: 'stakedBalances',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });

  const { data: requiredRtdStake, refetch: refetchRequired } = useReadContract({
    address: coreAddresses.Staking as `0x${string}`,
    abi: StakingAbi,
    functionName: 'requiredRtdStake',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });

  const { data: walletBalance, refetch: refetchWallet } = useReadContract({
    address: coreAddresses.RTD as `0x${string}`,
    abi: ERC20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: coreAddresses.RTD as `0x${string}`,
    abi: ERC20Abi,
    functionName: 'allowance',
    args: address ? [address, coreAddresses.Staking as `0x${string}`] : undefined,
    query: { enabled: !!address }
  });

  const { writeContract, data: hash, isPending } = useWriteContract();
  
  // This hook handles the mining state
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ 
    hash,
    query: { enabled: !!hash }
  });

  // --- Logic ---
  const amountBigInt = amount ? parseUnits(amount, 18) : 0n;
  const currentStaked = (stakedBalances as bigint) ?? 0n;
  const currentLocked = (requiredRtdStake as bigint) ?? 0n;
  const currentAllowance = (allowance as bigint) ?? 0n;
  const currentWallet = (walletBalance as bigint) ?? 0n;

  const withdrawable = currentStaked > currentLocked ? currentStaked - currentLocked : 0n;
  const isStakeMode = mode === 'stake';
  const needsApproval = isStakeMode && currentAllowance < amountBigInt;
  
  const canPerformAction = isStakeMode 
    ? (currentWallet >= amountBigInt && amountBigInt > 0n)
    : (withdrawable >= amountBigInt && amountBigInt > 0n);

  // --- Handle Confirmation ---
  useEffect(() => {
    if (isConfirmed) {
      // Refresh all data
      refetchStaked();
      refetchRequired();
      refetchWallet();
      refetchAllowance();

      // Only clear input if it was a final action (Stake/Unstake)
      if (!isApprovalTx.current) {
        setAmount("");
      }
      
      // Reset the flag for the next transaction
      isApprovalTx.current = false;
    }
  }, [isConfirmed, refetchStaked, refetchRequired, refetchWallet, refetchAllowance]);

  const handleAction = () => {
    if (!address || !canPerformAction) return;

    if (isStakeMode) {
      if (needsApproval) {
        isApprovalTx.current = true; // Mark as approval
        writeContract({
          address: coreAddresses.RTD as `0x${string}`,
          abi: ERC20Abi,
          functionName: 'approve',
          args: [coreAddresses.Staking as `0x${string}`, amountBigInt],
        });
      } else {
        isApprovalTx.current = false; // Mark as final action
        writeContract({
          address: coreAddresses.Staking as `0x${string}`,
          abi: StakingAbi,
          functionName: 'stake',
          args: [amountBigInt],
        });
      }
    } else {
      isApprovalTx.current = false; // Mark as final action
      writeContract({
        address: coreAddresses.Staking as `0x${string}`,
        abi: StakingAbi,
        functionName: 'unstake',
        args: [amountBigInt],
      });
    }
  };

  const getButtonText = () => {
    if (isPending || isConfirming) return "Processing...";
    if (!amount || amountBigInt === 0n) return isStakeMode ? "Stake" : "Unstake";
    if (isStakeMode) {
      if (currentWallet < amountBigInt) return "Insufficient Balance";
      return needsApproval ? "Step 1: Approve" : "Step 2: Stake";
    }
    return withdrawable < amountBigInt ? "Amount Locked" : "Unstake";
  };

  if (!isConnected) {
    return (
      <div className="bg-card rounded-xl max-w-lg p-5 border border-border/10 shadow-sm transition-all text-center space-y-6">
        <h3 className="text-lg font-black uppercase text-text2 tracking-wider mt-4">
          Lock RTD Collateral
        </h3>
        <p className="text-sm text-text2 mb-4">
          Connect your wallet to stake RTD and participate in the auction collateral phase.
        </p>
        
        {/* Placeholder for your actual Connect Wallet Button */}
        {/* You should replace this with the button from your wallet integration (e.g., <ConnectButton />) */}
        <div className="pt-2">
            <WalletButton/>

        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl max-w-lg p-5 border border-border/10 shadow-sm transition-all">
      
      {/* 1. Mode Switch: Flush edges, card2 bg */}
      <div className="bg-card2 rounded-lg flex overflow-hidden border border-border/20 mb-5 h-12">
        <button 
          onClick={() => { setMode('stake'); setAmount(""); }}
          className={`flex-1 text-[9px] font-black uppercase tracking-widest transition-all 
            ${isStakeMode ? 'bg-primary text-card' : 'text-text2 hover:text-text hover:bg-white/5'}`}
        >
          Stake
        </button>
        <button 
          onClick={() => { setMode('unstake'); setAmount(""); }}
          className={`flex-1 text-[9px] font-black uppercase tracking-widest transition-all 
            ${!isStakeMode ? 'bg-primary text-card' : 'text-text2 hover:text-text hover:bg-white/5'}`}
        >
          Unstake
        </button>
      </div>

      {/* Separator Line */}
      <div className="border-b border-border/40 pb-5 mb-5">
        <div className="flex justify-between items-center gap-4 text-left px-1">
          <div className="flex flex-col items-start min-w-20">
            <span className="text-[9px] uppercase font-bold text-text2 tracking-widest mb-1">Total Staked</span>
            <span className="text-xl font-black text-text tracking-tighter leading-none">
                {Number(formatUnits(currentStaked, 18)).toLocaleString()}
            </span>
          </div>

          {currentLocked > 0n && (
            <>
              <div className="flex flex-col items-start min-w-2">
                <span className="text-[9px] uppercase font-bold text-text2 tracking-widest mb-1">Locked</span>
                <span className="text-xl font-black text-danger tracking-tighter leading-none">
                    {Number(formatUnits(currentLocked, 18)).toLocaleString()}
                </span>
              </div>
              <div className="flex flex-col items-start min-w-20">
                <span className="text-[9px] uppercase font-bold text-text2 tracking-widest mb-1">Available</span>
                <span className="text-xl font-black text-success tracking-tighter leading-none">
                    {Number(formatUnits(withdrawable, 18)).toLocaleString()}
                </span>
              </div>
            </>
          )}

          {!currentLocked && (
             <div className="flex flex-col items-start">
               <span className="text-[9px] uppercase font-bold text-text2 tracking-widest mb-1 opacity-50">Status</span>
               <span className="text-[10px] font-black text-success uppercase tracking-widest">Unlocked</span>
             </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* 3. Input Block */}
        <div className="bg-card2 rounded-xl p-4 border border-border/10">
          <div className="flex justify-between items-end mb-2 px-1">
            <label className="text-[9px] uppercase font-bold text-text2 tracking-widest">
              {isStakeMode ? 'Deposit' : 'Withdraw'}
            </label>
            <span className="text-[9px] font-mono text-text2 uppercase tracking-tighter opacity-70">
              {isStakeMode 
                ? `Wallet: ${Number(formatUnits(currentWallet, 18)).toLocaleString()}` 
                : `Max: ${Number(formatUnits(withdrawable, 18)).toLocaleString()}`}
            </span>
          </div>
          
          <div className="flex items-center">
            <input 
              type="number" 
              placeholder="0.00"
              className="bg-transparent border-none p-0 w-full text-3xl font-mono font-black text-text outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              // Disable input only while transaction is being SENT or MINED
              disabled={isPending || isConfirming}
            />
            <button 
              onClick={() => setAmount(formatUnits(isStakeMode ? currentWallet : withdrawable, 18))}
              className="text-[9px] font-black bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-all ml-4"
            >
              MAX
            </button>
          </div>
        </div>

        {/* 4. Action Button */}
        <button 
          className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg
            ${(!canPerformAction && !(isPending || isConfirming)) || amountBigInt === 0n
              ? 'bg-muted/20 text-text2 cursor-not-allowed border border-border/5 shadow-none' 
              : 'bg-primary text-card hover:brightness-110 shadow-primary/20 active:scale-[0.98]'}
          `}
          disabled={!canPerformAction || isPending || isConfirming || amountBigInt === 0n}
          onClick={handleAction}
        >
          {getButtonText()}
        </button>
      </div>
    </div>
  );
}