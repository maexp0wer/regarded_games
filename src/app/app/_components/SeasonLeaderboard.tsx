'use client';

import React, { useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useSeasonLeaderboard, LeaderboardEntry } from '@/hooks/useSeasonLeaderboard';
import { usePlayerNames } from '@/hooks/usePlayerNames';

interface SeasonLeaderboardProps {
  seasonAddress: string;
  seasonName?: string;
}

type Category = {
  key: 'absolute' | 'relative' | 'volume' | 'fees';
  label: string;
  tag: string;
  // Full literal class strings so Tailwind's content scanner keeps them.
  strip: [string, string, string]; // #1 (accent) → #2 (-70) → #3 (-35)
  glow: string;                     // #1 strip glow shadow
  rankTop: string;                  // #1 rank number color
  value: string;                    // value text color
  hoverBorder: string;
  pill: string;                     // tag chip color set
  signed: boolean;                  // tint value by sign (P/L only)
  format: (v: number) => string;
};

const usd = (v: number) =>
  v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CATEGORIES: Category[] = [
  {
    key: 'absolute',
    label: 'Absolute P&L',
    tag: 'USD Value',
    strip: ['bg-green', 'bg-green-70', 'bg-green-35'],
    glow: 'shadow-[0_0_8px_var(--color-green-35)]',
    rankTop: 'text-green',
    value: 'text-green',
    hoverBorder: 'hover:border-green-35',
    pill: 'bg-green-15 text-green border-green-35',
    signed: true,
    format: (v) => `${v >= 0 ? '+' : '-'}$${usd(Math.abs(v))}`,
  },
  {
    key: 'relative',
    label: 'Relative P&L',
    tag: 'Multipliers',
    strip: ['bg-purple', 'bg-purple-70', 'bg-purple-35'],
    glow: 'shadow-[0_0_8px_var(--color-purple-35)]',
    rankTop: 'text-purple',
    value: 'text-purple',
    hoverBorder: 'hover:border-purple-35',
    pill: 'bg-purple-15 text-purple border-purple-35',
    signed: false,
    format: (v) => `${v >= 0 ? '+' : ''}${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`,
  },
  {
    key: 'volume',
    label: 'Trade Volume',
    tag: 'Turnover',
    strip: ['bg-gold', 'bg-gold-70', 'bg-gold-35'],
    glow: 'shadow-[0_0_8px_var(--color-gold-35)]',
    rankTop: 'text-gold',
    value: 'text-gold',
    hoverBorder: 'hover:border-gold-35',
    pill: 'bg-gold-15 text-gold border-gold-35',
    signed: false,
    format: (v) => `$${usd(v)}`,
  },
  {
    key: 'fees',
    label: 'Trading Fees',
    tag: 'Fees Paid',
    strip: ['bg-gold', 'bg-gold-70', 'bg-gold-35'],
    glow: 'shadow-[0_0_8px_var(--color-gold-35)]',
    rankTop: 'text-gold',
    value: 'text-text',
    hoverBorder: 'hover:border-gold-35',
    pill: 'bg-gold-15 text-gold border-gold-35',
    signed: false,
    format: (v) => `$${usd(v)}`,
  },
];

const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

interface SectionProps {
  category: Category;
  entries: LeaderboardEntry[];
  names: Map<string, string>;
  connectedAddress?: string; // lowercased
}

