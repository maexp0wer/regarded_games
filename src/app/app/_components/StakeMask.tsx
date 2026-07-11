'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';

import { WalletButton } from './WalletButton';
import AmountInput from '@/components/AmountInput';
import { sliderPctToAmount } from '@/utils/sliderAmount';
import { TxModal } from './TxModal';

// ABIs
import ERC20AbiRaw from '@/deployments/abis/FakeUSDC.json';
import StakingAbiRaw from '@/deployments/abis/Staking.json';
import type { Abi } from 'abitype';
import { useTenantDeployment, useTenantChainId } from '@/context/TenantContext';
import { friendlyRevertReason, isUserRejection, isInsufficientGas } from '@/utils/revertReason';

const ERC20Abi = ERC20AbiRaw as Abi;
const StakingAbi = StakingAbiRaw as Abi;

type WorkflowStep = 'idle' | 'approving' | 'mining_approval' | 'executing' | 'mining_execution' | 'success' | 'canceled' | 'failed' | 'no_gas';

export function StakeMask() {
  const { address, isConnected } = useAccount();
  const chainId = useTenantChainId();
  const publicClient = usePublicClient({ chainId });
  const { writeContractAsync } = useWriteContract();
  const coreAddresses = useTenantDeployment();

  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<'stake' | 'unstake'>('stake');
  const [status, setStatus] = useState<WorkflowStep>('idle');
  const [txHashes, setTxHashes] = useState<(string | null)[]>([]);
  const [errorReason, setErrorReason] = useState<string | null>(null);

  const stakingAddr = coreAddresses.Staking as `0x${string}`;
  const rgdAddr = coreAddresses.RGD as `0x${string}`;

  // --- 1. Contract Reads ---
  // Locked RGD (requiredRegStake) and the withdrawable amount now change on
  // trades/bids made elsewhere (collateral is reserved/released on the
  // Exchange), not just on this page's own stake/unstake. Poll so the dashboard
  // stays live; the per-action refetch below still gives an instant update.
  const { data: stakedBalances, refetch: refetchStaked } = useReadContract({
    address: stakingAddr, abi: StakingAbi, functionName: 'stakedBalances', args: address ? [address] : undefined, chainId,
    query: { enabled: !!address, refetchInterval: 5000 },
  });
  const { data: requiredRegStake, refetch: refetchRequired } = useReadContract({
    address: stakingAddr, abi: StakingAbi, functionName: 'requiredRegStake', args: address ? [address] : undefined, chainId,
    query: { enabled: !!address, refetchInterval: 5000 },
  });
  const { data: walletBalance, refetch: refetchWallet } = useReadContract({
    address: rgdAddr, abi: ERC20Abi, functionName: 'balanceOf', args: address ? [address] : undefined, chainId,
    query: { enabled: !!address, refetchInterval: 5000 },
  });
  const { refetch: refetchAllowance } = useReadContract({
    address: rgdAddr, abi: ERC20Abi, functionName: 'allowance', args: address ? [address, stakingAddr] : undefined, chainId,
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
    setAmount(sliderPctToAmount(pct, Number(formatUnits(maxForSlider, 18))));
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
    setErrorReason(null);

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

    } catch (err: unknown) {
      console.error("Workflow Error:", err);

      if (isUserRejection(err)) {
        setStatus('canceled');
        setTimeout(() => setStatus('idle'), 2000);
      } else if (isInsufficientGas(err)) {
        setStatus('no_gas');
      } else {
        setErrorReason(friendlyRevertReason(err));
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

  const fmtRgd = (val: bigint) =>
    Number(formatUnits(val, 18)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const postStakePool = isStakeMode
    ? Number(formatUnits(currentStaked + amountBigInt, 18))
    : Number(formatUnits(currentStaked > amountBigInt ? currentStaked - amountBigInt : 0n, 18));

  if (!isConnected) {
    return (
      <div className="terminal-pane connect-gate w-full">
        <div className="terminal-pane-header">
          <span className="terminal-pane-title">Stake</span>
        </div>
        <div className="connect-gate-body">
          <span className="terminal-pane-title" style={{ color: 'var(--color-text2)' }}>Connect your wallet to participate</span>
          <WalletButton />
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="grid grid-cols-1 gap-6 w-full md:grid-cols-[4fr_3fr]">

      {/* LEFT: Position detail */}
      <div className="flex flex-col gap-4">

        {/* Position breakdown — Detail Card */}
        <div className="terminal-pane h-full">
          <div className="terminal-pane-header">
            <span className="terminal-pane-title">Position Breakdown</span>
          </div>
          <div className="flex flex-col gap-3">
            <div className="kv-row">
              <span className="font-mono text-[11px] text-text2">Total RGD</span>
              <span className="font-mono text-[13px] font-semibold text-text tabular-nums">
                {fmtRgd(currentWallet + currentStaked)}<span className="text-text2 font-normal ml-1">RGD</span>
              </span>
            </div>
            <div className="kv-row">
              <span className="font-mono text-[11px] text-text2">Staked</span>
              <span className="font-mono text-[13px] font-semibold text-text tabular-nums">
                {fmtRgd(currentStaked)}<span className="text-text2 font-normal ml-1">RGD</span>
              </span>
            </div>
            <div className="kv-row">
              <span className="font-mono text-[11px] text-text2">Withdrawable</span>
              <span className="font-mono text-[13px] font-semibold text-green tabular-nums">
                {fmtRgd(withdrawable)}<span className="text-text2 font-normal ml-1">RGD</span>
              </span>
            </div>
            <div className="kv-row">
              <span className="font-mono text-[11px] text-text2">Locked</span>
              <span className="font-mono text-[13px] font-semibold text-text tabular-nums">
                {fmtRgd(currentLocked)}<span className="text-text2 font-normal ml-1">RGD</span>
              </span>
            </div>
          </div>
        </div>

        {/* Protocol disclosure */}
        <div className="bg-card3 border border-border rounded-lg flex flex-col gap-1.5 p-3">
          <span className="section-label">Protocol Liquidity Rule</span>
          <p className="font-sans text-xs text-text2 leading-relaxed">
            Standard staked tokens can be withdrawn instantly. Tokens locked by an active
            season&rsquo;s FIM purchase can be withdrawn once the season ends.
          </p>
        </div>

      </div>

      {/* RIGHT: Execution Mask */}
      <div className="terminal-pane bg-card! flex flex-col gap-0 self-start w-full min-h-0 p-0!">

        {/* Stake / Unstake selector bar */}
        <div className="terminal-view-selector-bar terminal-view-selector-bar--full">
          <button
            disabled={isBusy}
            onClick={() => { setMode('stake'); setAmount(""); }}
            className={`terminal-view-btn${isStakeMode ? ' active' : ''}`}
          >
            Stake
          </button>
          <button
            disabled={isBusy}
            onClick={() => { setMode('unstake'); setAmount(""); }}
            className={`terminal-view-btn${!isStakeMode ? ' active' : ''}`}
          >
            Unstake
          </button>
        </div>

        <div className="flex flex-col flex-1 min-h-0 gap-4 p-4">

          {/* Amount input + slider */}
          <AmountInput
            label="RGD"
            decimals={18}
            value={amount}
            onChange={setAmount}
            sliderValue={sliderPct}
            onSliderChange={handleSliderChange}
            disabled={showModal}
            balance={`${Number(formatUnits(maxForSlider, 18)).toLocaleString()} RGD`}
            max={Number(formatUnits(maxForSlider, 18))}
          />

          {/* Transaction preview — order-summary style (matches TradingMask) */}
          <div className="rounded-lg flex flex-col bg-card border border-border overflow-hidden">
            <div
              className="flex justify-between font-mono text-xs font-bold tabular-nums px-3 py-2.5 border-b border-border"
              style={{ color: isStakeMode ? 'var(--color-green)' : 'var(--color-red)' }}
            >
              <span>{isStakeMode ? 'Stake' : 'Unstake'}</span>
              <span>
                {Number(amount || '0').toLocaleString(undefined, { maximumFractionDigits: 2 })} RGD
              </span>
            </div>
            <div className="flex justify-between font-mono text-xs font-bold text-text px-3 py-2.5">
              <span>Post-state Staked</span>
              <span className="tabular-nums">
                {postStakePool.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RGD
              </span>
            </div>
          </div>

          {/* CTA pinned to the bottom of the mask */}
          <div className="mt-auto pt-3 flex flex-col gap-3">
            {isStakeMode && currentWallet === 0n ? (
              <Link href="/swap" className="btn-game-primary text-center">
                Buy RGD
              </Link>
            ) : (
              <button
                disabled={isButtonDisabled}
                onClick={handleStartFlow}
                className={`btn-terminal-action ${isStakeMode ? 'action-buy' : 'action-sell'} gap-2`}
              >
                {isBusy && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                <span>{ctaLabel}</span>
              </button>
            )}
          </div>

        </div>
      </div>

    </div>

    <TxModal
      status={status}
      txHashes={txHashes}
      title={isStakeMode ? 'Staking RGD' : 'Unstaking RGD'}
      successTitle={isStakeMode ? 'Stake Confirmed' : 'Unstake Confirmed'}
      errorReason={errorReason}
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
      onClose={() => { setAmount(''); setStatus('idle'); setTxHashes([]); setErrorReason(null); }}
    />
    </>
  );
}