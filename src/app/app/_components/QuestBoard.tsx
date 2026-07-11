'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAccount, usePublicClient } from 'wagmi';
import type { Abi } from 'abitype';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTenantChainId, useTenantPonderUrl } from '@/context/TenantContext';
import { useReferrals } from '@/hooks/useReferrals';
import LedgerLoader from '@/components/LedgerLoader';
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';

const VARIABLE_REWARD_CAPS: Record<string, number> = {
  discussion_bonus: 400,
  win_the_game: 1000,
  // Max across all referral tiers: 10×50 + 25×20 + 65×5 = 1325.
  referrals: 1325,
};

// Quests that keep accruing after their first award — they must never render as
// a finished (greyed-out) task even once they have points, since the user can
// still earn more.
const OPEN_ENDED_QUESTS = new Set(['referrals']);

const INTERNAL_BUTTON_LABELS: Record<string, string> = {
  login_discourse: 'Open Forum',
  vote_manifest: 'Vote',
  use_faucet: 'Faucet',
  swap_usdc_rgd: 'Swap',
  stake_rgd: 'Stake',
  buy_fim_auction: 'Buy FIM',
  create_order: 'Create Order',
  execute_shuffle: 'Shuffle',
  claim_payout: 'Claim Payout',
};

interface SubQuest {
  id: string;
  title: string;
  points: number;
  type: 'galxe' | 'internal';
  isCompleted: boolean;
  actionUrl?: string;
  copyUrl?: string;
  auctionGate?: boolean;
  tradingGate?: boolean;
  payoutGate?: boolean;
  note?: string;
}

function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const full = window.location.origin + url;
    navigator.clipboard.writeText(full).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className="font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded font-bold whitespace-nowrap btn-game-3"
    >
      {copied ? 'Copied!' : 'Copy Link'}
    </button>
  );
}

