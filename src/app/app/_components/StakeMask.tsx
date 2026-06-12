'use client';

import React, { useState, useMemo } from 'react';
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

      {/* LEFT: Balance Registry + Info */}
      <div className="flex flex-col gap-4">

        {/* Three-state balance cards */}
        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-3">

          <div className="terminal-pane">
            <div className="terminal-pane-title mb-1">Liquid Wallet</div>
            <div className="font-mono text-xl font-bold text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {fmtRgd(currentWallet)}
            </div>
            <span className="font-mono text-[10px] text-text2 uppercase">RGD Available</span>
          </div>

          <div className="terminal-pane">
            <div className="terminal-pane-title mb-1">Active Staked</div>
            <div className="font-mono text-xl font-bold" style={{ color: 'var(--color-green)', fontVariantNumeric: 'tabular-nums' }}>
              {fmtRgd(withdrawable)}
            </div>
            <span className="font-mono text-[10px] text-text2 uppercase">RGD Withdrawable</span>
          </div>

          <div className="terminal-pane border border-dashed border-border2 [background:linear-gradient(135deg,var(--color-card2)_0%,var(--color-purple-15)_100%)]">
            <div className="terminal-pane-title mb-1">Vault Locked</div>
            <div className="font-mono text-xl font-bold" style={{ color: 'var(--color-gold)', fontVariantNumeric: 'tabular-nums' }}>
              {fmtRgd(currentLocked)}
            </div>
            <span className="font-mono text-[10px] text-text2 uppercase">RGD Locked</span>
          </div>

        </div>

        {/* Summary breakdown */}
        <div className="terminal-pane">
          <div className="terminal-pane-title mb-2">Position Breakdown</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs text-text2">
            <div className="border-r border-border pr-2">
              <p className="mb-1">Total staked (incl. locked):</p>
              <p className="text-sm font-bold text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {fmtRgd(currentStaked)} <span className="text-[10px] font-normal text-text2">RGD</span>
              </p>
            </div>
            <div className="pl-0 sm:pl-2">
              <p className="mb-1">Withdrawable stake:</p>
              <p className="text-sm font-bold" style={{ color: 'var(--color-green)', fontVariantNumeric: 'tabular-nums' }}>
                {fmtRgd(withdrawable)} <span className="text-[10px] font-normal text-text2">RGD free</span>
              </p>
            </div>
          </div>
        </div>

        {/* Protocol disclosure */}
        <div className="bg-card3 border border-border rounded p-3 font-display text-xs text-text2 leading-relaxed">
          <span className="font-bold text-text uppercase font-mono text-[10px] block mb-1">Protocol Liquidity Rule</span>
          Standard staked tokens can be withdrawn instantly. Tokens locked by an active seasons FIM purchase can be withdrawn once the season ends.
        </div>

      </div>

      {/* RIGHT: Interactive Execution Panel */}
      <div className="rounded-md bg-card flex flex-col self-start w-full min-h-0">

        {/* Stake / Unstake Selector Bar */}
        <div className="terminal-view-selector-bar--full">
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

        <div className="flex flex-col gap-4 p-4">

          {/* Amount input + slider (Uses your updated visual component design) */}
          <AmountInput
            label="RGD"
            value={amount}
            onChange={setAmount}
            sliderValue={sliderPct}
            onSliderChange={handleSliderChange}
            disabled={showModal}
            balance={`${Number(formatUnits(maxForSlider, 18)).toLocaleString()} RGD`}
          />

          {/* Transaction preview details */}
          <div className="rounded-lg px-3 py-2.5 bg-card border border-border flex flex-col gap-1.5 font-mono text-xs">
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-text2">Action:</span>
              <span className="font-bold text-text uppercase">{isStakeMode ? 'Stake' : 'Unstake'} RGD</span>
            </div>
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-text2">Post-state staked:</span>
              <span className="font-bold" style={{ color: 'var(--color-purple)', fontVariantNumeric: 'tabular-nums' }}>
                {postStakePool.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RGD
              </span>
            </div>
          </div>

          {/* CTA with loading state support */}
          <button
            disabled={isButtonDisabled}
            onClick={handleStartFlow}
            className={`btn-terminal-action ${isStakeMode ? 'action-buy' : 'action-sell'} gap-2`}
          >
            {isBusy && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
            <span>{ctaLabel}</span>
          </button>

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