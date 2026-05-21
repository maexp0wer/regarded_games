'use client';

import React, { useState, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits, isAddress } from 'viem';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

import { WalletButton } from './WalletButton';
import PercentSlider from '@/components/PercentSlider';

import ERC20Abi from '@/deployments/abis/MockUSDC.json';
import StakingAbi from '@/deployments/abis/Staking.json';
import AuctionAbi from '@/deployments/abis/Auction.json';
import coreAddresses from '@/deployments/local/core.json';

const DEAD_ADDRESS = '0x0000000000000000000000000000000000000000';

type WorkflowStep = 'idle' | 'approving' | 'mining_approval' | 'buying' | 'mining_buy' | 'success' | 'canceled' | 'failed' | 'no_gas';

export function AuctionMask({
  seasonAddress: propSeason,
  auctionAddress: propAuction,
  fimAddress: propFim,
  currentPhase,
  isPhaseLoading = false,
  isPhaseError = false,
}: {
  seasonAddress?: string;
  auctionAddress?: string;
  fimAddress?: string;
  currentPhase: string | null | undefined;
  isPhaseLoading?: boolean;
  isPhaseError?: boolean;
}) {
  const { isConnected } = useAccount();

  const resolvedAuction = (propAuction || DEAD_ADDRESS) as `0x${string}`;
  const resolvedSeason  = (propSeason  || DEAD_ADDRESS) as `0x${string}`;
  const resolvedFim     = (propFim     || DEAD_ADDRESS) as `0x${string}`;

  const isAuctionValid  = resolvedAuction !== DEAD_ADDRESS && isAddress(resolvedAuction);
  const isSeasonValid   = resolvedSeason  !== DEAD_ADDRESS && isAddress(resolvedSeason);
  const isFimValid      = resolvedFim     !== DEAD_ADDRESS && isAddress(resolvedFim);
  const isStakingValid  = !!(coreAddresses.Staking && isAddress(coreAddresses.Staking));
  const isUsdcValid     = !!(coreAddresses.USDC    && isAddress(coreAddresses.USDC));
  const isFullyConfigured = isAuctionValid && isSeasonValid && isFimValid && isStakingValid && isUsdcValid;

  if (!isConnected) {
    return (
      <div className="card-app flex flex-col items-center justify-center gap-5 text-center h-full">
        <div>
          <p className="section-label mb-2">Auction</p>
          <p className="font-mono text-[13px] text-text2">Connect your wallet to participate.</p>
        </div>
        <WalletButton />
      </div>
    );
  }

  if (!isFullyConfigured) {
    return (
      <div className="card-app flex items-center justify-center h-full">
        <p className="section-label animate-pulse">Reading Ledger...</p>
      </div>
    );
  }

  return (
    <AuctionMaskInner
      seasonAddress={resolvedSeason}
      auctionAddress={resolvedAuction}
      fimAddress={resolvedFim}
      currentPhase={currentPhase}
      isPhaseLoading={isPhaseLoading}
      isPhaseError={isPhaseError}
    />
  );
}

