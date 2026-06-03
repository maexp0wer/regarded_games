'use client';

import React, { useState, useEffect } from 'react';
import { usePublicClient, useAccount } from 'wagmi';
import { Address } from 'viem';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

import { useTenantDeployment, useTenantChainId } from '@/context/TenantContext';
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';
import { usePayout } from '@/hooks/usePayout';
import { useDiscourseAlerts, type PendingPoll, type ReplyGroup } from '@/hooks/useDiscourseAlerts';
import { forumLoginUrl } from '@/utils/discourseForum';

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
  hoverBorderVar,
  children,
}: {
  accentVar: string;        // CSS var name e.g. '--color-gold'
  hoverBorderVar: string;   // CSS var name for hover border e.g. '--color-gold-35'
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg bg-card2 border border-border transition-all group overflow-hidden pl-5"
      style={hovered ? { borderColor: `var(${hoverBorderVar})` } : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Signature left edge bar */}
      <div
        className="absolute left-0 top-0 bottom-0 transition-all"
        style={{
          width: hovered ? '6px' : '4px',
          background: `var(${accentVar})`,
          boxShadow: `0 0 8px var(${hoverBorderVar})`,
        }}
      />
      {children}
    </div>
  );
}

// ─── Claimable Payout (Gold) ──────────────────────────────────────────────────

function ClaimableCard({ season, playerAddress }: { season: any; playerAddress: string }) {
  const { payout, pnl, loading } = usePayout(season.season, playerAddress as Address);

  if (loading || payout <= 0) return null;

  const pnlPositive = pnl >= 0;

  return (
    <Link href={`/season_${season.id}`} className="block">
      <AlertItem accentVar="--color-gold" hoverBorderVar="--color-gold-35">
        {/* Info */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-bold text-text uppercase tracking-tight">
              Season {String(season.id).padStart(2, '0')}
            </span>
            <span
              className="font-mono text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border"
              style={{
                background: 'var(--color-gold-15)',
                color: 'var(--color-gold)',
                borderColor: 'var(--color-gold-35)',
              }}
            >
              Claim Ready
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-sans text-xs text-text2">
            <span>
              Season PNL:{' '}
              <strong
                className="font-mono font-bold"
                style={{ color: pnlPositive ? 'var(--color-green)' : 'var(--color-red)', fontVariantNumeric: 'tabular-nums' }}
              >
                {pnlPositive ? '+ ' : '- '}$
                {Math.abs(pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </span>
            <span className="hidden sm:inline text-border2">|</span>
            <span>
              Claimable:{' '}
              <strong className="font-mono font-bold text-gold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {payout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
              </strong>
            </span>
          </div>
        </div>

        {/* CTA */}
        <span className="btn-game-primary text-xs font-black tracking-wider uppercase py-2 px-4 h-fit shrink-0">
          Claim Payout
        </span>
      </AlertItem>
    </Link>
  );
}

// ─── Governance Poll (Purple) ─────────────────────────────────────────────────

function PollAlertRow({ poll }: { poll: PendingPoll }) {
  const href = forumLoginUrl(`/t/${poll.topicSlug}/${poll.topicId}`);

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block">
      <AlertItem accentVar="--color-purple" hoverBorderVar="--color-purple-35">
        {/* Info */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display text-sm font-bold text-text uppercase tracking-tight truncate max-w-xs" title={poll.title}>
              {poll.title}
            </span>
            <span
              className="font-mono text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border shrink-0"
              style={{
                background: 'var(--color-purple-15)',
                color: 'var(--color-purple)',
                borderColor: 'var(--color-purple-35)',
              }}
            >
              Active Proposal
            </span>
          </div>
          <p className="font-sans text-xs text-text2">
            Governance vote · Your voice hasn&rsquo;t been cast yet
          </p>
        </div>

        {/* Countdown + CTA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
          <PollCountdown targetTimestamp={poll.pollCloseAt} />
          <span
            className="btn-game-secondary text-xs font-bold tracking-wider uppercase py-2 px-4 h-fit"
          >
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
      <AlertItem accentVar="--color-border2" hoverBorderVar="--color-border2">
        {/* Info */}
        <div className="flex flex-col gap-1 max-w-md min-w-0">
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
            <span className="font-display text-xs font-bold text-text uppercase truncate max-w-40" title={reply.topicTitle}>
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

        {/* CTA */}
        <span className="btn-game-secondary text-xs font-bold tracking-wider uppercase py-2 px-4 h-fit shrink-0">
          View Reply
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
          const phase = await publicClient.readContract({ address: data[0], abi: GameSeasonAbi as any, functionName: 'getPhase' });
          if (phase === 'PAYOUT' || phase === 'ENDED') list.push({ id: i + 1, season: data[0], phase: phase as string });
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

  const payouts = concludedSeasons ?? [];
  const polls = discourseAlerts?.pendingPolls ?? [];
  const replies = discourseAlerts?.replies ?? [];
  const totalCount = payouts.length + polls.length + replies.length;

  if (!isOwner || totalCount === 0) return null;

  return (
    <div className="relative w-full flex flex-col gap-3 p-5 rounded-xl bg-card border border-border shadow-xl overflow-hidden isolate">

      {/* Ambient glow */}
      <div
        className="absolute top-0 left-0 w-32 h-32 blur-2xl rounded-full -z-10 pointer-events-none -translate-x-1/2 -translate-y-1/2"
        style={{ background: 'var(--color-red-15)' }}
      />

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red opacity-75"
              style={{ boxShadow: '0 0 8px var(--color-red-35)' }}
            />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red" />
          </span>
          <span className="font-mono text-[10px] font-bold text-text2 uppercase tracking-widest pl-1">
            Active Alerts
          </span>
        </div>
        <span
          className="font-mono text-[10px] font-bold text-red px-2 py-0.5 rounded-full border"
          style={{
            background: 'var(--color-red-15)',
            borderColor: 'var(--color-red-35)',
          }}
        >
          {totalCount} Pending
        </span>
      </div>

      {/* Claimable payouts */}
      {payouts.map((s) => (
        <ClaimableCard key={s.season} season={s} playerAddress={playerAddress} />
      ))}

      {/* Governance polls */}
      {polls.map((poll) => (
        <PollAlertRow key={`${poll.topicId}-${poll.pollName}`} poll={poll} />
      ))}

      {/* Replies */}
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
