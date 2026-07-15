'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { formatUnits } from 'viem';
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';
import ExchangeAbi from '@/deployments/abis/Exchange.json';
import ERC20Abi from '@/deployments/abis/FakeUSDC.json';
import type { Abi } from 'abitype';
import { usePayout } from '@/hooks/usePayout';
import { useOpenOrders } from '@/hooks/useOpenOrders';
import { useSeasonVictory } from '@/hooks/useSeasonVictory';
import { useSeasonPhase } from '@/hooks/useSeasonPhase';
import { useSeasonEndgame } from '@/hooks/useSeasonEndgame';
import { useChainTime } from '@/hooks/useChainTime';
import { useTenantChainId, useTenantDeployment } from '@/context/TenantContext';
import { TxModal } from './TxModal';
import { WalletButton } from './WalletButton';
import { CountdownTicker } from './CountdownTicker';
import { friendlyRevertReason, isUserRejection, isInsufficientGas } from '@/utils/revertReason';

type TxStatus =
  | 'idle' | 'approving' | 'mining_approval' | 'executing' | 'mining'
  | 'success' | 'canceled' | 'failed' | 'no_gas';

interface PayoutMaskProps {
  seasonAddress: string;
  exchangeAddress: string;
  className?: string;
}

/** Shared tx-error → status mapping for every flow in this mask. */
function statusFromError(err: unknown, setStatus: (s: TxStatus) => void, setReason: (r: string | null) => void) {
  if (isUserRejection(err)) {
    setStatus('canceled');
    setTimeout(() => setStatus('idle'), 2000);
  } else if (isInsufficientGas(err)) {
    setStatus('no_gas');
  } else {
    setReason(friendlyRevertReason(err));
    setStatus('failed');
  }
}

/**
 * SETTLING: the settlement starter has `settlementDeadline` to finalize. Once it
 * lapses, anyone may take over the batch by posting the USDC bond (§6) — the
 * stalled starter's bond is forfeited.
 */
