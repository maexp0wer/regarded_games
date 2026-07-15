'use client';

import React, { useState, useEffect } from 'react';
import { usePublicClient, useAccount, useWriteContract } from 'wagmi';
import { Address } from 'viem';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

import { useTenantDeployment, useTenantChainId } from '@/context/TenantContext';
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';
import type { Abi } from 'abitype';
import ExchangeAbi from '@/deployments/abis/Exchange.json';
import { usePayout } from '@/hooks/usePayout';
import { useOpenOrders } from '@/hooks/useOpenOrders';
import { useSeasonEndgame } from '@/hooks/useSeasonEndgame';
import { useChainTime } from '@/hooks/useChainTime';
import { useDiscourseAlerts, type PendingPoll, type ReplyGroup } from '@/hooks/useDiscourseAlerts';
import { forumLoginUrl } from '@/utils/discourseForum';
import { isUserRejection, isInsufficientGas } from '@/utils/revertReason';
import { TxModal } from './TxModal';
import { CountdownTicker } from './CountdownTicker';

const CONTROLLER_ABI = [{
  type: 'function', name: 'seasons',
  inputs: [{ name: '', type: 'uint256' }],
  outputs: [
    { name: 'season', type: 'address' }, { name: 'a', type: 'address' },
    { name: 'e', type: 'address' },      { name: 'f', type: 'address' },
  ],
  stateMutability: 'view',
}] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(isoStr: string): string {
  const delta = Date.now() - new Date(isoStr).getTime();
  const m = Math.floor(delta / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} minute${m !== 1 ? 's' : ''} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h !== 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d !== 1 ? 's' : ''} ago`;
}

// ─── Inline poll countdown ───────────────────────────────────────────────────
// Same inline formatting as the season dashboard (CountdownTicker), but measured
// against wall-clock time: a Discourse poll close is a real-world timestamp, not
// an on-chain one, so it must not use chain time (which lags in fork mode).

function PollCountdown({ targetTimestamp }: { targetTimestamp: number | null }) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  if (!targetTimestamp) {
    return (
      <div className="meta-data-group">
        <span className="font-mono text-[10px] uppercase text-text2 tracking-wider">Closes</span>
        <span className="font-mono text-[12px] font-bold text-text2">NO DEADLINE</span>
      </div>
    );
  }

  return (
    <CountdownTicker
      targetTimestamp={targetTimestamp}
      nowOverride={now}
      label="Closes"
      elapsedLabel="CLOSED"
      inline
    />
  );
}

// ─── Alert item base layout (left-edge glow bar + card) ──────────────────────

function AlertItem({
  accentVar,
  children,
}: {
  accentVar: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 w-full overflow-hidden border-l-4 transition-colors group bg-[color-mix(in_srgb,var(--alert-accent)_30%,transparent)] hover:bg-[color-mix(in_srgb,var(--alert-accent)_22%,transparent)]"
      style={{
        borderLeftColor: `var(${accentVar})`,
        ['--alert-accent' as string]: `var(${accentVar})`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Claimable Payout (Gold) ──────────────────────────────────────────────────

type ClaimStatus = 'idle' | 'executing' | 'mining' | 'success' | 'canceled' | 'failed' | 'no_gas';

function ClaimableCard({
  season,
  playerAddress,
  onClaimableChange,
}: {
  season: { id: number; season: string };
  playerAddress: string;
  onClaimableChange: (seasonAddress: string, claimable: boolean) => void;
}) {
  const chainId = useTenantChainId();
  const publicClient = usePublicClient({ chainId });
  const { writeContractAsync } = useWriteContract();

  const { payout, pnl, hasClaimed: hasClaimedChain, hasBalance, loading, refetch } = usePayout(season.season, playerAddress as Address);
  const { claimDeadline, swept } = useSeasonEndgame(season.season);

  // Match the PayoutMask rule: the claim window opens ~a year wide, so a fresh
  // timer reads as noise. Only surface the countdown inside the final 90 days,
  // measured on the chain clock (fork block time lags real time by days).
  const CLAIM_WINDOW_WARN_SECONDS = 90 * 86400;
  const chainNow = useChainTime();
  const claimWindowClosing =
    !swept &&
    claimDeadline > 0 &&
    chainNow > 0 &&
    claimDeadline - chainNow <= CLAIM_WINDOW_WARN_SECONDS;

  const [status, setStatus] = useState<ClaimStatus>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);

  // Optimistically claimed the instant the tx confirms, so the card retires
  // immediately rather than waiting for the next on-chain read.
  const hasClaimed = hasClaimedChain || status === 'success';

  // Already-claimed seasons must not surface as "Claimable". Note `payout` is
  // still positive after a claim — usePayout swaps in the realized amount for
  // display — so `hasClaimed` is the authoritative gate, not the amount.
  // After a sweep the payout is legitimately $0, but claiming still releases the
  // staked collateral — keep warning the dormant user while they hold a stake.
  const isClaimable = !loading && !hasClaimed && (payout > 0 || (swept && hasBalance));

  // Report this season's claimable state up so the parent's count / pill /
  // whole-pane visibility match what actually renders (not the raw PAYOUT scan).
  useEffect(() => {
    onClaimableChange(season.season, isClaimable);
    return () => onClaimableChange(season.season, false);
  }, [season.season, isClaimable, onClaimableChange]);

  useEffect(() => {
    if (status === 'success') refetch();
  }, [status, refetch]);

  const isBusy = status === 'executing' || status === 'mining';

  // Same on-chain claim as the payout page — claimPayout() on the season contract.
  const handleClaim = async (e: React.MouseEvent) => {
    // The card body is a Link to the season page; keep the button from navigating.
    e.preventDefault();
    e.stopPropagation();
    if (!publicClient || isBusy || status !== 'idle') return;
    setTxHash(null);

    try {
      setStatus('executing');
      const hash = await writeContractAsync({
        address: season.season as `0x${string}`,
        abi: GameSeasonAbi as Abi,
        functionName: 'claimPayout',
        args: [],
      });
      setTxHash(hash);
      setStatus('mining');
      await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
      setStatus('success');
    } catch (err: unknown) {
      if (isUserRejection(err)) {
        setStatus('canceled');
        setTimeout(() => setStatus('idle'), 2000);
      } else if (isInsufficientGas(err)) {
        setStatus('no_gas');
      } else {
        setStatus('failed');
      }
    }
  };

  const handleCloseModal = () => {
    setStatus('idle');
    setTxHash(null);
  };

  if (!isClaimable) return null;

  const pnlPositive = pnl >= 0;

  return (
    <>
      <Link href={`/season_${season.id}`} className="block">
        <AlertItem accentVar={swept ? '--color-red' : '--color-gold'}>
          <div className="flex flex-col gap-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-display font-extrabold leading-none tracking-[-0.04em] text-text text-2xl shrink-0">
              S<em className="not-italic font-medium text-text2 tabular-nums">{String(season.id).padStart(2, '0')}</em>
            </p>

              <span
                className={`pill-solid ${swept ? 'bg-red' : 'bg-gold'}`}
              >
                {swept ? 'Claim Expired' : 'Claim Ready'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-sans text-xs text-text">
              <span>
                Season P/L:{' '}
                <strong className={`font-mono font-bold tabular-nums ${pnlPositive ? 'text-green' : 'text-red'}`}>
                {pnlPositive ? '+' : ''}${Math.abs(pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </span>
              <span className="hidden sm:inline text-border2">•</span>
              <span>
                Claimable:{' '}
                <strong className="font-mono font-bold text-gold tabular-nums">
                  ${payout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </span>
            </div>
            {swept ? (
              <span className="font-mono text-[10px] text-red uppercase tracking-wider">
                Unclaimed payouts were swept — claiming still releases your staked collateral
              </span>
            ) : claimWindowClosing ? (
              <CountdownTicker targetTimestamp={claimDeadline} label="Claim Window Ends" inline />
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleClaim}
            disabled={isBusy}
            className={`btn-game-primary text-xs font-black tracking-wider uppercase py-2 px-4 h-fit shrink-0 ${isBusy ? 'opacity-60 cursor-not-allowed!' : ''}`}
          >
            {isBusy ? 'Confirming…' : 'Claim'}
          </button>
        </AlertItem>
      </Link>

      <TxModal
        status={status}
        txHashes={[txHash]}
        title="Claiming Payout"
        successTitle="Payout Claimed"
        successMessage="Your USDC has been sent to your wallet."
        steps={[
          {
            label: 'Claim Payout',
            description: 'Sign the payout withdrawal transaction',
            activeStatuses: ['executing', 'mining'],
            completeStatuses: ['success'],
          },
        ]}
        onClose={handleCloseModal}
      />
    </>
  );
}

// ─── Review window: TRIAGE / INVESTIGATION (Purple) ──────────────────────────

function ReviewCard({
  season,
  playerAddress,
  onVisibleChange,
}: {
  season: { id: number; season: string; phase: string };
  playerAddress: string;
  onVisibleChange: (seasonAddress: string, visible: boolean) => void;
}) {
  const chainId = useTenantChainId();
  const publicClient = usePublicClient({ chainId });
  const queryClient = useQueryClient();
  const { writeContractAsync } = useWriteContract();

  const { payout, hasBalance, loading } = usePayout(season.season, playerAddress as Address);
  const { reviewWindowEnd, reviewExpired, forcedDraw, refetch } = useSeasonEndgame(season.season);

  const [status, setStatus] = useState<ClaimStatus>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const isBusy = status === 'executing' || status === 'mining';

  const isTriage = season.phase === 'TRIAGE';
  // Only participants care that their payout is pending review.
  const isVisible = !loading && (hasBalance || payout > 0);

  useEffect(() => {
    onVisibleChange(season.season, isVisible);
    return () => onVisibleChange(season.season, false);
  }, [season.season, isVisible, onVisibleChange]);

  // openDistribution() is permissionless once the window lapses (§1). After it
  // lands the season is in PAYOUT — refresh the scan so the claim card takes over.
  const handleOpen = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!publicClient || isBusy || status !== 'idle') return;
    setTxHash(null);
    try {
      setStatus('executing');
      const hash = await writeContractAsync({
        address: season.season as `0x${string}`,
        abi: GameSeasonAbi as Abi,
        functionName: 'openDistribution',
        args: [],
      });
      setTxHash(hash);
      setStatus('mining');
      await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
      setStatus('success');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['claimable-scan'] });
    } catch (err: unknown) {
      if (isUserRejection(err)) {
        setStatus('canceled');
        setTimeout(() => setStatus('idle'), 2000);
      } else if (isInsufficientGas(err)) {
        setStatus('no_gas');
      } else {
        setStatus('failed');
      }
    }
  };

  if (!isVisible) return null;

  return (
    <>
      <Link href={`/season_${season.id}`} className="block">
        <AlertItem accentVar="--color-purple">
          <div className="flex flex-col gap-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-display font-extrabold leading-none tracking-[-0.04em] text-text text-2xl shrink-0">
              S<em className="not-italic font-medium text-text2 tabular-nums">{String(season.id).padStart(2, '0')}</em>
            </p>
              <span className="pill-solid bg-purple">
                {isTriage ? 'Triage' : 'Under Investigation'}
              </span>
            </div>
            <p className="font-sans text-xs text-text">
              {isTriage
                ? 'Post-settlement triage — payouts open when the window lapses.'
                : 'The Council is investigating suspected sybil play — payouts are on hold.'}
              {forcedDraw && (
                <strong className="text-red"> A wallet was flagged: the season settles as a draw.</strong>
              )}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
            {reviewExpired ? (
              <button
                type="button"
                onClick={handleOpen}
                disabled={isBusy}
                className={`btn-game-primary text-xs font-black tracking-wider uppercase py-2 px-4 h-fit shrink-0 ${isBusy ? 'opacity-60 cursor-not-allowed!' : ''}`}
              >
                {isBusy ? 'Confirming…' : 'Open Distribution'}
              </button>
            ) : (
              <CountdownTicker targetTimestamp={reviewWindowEnd} label="Payouts Open In" inline />
            )}
          </div>
        </AlertItem>
      </Link>

      <TxModal
        status={status}
        txHashes={[txHash]}
        title="Opening Distribution"
        successTitle="Distribution Opened"
        successMessage="Payouts are live — all players can claim now."
        steps={[
          {
            label: 'Open Distribution',
            description: 'Snapshot the pool and unlock claims',
            activeStatuses: ['executing', 'mining'],
            completeStatuses: ['success'],
          },
        ]}
        onClose={() => { setStatus('idle'); setTxHash(null); }}
      />
    </>
  );
}

// ─── Stranded escrow (Red) ────────────────────────────────────────────────────

function EscrowCard({
  season,
  playerAddress,
  onVisibleChange,
}: {
  season: { id: number; season: string; exchange: string };
  playerAddress: string;
  onVisibleChange: (seasonAddress: string, visible: boolean) => void;
}) {
  const chainId = useTenantChainId();
  const publicClient = usePublicClient({ chainId });
  const { writeContractAsync } = useWriteContract();

  const { data: openOrders = [], refetch } = useOpenOrders(season.season, playerAddress, 'open');

  const [status, setStatus] = useState<ClaimStatus>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const isBusy = status === 'executing' || status === 'mining';

  const isVisible = openOrders.length > 0;

  useEffect(() => {
    onVisibleChange(season.season, isVisible);
    return () => onVisibleChange(season.season, false);
  }, [season.season, isVisible, onVisibleChange]);

  let usdcLocked = 0;
  let fimLocked = 0;
  for (const o of openOrders) {
    if (o.isBuy) usdcLocked += o.remainingAmount * o.price;
    else fimLocked += o.remainingAmount;
  }

  // One-click cancelOrders over the Ponder-derived id list — stale/filled ids
  // are skipped on-chain, so a mid-refetch list is safe (§4).
  const handleReclaim = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!publicClient || isBusy || status !== 'idle' || openOrders.length === 0) return;
    setTxHash(null);
    try {
      setStatus('executing');
      const hash = await writeContractAsync({
        address: season.exchange as `0x${string}`,
        abi: ExchangeAbi as Abi,
        functionName: 'cancelOrders',
        args: [openOrders.map((o) => o.orderId)],
      });
      setTxHash(hash);
      setStatus('mining');
      await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
      setStatus('success');
      refetch();
    } catch (err: unknown) {
      if (isUserRejection(err)) {
        setStatus('canceled');
        setTimeout(() => setStatus('idle'), 2000);
      } else if (isInsufficientGas(err)) {
        setStatus('no_gas');
      } else {
        setStatus('failed');
      }
    }
  };

  if (!isVisible) return null;

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <>
      <Link href={`/season_${season.id}`} className="block">
        <AlertItem accentVar="--color-red">
          <div className="flex flex-col gap-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-display font-extrabold leading-none tracking-[-0.04em] text-text text-2xl shrink-0">
              S<em className="not-italic font-medium text-text2 tabular-nums">{String(season.id).padStart(2, '0')}</em>
            </p>
              <span className="pill-solid bg-red">
                Escrowed Funds
              </span>
            </div>
            <p className="font-sans text-xs text-text">
              {usdcLocked > 0 && <strong className="font-mono font-bold tabular-nums">{fmt(usdcLocked)} USDC</strong>}
              {usdcLocked > 0 && fimLocked > 0 && ' + '}
              {fimLocked > 0 && <strong className="font-mono font-bold tabular-nums">{fmt(fimLocked)} FIM</strong>}
              {' '}still locked in {openOrders.length} open order{openOrders.length === 1 ? '' : 's'} — reclaimable any time.
            </p>
          </div>

          <button
            type="button"
            onClick={handleReclaim}
            disabled={isBusy}
            className={`btn-game-primary text-xs font-black tracking-wider uppercase py-2 px-4 h-fit shrink-0 ${isBusy ? 'opacity-60 cursor-not-allowed!' : ''}`}
          >
            {isBusy ? 'Confirming…' : 'Reclaim'}
          </button>
        </AlertItem>
      </Link>

      <TxModal
        status={status}
        txHashes={[txHash]}
        title="Reclaiming Escrow"
        successTitle="Escrow Reclaimed"
        successMessage="All open orders were cancelled and their escrow returned to your wallet."
        steps={[
          {
            label: 'Cancel Orders',
            description: 'Cancel all open orders and return escrow',
            activeStatuses: ['executing', 'mining'],
            completeStatuses: ['success'],
          },
        ]}
        onClose={() => { setStatus('idle'); setTxHash(null); }}
      />
    </>
  );
}

// ─── Governance Poll (Purple) ─────────────────────────────────────────────────

function PollAlertRow({ poll }: { poll: PendingPoll }) {
  // Route through /session/sso so the return_path carries the exact poll topic
  // through login. A signed-in wallet lands straight on the poll; a cold login
  // bounces via /community-login and still returns here, because Discourse holds
  // the return_path keyed by its login nonce across that round-trip.
  const href = forumLoginUrl(`/t/${poll.topicSlug}/${poll.topicId}`);

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block">
      <AlertItem accentVar="--color-purple">
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-extrabold text-base leading-tight tracking-tight text-text" title={poll.title}>
              {poll.title}
            </span>
            <span className="pill-solid bg-purple shrink-0">
              Active Proposal
            </span>
          </div>
          <p className="font-sans text-xs text-text2">
            Governance vote · Your voice hasn&rsquo;t been cast yet
          </p>
        </div>

        <div className="flex items-center shrink-0">
          <PollCountdown targetTimestamp={poll.pollCloseAt} />
        </div>
      </AlertItem>
    </a>
  );
}

// ─── Reply Group (Neutral) ────────────────────────────────────────────────────

function ReplyAlertCard({
  reply,
  playerAddress,
  onDismiss,
}: {
  reply: ReplyGroup;
  playerAddress: string;
  onDismiss: () => void;
}) {
  const href = forumLoginUrl(`/t/${reply.topicSlug}/${reply.topicId}`);

  function handleClick() {
    onDismiss();
    fetch('/api/discourse/alerts/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: playerAddress, notificationIds: reply.notificationIds }),
    }).catch(() => {});
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block" onClick={handleClick}>
      <AlertItem accentVar="--color-text">
        <div className="flex flex-col gap-2 max-w-md min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {reply.replyCount === 1 ? (
              <>
                <span className="font-mono text-xs font-bold text-gold truncate max-w-35" title={reply.latestReplierUsername}>
                  {reply.latestReplierUsername}
                </span>
                <span className="font-sans text-xs text-text">replied in</span>
              </>
            ) : (
              <span className="font-sans text-xs text-text">
                <strong className="font-mono font-bold text-text">{reply.replyCount}</strong> replies in
              </span>
            )}
            <span className="h4-app truncate max-w-40" title={reply.topicTitle}>
              {reply.topicTitle}
            </span>
          </div>

          {reply.latestReplyExcerpt && (
            <p className="font-sans text-xs text-text truncate italic">
              &ldquo;{reply.latestReplyExcerpt}&rdquo;
            </p>
          )}

          <span className="font-mono text-[9px] text-text opacity-50 uppercase tracking-wider">
            {timeAgo(reply.latestReplyAt)}
          </span>
        </div>

        <span className="btn-game-secondary text-xs font-bold tracking-wider uppercase py-2 px-4 h-fit shrink-0">
          View
        </span>
      </AlertItem>
    </a>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function Alerts({ playerAddress }: { playerAddress: string }) {
  const { address: connectedAddress } = useAccount();
  const chainId = useTenantChainId();
  const publicClient = usePublicClient({ chainId });
  const coreDeployment = useTenantDeployment();
  const queryClient = useQueryClient();
  const isOwner = connectedAddress?.toLowerCase() === playerAddress.toLowerCase();
  const controllerAddress = coreDeployment.Controller as Address;

  const { data: concludedSeasons } = useQuery({
    queryKey: ['claimable-scan', playerAddress, chainId],
    queryFn: async () => {
      if (!publicClient || !controllerAddress) return [];
      const list = [];
      for (let i = 0; i < 30; i++) {
        try {
          const data = await publicClient.readContract({ address: controllerAddress, abi: CONTROLLER_ABI, functionName: 'seasons', args: [BigInt(i)] });
          const phase = await publicClient.readContract({ address: data[0], abi: GameSeasonAbi as Abi, functionName: 'getPhase' });
          // Every post-trading phase matters here: PAYOUT feeds the claim card,
          // TRIAGE/INVESTIGATION the review card, and all of them (plus SETTLING)
          // the stranded-escrow card.
          if (['PAYOUT', 'TRIAGE', 'INVESTIGATION', 'SETTLING'].includes(phase as string)) {
            list.push({ id: i + 1, season: data[0], exchange: data[2], phase: phase as string });
          }
        } catch { break; }
      }
      return list;
    },
    enabled: !!playerAddress && isOwner,
  });

  const { data: discourseAlerts } = useDiscourseAlerts(isOwner ? playerAddress : undefined);

  function dismissReply(originalPostId: number) {
    queryClient.setQueryData(
      ['discourse-alerts', playerAddress.toLowerCase()],
      (old: { pendingPolls: PendingPoll[]; replies: ReplyGroup[] } | null) => {
        if (!old) return old;
        return { ...old, replies: old.replies.filter((r) => r.originalPostId !== originalPostId) };
      },
    );
  }

  // The phase scan only tells us which seasons *could* have something pending.
  // Whether a card actually renders (claimable payout / pending review /
  // stranded escrow) is decided per season inside each card via its own hooks.
  // Each card reports its result here so the count / pill / whole-pane
  // visibility match what actually renders.
  const [claimableMap, setClaimableMap] = useState<Record<string, boolean>>({});
  const handleClaimableChange = React.useCallback((seasonAddress: string, claimable: boolean) => {
    setClaimableMap((prev) =>
      prev[seasonAddress] === claimable ? prev : { ...prev, [seasonAddress]: claimable },
    );
  }, []);
  const [reviewMap, setReviewMap] = useState<Record<string, boolean>>({});
  const handleReviewChange = React.useCallback((seasonAddress: string, visible: boolean) => {
    setReviewMap((prev) =>
      prev[seasonAddress] === visible ? prev : { ...prev, [seasonAddress]: visible },
    );
  }, []);
  const [escrowMap, setEscrowMap] = useState<Record<string, boolean>>({});
  const handleEscrowChange = React.useCallback((seasonAddress: string, visible: boolean) => {
    setEscrowMap((prev) =>
      prev[seasonAddress] === visible ? prev : { ...prev, [seasonAddress]: visible },
    );
  }, []);

  const scanned = concludedSeasons ?? [];
  const payouts = scanned.filter((s) => s.phase === 'PAYOUT');
  const reviews = scanned.filter((s) => s.phase === 'TRIAGE' || s.phase === 'INVESTIGATION');
  const polls = discourseAlerts?.pendingPolls ?? [];
  const replies = discourseAlerts?.replies ?? [];

  const claimableCount = payouts.reduce((n, s) => n + (claimableMap[s.season] ? 1 : 0), 0);
  const reviewCount = reviews.reduce((n, s) => n + (reviewMap[s.season] ? 1 : 0), 0);
  const escrowCount = scanned.reduce((n, s) => n + (escrowMap[s.season] ? 1 : 0), 0);
  const totalCount = claimableCount + reviewCount + escrowCount + polls.length + replies.length;

  if (!isOwner) return null;

  // The cards must stay mounted whenever there are scanned post-trading
  // seasons — their hooks are what populate the visibility maps. When the
  // visible pane is hidden (nothing actually pending), keep the probes mounted
  // off-screen so they can report in and flip the pane on if one lights up.
  const probes = (
    <>
      {payouts.map((s) => (
        <ClaimableCard
          key={`claim-${s.season}`}
          season={s}
          playerAddress={playerAddress}
          onClaimableChange={handleClaimableChange}
        />
      ))}
      {reviews.map((s) => (
        <ReviewCard
          key={`review-${s.season}`}
          season={s}
          playerAddress={playerAddress}
          onVisibleChange={handleReviewChange}
        />
      ))}
      {scanned.map((s) => (
        <EscrowCard
          key={`escrow-${s.season}`}
          season={s}
          playerAddress={playerAddress}
          onVisibleChange={handleEscrowChange}
        />
      ))}
    </>
  );

  if (totalCount === 0) {
    return <div className="hidden">{probes}</div>;
  }

  return (
    <div className="flex flex-col gap-px w-full rounded-md overflow-hidden">
      {probes}

      {polls.map((poll) => (
        <PollAlertRow key={`${poll.topicId}-${poll.pollName}`} poll={poll} />
      ))}

      {replies.map((reply) => (
        <ReplyAlertCard
          key={reply.originalPostId}
          reply={reply}
          playerAddress={playerAddress}
          onDismiss={() => dismissReply(reply.originalPostId)}
        />
      ))}
    </div>
  );
}
