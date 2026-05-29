'use client';

import React, { useState } from 'react';
import { usePublicClient } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { useTenantChainId, useTenantPonderUrl } from '@/context/TenantContext';
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';

const VARIABLE_REWARD_CAPS: Record<string, number> = {
  discussion_bonus: 400,
  win_the_game: 1000,
};

const INTERNAL_BUTTON_LABELS: Record<string, string> = {
  login_discourse: 'Discourse',
  vote_manifest: 'Vote',
  use_faucet: 'Faucet',
  swap_usdc_rgd: 'Swap',
  stake_rgd: 'Stake',
  buy_fim_auction: 'Buy FIM',
  trade_fim: 'Trade FIM',
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
      className="font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 border rounded font-bold transition-transform active:scale-95 whitespace-nowrap btn-game-primary"
    >
      {copied ? 'Copied!' : 'Copy Link'}
    </button>
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
      abi: GameSeasonAbi as any,
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
        className="font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 border rounded font-bold whitespace-nowrap btn-game-primary"
      >
        {label}
      </button>
      <div
        role="tooltip"
        className="absolute right-0 top-full mt-2 z-40 w-64 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.25))' }}
      >
        {/* Gradient accent bar — matches btn-game-primary */}
        <div style={{ height: 2, background: 'var(--cyber-sunset)', borderRadius: '3px 3px 0 0' }} />
        <div className="bg-card3 border border-t-0 border-border2 rounded-b p-3 font-mono">
          <span className="block text-[8px] uppercase tracking-widest text-text2 mb-1.5">
            {tooltipKicker}
          </span>
          <h3 className="text-[11px] font-black text-text uppercase tracking-wide mb-2">
            {tooltipTitle}
          </h3>
          <p className="text-[10px] text-text2 leading-snug">
            {tooltipBody}
          </p>
        </div>
      </div>
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
        className="font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 border rounded font-bold transition-transform active:scale-95 whitespace-nowrap btn-game-primary block"
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
  description: string;
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
  if (sub.copyUrl) return <CopyLinkButton url={sub.copyUrl} />;
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
        label="Trade FIM"
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
        className={`font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 border rounded font-bold transition-transform active:scale-95 whitespace-nowrap block ${
          sub.type === 'galxe' ? 'btn-game-secondary' : 'btn-game-primary'
        }`}
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

function SubQuestTypeChip({ type }: { type: 'galxe' | 'internal' }) {
  return (
    <span
      className={`font-mono text-[8px] px-1 py-0.25 rounded border font-bold uppercase tracking-tight ${
        type === 'galxe'
          ? 'text-[var(--color-purple)] border-[var(--color-purple)]/30 bg-[var(--color-purple-15)]'
          : 'text-[var(--color-gold)] border-[var(--color-gold)]/30 bg-[var(--color-gold-15)]'
      }`}
    >
      {type === 'galxe' ? 'Galxe' : 'Internal'}
    </span>
  );
}

const DIRECTIVE_ACCENTS = [
  {
    factionBg: '',
    pillClass: 'pill-phase-gold',
    progressStyle: {} as React.CSSProperties,
  },
  {
    factionBg: 'faction-bg-soc',
    pillClass: 'pill-phase-soc',
    progressStyle: { background: 'linear-gradient(90deg, var(--color-purple) 0%, var(--color-magenta) 100%)' } as React.CSSProperties,
  },
  {
    factionBg: 'faction-bg-cap',
    pillClass: 'pill-phase-cap',
    progressStyle: { background: 'linear-gradient(90deg, var(--color-gold) 0%, var(--color-orange) 100%)' } as React.CSSProperties,
  },
];

export function QuestBoard({
  mainQuests,
  userTotalPoints,
  tgeConversionRate = 'Dynamic Vector',
}: QuestBoardProps) {
  return (
    <div className="quest-board-layout">

      {/* ── HERO HEADER ─────────────────────────────────────────── */}
      <header className="quest-header">
        <div className="quest-header-content">
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

        <div className="stat-grid" style={{ maxWidth: 200, width: '100%', gridTemplateColumns: '1fr' }}>
          <div className="stat-cell">
            <div className="stat-label">Secured Points</div>
            <div className="stat-value green">
              {userTotalPoints.toLocaleString()}
              <span className="stat-sub">PTS</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── DIRECTIVES ──────────────────────────────────────────── */}
      {mainQuests.map((mainQuest, idx) => {
        const completedCount = mainQuest.subQuests.filter(q => q.isCompleted).length;
        const totalCount = mainQuest.subQuests.length;
        const isFullyCleared = completedCount === totalCount && totalCount > 0;
        const showStepNumbers = mainQuest.id === 'dominate_testnet';
        const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
        const accent = DIRECTIVE_ACCENTS[idx] ?? DIRECTIVE_ACCENTS[0];

        return (
          <section
            key={mainQuest.id}
            className={`terminal-pane quest-category-pane ${accent.factionBg}`}
            style={isFullyCleared ? { boxShadow: '0 0 16px var(--color-green-15), 0 0 0 1px var(--color-green-35)' } : undefined}
          >
            {/* Header row */}
            <div className="terminal-pane-header">
              <div>
                <span className="font-mono text-[9px] uppercase text-text2 tracking-widest block mb-0.5">
                  Directive {String.fromCharCode(65 + idx)}
                </span>
                <span className="terminal-pane-title" style={{ color: 'var(--color-text)', fontSize: '0.8rem' }}>
                  {mainQuest.title}
                </span>
              </div>
              <span className={`pill ${accent.pillClass}`} style={{ fontSize: '0.7rem' }}>
                <span className={isFullyCleared ? 'text-green' : ''}>{completedCount}</span>
                {' / '}{totalCount} Cleared
              </span>
            </div>

            {/* Description */}
            {mainQuest.description && (
              <p className="font-mono text-[11px] text-text2 mb-3 leading-relaxed">
                {mainQuest.description}
              </p>
            )}

            {/* Progress rail */}
            <div className="progress-rail-container" style={{ height: '5px', marginBottom: '1rem', borderWidth: 0 }}>
              <div
                className="progress-rail-fill"
                style={{ width: `${progressPct}%`, ...accent.progressStyle }}
              />
            </div>

            {/* Sub-quest rows */}
            <div className="ledger-container" style={{ overflow: 'visible' }}>
              {mainQuest.subQuests.map((sub, stepIdx) => {
                const stepLabel = showStepNumbers ? String(stepIdx + 1).padStart(2, '0') : null;
                const locked = false;

                return (
                  <div
                    key={sub.id}
                    className={`ledger-row quest-task-row${sub.isCompleted ? ' quest-completed' : ''}${locked ? ' locked-task' : ''}`}
                    style={{ backgroundColor: 'var(--color-card2)' }}
                  >
                    {/* Col 1: meta */}
                    <div className="quest-meta">
                      <div className="quest-title">
                        {stepLabel && (
                          <span className="font-mono text-[8px] font-black text-text2 tracking-widest uppercase shrink-0">
                            {stepLabel}.
                          </span>
                        )}
                        {sub.title}
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
                      <div className="quest-desc">
                        <SubQuestTypeChip type={sub.type} />
                        {sub.note && <span>{sub.note}</span>}
                      </div>
                    </div>

                    {/* Col 2: reward */}
                    <div className="quest-reward">
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
                    <div className="quest-action">
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
      <div className="font-mono text-[10px] text-text2 border-t border-border2 pt-3">
        
        <div className="sm:text-right text-text2/70 uppercase tracking-wider self-center">
          Points translate directly to Regarded Tokens you receive during the Token Generation Event.
        </div>
      </div>
    </div>
  );
}
