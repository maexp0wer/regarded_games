'use client';

import React, { useState, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { useQueryClient } from '@tanstack/react-query';

import { WalletButton } from './WalletButton';
import PercentSlider from '@/components/PercentSlider';

// ABIs
import ERC20AbiRaw from '@/deployments/abis/MockUSDC.json'; 
import StakingAbiRaw from '@/deployments/abis/Staking.json';
import coreAddresses from '@/deployments/local/core.json';

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

  const maxForSlider = isStakeMode ? currentWallet : withdrawable;

  const handleMax = () => {
    setAmount(formatUnits(maxForSlider, 18));
  };

  // --- Slider Logic ---
  const sliderPct = useMemo(() => {
    if (!amount || maxForSlider === 0n) return 0;
    try {
      const raw = parseUnits(amount, 18);
      return Math.min(100, Math.max(0, Math.round(Number((raw * 100n) / maxForSlider))));
    } catch { return 0; }
  }, [amount, maxForSlider]);

  const handleSliderChange = (pct: number) => {
    if (maxForSlider === 0n) return;
    setAmount(formatUnits((maxForSlider * BigInt(pct)) / 100n, 18));
  };

  const resetData = () => {
    refetchStaked();
    refetchRequired();
    refetchWallet();
    refetchAllowance();
  };

  // --- 3. THE ORCHESTRATOR ---
  const handleStartFlow = async () => {
    if (!publicClient || !address || !amountBigInt) return;

    try {
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

      setStatus('executing');
      
      const functionName = isStakeMode ? 'stake' : 'unstake';
      const actionHash = await writeContractAsync({
        address: stakingAddr, abi: StakingAbi, functionName: functionName, args: [amountBigInt],
      });

      setStatus('mining_execution');
      await publicClient.waitForTransactionReceipt({ hash: actionHash });

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
      case 'executing': return isStakeMode ? '60%' : '50%';
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

    if (!amount || amountBigInt === 0n) return isStakeMode ? "Stake" : "Unstake";
    if (isStakeMode && currentWallet < amountBigInt) return "Insufficient Balance";
    if (!isStakeMode && withdrawable < amountBigInt) return "Amount Locked";
    
    return isStakeMode ? "Stake RGD" : "Unstake RGD";
  };

  const isBusy = status !== 'idle' && status !== 'canceled' && status !== 'failed' && status !== 'success' && status !== 'no_gas';
  const isSuccess = status === 'success';
  const isError = status === 'canceled' || status === 'failed' || status === 'no_gas';
  const isButtonDisabled = isBusy || isSuccess || isError || !amount || !canPerformAction;

  // Shared Design Constants
  const inputBase = 'bg-transparent border-none p-0 w-full font-mono font-bold text-text outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';
  const activeStyle = { background: 'var(--color-gold-a15)', color: 'var(--color-gold)', boxShadow: '0 1px 4px #00000033' };
  const segInactive = { color: 'var(--color-text2)', background: 'transparent' };

  const ctaBtnStyle = isBusy || (status !== 'idle' && !isError && !isSuccess)
    ? {}
    : isButtonDisabled && !isSuccess && !isError
    ? { background: 'var(--color-card2)', color: 'var(--color-text2)', cursor: 'not-allowed' }
    : isError
    ? { background: 'var(--color-pink)', color: 'var(--color-bg)', cursor: 'not-allowed' }
    : isSuccess
    ? { background: 'var(--color-green)', color: 'var(--color-bg)', cursor: 'not-allowed' }
    : { background: 'var(--color-gold)', color: 'var(--color-bg)', boxShadow: '0 4px 20px -6px var(--color-gold-a50)' };


  if (!isConnected) {
    return (
      <div 
        className="card-app flex flex-col items-center justify-center gap-4 w-full max-w-lg py-12"
        style={{ borderColor: 'var(--color-border-bright)' }}
      >
        <p className="font-mono text-sm text-text2">Please connect wallet to stake</p>
        <WalletButton />
      </div>
    );
  }

  return (
    <div 
      className="card-app flex flex-col gap-4 w-full max-w-lg"
      style={{ borderColor: 'var(--color-border-bright)' }}
    >
      {/* ── Balances Header ── */}
      <div className="flex flex-col pb-2">
        <div className="flex items-start justify-between">
          <div>
            <p className="section-label mb-1">Wallet Balance</p>
            <div 
              className="font-display font-extrabold leading-none text-display-swap"
              style={{
                color: 'var(--color-gold)',
                textShadow: '0 0 40px var(--color-gold-a25)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {Number(formatUnits(currentWallet, 18)).toLocaleString()}
              <span className="font-mono font-medium text-text2 ml-2 text-currency-label">RGD</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mode seg control ── */}
      <div className="seg" style={{ width: '100%' }}>
        <button
          disabled={isBusy}
          onClick={() => { setMode('stake'); setAmount(""); }}
          className="seg-btn"
          style={{ ...(isStakeMode ? activeStyle : segInactive), flex: 1, textAlign: 'center' }}
        >
          Stake
        </button>
        <button
          disabled={isBusy}
          onClick={() => { setMode('unstake'); setAmount(""); }}
          className="seg-btn"
          style={{ ...(!isStakeMode ? activeStyle : segInactive), flex: 1, textAlign: 'center' }}
        >
          Unstake
        </button>
      </div>

      {/* ── Amount input ── */}
      <div
        className="rounded-xl flex overflow-hidden"
        style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
      >
        {/* Input area */}
        <div className="flex flex-col flex-1 p-4 gap-2">
          <div className="flex items-center justify-between">
            <span className="section-label">{isStakeMode ? 'Stake Amount' : 'Unstake Amount'}</span>
            <span className="font-mono text-[11px] text-text2 ml-2">
              MAX · <span className="text-text font-semibold">
                {isStakeMode 
                  ? Number(formatUnits(currentWallet, 18)).toLocaleString()
                  : Number(formatUnits(withdrawable, 18)).toLocaleString()
                }
              </span>
            </span>
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`${inputBase} text-input`}
            placeholder="0.00"
            disabled={isBusy || isSuccess || isError}
          />
          <PercentSlider 
            value={sliderPct} 
            onChange={handleSliderChange} 
            disabled={isBusy || isSuccess || isError} 
          />
        </div>
        {/* Vertical Max button — right side */}
        
      </div>

      {/* ── Sub-stats ── */}
      <div className="grid grid-cols-3 gap-2 pt-2 mt-1" style={{ borderTop: '1px solid var(--color-border)' }}>
        <div className="text-left">
          <p className="section-label mb-1">Staked</p>
          <span className="font-mono font-bold text-summary-value text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {Number(formatUnits(currentStaked, 18)).toLocaleString()}
          </span>
        </div>
        <div className="text-left">
          <p className="section-label mb-1">Locked</p>
          <span className="font-mono font-bold text-summary-value text-red" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {currentLocked > 0n ? Number(formatUnits(currentLocked, 18)).toFixed(2) : "0.00"}
          </span>
        </div>
        <div className="text-left">
          <p className="section-label mb-1">Available</p>
          <span className="font-mono font-bold text-summary-value text-green" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {Number(formatUnits(withdrawable, 18)).toLocaleString()}
          </span>
        </div>
      </div>

      {/* ── CTA Button ── */}
      <div className="mt-2 relative rounded-xl overflow-hidden">
        {status !== 'idle' && !isError && (
          <div
            className="absolute inset-y-0 left-0 transition-all duration-500"
            style={{
              width: getProgressWidth(),
              background: status === 'success' ? 'var(--color-green)' : 'rgba(245,184,0,0.3)',
            }}
          />
        )}
        <button
          disabled={isButtonDisabled}
          onClick={handleStartFlow}
          className="relative z-10 w-full py-4 font-display font-bold text-[15px] uppercase tracking-wide flex items-center justify-center gap-2 transition-all rounded-xl"
          style={ctaBtnStyle}
        >
          {isBusy && <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />}
          {getButtonText()}
        </button>
      </div>
    </div>
  );
}