function AuctionMaskInner({
  seasonAddress,
  auctionAddress,
  fimAddress,
  currentPhase,
  isPhaseLoading,
  isPhaseError,
}: {
  seasonAddress: string;
  auctionAddress: string;
  fimAddress: string;
  currentPhase: string | null | undefined;
  isPhaseLoading: boolean;
  isPhaseError: boolean;
}) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const queryClient  = useQueryClient();

  const [buyAmount, setBuyAmount] = useState('');
  const [status, setStatus] = useState<WorkflowStep>('idle');

  const stakingAddr = (coreAddresses as any).Staking as `0x${string}`;
  const usdcAddr    = (coreAddresses as any).USDC    as `0x${string}`;

  // --- Contract reads ---
  const { data: stakedBalances,      refetch: refetchStaked }   = useReadContract({ address: stakingAddr, abi: StakingAbi, functionName: 'stakedBalances',  args: [address] });
  const { data: requiredRegStake,    refetch: refetchRequired } = useReadContract({ address: stakingAddr, abi: StakingAbi, functionName: 'requiredRegStake', args: [address] });
  const { data: fimWallet, refetch: refetchFimWallet, isFetching: isFimFetching } = useReadContract({ address: fimAddress as `0x${string}`, abi: ERC20Abi, functionName: 'balanceOf', args: [address], query: { refetchInterval: 5000 } });
  const { data: usdcWallet,  refetch: refetchUsdcWallet }            = useReadContract({ address: usdcAddr,    abi: ERC20Abi, functionName: 'balanceOf', args: [address] });
  const { data: usdcAllowance, refetch: refetchUsdcAllowance }       = useReadContract({ address: usdcAddr,    abi: ERC20Abi, functionName: 'allowance', args: [address, auctionAddress as `0x${string}`], query: { staleTime: 0 } });

  const { writeContractAsync } = useWriteContract();

  const isAuctionPhase = currentPhase === 'AUCTION';

  // --- Math ---
  const usdcToBuyBigInt   = buyAmount ? parseUnits(buyAmount, 6) : 0n;
  const currentStaked     = (stakedBalances   as bigint) ?? 0n;
  const currentLocked     = (requiredRegStake as bigint) ?? 0n;
  const hasStakedAnything = currentStaked > 0n;
  const currentFim              = (fimWallet   as bigint) ?? 0n;
  const currentUsdcInWallet     = (usdcWallet  as bigint) ?? 0n;
  const totalEligibleFim        = useMemo(() => currentStaked ? currentStaked * 10n : 0n, [currentStaked]);
  const remainingFimAllowance   = totalEligibleFim > currentFim ? totalEligibleFim - currentFim : 0n;
  const isMaxedOut              = hasStakedAnything && remainingFimAllowance === 0n;
  const inputAsFim              = usdcToBuyBigInt * 1000000000000n;
  const isOverLimit             = hasStakedAnything && inputAsFim > remainingFimAllowance && remainingFimAllowance > 0n;

  const maxUsdc = useMemo(() => {
    const usdcNeeded = remainingFimAllowance / 1000000000000n;
    return usdcNeeded > currentUsdcInWallet ? currentUsdcInWallet : usdcNeeded;
  }, [remainingFimAllowance, currentUsdcInWallet]);

  const sliderPct = useMemo(() => {
    if (!buyAmount || maxUsdc === 0n) return 0;
    return Math.min(100, Math.round(Number((usdcToBuyBigInt * 100n) / maxUsdc)));
  }, [buyAmount, usdcToBuyBigInt, maxUsdc]);

  const handleSliderChange = (pct: number) => setBuyAmount(formatUnits((maxUsdc * BigInt(pct)) / 100n, 6));

  // --- Transaction orchestrator ---
  const handleStartFlow = async () => {
    if (!publicClient || !address || !usdcToBuyBigInt) return;
    try {
      const liveAllowance = await publicClient.readContract({
        address: usdcAddr, abi: ERC20Abi, functionName: 'allowance', args: [address, auctionAddress as `0x${string}`],
      }) as bigint;

      if (liveAllowance < usdcToBuyBigInt) {
        setStatus('approving');
        const hash = await writeContractAsync({ address: usdcAddr, abi: ERC20Abi, functionName: 'approve', args: [auctionAddress as `0x${string}`, usdcToBuyBigInt] });
        setStatus('mining_approval');
        await publicClient.waitForTransactionReceipt({ hash });
        refetchUsdcAllowance();
      }

      setStatus('buying');
      const buyHash = await writeContractAsync({ address: auctionAddress as `0x${string}`, abi: AuctionAbi, functionName: 'buyFIM', args: [usdcToBuyBigInt] });
      setStatus('mining_buy');
      await publicClient.waitForTransactionReceipt({ hash: buyHash });
      setStatus('success');

      refetchStaked(); refetchRequired(); refetchUsdcAllowance(); refetchUsdcWallet(); refetchFimWallet();
      queryClient.invalidateQueries({ queryKey: ['auctionHistory', seasonAddress.toLowerCase()] });

      setTimeout(() => { setBuyAmount(''); setStatus('idle'); }, 2500);
    } catch (err: any) {
      console.error('Workflow Error:', err);
      const isRejection       = err.shortMessage?.includes('rejected') || err.message?.includes('User rejected');
      const isInsufficientGas = err.message?.includes('insufficient funds') || err.name === 'InsufficientFundsError';
      setStatus(isRejection ? 'canceled' : isInsufficientGas ? 'no_gas' : 'failed');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  // --- Display helpers ---
  const fimDisplayValue        = isFimFetching ? '...' : Number(formatUnits(currentFim, 18)).toLocaleString();
  const eligibleDisplay        = Number(formatUnits(totalEligibleFim,      18)).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const additionalEligibleDisplay = Number(formatUnits(remainingFimAllowance, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const stakedDisplay          = Number(formatUnits(currentStaked, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const lockedDisplay          = Number(formatUnits(currentLocked, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 });

  const getProgressWidth = () => ({ idle: '0%', approving: '15%', mining_approval: '40%', buying: '60%', mining_buy: '85%', success: '100%', canceled: '0%', failed: '0%', no_gas: '0%' }[status]);

  const getButtonLabel = () => {
    switch (status) {
      case 'approving':       return 'Step 1/2: Approve USDC…';
      case 'mining_approval': return 'Step 1/2: Confirming…';
      case 'buying':          return 'Step 2/2: Sign Purchase…';
      case 'mining_buy':      return 'Step 2/2: Finalizing…';
      case 'success':         return 'FIM Purchased ✓';
      case 'canceled':        return 'Canceled';
      case 'no_gas':          return 'Insufficient Gas';
      case 'failed':          return 'Transaction Failed';
    }
    if (!hasStakedAnything) return 'Stake REGARDS to Unlock';
    if (isMaxedOut) return 'Stake More REGARDS';
    if (isOverLimit) return `Limit Exceeded`;
    return 'Buy FIM →';
  };

  const isBusy    = ['approving', 'mining_approval', 'buying', 'mining_buy'].includes(status);
  const isSuccess = status === 'success';
  const isError   = ['canceled', 'failed', 'no_gas'].includes(status);
  const isButtonDisabled = isBusy || isSuccess || isError || !buyAmount || !hasStakedAnything || isMaxedOut || isOverLimit;

  const widgetDisabled = !hasStakedAnything || isMaxedOut;

  return (
    <div
      className="card-app flex flex-col gap-5 h-full border-border2"
    >
      {/* ── FIM Balance ── */}
      <div>
        <p className="section-label mb-1">FIM Balance</p>
        <div
          className="font-display font-extrabold leading-none text-display-trading"
          style={{
            color: 'var(--color-gold)',
            textShadow: '0 0 40px var(--color-gold-35)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {fimDisplayValue}
          <span className="font-mono font-medium text-text2 ml-2 text-currency-label">FIM</span>
        </div>
      </div>

      {/* ── Phase guards ── */}
      {isPhaseLoading ? (
        <p className="section-label animate-pulse">Loading Phase…</p>
      ) : isPhaseError || currentPhase == null ? (
        <div className="rounded-lg px-4 py-3 text-center surface-red-warn">
          <p className="font-mono text-[10px] uppercase font-bold tracking-widest" style={{ color: 'var(--color-red)' }}>Phase data unavailable</p>
        </div>
      ) : !isAuctionPhase ? (
        <div className="rounded-lg px-4 py-3 text-center" style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)' }}>
          <p className="section-label">Season on Hold</p>
        </div>
      ) : (
        <>
          {/* Staking warning */}
          {!hasStakedAnything && (
            <Link href="/stake">
              <div
                className="rounded-lg px-4 py-3 text-center cursor-pointer transition-opacity hover:opacity-80 surface-pink-warn"
              >
                <p className="font-mono text-[10px] uppercase font-bold tracking-widest text-red">
                  No Collateral Staked
                </p>
                <p className="font-mono text-[10px] text-text2 mt-1 tracking-wide">
                  Stake REGARDS to unlock buying →
                </p>
              </div>
            </Link>
          )}

          {/* ── Buy widget ── */}
          <div
            className={`rounded-lg p-4 flex flex-col gap-3 transition-opacity ${widgetDisabled ? 'opacity-40 pointer-events-none' : ''}`}
            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
          >
            {/* Widget header */}
            <div className="flex items-center justify-between">
              <span className="section-label">Buy FIM with USDC</span>
              <span className="font-mono text-[11px] text-text2 ml-2">
                WALLET · <span className="text-text font-semibold">{Number(formatUnits(currentUsdcInWallet, 6)).toLocaleString()} USDC</span>
              </span>
            </div>

            {/* Amount input */}
            <input
              type="number"
              placeholder="0.00"
              className="text-input bg-transparent border-none p-0 w-full font-mono font-bold text-text outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              value={buyAmount}
              onChange={(e) => setBuyAmount(e.target.value)}
              disabled={isBusy || isSuccess || isError}
            />

            {/* % slider */}
            <PercentSlider value={sliderPct} onChange={handleSliderChange} disabled={isBusy || isSuccess || isError} />
          </div>

          {/* ── CTA button ── */}
          <div className="relative rounded-lg overflow-hidden">
            {/* Progress track */}
            {!isError && status !== 'idle' && (
              <div
                className="absolute inset-y-0 left-0 transition-all duration-500"
                style={{ width: getProgressWidth(), background: isSuccess ? 'var(--color-green)' : 'var(--color-gold-35)' }}
              />
            )}
            <button
              onClick={handleStartFlow}
              disabled={isButtonDisabled}
              className={`relative z-10 w-full py-4 font-mono font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all
                ${isSuccess ? 'bg-green! text-card!' : ''}
                ${isError   ? 'bg-red! text-white!' : ''}
                ${!isButtonDisabled && !isSuccess && !isError ? 'btn-primary' : ''}
                ${isButtonDisabled && !isBusy && !isSuccess && !isError ? 'bg-card2! text-text2! cursor-not-allowed!' : ''}
              `}
            >
              {isBusy && <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />}
              {getButtonLabel()}
            </button>
          </div>
        </>
      )}

      {/* ── Stats grid ── */}
      <div
        className="grid grid-cols-2 gap-0 rounded-lg overflow-hidden mt-auto"
        style={{ border: '1px solid var(--color-border)' }}
      >
        {/* Eligible FIM Remaining (Total) */}
        <div
          className="flex flex-col gap-1 p-3"
          style={{ background: 'var(--color-card2)', borderRight: '1px solid var(--color-border)' }}
        >
          <span className="section-label">Eligible FIM REMAINING (TOTAL)</span>
          <span className="font-mono font-semibold text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ color: 'var(--color-gold)' }}>{additionalEligibleDisplay}</span>
            <span className="text-text2 font-normal text-xs ml-1">({eligibleDisplay})</span>
          </span>
        </div>

        {/* REGARDS Locked (Staked) */}
        <div
          className="flex flex-col gap-1 p-3"
          style={{ background: 'var(--color-card2)' }}
        >
          <span className="section-label">REGARDS LOCKED (STAKED)</span>
          <span className="font-mono font-semibold text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ color: currentLocked > 0n ? 'var(--color-red)' : 'var(--color-text2)' }}>{currentLocked > 0n ? lockedDisplay : '0'}</span>
            <span className="text-text2 font-normal text-xs ml-1">({stakedDisplay})</span>
          </span>
        </div>
      </div>
    </div>
  );
}
