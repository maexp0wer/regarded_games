'use client';

import React, { useState, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits, isAddress } from 'viem';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

import { WalletButton } from './WalletButton';
import AmountInput from '@/components/AmountInput';
import { sliderPctToAmount } from '@/utils/sliderAmount';
import { PercentileCircle } from './PercentileCircle';
import { useBatchPlayerPercentiles } from '@/hooks/useBatchPlayerPercentiles';

import ERC20Abi from '@/deployments/abis/FakeUSDC.json';
import StakingAbi from '@/deployments/abis/Staking.json';
import AuctionAbi from '@/deployments/abis/Auction.json';
import { useTenantDeployment, useTenantChainId } from '@/context/TenantContext';
import { TxModal } from './TxModal';
import { friendlyRevertReason, isUserRejection, isInsufficientGas } from '@/utils/revertReason';
import { useCollateral } from '@/hooks/useCollateral';

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
  const [errorReason, setErrorReason] = useState<string | null>(null);

  const stakingAddr = coreAddresses.Staking as `0x${string}`;
  const usdcAddr    = coreAddresses.USDC    as `0x${string}`;

  // --- Contract reads ---
  const { data: stakedBalances, refetch: refetchStaked } = useReadContract({ address: stakingAddr, abi: StakingAbi, functionName: 'stakedBalances', args: [address], chainId });
  const { data: fimWallet, refetch: refetchFimWallet, isFetching: isFimFetching } = useReadContract({ address: fimAddress as `0x${string}`, abi: ERC20Abi, functionName: 'balanceOf', args: [address], chainId, query: { refetchInterval: 5000 } });
  const { data: usdcWallet,  refetch: refetchUsdcWallet }            = useReadContract({ address: usdcAddr,    abi: ERC20Abi, functionName: 'balanceOf', args: [address], chainId });
  const { refetch: refetchUsdcAllowance } = useReadContract({ address: usdcAddr, abi: ERC20Abi, functionName: 'allowance', args: [address, auctionAddress as `0x${string}`], chainId, query: { staleTime: 0 } });

  const userMakers = useMemo(() => (address ? [address.toLowerCase()] : []), [address]);
  const { data: userStatsMap } = useBatchPlayerPercentiles(seasonAddress, userMakers, auctionAddress);
  const userStats = address ? userStatsMap?.[address.toLowerCase()] : undefined;

  const { writeContractAsync } = useWriteContract();

  const isAuctionPhase = currentPhase === 'AUCTION';

  // Collateral headroom drives how much FIM the stake can still back. Reads the
  // shared rate (rgdLockedPerFim) from the Auction — identical to the Exchange's
  // — so the auction and trading collateral checks can never disagree (see ADR
  // 0001; replaces the old hardcoded ×10 ratio).
  const collateral = useCollateral(seasonAddress, auctionAddress);

  // --- Math ---
  const usdcToBuyBigInt   = buyAmount ? parseUnits(buyAmount, 6) : 0n;
  const currentStaked     = (stakedBalances as bigint) ?? 0n;
  const hasStakedAnything = currentStaked > 0n;
  const currentFim              = (fimWallet   as bigint) ?? 0n;
  const currentUsdcInWallet     = (usdcWallet  as bigint) ?? 0n;
  // Remaining FIM the stake can collateralize == headroom converted to FIM.
  // `maxBuyableFim` already nets out FIM the user holds (headroom = staked −
  // required, and `required` reflects held FIM), so it IS the remaining allowance.
  const remainingFimAllowance   = collateral.maxBuyableFim;
  const isMaxedOut              = hasStakedAnything && collateral.isReady && remainingFimAllowance === 0n;
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
    setErrorReason(null);
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
    } catch (err: unknown) {
      console.error('Workflow Error:', err);
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
      {(currentFim > 0n || userStats) && (
        <div className="terminal-pane">
          <div className="terminal-pane-header flex items-center justify-between">
            <span className="terminal-pane-title">Balance</span>
            <span className="terminal-pane-title">Expected Class Rank</span>
          </div>
          <div className="flex items-center justify-between">
            {currentFim > 0n && (
              <div
                className="font-mono font-extrabold leading-none text-display-trading tabular-nums"
                style={{ color: userStats?.isCapitalist ? 'var(--color-gold)' : 'var(--color-purple)', textShadow: `0 0 40px ${userStats?.isCapitalist ? 'var(--color-gold-35)' : 'var(--color-purple-35)'}` }}
              >
                {fimDisplayValue}
                <span className="font-mono font-medium text-text2 ml-2 text-currency-label">FIM</span>
              </div>
            )}
            {userStats && (
              <div className="flex flex-col items-end min-w-0 ml-auto shrink-0">
                <PercentileCircle percentage={userStats.factionPercentile} isCapitalist={userStats.isCapitalist} size="lg" />
              </div>
            )}
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
          <div className="rounded-lg px-4 py-3 text-center" style={{ background: 'var(--color-red-15)', border: '1px solid var(--color-red)' }}>
            <p className="section-label" style={{ color: 'var(--color-red)' }}>Season on Hold</p>
          </div>
        ) : (
          <>
            {/* ── Buy widget ── */}
            <div className={`transition-opacity ${widgetDisabled ? 'opacity-40 pointer-events-none' : ''}`}>
              <AmountInput
                label="USDC"
                decimals={6}
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
      errorReason={errorReason}
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
      onClose={() => { setBuyAmount(''); setStatus('idle'); setTxHashes([null, null]); setErrorReason(null); }}
    />
    </>
  );
}