function ReferralsModal({ address, onClose }: { address: string; onClose: () => void }) {
  const { data, isLoading, isError } = useReferrals(address);
  const queryClient = useQueryClient();
  const totalReferralPoints = data?.totalReferralPoints ?? 0;

  // The endpoint settles any owed referral credit as a side effect — refresh
  // the board so the +points appear without waiting for its next poll.
  useEffect(() => {
    if (totalReferralPoints > 0) {
      queryClient.invalidateQueries({ queryKey: ['quests', address.toLowerCase()] });
    }
  }, [totalReferralPoints, address, queryClient]);

  // Portal to <body> so the fixed overlay escapes the quest-row's transformed
  // ancestors — otherwise backdrop-filter is clipped to the row instead of
  // blurring the whole page (matches how TxModal renders at the layout root).
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="modal-overlay-blur"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card3 border border-border2 rounded-xl p-6 flex flex-col gap-5 w-full max-w-md shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display font-bold text-lg text-text uppercase">Your Referrals</h3>
            <p className="text-sm text-text2 mt-1">
              Referred wallets qualify once they reach {data?.threshold ?? 500} quest points.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="font-mono text-sm text-text2 hover:text-text leading-none shrink-0"
          >
            ✕
          </button>
        </div>

        {isLoading && (
          <div className="py-8 text-center">
            <LedgerLoader variant="inline" />
          </div>
        )}
        {isError && (
          <span className="font-mono text-xs text-[--color-red]">Failed to load referrals. Try again.</span>
        )}

        {data && (
          <>
            <div className="flex flex-col gap-2">
              <div className="kv-row">
                <span className="text-sm text-text2">Qualified referrals</span>
                <span className="font-mono text-[12px] font-semibold text-text tabular-nums">
                  {data.qualifiedCount} / {data.referrals.length}
                </span>
              </div>
              <div className="kv-row">
                <span className="text-sm text-text2">Referral points earned</span>
                <span className={`font-mono text-[12px] font-bold tabular-nums ${data.totalReferralPoints > 0 ? 'text-green' : 'text-text2'}`}>
                  +{data.totalReferralPoints} PTS
                </span>
              </div>
            </div>

            {data.referrals.length === 0 ? (
              <p className="font-mono text-xs text-text text-center py-4">
                No referrals yet — share your link to start earning.
              </p>
            ) : (
              <div className="border border-border2 rounded-lg divide-y divide-border2 max-h-110 overflow-y-auto custom-scrollbar">
                {data.referrals.map((r) => (
                  <div key={r.address} className="flex items-center gap-3 px-3 py-2.5">
                    <code title={r.address} className="font-mono text-[11px] text-text select-all">
                      {r.address.slice(0, 6)}…{r.address.slice(-4)}
                    </code>
                    <span className={`ml-auto font-mono text-[11px] tabular-nums ${r.qualified ? 'text-green' : 'text-text2'}`}>
                      {r.points} / {data.threshold} PTS
                    </span>
                    {r.qualified ? (
                      <div className="w-6 h-6 rounded-full bg-green/10 border border-green grid place-items-center text-green font-mono text-xs font-black shrink-0">
                        ✓
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border border-border2 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-text2 leading-relaxed">
              Per qualified referral: {data.tiers.map((t) => `${t.from}–${t.to}: ${t.perReferral} pts`).join(' · ')}.
            </p>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

function ViewReferralsButton() {
  const [open, setOpen] = useState(false);
  const { address } = useAccount();
  if (!address) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded font-bold whitespace-nowrap btn-game-3"
      >
        View Referrals
      </button>
      {open && <ReferralsModal address={address} onClose={() => setOpen(false)} />}
    </>
  );
}

async function findActiveSeasonSlug(
  phase: 'AUCTION' | 'TRADING' | 'PAYOUT',
  ponderUrl: string,
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>,
): Promise<string | null> {
  const res = await fetch(ponderUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query { seasonss(limit: 10) { items { address seasonId } } }`,
    }),
  });
  const json = await res.json();
  const seasons: { address: string; seasonId: string }[] = json?.data?.seasonss?.items ?? [];
  for (const season of seasons) {
    const currentPhase = await publicClient.readContract({
      address: season.address as `0x${string}`,
      abi: GameSeasonAbi as Abi,
      functionName: 'getPhase',
    });
    const isMatch = phase === 'PAYOUT'
      ? (currentPhase === 'PAYOUT' || currentPhase === 'DISTRIBUTION')
      : currentPhase === phase;
    if (isMatch) {
      return `season_${BigInt(season.seasonId) + 1n}`;
    }
  }
  return null;
}

// Shared hover tooltip. Render inside a `relative group` wrapper — it reveals
// on hover of that group (a disabled button, or an active link).
function HoverTooltip({ kicker, title, body }: { kicker: string; title: string; body: string }) {
  return (
    <div
      role="tooltip"
      className="absolute right-0 top-full mt-2 z-40 w-64 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150"
      style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.25))' }}
    >
      {/* Neutral accent bar — matches btn-game-3 */}
      <div style={{ height: 2, background: 'var(--color-border2)', borderRadius: '3px 3px 0 0' }} />
      <div className="bg-card3 border border-t-0 border-border2 rounded-b p-3 font-mono">
        <span className="block text-[8px] uppercase tracking-widest text-text2 mb-1.5">
          {kicker}
        </span>
        <h3 className="text-[11px] font-black text-text uppercase tracking-wide mb-2">
          {title}
        </h3>
        <p className="text-[10px] text-text2 leading-snug">
          {body}
        </p>
      </div>
    </div>
  );
}

// Note badge + tooltip. A filled purple "i" pip that reveals the note. On
// desktop it opens on hover; on touch (no hover) it toggles on tap. Visibility
// is state-driven rather than CSS `group-hover` so it works on mobile, and it
// dismisses on outside tap or Escape.
function NoteBadge({ note }: { note: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <span
      ref={ref}
      className="relative inline-flex shrink-0"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label="Show note"
        aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="font-mono text-[9px] font-black w-4 h-4 rounded-full grid place-items-center leading-none cursor-help"
        style={{
          background: 'var(--color-purple)',
          color: '#fff',
        }}
      >
        i
      </button>
      <div
        role="tooltip"
        className={`absolute left-1/2 -translate-x-1/2 top-full mt-2 z-40 w-72 max-w-[90vw] transition-opacity duration-150 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.25))' }}
      >
        {/* Purple accent bar — matches the quest category accent */}
        <div style={{ height: 2, background: 'var(--color-purple)', borderRadius: '3px 3px 0 0' }} />
        <div className="bg-card3 border border-t-0 border-border2 rounded-b p-3 font-mono normal-case">
          <span className="block text-[8px] uppercase tracking-widest text-text2 mb-1.5">
            Note
          </span>
          <p className="text-[10px] text-text2 leading-snug">
            {note}
          </p>
        </div>
      </div>
    </span>
  );
}

function InactivePendingButton({ label, tooltipKicker, tooltipTitle, tooltipBody }: {
  label: string;
  tooltipKicker: string;
  tooltipTitle: string;
  tooltipBody: string;
}) {
  return (
    <div className="relative group">
      <button
        type="button"
        disabled
        className="font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded font-bold whitespace-nowrap btn-game-3"
      >
        {label}
      </button>
      <HoverTooltip kicker={tooltipKicker} title={tooltipTitle} body={tooltipBody} />
    </div>
  );
}

function PhaseGateButton({ phase, label, tooltipTitle, tooltipBody }: {
  phase: 'AUCTION' | 'TRADING' | 'PAYOUT';
  label: string;
  tooltipTitle: string;
  tooltipBody: string;
}) {
  const chainId = useTenantChainId();
  const ponderUrl = useTenantPonderUrl();
  const publicClient = usePublicClient({ chainId });

  const queryKeyLabel = phase === 'AUCTION' ? 'auctionActive' : phase === 'TRADING' ? 'tradingActive' : 'payoutActive';
  const { data: activeSlug = null } = useQuery({
    queryKey: [queryKeyLabel, ponderUrl, chainId],
    queryFn: () => findActiveSeasonSlug(phase, ponderUrl, publicClient!),
    enabled: !!publicClient,
    refetchInterval: 15000,
  });

  if (activeSlug) {
    return (
      <a
        href={`/${activeSlug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded font-bold whitespace-nowrap btn-game-3 block"
      >
        {label}
      </a>
    );
  }

  return (
    <InactivePendingButton
      label={label}
      tooltipKicker="Phase Status"
      tooltipTitle={tooltipTitle}
      tooltipBody={tooltipBody}
    />
  );
}

const INACTIVE_PENDING_TOOLTIPS: Record<string, { title: string; body: string }> = {
  discussion_bonus: {
    title: 'Strategic Voice Bonus',
    body: "Awarded at the end of the Testnet Phase based on the quality and engagement of your participation in Discourse discussions.",
  },
  win_the_game: {
    title: 'Win the Game',
    body: "Points are awarded at the end of each season based on your relative PnL rank — the higher your rank versus other players, the more points you earn (up to the cap).",
  },
};

interface MainQuest {
  id: string;
  title: string;
  subQuests: SubQuest[];
}

interface QuestBoardProps {
  mainQuests: MainQuest[];
  userTotalPoints: number;
  tgeConversionRate?: string;
}

function SubQuestAction({ sub, locked }: { sub: SubQuest; locked: boolean }) {
  if (locked) {
    return (
      <InactivePendingButton
        label="Locked"
        tooltipKicker="Sequence Gate"
        tooltipTitle="Complete previous step first"
        tooltipBody="The Testnet vector is a linear sequence — capital must flow through each stage in order. Clear the prior step to unlock this one."
      />
    );
  }
  if (sub.copyUrl) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <ViewReferralsButton />
        <CopyLinkButton url={sub.copyUrl} />
      </div>
    );
  }
  if (sub.auctionGate && !sub.isCompleted) {
    return (
      <PhaseGateButton
        phase="AUCTION"
        label="Buy FIM"
        tooltipTitle="No Active Auction"
        tooltipBody="There is currently no testnet season in the auction phase. Check back when the next season launches."
      />
    );
  }
  if (sub.tradingGate && !sub.isCompleted) {
    return (
      <PhaseGateButton
        phase="TRADING"
        label={INTERNAL_BUTTON_LABELS[sub.id] ?? 'Trade FIM'}
        tooltipTitle="No Active Trading Season"
        tooltipBody="There is currently no testnet season in the trading phase. Check back when the next season starts."
      />
    );
  }
  if (sub.payoutGate && !sub.isCompleted) {
    return (
      <PhaseGateButton
        phase="PAYOUT"
        label="Claim Payout"
        tooltipTitle="No Active Payout"
        tooltipBody="There is currently no testnet season in the payout phase. Check back when the current season concludes."
      />
    );
  }
  if (sub.isCompleted) {
    return (
      <div className="w-6 h-6 rounded-full bg-[var(--color-green)]/10 border border-[var(--color-green)] grid place-items-center text-[var(--color-green)] font-mono text-xs font-black">
        ✓
      </div>
    );
  }
  if (sub.actionUrl) {
    return (
      <a
        href={sub.actionUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded font-bold whitespace-nowrap block btn-game-3"
      >
        {sub.type === 'galxe' ? 'Launch' : (INTERNAL_BUTTON_LABELS[sub.id] ?? 'Execute')}
      </a>
    );
  }
  return (
    <InactivePendingButton
      label="Pending"
      tooltipKicker="Award Status"
      tooltipTitle={INACTIVE_PENDING_TOOLTIPS[sub.id]?.title ?? sub.title}
      tooltipBody={INACTIVE_PENDING_TOOLTIPS[sub.id]?.body ?? sub.note ?? 'Points for this quest are awarded automatically once the qualifying conditions are met.'}
    />
  );
}

export function QuestBoard({
  mainQuests,
  userTotalPoints,
}: QuestBoardProps) {
  return (
    <div className="flex flex-col gap-8 max-w-250 mx-auto px-4 py-8">

      {/* ── HERO HEADER ─────────────────────────────────────────── */}
      <header className="flex flex-col items-start justify-between gap-6 pb-8 border-b border-dashed border-border md:flex-row md:items-end">
        <div className="flex-1 min-w-0">
          <h1
            className="hero-title"
            style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}
          >
            Airdrop{' '}
            <span className="hero-gradient-text">Quest Board</span>
          </h1>
          <p className="hero-subtitle" style={{ marginBottom: 0, fontSize: '0.95rem' }}>
            Complete quests to secure your stake of the Airdrop.
          </p>
        </div>

        <div className="grid gap-px rounded-md overflow-hidden border border-border" style={{ maxWidth: 200, width: '100%', gridTemplateColumns: '1fr' }}>
          <div className="bg-card px-4 py-3 in-[.dark]:bg-card2">
            <div className="font-mono text-[10px] font-semibold tracking-widest uppercase text-text2 mb-1.5">Secured Points</div>
            <div className="font-mono font-semibold text-[18px] tracking-[-0.01em] tabular-nums text-green">
              {userTotalPoints.toLocaleString()}
              <span className="font-mono text-[13px] font-medium text-text2 ml-1">PTS</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── QUEST CATEGORIES ────────────────────────────────────── */}
      {mainQuests.map((mainQuest) => {
        const completedCount = mainQuest.subQuests.filter(q => q.isCompleted).length;
        const totalCount = mainQuest.subQuests.length;
        const isFullyCleared = completedCount === totalCount && totalCount > 0;
        const showStepNumbers = mainQuest.id === 'dominate_testnet';
        const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

        return (
          <section
            key={mainQuest.id}
            className="terminal-pane quest-category-pane"
          >
            {/* Header row */}
            <div className="terminal-pane-header">
              <div>
                <span className="terminal-pane-title" style={{ color: 'var(--color-text)', fontSize: '0.8rem' }}>
                  {mainQuest.title}
                </span>
              </div>
              <span
                className={`pill ${isFullyCleared ? 'text-green' : 'text-purple'}`}
                style={{ fontSize: '0.7rem' }}
              >
                {completedCount} / {totalCount} Completed
              </span>
            </div>

            {/* Progress rail */}
            <div className="progress-rail-container" style={{ height: '5px', marginBottom: '1rem', borderWidth: 0 }}>
              <div
                className="progress-rail-fill"
                style={{
                  width: `${progressPct}%`,
                  background: isFullyCleared
                    ? 'var(--color-green)'
                    : 'linear-gradient(90deg, var(--color-purple) 0%, var(--color-magenta) 100%)',
                }}
              />
            </div>

            {/* Sub-quest rows */}
            <div className="flex flex-col w-full bg-transparent rounded-lg overflow-hidden" style={{ overflow: 'visible' }}>
              {mainQuest.subQuests.map((sub, stepIdx) => {
                const stepLabel = showStepNumbers ? String(stepIdx + 1).padStart(2, '0') : null;
                const locked = false;
                // Open-ended quests keep accepting new points, so they never
                // render as a finished (greyed-out) task even with points banked.
                const showAsCompleted = sub.isCompleted && !OPEN_ENDED_QUESTS.has(sub.id);

                return (
                  <div
                    key={sub.id}
                    className={`ledger-row quest-task-row${showAsCompleted ? ' quest-completed' : ''}${locked ? ' locked-task' : ''}`}
                    style={{ backgroundColor: 'var(--color-card2)' }}
                  >
                    {/* Col 1: meta */}
                    <div className="quest-cell-meta flex flex-col gap-[0.3rem] min-w-0">
                      <div className="font-display text-[0.9rem] font-bold text-text tracking-[0.02em] flex items-center gap-2 flex-wrap">
                        {stepLabel && (
                          <span className="font-mono text-[8px] font-black text-text2 tracking-widest uppercase shrink-0">
                            {stepLabel}.
                          </span>
                        )}
                        {sub.title}
                        {sub.note && <NoteBadge note={sub.note} />}
                        {locked && (
                          <span
                            className="font-mono text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
                            style={{
                              color: 'var(--color-red)',
                              background: 'var(--color-red-15)',
                              border: '1px solid var(--color-red-35)',
                            }}
                          >
                            LOCKED
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Col 2: reward */}
                    <div className="quest-cell-reward font-mono font-bold text-[0.85rem] text-left md:text-right md:min-w-22.5 whitespace-nowrap">
                      {sub.isCompleted ? (
                        <span className="text-green">+{sub.points} PTS</span>
                      ) : locked ? (
                        <span className="text-text2">??? PTS</span>
                      ) : VARIABLE_REWARD_CAPS[sub.id] != null ? (
                        <span className="text-gold">up to {VARIABLE_REWARD_CAPS[sub.id]} PTS</span>
                      ) : (
                        <span className="text-gold">+{sub.points} PTS</span>
                      )}
                    </div>

                    {/* Col 3: action */}
                    <div className="quest-cell-action quest-action">
                      <SubQuestAction sub={sub} locked={locked} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* ── FOOTER ADVISORY ─────────────────────────────────────── */}
      <div className="font-mono text-[10px] text-text2">
        
        <div className="sm:text-right text-text2/70 uppercase tracking-wider self-center">
          Points translate directly to Regarded Tokens you receive during the Token Generation Event.
        </div>
      </div>
    </div>
  );
}