function SettlementActions({ seasonAddress }: { seasonAddress: string }) {
  const chainId = useTenantChainId();
  const core = useTenantDeployment();
  const publicClient = usePublicClient({ chainId });
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { settlementDeadline, settlementExpired, takeoverBondUsdc, refetch } = useSeasonEndgame(seasonAddress);

  const [status, setStatus] = useState<TxStatus>('idle');
  const [txHashes, setTxHashes] = useState<(string | null)[]>([null, null]);
  const [errorReason, setErrorReason] = useState<string | null>(null);

  const bondUsdc = Number(formatUnits(takeoverBondUsdc, 6));
  const isBusy = status !== 'idle' && status !== 'success' && status !== 'canceled';

  const handleTakeover = async () => {
    if (!address || !publicClient || isBusy) return;
    setTxHashes([null, null]);
    setErrorReason(null);
    try {
      const usdcAddr = core.USDC as `0x${string}`;
      const liveAllowance = (await publicClient.readContract({
        address: usdcAddr, abi: ERC20Abi as Abi, functionName: 'allowance',
        args: [address, seasonAddress as `0x${string}`],
      })) as bigint;

      let approveHash: string | null = null;
      if (liveAllowance < takeoverBondUsdc) {
        setStatus('approving');
        approveHash = await writeContractAsync({
          address: usdcAddr, abi: ERC20Abi as Abi, functionName: 'approve',
          args: [seasonAddress as `0x${string}`, takeoverBondUsdc],
        });
        setTxHashes([approveHash, null]);
        setStatus('mining_approval');
        await publicClient.waitForTransactionReceipt({ hash: approveHash as `0x${string}` });
      }

      setStatus('executing');
      const hash = await writeContractAsync({
        address: seasonAddress as `0x${string}`, abi: GameSeasonAbi as Abi,
        functionName: 'takeOverSettlement', args: [],
      });
      setTxHashes([approveHash, hash]);
      setStatus('mining');
      await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
      setStatus('success');
      refetch();
    } catch (err: unknown) {
      statusFromError(err, setStatus, setErrorReason);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <CountdownTicker targetTimestamp={settlementDeadline} label="Settlement Deadline" />
      {settlementExpired ? (
        <div className="flex flex-col gap-2">
          <button
            onClick={handleTakeover}
            disabled={isBusy || !address}
            className={`btn-game-primary w-full py-3 text-sm font-black tracking-widest ${isBusy ? 'opacity-60 cursor-not-allowed!' : ''}`}
          >
            {isBusy ? 'Confirming on Chain…' : 'Take Over Settlement'}
          </button>
          <p className="font-mono text-[10px] text-text2 text-center opacity-70">
            The starter stalled. Post the {bondUsdc.toLocaleString()} USDC bond to restart the
            settlement batch — their bond is forfeited, yours is returned when you finalize.
          </p>
        </div>
      ) : (
        <p className="font-mono text-[10px] text-text2 text-center opacity-70">
          Settlement is being finalized on-chain. If the starter stalls past the deadline,
          anyone may take over.
        </p>
      )}
      <TxModal
        status={status}
        txHashes={txHashes}
        title="Taking Over Settlement"
        successTitle="Settlement Taken Over"
        successMessage="You are now the settlement starter. Finalize the batch to reclaim your bond."
        errorReason={errorReason}
        steps={[
          { label: 'Approve USDC', description: 'Approve the settlement bond', activeStatuses: ['approving', 'mining_approval'], completeStatuses: ['executing', 'mining', 'success'] },
          { label: 'Take Over', description: 'Post the bond and restart the batch', activeStatuses: ['executing', 'mining'], completeStatuses: ['success'] },
        ]}
        onClose={() => { setStatus('idle'); setTxHashes([null, null]); }}
      />
    </div>
  );
}

/**
 * TRIAGE / INVESTIGATION (ADR-0008): payouts are frozen while the Council may
 * flag sybil clusters. Once the active window lapses, `openDistribution()` is
 * permissionless — surface the button to whoever is impatient.
 */
function ReviewActions({ seasonAddress }: { seasonAddress: string }) {
  const chainId = useTenantChainId();
  const publicClient = usePublicClient({ chainId });
  const { isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { isTriage } = useSeasonPhase(seasonAddress);
  const { reviewWindowEnd, reviewExpired, refetch } = useSeasonEndgame(seasonAddress);

  const [status, setStatus] = useState<TxStatus>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const isBusy = status === 'executing' || status === 'mining';

  const handleOpen = async () => {
    if (!publicClient || isBusy) return;
    setTxHash(null);
    setErrorReason(null);
    try {
      setStatus('executing');
      const hash = await writeContractAsync({
        address: seasonAddress as `0x${string}`, abi: GameSeasonAbi as Abi,
        functionName: 'openDistribution', args: [],
      });
      setTxHash(hash);
      setStatus('mining');
      await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
      setStatus('success');
      refetch();
    } catch (err: unknown) {
      statusFromError(err, setStatus, setErrorReason);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <CountdownTicker
        targetTimestamp={reviewWindowEnd}
        label={isTriage ? 'Triage Window' : 'Investigation Window'}
      />
      {reviewExpired ? (
        <div className="flex flex-col gap-2">
          <button
            onClick={handleOpen}
            disabled={isBusy || !isConnected}
            className={`btn-game-primary w-full py-3 text-sm font-black tracking-widest ${isBusy ? 'opacity-60 cursor-not-allowed!' : ''}`}
          >
            {isBusy ? 'Confirming on Chain…' : 'Open Distribution'}
          </button>
          <p className="font-mono text-[10px] text-text2 text-center opacity-70">
            The review window has lapsed. Anyone may open distribution — this unlocks claims
            for every player.
          </p>
        </div>
      ) : (
        <p className="font-mono text-[10px] text-text2 text-center opacity-70">
          {isTriage
            ? 'Post-settlement triage: the Council may raise suspicion of sybil play. If it stays quiet, payouts open when the window lapses.'
            : 'The season is under investigation — the Council may flag sybil wallets. Payouts open when the window lapses or the investigation concludes.'}
        </p>
      )}
      <TxModal
        status={status}
        txHashes={[txHash]}
        title="Opening Distribution"
        successTitle="Distribution Opened"
        successMessage="Payouts are live — all players can claim now."
        errorReason={errorReason}
        steps={[
          { label: 'Open Distribution', description: 'Snapshot the pool and unlock claims', activeStatuses: ['executing', 'mining'], completeStatuses: ['success'] },
        ]}
        onClose={() => { setStatus('idle'); setTxHash(null); }}
      />
    </div>
  );
}

/**
 * Escrow reclaim (§4): open bids hold USDC, open asks hold FIM. FIM has no use
 * once the season concludes — its payout weight is already credited at settlement
 * (the ledger balance counts escrowed sell FIM), so leaving asks open strands only
 * dead-weight FIM. We therefore only surface and cancel USDC-bearing bids here.
 * Stale ids are skipped on-chain, so the Ponder-derived list is safe mid-refetch.
 */
function ReclaimEscrowBlock({ seasonAddress, exchangeAddress }: { seasonAddress: string; exchangeAddress: string }) {
  const chainId = useTenantChainId();
  const publicClient = usePublicClient({ chainId });
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { data: openOrders = [], refetch: refetchOrders } = useOpenOrders(seasonAddress, address, 'open');

  const [status, setStatus] = useState<TxStatus>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const isBusy = status === 'executing' || status === 'mining';

  // Only open bids escrow USDC — asks hold FIM, which is worthless post-season.
  const usdcBids = useMemo(() => openOrders.filter((o) => o.isBuy), [openOrders]);

  const usdcLocked = useMemo(
    () => usdcBids.reduce((sum, o) => sum + o.remainingAmount * o.price, 0),
    [usdcBids],
  );

  if (usdcBids.length === 0) return null;

  const handleReclaim = async () => {
    if (!publicClient || isBusy || usdcBids.length === 0) return;
    setTxHash(null);
    setErrorReason(null);
    try {
      setStatus('executing');
      const hash = await writeContractAsync({
        address: exchangeAddress as `0x${string}`, abi: ExchangeAbi as Abi,
        functionName: 'cancelOrders', args: [usdcBids.map((o) => o.orderId)],
      });
      setTxHash(hash);
      setStatus('mining');
      await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
      setStatus('success');
      refetchOrders();
    } catch (err: unknown) {
      statusFromError(err, setStatus, setErrorReason);
    }
  };

  const fmt = (n: number, d = 2) => n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

  return (
    <div
      className="px-5 py-4 rounded-lg flex flex-col gap-2 border border-border bg-card2"
    >
      <p className="font-mono text-[11px] uppercase font-bold tracking-widest text-text2">Escrowed USDC</p>
      <p className="font-mono text-[10px] text-text2">
        <strong className="text-text">{fmt(usdcLocked)} USDC</strong>
        {' '}locked in {usdcBids.length} open bid{usdcBids.length === 1 ? '' : 's'}.
      </p>
      <button
        onClick={handleReclaim}
        disabled={isBusy}
        className={`btn-game-3 w-full py-2.5 text-xs font-black tracking-widest uppercase ${isBusy ? 'opacity-60 cursor-not-allowed!' : ''}`}
      >
        {isBusy ? 'Confirming on Chain…' : 'Reclaim'}
      </button>
      <TxModal
        status={status}
        txHashes={[txHash]}
        title="Reclaiming USDC"
        successTitle="USDC Reclaimed"
        successMessage="Your open bids were cancelled and their escrowed USDC returned to your wallet."
        errorReason={errorReason}
        steps={[
          { label: 'Cancel Bids', description: 'Cancel open bids and return escrowed USDC', activeStatuses: ['executing', 'mining'], completeStatuses: ['success'] },
        ]}
        onClose={() => { setStatus('idle'); setTxHash(null); }}
      />
    </div>
  );
}

export function PayoutMask({ seasonAddress, exchangeAddress, className }: PayoutMaskProps) {
  const { address, isConnected } = useAccount();
  const chainId = useTenantChainId();
  const publicClient = usePublicClient({ chainId });

  const [status, setStatus] = useState<TxStatus>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [snapshotPnL, setSnapshotPnL] = useState<number | null>(null);

  const { writeContractAsync } = useWriteContract();

  const { payout, yieldPayout, pnl: livePnL, userFim, finalFim, contribution, realizedPayout, hasClaimed: hasClaimedChain, hasBalance, loading: calcLoading, error: payoutError, refetch: refetchPayout } =
    usePayout(seasonAddress, address);
  const { winningSide } = useSeasonVictory(seasonAddress);
  const { isSettling, isUnderReview, isPayout } = useSeasonPhase(seasonAddress);
  const { forcedDraw, claimDeadline, swept } = useSeasonEndgame(seasonAddress);
  const capsWin = !forcedDraw && winningSide === 'cap';

  // Only surface the "Claim Window Ends" countdown once it's imminent. The
  // claim window opens ~a year wide, so a fresh timer reads as noise; show it
  // only inside the final 90 days. Chain time — not Date.now() — to match the
  // clock CountdownTicker uses (fork block time lags real time by days).
  const CLAIM_WINDOW_WARN_SECONDS = 90 * 86400;
  const chainNow = useChainTime();
  const claimWindowClosing =
    !swept &&
    claimDeadline > 0 &&
    chainNow > 0 &&
    claimDeadline - chainNow <= CLAIM_WINDOW_WARN_SECONDS;

  // Council sybil flag on the connected wallet (this season). Zeroes the payout
  // on-chain; collateral is still released at claim.
  const { data: isFlaggedRaw } = useReadContract({
    address: seasonAddress as `0x${string}`, abi: GameSeasonAbi as Abi,
    functionName: 'isFlagged', args: address ? [address] : undefined, chainId,
    query: { enabled: !!address, refetchInterval: 15000 },
  });
  const isFlaggedUser = isFlaggedRaw === true;

  // hasClaimed from the contract; optimistically true the instant a claim tx confirms.
  const hasClaimed = hasClaimedChain || status === 'success';

  // Every participant can claim to release their staked RGD collateral — even at
  // a $0 payout (flagged, swept, or dust). Open orders no longer block claiming:
  // claimPayout() doesn't touch the Exchange, and the ledger balance already
  // includes escrowed FIM.
  const canClaim = isPayout && !hasClaimed && (payout > 0 || hasBalance);

  const displayPnL = useMemo(() => {
    if (snapshotPnL !== null && livePnL < snapshotPnL) return snapshotPnL;
    return livePnL;
  }, [snapshotPnL, livePnL]);

  const displayPayout = hasClaimed ? realizedPayout : payout;

  useEffect(() => {
    if (status === 'success') refetchPayout();
  }, [status, refetchPayout]);

  const handleClaim = async () => {
    if (!canClaim || !publicClient || status !== 'idle') return;
    setSnapshotPnL(livePnL);
    setTxHash(null);
    setErrorReason(null);

    try {
      setStatus('executing');
      const hash = await writeContractAsync({
        address: seasonAddress as `0x${string}`,
        abi: GameSeasonAbi as Abi,
        functionName: 'claimPayout',
        args: [],
      });
      setTxHash(hash);
      setStatus('mining');
      await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
      setStatus('success');
    } catch (err: unknown) {
      statusFromError(err, setStatus, setErrorReason);
    }
  };

  const handleClose = () => {
    setStatus('idle');
    setTxHash(null);
    setErrorReason(null);
    setSnapshotPnL(null);
  };

  if (!isConnected) {
    return (
      <div className={`terminal-pane connect-gate mx-auto${className ? ` ${className}` : ''}`}>
        <div className="terminal-pane-header">
          <span className="terminal-pane-title">Payout</span>
        </div>
        <div className="connect-gate-body">
          <span className="terminal-pane-title" style={{ color: 'var(--color-text2)' }}>Connect your wallet to participate</span>
          <WalletButton />
        </div>
      </div>
    );
  }

  const isBusy = status === 'executing' || status === 'mining';
  const isButtonDisabled = isBusy || !canClaim;
  const pnlPositive = displayPnL >= 0;
  const contribPositive = capsWin ? contribution <= 0 : contribution >= 0;
  const yieldHasValue = yieldPayout > 0.005; // ignore sub-cent rounding
  const displayFim = hasClaimed ? finalFim : userFim;

  const statusPill = isSettling ? 'Settling'
    : isUnderReview ? 'Under Review'
    : hasClaimed ? 'Settled'
    : 'Active';
  const statusDotLive = !hasClaimed && !isSettling && !isUnderReview;

  const vaultLabel = hasClaimed ? 'Total Claimed'
    : !isPayout ? 'Projected Payout'
    : payout > 0 ? 'Claimable'
    : 'No Payout Due';

  return (
    <>
    <div className={`flex flex-col gap-5 w-full border border-border rounded-lg p-5 mx-auto max-h-[50vh] ${hasClaimed ? 'bg-bg' : 'bg-card'}${className ? ` ${className}` : ''}`}>

      {/* Header */}
      <div className="terminal-pane-header mb-0!">
        <span className="terminal-pane-title">Payout Settlement</span>
        <span className="font-mono text-[10px] bg-[var(--color-card2)] border border-[var(--color-border)] px-2 py-0.5 rounded text-text2 uppercase tracking-wider flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${statusDotLive ? 'bg-[var(--color-green)] animate-pulse' : 'bg-[var(--color-text2)]'}`} />
          {statusPill}
        </span>
      </div>

      {/* Audit Matrix */}
      <div className="grid grid-cols-2 gap-5">
        <div className="terminal-pane bg-transparent!">
          <span className="terminal-pane-title block mb-0.5">{hasClaimed ? 'Final Holdings' : 'Your Holdings'}</span>
          <span className="font-mono text-sm font-bold text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {displayFim.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            <span className="ml-1 text-[10px] text-text2">FIM</span>
          </span>
        </div>

        <div className="terminal-pane">
          <span className="terminal-pane-title block mb-0.5">{capsWin ? 'Extraction' : 'Contribution'}</span>
          <span
            className="font-mono text-sm font-bold"
            style={{ color: contribPositive ? 'var(--color-green)' : 'var(--color-red)', fontVariantNumeric: 'tabular-nums' }}
          >
            {capsWin
              ? <>{contribution < 0 ? '+' : contribution > 0 ? '-' : ''}{Math.abs(contribution).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
              : <>{contribution > 0 ? '+' : ''}{contribution.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
            }
            <span className="ml-1 text-[10px] text-text2">USDC</span>
          </span>
        </div>

        <div className="terminal-pane">
          <div className="flex justify-between items-center mb-0.5">
            <span className="terminal-pane-title">Season P / L</span>

          </div>
          {calcLoading ? (
            <div className="h-4 w-28 rounded animate-pulse mt-1" style={{ background: 'var(--color-border)' }} />
          ) : (
            <span
              className="font-mono text-sm font-bold"
              style={{ color: pnlPositive ? 'var(--color-green)' : 'var(--color-red)', fontVariantNumeric: 'tabular-nums' }}
            >
              {pnlPositive ? '+' : '-'}${Math.abs(displayPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="ml-1 text-[10px] text-text2">USDC</span>
            </span>
          )}
        </div>

        {/* Yield Bonus contribution to P/L — the slice of the payout funded by
            reinvested Aave yield, which the player paid nothing for (pure upside). */}
        <div className="terminal-pane">
          <span className="terminal-pane-title block mb-0.5">Yield Bonus</span>
          {calcLoading ? (
            <div className="h-4 w-24 rounded animate-pulse mt-1" style={{ background: 'var(--color-border)' }} />
          ) : (
            <span
              className="font-mono text-sm font-bold"
              style={{ color: yieldHasValue ? 'var(--color-green)' : 'var(--color-text2)', fontVariantNumeric: 'tabular-nums' }}
            >
              +${yieldPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="ml-1 text-[10px] text-text2">USDC</span>
            </span>
          )}
        </div>
      </div>

      {/* Checkout Vault */}
      <div className="rounded-md p-0.5" style={{ background: 'var(--sunset-35)' }}>
        <div className={`${hasClaimed ? 'bg-card' : 'bg-card2'} rounded-sm p-4 flex flex-col items-center justify-center text-center`}>
          <span className="font-mono text-[10px] font-bold text-text2 uppercase tracking-widest mb-1">
            {vaultLabel}
          </span>
          {calcLoading ? (
            <div className="h-9 w-36 rounded animate-pulse" style={{ background: 'var(--color-border)' }} />
          ) : (
            <div
              className="font-mono text-3xl font-black tracking-tighter"
              style={{ color: displayPayout > 0 ? 'var(--color-green)' : 'var(--color-text2)', fontVariantNumeric: 'tabular-nums' }}
            >
              ${displayPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-xs font-bold text-text2 ml-1">USDC</span>
            </div>
          )}
        </div>
      </div>

      {payoutError && (
        <p className="text-red-500 font-mono text-[11px] text-center">{payoutError}</p>
      )}

      {/* Season-wide draw notice: any Council flag reprices every player. */}
      {forcedDraw && !hasClaimed && (
        <div className="surface-pink-warn px-4 py-3 rounded-lg text-center">
          <p className="font-mono text-[11px] uppercase font-bold tracking-widest text-red">Season Settles As Draw</p>
          <p className="font-mono text-[10px] text-text2 mt-1">
            A wallet was flagged during the investigation, so the outcome is voided — all
            payouts are repriced to the draw distribution.
          </p>
        </div>
      )}

      {isFlaggedUser && !hasClaimed && (
        <div className="surface-pink-warn px-4 py-3 rounded-lg text-center">
          <p className="font-mono text-[11px] uppercase font-bold tracking-widest text-red">Wallet Flagged</p>
          <p className="font-mono text-[10px] text-text2 mt-1">
            This wallet was flagged as part of a sybil cluster — its payout is forfeited.
            Your staked RGD collateral is still released at claim.
          </p>
        </div>
      )}

      {swept && !hasClaimed && (
        <div className="surface-pink-warn px-4 py-3 rounded-lg text-center">
          <p className="font-mono text-[11px] uppercase font-bold tracking-widest text-red">Claim Window Expired</p>
          <p className="font-mono text-[10px] text-text2 mt-1">
            Unclaimed payouts were swept. Claiming now pays $0 but still releases your
            staked RGD collateral.
          </p>
        </div>
      )}

      {/* Phase actions */}
      {isSettling ? (
        <SettlementActions seasonAddress={seasonAddress} />
      ) : isUnderReview ? (
        <ReviewActions seasonAddress={seasonAddress} />
      ) : hasClaimed ? null : canClaim ? (
        <div className="flex flex-col gap-2">
          <button
            onClick={handleClaim}
            disabled={isButtonDisabled}
            className={`btn-game-primary w-full py-3 text-sm font-black tracking-widest ${isButtonDisabled ? 'opacity-60 cursor-not-allowed!' : ''}`}
          >
            {isBusy ? 'Confirming on Chain…' : payout > 0 ? 'Claim' : 'Claim & Unlock Collateral'}
          </button>
          {payout === 0 && (
            <p className="font-mono text-[10px] text-text2 text-center opacity-70">
              No USDC payout due, but claiming releases your staked RGD.
            </p>
          )}
          {claimWindowClosing && (
            <CountdownTicker targetTimestamp={claimDeadline} label="Claim Window Ends" inline />
          )}
        </div>
      ) : (
        <div
          className="px-5 py-4 rounded-lg text-center"
          style={{ background: 'var(--color-card2)', border: '1px dashed var(--color-border2)' }}
        >
          <p className="font-mono text-[11px] uppercase font-bold tracking-widest text-text2">Ineligible</p>
          <p className="font-mono text-[10px] text-text2 mt-1 opacity-60">You did not participate in this season</p>
        </div>
      )}

      {/* Escrow reclaim — independent of claiming, shown while open orders exist. */}
      <ReclaimEscrowBlock seasonAddress={seasonAddress} exchangeAddress={exchangeAddress} />

    </div>

    <TxModal
      status={status}
      txHashes={[txHash]}
      title="Claiming Payout"
      successTitle="Payout Claimed"
      successMessage="Your USDC has been sent to your wallet."
      errorReason={errorReason}
      steps={[
        {
          label: 'Claim Payout',
          description: 'Sign the payout withdrawal transaction',
          activeStatuses: ['executing', 'mining'],
          completeStatuses: ['success'],
        },
      ]}
      onClose={handleClose}
    />
    </>
  );
}