const LeaderboardSection: React.FC<SectionProps> = ({ category, entries, names, connectedAddress }) => (
  <section className="flex flex-col p-5 rounded-lg bg-card2 border border-border">
    <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
      <span className="font-mono text-xs font-bold text-text2 uppercase tracking-widest">{category.label}</span>
      <span className={`font-mono text-[10px] px-2 py-0.5 rounded border uppercase font-bold tracking-wider ${category.pill}`}>
        {category.tag}
      </span>
    </div>

    <div className="flex flex-col gap-2">
      {entries.length === 0 ? (
        <div className="flex items-center justify-center p-3 rounded bg-card2 border border-border">
          <span className="font-mono text-[11px] text-text2 uppercase tracking-widest opacity-60">No Entries</span>
        </div>
      ) : (
        entries.map((entry, i) => {
          const isTop = i === 0;
          const isYou = !!connectedAddress && entry.address === connectedAddress;
          const tint = category.signed
            ? entry.value >= 0 ? 'text-green' : 'text-red'
            : category.value;
          const name = names.get(entry.address) ?? 'Regarded Anon';
          return (
            <div
              key={entry.address}
              className={`relative flex items-center justify-between p-3 pl-5 rounded ${category.hoverBorder} group transition-all duration-150 ease-in-out overflow-hidden ${isYou ? 'bg-(image:--sunset-15) ' : 'bg-card3'}`}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1 group-hover:w-1.5 transition-all ${category.strip[i]} ${isTop ? category.glow : ''}`} />
              <div className="flex items-center gap-3 min-w-0">
                <span className={`font-display text-lg font-black tracking-tight tabular-nums shrink-0 ${isTop ? category.rankTop : 'text-text2'}`}>
                  #{i + 1}
                </span>
                <div className="flex items-baseline gap-1.5 min-w-0">
                  <span className="font-sans text-xs font-bold text-text truncate">{name}</span>
                  <span className="font-mono text-[10px] tracking-widest text-text2 uppercase shrink-0">({truncate(entry.address)})</span>
                </div>
              </div>
              <span className={`font-mono text-xs font-bold tabular-nums shrink-0 ${tint}`}>
                {category.format(entry.value)}
              </span>
            </div>
          );
        })
      )}
    </div>
  </section>
);

export const SeasonLeaderboard: React.FC<SeasonLeaderboardProps> = ({ seasonAddress, seasonName }) => {
  const board = useSeasonLeaderboard(seasonAddress);
  const { address } = useAccount();
  const connectedAddress = address?.toLowerCase();

  const rosterAddresses = useMemo(
    () => [...board.absolute, ...board.relative, ...board.volume, ...board.fees].map((e) => e.address),
    [board.absolute, board.relative, board.volume, board.fees],
  );
  const { data: names } = usePlayerNames(rosterAddresses);
  const nameMap = names ?? new Map<string, string>();

  if (board.loading) {
    return (
      <div className="w-full flex flex-col gap-6 p-6 rounded-xl bg-card border border-border relative overflow-hidden isolate">
        <div className="h-7 w-56 rounded bg-border animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {CATEGORIES.map((c) => (
            <div key={c.key} className="flex flex-col gap-3 p-5 rounded-lg bg-card border border-border animate-pulse">
              <div className="h-4 w-32 rounded bg-border" />
              <div className="h-11 w-full rounded bg-border" />
              <div className="h-11 w-full rounded bg-border" />
              <div className="h-11 w-full rounded bg-border" />
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-text2 font-mono">Reading Ledger...</p>
      </div>
    );
  }

  if (board.totalPlayers < 1) return null;

  return (
    <div className="terminal-pane gap-5 pb-2">
      {/* Ambient gold mist */}
      
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-4 border-b border-border">
        <div className="flex flex-col gap-1.5">
          <p className="terminal-pane-title">Leaderboard</p>
        </div>

        <div className="flex items-center gap-1 font-mono text-[11px] text-text2 bg-card2 border border-border px-3 py-1.5 rounded-md">
          <span className="text-[9px] tracking-wider uppercase mr-1">Field:</span>
          <span className="font-bold text-text tabular-nums">{board.totalPlayers}</span>
          <span className="text-[9px] text-gold font-bold ml-0.5">Players</span>
        </div>
      </header>

      {/* 2x2 Standings */}
      <main className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {CATEGORIES.map((category) => (
          <LeaderboardSection
            key={category.key}
            category={category}
            entries={board[category.key]}
            names={nameMap}
            connectedAddress={connectedAddress}
          />
        ))}
      </main>
    </div>
  );
};
