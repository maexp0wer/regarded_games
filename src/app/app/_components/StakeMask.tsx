'use client';

import React, { useState, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { useQueryClient } from '@tanstack/react-query';

import { WalletButton } from './WalletButton';

// ABIs
import ERC20AbiRaw from '@/deployments/abis/MockUSDC.json'; 
import StakingAbiRaw from '@/deployments/abis/Staking.json';
import coreAddresses from '@/deployments/core.json';

const ERC20Abi = ERC20AbiRaw as any;
const StakingAbi = StakingAbiRaw as any;

type WorkflowStep = 'idle' | 'approving' | 'mining_approval' | 'executing' | 'mining_execution' | 'success' | 'canceled' | 'failed' | 'no_gas';

export function Stake() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const { writeContractAsync } = useWriteContract();

  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<'stake' | 'unstake'>('stake');
  const [status, setStatus] = useState<WorkflowStep>('idle');

  const stakingAddr = coreAddresses.Staking as `0x${string}`;
  const rgdAddr = coreAddresses.RGD as `0x${string}`;

  // --- 1. Contract Reads ---
  const { data: stakedBalances, refetch: refetchStaked } = useReadContract({
    address: stakingAddr, abi: StakingAbi, functionName: 'stakedBalances', args: address ? [address] : undefined,
  });
  const { data: requiredRegStake, refetch: refetchRequired } = useReadContract({
    address: stakingAddr, abi: StakingAbi, functionName: 'requiredRegStake', args: address ? [address] : undefined,
  });
  const { data: walletBalance, refetch: refetchWallet } = useReadContract({
    address: rgdAddr, abi: ERC20Abi, functionName: 'balanceOf', args: address ? [address] : undefined,
  });
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: rgdAddr, abi: ERC20Abi, functionName: 'allowance', args: address ? [address, stakingAddr] : undefined,
  });

  // --- 2. Logic & Math ---
  const amountBigInt = amount ? parseUnits(amount, 18) : 0n;
  const currentStaked = (stakedBalances as bigint) ?? 0n;
  const currentLocked = (requiredRegStake as bigint) ?? 0n;
  const currentAllowance = (allowance as bigint) ?? 0n;
  const currentWallet = (walletBalance as bigint) ?? 0n;

  const withdrawable = currentStaked > currentLocked ? currentStaked - currentLocked : 0n;
  const isStakeMode = mode === 'stake';

  const canPerformAction = isStakeMode 
    ? (currentWallet >= amountBigInt && amountBigInt > 0n)
    : (withdrawable >= amountBigInt && amountBigInt > 0n);

  const handleMax = () => {
    const maxVal = isStakeMode ? currentWallet : withdrawable;
    setAmount(formatUnits(maxVal, 18));
  };

  const resetData = () => {
    refetchStaked();
    refetchRequired();
    refetchWallet();
    refetchAllowance();
    // Optional: Invalidate generic queries if needed
    // queryClient.invalidateQueries({ queryKey: ["stakingData"] });
  };

  // --- 3. THE ORCHESTRATOR ---
  const handleStartFlow = async () => {
    if (!publicClient || !address || !amountBigInt) return;

    try {
      // --- BRANCH A: STAKING (Check Approval first) ---
      if (isStakeMode) {
        const liveAllowance = await publicClient.readContract({
          address: rgdAddr, abi: ERC20Abi, functionName: 'allowance', args: [address, stakingAddr]
        }) as bigint;

        if (liveAllowance < amountBigInt) {
          setStatus('approving');
          const approveHash = await writeContractAsync({
            address: rgdAddr, abi: ERC20Abi, functionName: 'approve', args: [stakingAddr, amountBigInt],
          });
          setStatus('mining_approval');
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
          refetchAllowance();
        }
      }

      // --- BRANCH B: EXECUTION (Stake or Unstake) ---
      setStatus('executing');
      
      const functionName = isStakeMode ? 'stake' : 'unstake';
      const actionHash = await writeContractAsync({
        address: stakingAddr, abi: StakingAbi, functionName: functionName, args: [amountBigInt],
      });

      setStatus('mining_execution');
      await publicClient.waitForTransactionReceipt({ hash: actionHash });

      // --- SUCCESS ---
      setStatus('success');
      resetData();

      setTimeout(() => {
        setAmount("");
        setStatus('idle');
      }, 2500);

    } catch (err: any) {
      console.error("Workflow Error:", err);
      
      const isRejection = err.shortMessage?.includes("rejected") || err.message?.includes("User rejected");
      const isInsufficientGas = err.message?.includes("insufficient funds") || err.name === 'InsufficientFundsError';
      
      if (isRejection) {
        setStatus('canceled');
      } else if (isInsufficientGas) {
        setStatus('no_gas');
      } else {
        setStatus('failed');
      }
      
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  // --- 4. UI Helpers ---
  const getProgressWidth = () => {
    switch (status) {
      case 'idle': return '0%';
      case 'approving': return '15%';
      case 'mining_approval': return '40%';
      case 'executing': return isStakeMode ? '60%' : '50%'; // Unstake starts here, so give it 50%
      case 'mining_execution': return '85%';
      case 'success': return '100%';
      default: return '0%';
    }
  };

  const getButtonText = () => {
    if (status === 'approving') return "Step 1/2: Approve RGD...";
    if (status === 'mining_approval') return "Step 1/2: Confirming...";
    if (status === 'executing') return isStakeMode ? "Step 2/2: Sign Stake..." : "Sign Unstake...";
    if (status === 'mining_execution') return "Finalizing...";
    if (status === 'success') return "Success!";
    if (status === 'canceled') return "Canceled";
    if (status === 'no_gas') return "Insufficient Gas";
    if (status === 'failed') return "Transaction Failed";

    // Idle States
    if (!amount || amountBigInt === 0n) return isStakeMode ? "Stake" : "Unstake";
    if (isStakeMode && currentWallet < amountBigInt) return "Insufficient Balance";
    if (!isStakeMode && withdrawable < amountBigInt) return "Amount Locked";
    
    return isStakeMode ? "Stake RGD" : "Unstake RGD";
  };

  const isBusy = status !== 'idle' && status !== 'canceled' && status !== 'failed' && status !== 'success' && status !== 'no_gas';
  const isSuccess = status === 'success';
  const isError = status === 'canceled' || status === 'failed' || status === 'no_gas';
  const isButtonDisabled = isBusy || isSuccess || isError || !amount || !canPerformAction;

  if (!isConnected) {
    return (
      <div className="bg-card rounded-xl p-5 border border-border/10 shadow-sm transition-all text-center space-y-6 w-full max-w-lg">
          <h3 className="text-lg font-black uppercase text-text2 tracking-wider mt-4">Staking</h3>
          <p className="text-sm text-text2 mb-4">Connect your wallet to stake RGD.</p>
          <div className="pt-2"><WalletButton /></div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-5 border border-border/10 shadow-sm transition-all space-y-6 w-full max-w-lg">
      
      {/* HEADER: Mode Toggle & Stats */}
      <div className="space-y-5 border-b border-border/40 pb-5 mb-5">
        
        {/* Toggle */}
        <div className="bg-card2 rounded-lg flex overflow-hidden border border-border/20 h-10">
          <button 
            onClick={() => { if(!isBusy) { setMode('stake'); setAmount(""); } }}
            className={`flex-1 text-[9px] font-black uppercase tracking-widest transition-all 
              ${isStakeMode ? 'bg-gold text-card' : 'text-text2 hover:text-text hover:bg-white/5'}`}
            disabled={isBusy}
          >
            Stake
          </button>
          <button 
            onClick={() => { if(!isBusy) { setMode('unstake'); setAmount(""); } }}
            className={`flex-1 text-[9px] font-black uppercase tracking-widest transition-all 
              ${!isStakeMode ? 'bg-gold text-card' : 'text-text2 hover:text-text hover:bg-white/5'}`}
            disabled={isBusy}
          >
            Unstake
          </button>
        </div>

        {/* 4-Column Stats Grid (Replicating Auction Visuals) */}
        <div className="grid grid-cols-4 gap-2 text-left px-1">
          <div className="flex flex-col">
            <span className="text-[8px] uppercase font-bold text-text2 tracking-widest mb-1">Wallet RGD</span>
            <span className="text-lg font-black text-gold tracking-tighter leading-none">
              {Number(formatUnits(currentWallet, 18)).toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] uppercase font-bold text-text2 tracking-widest mb-1">Staked</span>
            <span className="text-lg font-black text-text tracking-tighter leading-none">
              {Number(formatUnits(currentStaked, 18)).toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] uppercase font-bold text-text2 tracking-widest mb-1">Locked</span>
            <span className="text-lg font-black text-pink tracking-tighter leading-none">
              {currentLocked > 0n ? Number(formatUnits(currentLocked, 18)).toFixed(2) : "0.00"}
            </span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[8px] uppercase font-bold text-text2 tracking-widest mb-1">Available</span>
            <span className="text-lg font-black text-green tracking-tighter leading-none">
              {Number(formatUnits(withdrawable, 18)).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-2">
        
        {/* INPUT BOX */}
        <div className="bg-card2 rounded-xl p-4 border border-border/10">
          <div className="flex justify-between items-end mb-2 px-1">
            <label className="text-[9px] uppercase font-bold text-text2 tracking-widest">
              {isStakeMode ? "Stake Amount" : "Unstake Amount"}
            </label>
            <span className="text-[9px] font-mono text-text2 uppercase tracking-tighter opacity-70">
              {isStakeMode 
                ? `Max: ${Number(formatUnits(currentWallet, 18)).toLocaleString()}`
                : `Max: ${Number(formatUnits(withdrawable, 18)).toLocaleString()}`
              }
            </span>
          </div>
          <div className="flex items-center">
            <input 
              type="number" placeholder="0.00"
              className="bg-transparent border-none p-0 w-full text-3xl font-mono font-black text-text outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
              disabled={isBusy || isSuccess || isError}
            />
            <button 
                onClick={handleMax} 
                className="text-[9px] font-black bg-gold/10 text-gold px-3 py-1.5 rounded-lg hover:bg-gold/20 transition-all ml-4"
                disabled={isBusy || isSuccess || isError}
            >MAX</button>
          </div>
        </div>

        {/* SMART BUTTON WITH PROGRESS BAR */}
        <div className="relative w-full rounded-xl overflow-hidden shadow-lg transition-all active:scale-[0.99]">
            {status !== 'idle' && !isError && (
                <div 
                    className={`absolute top-0 left-0 h-full transition-all duration-500 ease-out ${isSuccess ? 'bg-green' : 'bg-gold/30'}`}
                    style={{ width: getProgressWidth() }}
                />
            )}
            
            <button 
                className={`relative w-full py-4 font-black text-[10px] uppercase tracking-widest z-10 flex items-center justify-center gap-2 transition-all duration-200
                    ${isButtonDisabled && !isBusy && !isSuccess && !isError ? 'bg-bg text-text2 cursor-not-allowed shadow-none' : ''}
                    ${isBusy ? 'cursor-not-allowed text-text' : ''}
                    ${isSuccess ? 'cursor-not-allowed text-card shadow-lg' : ''}
                    ${isError ? 'bg-pink text-card cursor-not-allowed shadow-lg' : ''}
                    ${status === 'idle' && !isButtonDisabled ? 'bg-gold text-card hover:brightness-110 shadow-lg' : ''}
                    ${status !== 'idle' && !isSuccess && !isError ? 'text-text' : ''}
                `}
                disabled={isButtonDisabled} 
                onClick={handleStartFlow}
            >
                {isBusy && <div className="w-3 h-3 border-2 border-text border-t-transparent rounded-full animate-spin" />}
                {getButtonText()}
            </button>
        </div>
      </div>
    </div>
  );
}