'use client';

import React, { useState, useEffect } from 'react';
import { usePublicClient, useAccount, useWriteContract } from 'wagmi';
import { Address } from 'viem';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

import { useTenantDeployment, useTenantChainId } from '@/context/TenantContext';
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';
import type { Abi } from 'abitype';
import { usePayout } from '@/hooks/usePayout';
import { useOpenOrders } from '@/hooks/useOpenOrders';
import { useDiscourseAlerts, type PendingPoll, type ReplyGroup } from '@/hooks/useDiscourseAlerts';
import { forumLoginUrl } from '@/utils/discourseForum';
import { isUserRejection, isInsufficientGas } from '@/utils/revertReason';
import { TxModal } from './TxModal';

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

const pad = (n: number) => String(n).padStart(2, '0');

// ─── Inline poll countdown (D/H/M boxes, purple unit labels) ─────────────────

function PollCountdown({ targetTimestamp }: { targetTimestamp: number | null }) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  if (!targetTimestamp) {
    return (
      <span className="font-mono text-[10px] font-bold text-text2 uppercase tracking-wider">
        No deadline
      </span>
    );
  }

  const remaining = Math.max(0, targetTimestamp - now);

  if (remaining === 0) {
    return (
      <span className="font-mono text-[10px] font-bold text-text2 uppercase tracking-wider">
        Closed
      </span>
    );
  }

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);

  return (
    <div className="flex items-center gap-1 font-mono text-[11px] text-text2">
      <span className="text-[9px] tracking-wider uppercase mr-1">Closes:</span>
      <div className="flex items-center gap-1 bg-card border border-border rounded px-1.5 py-0.5">
        <span className="font-bold text-text tabular-nums">{pad(days)}</span>
        <span className="text-[9px] text-purple">D</span>
      </div>
      <span className="animate-pulse font-bold text-border2">:</span>
      <div className="flex items-center gap-1 bg-card border border-border rounded px-1.5 py-0.5">
        <span className="font-bold text-text tabular-nums">{pad(hours)}</span>
        <span className="text-[9px] text-purple">H</span>
      </div>
      <span className="animate-pulse font-bold text-border2">:</span>
      <div className="flex items-center gap-1 bg-card border border-border rounded px-1.5 py-0.5">
        <span className="font-bold text-text tabular-nums">{pad(minutes)}</span>
        <span className="text-[9px] text-purple">M</span>
      </div>
    </div>
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
      className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 w-full overflow-hidden border-l-4 transition-colors group bg-[color-mix(in_srgb,var(--alert-accent)_15%,transparent)] hover:bg-[color-mix(in_srgb,var(--alert-accent)_22%,transparent)]"
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

  const { payout, pnl, hasClaimed: hasClaimedChain, loading, refetch } = usePayout(season.season, playerAddress as Address);

  // Open sell orders escrow FIM; claimPayout() reverts until they're cancelled
  // or settled — mirror PayoutMask and block the claim with an explanation.
  const { data: openOrders = [] } = useOpenOrders(season.season, playerAddress, 'open');
  const hasSellOrders = openOrders.some((o) => !o.isBuy);

  const [status, setStatus] = useState<ClaimStatus>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);

  // Optimistically claimed the instant the tx confirms, so the card retires
  // immediately rather than waiting for the next on-chain read.
  const hasClaimed = hasClaimedChain || status === 'success';

  // Already-claimed seasons must not surface as "Claimable". Note `payout` is
  // still positive after a claim — usePayout swaps in the realized amount for
  // display — so `hasClaimed` is the authoritative gate, not the amount.
  const isClaimable = !loading && !hasClaimed && payout > 0;

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
    if (!publicClient || hasSellOrders || isBusy || status !== 'idle') return;
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
        <AlertItem accentVar="--color-gold">
          <div className="flex flex-col gap-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="h4-app text-gold">
                Season {String(season.id).padStart(2, '0')}
              </span>
              <span
                className="font-mono text-[10px] bg-gold border-0 px-2 py-0.5 rounded text-card2 uppercase tracking-wider"
              >
                Claim Ready
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-sans text-xs text-text2">
              <span>
                Season PNL:{' '}
                <strong className={`font-mono font-bold tabular-nums ${pnlPositive ? 'text-green' : 'text-red'}`}>
                  {pnlPositive ? '+' : ''} ${Math.abs(pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </span>
              <span className="hidden sm:inline text-border2">•</span>
              <span>
                Claimable:{' '}
                <strong className="font-mono font-bold text-gold tabular-nums">
                  {payout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                </strong>
              </span>
            </div>
            {hasSellOrders && (
              <span className="font-mono text-[10px] text-red uppercase tracking-wider">
                Cancel open sell orders before claiming
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleClaim}
            disabled={hasSellOrders || isBusy}
            className={`btn-game-primary text-xs font-black tracking-wider uppercase py-2 px-4 h-fit shrink-0 ${hasSellOrders || isBusy ? 'opacity-60 cursor-not-allowed!' : ''}`}
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

// ─── Governance Poll (Purple) ─────────────────────────────────────────────────

function PollAlertRow({ poll }: { poll: PendingPoll }) {
  const href = forumLoginUrl(`/t/${poll.topicSlug}/${poll.topicId}`);

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block">
      <AlertItem accentVar="--color-purple">
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="h4-app text-purple truncate max-w-xs" title={poll.title}>
              {poll.title}
            </span>
            <span
              className="font-mono text-[10px] bg-purple border-0 px-2 py-0.5 rounded text-card2 uppercase tracking-wider shrink-0"
            >
              Active Proposal
            </span>
          </div>
          <p className="font-sans text-xs text-text2">
            Governance vote · Your voice hasn&rsquo;t been cast yet
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
          <PollCountdown targetTimestamp={poll.pollCloseAt} />
          <span className="btn-game-secondary text-xs font-bold tracking-wider uppercase py-2 px-4 h-fit">
            Cast Vote
          </span>
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
      <AlertItem accentVar="--color-text2">
        <div className="flex flex-col gap-2 max-w-md min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {reply.replyCount === 1 ? (
              <>
                <span className="font-mono text-xs font-bold text-gold truncate max-w-35" title={reply.latestReplierUsername}>
                  {reply.latestReplierUsername}
                </span>
                <span className="font-sans text-xs text-text2">replied in</span>
              </>
            ) : (
              <span className="font-sans text-xs text-text2">
                <strong className="font-mono font-bold text-text">{reply.replyCount}</strong> replies in
              </span>
            )}
            <span className="h4-app truncate max-w-40" title={reply.topicTitle}>
              {reply.topicTitle}
            </span>
          </div>

          {reply.latestReplyExcerpt && (
            <p className="font-sans text-xs text-text2 truncate italic">
              &ldquo;{reply.latestReplyExcerpt}&rdquo;
            </p>
          )}

          <span className="font-mono text-[9px] text-text2 opacity-50 uppercase tracking-wider">
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
          if (phase === 'PAYOUT') list.push({ id: i + 1, season: data[0], phase: phase as string });
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

  // The PAYOUT-phase scan only tells us which seasons *could* be claimable.
  // Whether a season is actually claimable (unclaimed + owed) is decided per
  // season inside ClaimableCard via usePayout. Each card reports its result
  // here so the count / pill / whole-pane visibility match what renders.
  const [claimableMap, setClaimableMap] = useState<Record<string, boolean>>({});
  const handleClaimableChange = React.useCallback((seasonAddress: string, claimable: boolean) => {
    setClaimableMap((prev) =>
      prev[seasonAddress] === claimable ? prev : { ...prev, [seasonAddress]: claimable },
    );
  }, []);

  const payouts = concludedSeasons ?? [];
  const polls = discourseAlerts?.pendingPolls ?? [];
  const replies = discourseAlerts?.replies ?? [];

  const claimableCount = payouts.reduce((n, s) => n + (claimableMap[s.season] ? 1 : 0), 0);
  const totalCount = claimableCount + polls.length + replies.length;

  if (!isOwner) return null;

  // The ClaimableCards must stay mounted whenever there are scanned PAYOUT
  // seasons — their usePayout hooks are what populate claimableMap. When the
  // visible pane is hidden (nothing actually pending), keep the probes mounted
  // off-screen so they can report in and flip the pane on if one is claimable.
  const probes = payouts.map((s) => (
    <ClaimableCard
      key={s.season}
      season={s}
      playerAddress={playerAddress}
      onClaimableChange={handleClaimableChange}
    />
  ));

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
