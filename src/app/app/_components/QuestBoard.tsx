'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePublicClient } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { useTenantChainId, useTenantPonderUrl } from '@/context/TenantContext';
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';

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

function PhaseGateButton({ phase, modalTitle, modalBody }: {
  phase: 'AUCTION' | 'TRADING' | 'PAYOUT';
  modalTitle: string;
  modalBody: string;
}) {
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();
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

  function handleClick() {
    if (activeSlug) {
      router.push(`/${activeSlug}`);
    } else {
      setShowModal(true);
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 border rounded font-bold transition-transform active:scale-95 whitespace-nowrap btn-game-primary"
      >
        Execute
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-[var(--color-card)] border border-text2 rounded p-6 max-w-sm w-full mx-4 font-mono"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="block text-[9px] uppercase text-text2 tracking-widest mb-2">Phase Status</span>
            <h3 className="text-sm font-black text-text uppercase tracking-wide mb-3">{modalTitle}</h3>
            <p className="text-[11px] text-text2 mb-5">{modalBody}</p>
            <button
              onClick={() => setShowModal(false)}
              className="font-mono text-[10px] uppercase tracking-wider px-4 py-1.5 border border-text2 rounded font-bold text-text2 hover:text-text transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </>
  );
}

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

export function QuestBoard({
  mainQuests,
  userTotalPoints,
  tgeConversionRate = 'Dynamic Vector',
}: QuestBoardProps) {
  return (
    <div className="w-full metric-bar-chassis flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-3 border-text2 pb-4 gap-4">
        <div className="flex flex-col">
          <span className="font-mono text-[9px] uppercase text-text2 tracking-widest">Protocol Directive</span>
          <h2 className="font-mono text-lg font-black text-text uppercase tracking-wider">
            Governance Seed Matrix
          </h2>
        </div>

        <div className="flex gap-6 items-center w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex flex-col text-left sm:text-right">
            <span className="font-mono text-[9px] uppercase text-text2 tracking-widest">TGE Yield Anchor</span>
            <span className="font-mono text-xs font-bold text-[var(--color-gold)] uppercase">
              {tgeConversionRate}
            </span>
          </div>
          <div className="flex flex-col text-right bg-[var(--color-card2)] border border-text2 px-3 py-1.5 rounded">
            <span className="font-mono text-[9px] uppercase text-text2 tracking-widest">Secured Points</span>
            <span className="font-mono text-base font-black text-[var(--color-green)]">
              {userTotalPoints.toLocaleString()} <span className="text-[10px] text-text2 font-normal">PTS</span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {mainQuests.map((mainQuest, idx) => {
          const completedCount = mainQuest.subQuests.filter(q => q.isCompleted).length;
          const totalCount = mainQuest.subQuests.length;
          const isVectorFullyCleared = completedCount === totalCount;

          return (
            <div
              key={mainQuest.id}
              className="p-4 border border-text2 bg-[var(--color-bg)] rounded transition-all duration-300 relative overflow-hidden"
              style={{
                boxShadow: isVectorFullyCleared ? '0 0 12px var(--color-green-15)' : 'none',
              }}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="font-mono text-[9px] uppercase text-text2 tracking-widest font-bold">
                    Vector 0{idx + 1}
                  </span>
                  <h3 className="font-mono text-sm font-black text-text uppercase tracking-wide mt-0.5">
                    {mainQuest.title}
                  </h3>
                  <p className="font-mono text-[11px] text-text2 mt-1 max-w-2xl">
                    {mainQuest.description}
                  </p>
                </div>

                <div className="font-mono text-[10px] font-bold bg-[var(--color-card2)] px-2 py-0.5 rounded border border-text2/40 whitespace-nowrap">
                  <span className={isVectorFullyCleared ? 'text-[var(--color-green)]' : 'text-text'}>
                    {completedCount}
                  </span>
                  <span className="text-text2"> / {totalCount} CLEARED</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {mainQuest.subQuests.map((sub) => (
                  <div
                    key={sub.id}
                    className={`p-3 rounded border flex items-center justify-between gap-4 transition-colors ${
                      sub.isCompleted
                        ? 'bg-[var(--color-card2)]/30 border-[var(--color-green)]/40'
                        : 'bg-[var(--color-card2)] border-text2/40 hover:border-text2'
                    }`}
                  >
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-mono text-[8px] px-1 py-0.25 rounded border font-bold uppercase tracking-tight ${
                          sub.type === 'galxe'
                            ? 'text-[var(--color-purple)] border-[var(--color-purple)]/30 bg-[var(--color-purple-15)]'
                            : 'text-[var(--color-gold)] border-[var(--color-gold)]/30 bg-[var(--color-gold-15)]'
                        }`}>
                          {sub.type === 'galxe' ? 'Galxe Execution' : 'Internal Testnet'}
                        </span>

                        <span className="font-mono text-[9px] font-black text-[var(--color-green)]">
                          +{sub.points} PTS
                        </span>
                      </div>

                      <span className="font-mono text-xs font-bold text-text truncate">
                        {sub.title}
                      </span>
                      {sub.note && (
                        <span className="font-mono text-[10px] text-text2/70 mt-0.5">
                          {sub.note}
                        </span>
                      )}
                    </div>

                    <div>
                      {sub.copyUrl ? (
                        <CopyLinkButton url={sub.copyUrl} />
                      ) : sub.auctionGate && !sub.isCompleted ? (
                        <PhaseGateButton
                          phase="AUCTION"
                          modalTitle="No Active Auction"
                          modalBody="There is currently no testnet season in the auction phase. Check back when the next season launches."
                        />
                      ) : sub.tradingGate && !sub.isCompleted ? (
                        <PhaseGateButton
                          phase="TRADING"
                          modalTitle="No Active Trading Season"
                          modalBody="There is currently no testnet season in the trading phase. Check back when the next season starts."
                        />
                      ) : sub.payoutGate && !sub.isCompleted ? (
                        <PhaseGateButton
                          phase="PAYOUT"
                          modalTitle="No Active Payout"
                          modalBody="There is currently no testnet season in the payout phase. Check back when the current season concludes."
                        />
                      ) : sub.isCompleted ? (
                        <div className="w-6 h-6 rounded-full bg-[var(--color-green)]/10 border border-[var(--color-green)] grid place-items-center text-[var(--color-green)] font-mono text-xs font-black">
                          ✓
                        </div>
                      ) : sub.actionUrl ? (
                        <a
                          href={sub.actionUrl}
                          target={sub.type === 'galxe' ? '_blank' : '_self'}
                          rel="noopener noreferrer"
                          className={`font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 border rounded font-bold transition-transform active:scale-95 whitespace-nowrap block ${
                            sub.type === 'galxe'
                              ? 'bg-[var(--color-purple)] border-[var(--color-purple)] text-white hover:opacity-90'
                              : 'btn-game-primary'
                          }`}
                        >
                          {sub.type === 'galxe' ? 'Launch' : 'Execute'}
                        </a>
                      ) : (
                        <span className="font-mono text-[10px] uppercase tracking-wider text-text2/60 whitespace-nowrap">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[10px] text-text2 border-t-3 border-text2 pt-3 mt-1">
        <div className="text-left">
          <span className="text-[var(--color-gold)] font-bold">▲ Ledger Advisory:</span> All internally executed testnet states are captured on-chain via localized snapshot indexes.
        </div>
        <div className="text-right sm:text-right text-text2/70 uppercase tracking-wider self-center">
          Points translate directly to Governance weight multipliers upon TGE phase trigger.
        </div>
      </div>
    </div>
  );
}
