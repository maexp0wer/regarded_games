'use client';

import React, { useState, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits, isAddress } from 'viem';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

import { WalletButton } from './WalletButton';
import AmountInput from '@/components/AmountInput';
import { sliderPctToAmount } from '@/utils/sliderAmount';

import ERC20Abi from '@/deployments/abis/FakeUSDC.json';
import StakingAbi from '@/deployments/abis/Staking.json';
import AuctionAbi from '@/deployments/abis/Auction.json';
import { useTenantDeployment, useTenantChainId } from '@/context/TenantContext';
import { TxModal } from './TxModal';

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
  const coreAddresses = useTenantDeployment();

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
      <div className="terminal-pane connect-gate">
        <div className="terminal-pane-header">
          <span className="terminal-pane-title">Auction</span>
        </div>
        <div className="connect-gate-body">
          <span className="terminal-pane-title" style={{ color: 'var(--color-text2)' }}>Connect your wallet to participate</span>
          <WalletButton />
        </div>
      </div>
    );
  }

  if (!isFullyConfigured) {
    return (
      <div className="flex items-center justify-center h-full">
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
  const chainId = useTenantChainId();
  const publicClient = usePublicClient({ chainId });
  const queryClient  = useQueryClient();
  const coreAddresses = useTenantDeployment();

  const [buyAmount, setBuyAmount] = useState('');
  const [status, setStatus] = useState<WorkflowStep>('idle');
  const [txHashes, setTxHashes] = useState<(string | null)[]>([null, null]);

  const stakingAddr = coreAddresses.Staking as `0x${string}`;
  const usdcAddr    = coreAddresses.USDC    as `0x${string}`;

  // --- Contract reads ---
  const { data: stakedBalances, refetch: refetchStaked } = useReadContract({ address: stakingAddr, abi: StakingAbi, functionName: 'stakedBalances', args: [address], chainId });
  const { data: fimWallet, refetch: refetchFimWallet, isFetching: isFimFetching } = useReadContract({ address: fimAddress as `0x${string}`, abi: ERC20Abi, functionName: 'balanceOf', args: [address], chainId, query: { refetchInterval: 5000 } });
  const { data: usdcWallet,  refetch: refetchUsdcWallet }            = useReadContract({ address: usdcAddr,    abi: ERC20Abi, functionName: 'balanceOf', args: [address], chainId });
  const { refetch: refetchUsdcAllowance } = useReadContract({ address: usdcAddr, abi: ERC20Abi, functionName: 'allowance', args: [address, auctionAddress as `0x${string}`], chainId, query: { staleTime: 0 } });

  const { writeContractAsync } = useWriteContract();

  const isAuctionPhase = currentPhase === 'AUCTION';

  // --- Math ---
  const usdcToBuyBigInt   = buyAmount ? parseUnits(buyAmount, 6) : 0n;
  const currentStaked     = (stakedBalances as bigint) ?? 0n;
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
    return Math.min(100, Number((usdcToBuyBigInt * 10000n) / maxUsdc) / 100);
  }, [buyAmount, usdcToBuyBigInt, maxUsdc]);

  const handleSliderChange = (pct: number) => setBuyAmount(sliderPctToAmount(pct, Number(formatUnits(maxUsdc, 6))));

  // --- Transaction orchestrator ---
  const handleStartFlow = async () => {
    if (!publicClient || !address || !usdcToBuyBigInt) return;
    setTxHashes([null, null]);
    try {
      const liveAllowance = await publicClient.readContract({
        address: usdcAddr, abi: ERC20Abi, functionName: 'allowance', args: [address, auctionAddress as `0x${string}`],
      }) as bigint;

      let approveHash: string | null = null;
      if (liveAllowance < usdcToBuyBigInt) {
        setStatus('approving');
        approveHash = await writeContractAsync({ address: usdcAddr, abi: ERC20Abi, functionName: 'approve', args: [auctionAddress as `0x${string}`, usdcToBuyBigInt] });
        setStatus('mining_approval');
        await publicClient.waitForTransactionReceipt({ hash: approveHash as `0x${string}` });
        setTxHashes([approveHash, null]);
        refetchUsdcAllowance();
      }

      setStatus('buying');
      const buyHash = await writeContractAsync({ address: auctionAddress as `0x${string}`, abi: AuctionAbi, functionName: 'buyFIM', args: [usdcToBuyBigInt] });
      setStatus('mining_buy');
      await publicClient.waitForTransactionReceipt({ hash: buyHash });
      setTxHashes([approveHash, buyHash]);
      setStatus('success');

      refetchStaked(); refetchUsdcAllowance(); refetchUsdcWallet(); refetchFimWallet();
      queryClient.invalidateQueries({ queryKey: ['auctionHistory', seasonAddress.toLowerCase()] });

      setTimeout(() => { setBuyAmount(''); setStatus('idle'); setTxHashes([null, null]); }, 2500);
    } catch (err: any) {
      console.error('Workflow Error:', err);
      const isRejection       = err.shortMessage?.includes('rejected') || err.message?.includes('User rejected');
      const isInsufficientGas = err.message?.includes('insufficient funds') || err.name === 'InsufficientFundsError';
      setStatus(isRejection ? 'canceled' : isInsufficientGas ? 'no_gas' : 'failed');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  // --- Display helpers ---
  const fimDisplayValue = isFimFetching ? '...' : Number(formatUnits(currentFim, 18)).toLocaleString();

  const isBusy    = ['approving', 'mining_approval', 'buying', 'mining_buy'].includes(status);
  const showModal = status !== 'idle' && status !== 'canceled';

  const getButtonLabel = () => {
    if (!hasStakedAnything) return 'Stake REGARDS to Unlock';
    if (isMaxedOut) return 'Stake More REGARDS';
    if (isOverLimit) return 'Limit Exceeded';
    return 'Buy FIM';
  };

  const isButtonDisabled = isBusy || showModal || !buyAmount || !hasStakedAnything || isMaxedOut || isOverLimit;

  const needsStaking   = !hasStakedAnything || isMaxedOut;
  const widgetDisabled = needsStaking;

  return (
    <>
    <div className="flex flex-col gap-5 h-full relative">

      {/* ── FIM Balance card ── */}
      {currentFim > 0n && (
        <div className="terminal-pane">
          <div className="terminal-pane-header">
            <span className="terminal-pane-title">Balance</span>
          </div>
          <div
            className="font-mono font-extrabold leading-none text-display-trading tabular-nums"
            style={{ color: 'var(--color-gold)', textShadow: '0 0 40px var(--color-gold-35)' }}
          >
            {fimDisplayValue}
            <span className="font-mono font-medium text-text2 ml-2 text-currency-label">FIM</span>
          </div>
        </div>
      )}

      {/* ── Auction panel card ── */}
      <div className="terminal-pane bg-card! flex flex-col gap-0 flex-1 min-h-0">
        <div className="terminal-pane-header">
          <span className="terminal-pane-title">Auction</span>
        </div>

        {/* ── Phase guards ── */}
        {isPhaseLoading ? (
          <p className="section-label animate-pulse">Loading Phase…</p>
        ) : isPhaseError || currentPhase == null ? (
          <div className="rounded-lg px-4 py-3 text-center bg-(--color-red-15) border border-(--color-red-35)">
            <p className="font-mono text-[10px] uppercase font-bold tracking-widest" style={{ color: 'var(--color-red)' }}>Phase data unavailable</p>
          </div>
        ) : !isAuctionPhase ? (
          <div className="rounded-lg px-4 py-3 text-center" style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)' }}>
            <p className="section-label">Season on Hold</p>
          </div>
        ) : (
          <>
            {/* ── Buy widget ── */}
            <div className={`transition-opacity ${widgetDisabled ? 'opacity-40 pointer-events-none' : ''}`}>
              <AmountInput
                label="USDC"
                value={buyAmount}
                onChange={setBuyAmount}
                sliderValue={sliderPct}
                onSliderChange={handleSliderChange}
                disabled={showModal}
                balance={`${Number(formatUnits(currentUsdcInWallet, 6)).toLocaleString()} USDC`}
              />
            </div>
          </>
        )}

        {/* ── CTA ── */}
        <div className="mt-auto pt-3 flex flex-col gap-3 border-t border-border">
          {isAuctionPhase && (
            needsStaking ? (
              <Link href="/stake" className="btn-game-primary text-center">
                {isMaxedOut ? 'Stake More REGARDS' : 'Stake REGARDS to Unlock'}
              </Link>
            ) : (
              <button
                onClick={handleStartFlow}
                disabled={isButtonDisabled}
                className="btn-terminal-action action-buy"
              >
                {getButtonLabel()}
              </button>
            )
          )}
        </div>

      </div>
    </div>

    <TxModal
      status={status}
      txHashes={txHashes}
      title="Buying FIM"
      successTitle="FIM Purchased"
      steps={[
        {
          label: 'Approve USDC Spending',
          description: 'Allow the auction contract to use your USDC',
          activeStatuses: ['approving', 'mining_approval'],
          completeStatuses: ['buying', 'mining_buy', 'success'],
        },
        {
          label: 'Purchase FIM',
          description: 'Sign the buy transaction',
          activeStatuses: ['buying', 'mining_buy'],
          completeStatuses: ['success'],
        },
      ]}
      onClose={() => { setBuyAmount(''); setStatus('idle'); setTxHashes([null, null]); }}
    />
    </>
  );
}
