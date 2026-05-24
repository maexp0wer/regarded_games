'use client';

import React, { useState, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';

import { WalletButton } from './WalletButton';
import AmountInput from '@/components/AmountInput';
import { TxModal } from './TxModal';

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
  const { writeContractAsync } = useWriteContract();

  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<'stake' | 'unstake'>('stake');
  const [status, setStatus] = useState<WorkflowStep>('idle');
  const [txHashes, setTxHashes] = useState<(string | null)[]>([]);

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
  const { refetch: refetchAllowance } = useReadContract({
    address: rgdAddr, abi: ERC20Abi, functionName: 'allowance', args: address ? [address, stakingAddr] : undefined,
  });

  // --- 2. Logic & Math ---
  const amountBigInt = amount ? parseUnits(amount, 18) : 0n;
  const currentStaked = (stakedBalances as bigint) ?? 0n;
  const currentLocked = (requiredRegStake as bigint) ?? 0n;

  const currentWallet = (walletBalance as bigint) ?? 0n;

  const withdrawable = currentStaked > currentLocked ? currentStaked - currentLocked : 0n;
  const isStakeMode = mode === 'stake';

  const canPerformAction = isStakeMode 
    ? (currentWallet >= amountBigInt && amountBigInt > 0n)
    : (withdrawable >= amountBigInt && amountBigInt > 0n);

  const maxForSlider = isStakeMode ? currentWallet : withdrawable;

  // --- Slider Logic ---
  const sliderPct = useMemo(() => {
    if (!amount || maxForSlider === 0n) return 0;
    try {
      const raw = parseUnits(amount, 18);
      return Math.min(100, Math.max(0, Number((raw * 10000n) / maxForSlider) / 100));
    } catch { return 0; }
  }, [amount, maxForSlider]);

  const handleSliderChange = (pct: number) => {
    if (maxForSlider === 0n) return;
    setAmount(formatUnits((maxForSlider * BigInt(Math.round(pct * 100))) / 10000n, 18));
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
    setTxHashes([]);

    try {
      let approveHash: string | null = null;

      if (isStakeMode) {
        const liveAllowance = await publicClient.readContract({
          address: rgdAddr, abi: ERC20Abi, functionName: 'allowance', args: [address, stakingAddr]
        }) as bigint;

        if (liveAllowance < amountBigInt) {
          setStatus('approving');
          approveHash = await writeContractAsync({
            address: rgdAddr, abi: ERC20Abi, functionName: 'approve', args: [stakingAddr, amountBigInt],
          });
          setStatus('mining_approval');
          await publicClient.waitForTransactionReceipt({ hash: approveHash as `0x${string}` });
          setTxHashes([approveHash, null]);
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
      setTxHashes(isStakeMode ? [approveHash, actionHash] : [actionHash]);

      setStatus('success');
      resetData();

    } catch (err: any) {
      console.error("Workflow Error:", err);

      const isRejection = err.shortMessage?.includes("rejected") || err.message?.includes("User rejected");
      const isInsufficientGas = err.message?.includes("insufficient funds") || err.name === 'InsufficientFundsError';

      if (isRejection) {
        setStatus('canceled');
        setTimeout(() => setStatus('idle'), 2000);
      } else if (isInsufficientGas) {
        setStatus('no_gas');
      } else {
        setStatus('failed');
      }
    }
  };

  const isBusy = status !== 'idle' && status !== 'canceled' && status !== 'failed' && status !== 'success' && status !== 'no_gas';
  const showModal = status !== 'idle' && status !== 'canceled';

  const ctaLabel = (() => {
    if (!amount || amountBigInt === 0n) return isStakeMode ? 'Stake' : 'Unstake';
    if (isStakeMode && currentWallet < amountBigInt) return 'Insufficient Balance';
    if (!isStakeMode && withdrawable < amountBigInt) return 'Amount Locked';
    return isStakeMode ? 'Stake RGD' : 'Unstake RGD';
  })();

  const isButtonDisabled = isBusy || showModal || !amount || !canPerformAction;



  if (!isConnected) {
    return (
      <div 
        className="bg-card flex flex-col items-center justify-center gap-4 w-full max-w-lg py-12 border-border2"
      >
        <p className="font-mono text-sm text-text2">Please connect wallet to stake</p>
        <WalletButton />
      </div>
    );
  }

  return (
    <>
    <div
      className="terminal-pane flex flex-col gap-4 w-full max-w-lg border-border2"
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
                textShadow: '0 0 40px var(--color-gold-35)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {Number(formatUnits(currentWallet, 18)).toLocaleString()}
              <span className="font-mono font-medium text-text2 ml-2 text-currency-label">RGD</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mode toggle ── */}
      <div className="flex rounded-lg overflow-hidden border border-border bg-card2 p-1 gap-1">
        <button
          disabled={isBusy}
          onClick={() => { setMode('stake'); setAmount(""); }}
          className="flex-1 py-2 rounded font-display font-bold text-sm uppercase tracking-wide transition-all disabled:opacity-50"
          style={isStakeMode ? {
            background: 'linear-gradient(180deg, var(--color-green-hover), var(--color-green))',
            color: '#0a1e0b',
            boxShadow: '0 2px 8px -2px var(--color-green-35)',
          } : { color: 'var(--color-text2)' }}
        >
          Stake
        </button>
        <button
          disabled={isBusy}
          onClick={() => { setMode('unstake'); setAmount(""); }}
          className="flex-1 py-2 rounded font-display font-bold text-sm uppercase tracking-wide transition-all disabled:opacity-50"
          style={!isStakeMode ? {
            background: 'linear-gradient(180deg, var(--color-red-hover), var(--color-red))',
            color: 'white',
            boxShadow: '0 2px 8px -2px var(--color-red-35)',
          } : { color: 'var(--color-text2)' }}
        >
          Unstake
        </button>
      </div>

      {/* ── Amount input ── */}
      <AmountInput
        label="RGD"
        value={amount}
        onChange={setAmount}
        sliderValue={sliderPct}
        onSliderChange={handleSliderChange}
        disabled={showModal}
        balance={`${Number(formatUnits(isStakeMode ? currentWallet : withdrawable, 18)).toLocaleString()} RGD`}
      />

      {/* ── Sub-stats ── */}
      <div className="grid grid-cols-2 gap-2 pt-2 mt-1" style={{ borderTop: '1px solid var(--color-border)' }}>
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
        {/*
        <div className="text-left">
          <p className="section-label mb-1">Available</p>
          <span className="font-mono font-bold text-summary-value text-green" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {Number(formatUnits(withdrawable, 18)).toLocaleString()}
          </span>
        </div>*/}
      </div>

      {/* ── CTA Button ── */}
      <div className="mt-2">
        <button
          disabled={isButtonDisabled}
          onClick={handleStartFlow}
          className="btn-game-primary w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
        >
          {ctaLabel}
        </button>
      </div>

    </div>

    {/* ── Transaction Modal ── */}
    <TxModal
      status={status}
      txHashes={txHashes}
      title={isStakeMode ? 'Staking RGD' : 'Unstaking RGD'}
      successTitle={isStakeMode ? 'Stake Confirmed' : 'Unstake Confirmed'}
      steps={[
        ...(isStakeMode ? [{
          label: 'Approve Spending Allowance',
          description: 'Allow contract to use your RGD',
          activeStatuses: ['approving', 'mining_approval'],
          completeStatuses: ['executing', 'mining_execution', 'success'],
        }] : []),
        {
          label: isStakeMode ? 'Confirm Stake' : 'Confirm Unstake',
          description: isStakeMode ? 'Sign the stake transaction' : 'Sign the unstake transaction',
          activeStatuses: ['executing', 'mining_execution'],
          completeStatuses: ['success'],
        },
      ]}
      onClose={() => { setAmount(''); setStatus('idle'); setTxHashes([]); }}
    />
    </>
  );
}