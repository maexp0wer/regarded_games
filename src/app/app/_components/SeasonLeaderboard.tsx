'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useSeasonLeaderboard, LeaderboardEntry } from '@/hooks/useSeasonLeaderboard';
import { usePlayerNames } from '@/hooks/usePlayerNames';
import LedgerLoader from '@/components/LedgerLoader';

interface SeasonLeaderboardProps {
  seasonAddress: string;
  seasonName?: string;
}

type CategoryKey = 'absolute' | 'relative' | 'volume' | 'fees';

type Category = {
  key: CategoryKey;
  label: string;
  signed: boolean;
  format: (v: number) => string;
};

const usd = (v: number) =>
  v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CATEGORIES: Category[] = [
  {
    key: 'absolute',
    label: 'Absolute P&L',
    signed: true,
    format: (v) => `${v >= 0 ? '+' : '-'}$${usd(Math.abs(v))}`,
  },
  {
    key: 'relative',
    label: 'Relative P&L',
    signed: false,
    format: (v) =>
      `${v >= 0 ? '+' : ''}${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`,
  },
  {
    key: 'volume',
    label: 'Trade Volume',
    signed: false,
    format: (v) => `$${usd(v)}`,
  },
  {
    key: 'fees',
    label: 'Trading Fees',
    signed: false,
    format: (v) => `$${usd(v)}`,
  },
];

const truncate = (addr: string) => `${addr.slice(0, 5)}…${addr.slice(-3)}`;

// Council sybil flag for THIS season. Neutral, factual wording (ADR-0008): the
// flag is a season-scoped record, not a verdict on the player.
function FlaggedTag() {
  return (
    <span
      className="font-mono text-[8px] font-black uppercase tracking-wider px-1 py-px rounded shrink-0"
      style={{ background: 'var(--color-red-15)', color: 'var(--color-red)', border: '1px solid var(--color-red-35)' }}
      title="Flagged by the Council this season — payout forfeited; the season settles as a draw."
    >
      Flagged
    </span>
  );
}

// ---- Preview table (top-10 in the card, clickable to open modal) ----

interface PreviewTableProps {
  category: Category;
  entries: LeaderboardEntry[];
  names: Map<string, string>;
  connectedAddress?: string;
  onOpen: () => void;
}

function PreviewTable({ category, entries, names, connectedAddress, onOpen }: PreviewTableProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col text-left w-full rounded-xl border border-border bg-card2 px-4 pt-3 pb-4 gap-2 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-border2 hover:shadow-[0_12px_30px_rgba(0,0,0,0.15),0_0_20px_var(--color-purple-15)] active:scale-[0.98]"
    >
      <div className="flex flex-col w-full">
        <div
          className="ledger-header"
          style={{ gridTemplateColumns: '2rem 1fr auto', background: 'transparent' }}
        >
          <div>#</div>
          <div>Player</div>
          <div className="text-right">{category.label}</div>
        </div>

        {entries.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="section-label opacity-30">No entries</p>
          </div>
        ) : (
          entries.map((entry, i) => {
            const isYou = !!connectedAddress && entry.address === connectedAddress;
            const valueColor = category.signed
              ? entry.value >= 0 ? 'var(--color-green)' : 'var(--color-red)'
              : 'var(--color-text)';

            return (
              <div
                key={entry.address}
                className="ledger-row ledger-row-passive"
                style={{
                  gridTemplateColumns: '2rem 1fr auto',
                  background: isYou ? 'var(--sunset)' : 'transparent',
                }}
              >
                <span className={`ledger-cell-secondary tabular-nums ${isYou ? 'text-bg!' : ''}`}>
                  {i + 1}
                </span>

                <div className="flex items-baseline gap-2 min-w-0 overflow-hidden">
                  <span className={`font-sans text-xs font-semibold shrink-0 ${isYou ? 'text-bg' : 'text-text'}`}>
                    {names.get(entry.address) ?? 'Regarded Anon'}
                  </span>
                  {entry.isFlagged && <FlaggedTag />}
                  <span className={`ledger-cell-secondary truncate min-w-0 ${isYou ? 'text-bg!' : ''}`}>
                    {truncate(entry.address)}
                  </span>
                </div>

                <span
                  className="ledger-cell-metric tabular-nums"
                  style={{ color: isYou ? 'var(--color-bg)' : valueColor }}
                >
                  {category.format(entry.value)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </button>
  );
}

// ---- Full leaderboard modal ----

const ROWS_PER_COL = 25;

// Columns per page: 5 @ 2xl, 4 @ xl, 3 @ lg, 2 @ md, 1 below
const COL_BREAKPOINTS = [
  { minWidth: 1536, cols: 5 },
  { minWidth: 1280, cols: 4 },
  { minWidth: 1024, cols: 3 },
  { minWidth: 768,  cols: 2 },
  { minWidth: 0,    cols: 1 },
];

function useColumnsPerPage(): number {
  const getCount = useCallback(() => {
    if (typeof window === 'undefined') return 2;
    const w = window.innerWidth;
    for (const bp of COL_BREAKPOINTS) {
      if (w >= bp.minWidth) return bp.cols;
    }
    return 1;
  }, []);

  const [count, setCount] = useState(getCount);

  useEffect(() => {
    const handler = () => setCount(getCount());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [getCount]);

  return count;
}

interface ModalProps {
  category: Category;
  entries: LeaderboardEntry[];
  names: Map<string, string>;
  connectedAddress?: string;
  activeCategory: CategoryKey;
  onCategoryChange: (k: CategoryKey) => void;
  onClose: () => void;
}

function LeaderboardModal({
  category,
  entries,
  names,
  connectedAddress,
  activeCategory,
  onCategoryChange,
  onClose,
}: ModalProps) {
  const colsPerPage = useColumnsPerPage();
  const [page, setPage] = useState(0);

  // reset page when category or viewport cols change
  useEffect(() => { setPage(0); }, [activeCategory, colsPerPage]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const totalCols   = Math.ceil(entries.length / ROWS_PER_COL);
  const totalPages  = Math.max(1, Math.ceil(totalCols / colsPerPage));
  const startCol    = page * colsPerPage;
  const visibleCols = Array.from({ length: Math.min(colsPerPage, totalCols - startCol) }, (_, ci) => {
    const colStart = (startCol + ci) * ROWS_PER_COL;
    return entries.slice(colStart, colStart + ROWS_PER_COL);
  });

  const valueColor = (entry: LeaderboardEntry) =>
    category.signed
      ? entry.value >= 0 ? 'var(--color-green)' : 'var(--color-red)'
      : 'var(--color-text)';

  return (
    <div
      className="modal-overlay-blur"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-bg border border-border rounded-2xl flex flex-col shadow-2xl w-full"
        style={{ maxWidth: 'min(96vw, 1400px)', maxHeight: '90vh' }}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <p className="terminal-pane-title">Leaderboard</p>
          <button
            className="btn-game-secondary px-3 py-1 text-xs"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {/* Category tabs */}
        <div className="terminal-view-selector-bar shrink-0">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              className={`terminal-view-btn ${activeCategory === c.key ? 'active' : ''}`}
              onClick={() => onCategoryChange(c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Column grid — scrollable body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4">
          {entries.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <p className="section-label opacity-30">No entries</p>
            </div>
          ) : (
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${colsPerPage}, minmax(0, 1fr))` }}
            >
              {visibleCols.map((col, ci) => {
                const rankOffset = (startCol + ci) * ROWS_PER_COL;
                return (
                  <div key={ci} className="flex flex-col rounded-lg p-3" style={{ background: 'var(--color-bg)' }}>
                    <div
                      className="ledger-header"
                      style={{ gridTemplateColumns: '2rem 1fr auto', background: 'transparent' }}
                    >
                      <div>#</div>
                      <div>Player</div>
                      <div className="text-right">{category.label}</div>
                    </div>

                    {col.map((entry, ri) => {
                      const rank  = rankOffset + ri + 1;
                      const isYou = !!connectedAddress && entry.address === connectedAddress;

                      return (
                        <div
                          key={entry.address}
                          className="ledger-row ledger-row-passive"
                          style={{
                            gridTemplateColumns: '2rem 1fr auto',
                            background: isYou ? 'var(--sunset)' : 'transparent',
                          }}
                        >
                          <span
                            className={`ledger-cell-secondary tabular-nums ${isYou ? 'text-bg!' : ''}`}
                          >
                            {rank}
                          </span>

                          <div className="flex items-baseline gap-1.5 min-w-0 overflow-hidden">
                            <span
                              className={`font-sans text-xs font-semibold truncate ${isYou ? 'text-bg' : 'text-text'}`}
                            >
                              {names.get(entry.address) ?? 'Regarded Anon'}
                            </span>
                            {entry.isFlagged && <FlaggedTag />}
                            <span
                              className={`ledger-cell-secondary shrink-0 ${isYou ? 'text-bg!' : ''}`}
                            >
                              {truncate(entry.address)}
                            </span>
                          </div>

                          <span
                            className="ledger-cell-metric tabular-nums"
                            style={{ color: isYou ? 'var(--color-bg)' : valueColor(entry) }}
                          >
                            {category.format(entry.value)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 px-6 py-3 border-t border-border shrink-0">
            <button
              className="btn-stepper px-1 py-0.5 text-[12px]! leading-none disabled:opacity-30"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              &#9664;
            </button>
            <span className="section-label">{page + 1} / {totalPages}</span>
            <button
              className="btn-stepper px-1 py-0.5 text-[12px]! leading-none disabled:opacity-30"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              &#9654;
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Main export ----

export const SeasonLeaderboard: React.FC<SeasonLeaderboardProps> = ({ seasonAddress }) => {
  const board = useSeasonLeaderboard(seasonAddress);
  const { address } = useAccount();
  const connectedAddress = address?.toLowerCase();

  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null);

  const rosterAddresses = useMemo(
    () => [...board.allAbsolute].map((e) => e.address),
    [board.allAbsolute],
  );
  const { data: names } = usePlayerNames(rosterAddresses);
  const nameMap = names ?? new Map<string, string>();

  const allEntries: Record<CategoryKey, LeaderboardEntry[]> = {
    absolute: board.allAbsolute,
    relative: board.allRelative,
    volume:   board.allVolume,
    fees:     board.allFees,
  };


  if (board.loading) {
    return <LedgerLoader />;
  }

  if (board.totalPlayers < 1) return null;

  const openCategory = activeCategory
    ? CATEGORIES.find((c) => c.key === activeCategory)!
    : null;

  return (
    <>
      {/* Non-clickable container */}
      <div className="terminal-pane gap-5 pb-2 w-full h-full">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <p className="terminal-pane-title">Leaderboard</p>
          <span className="section-label opacity-60">
            {board.totalPlayers} players
          </span>
        </header>

        {/* 2x2 preview grid — each table is individually clickable */}
        <main className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {CATEGORIES.map((category) => (
            <PreviewTable
              key={category.key}
              category={category}
              entries={board[category.key]}
              names={nameMap}
              connectedAddress={connectedAddress}
              onOpen={() => setActiveCategory(category.key)}
            />
          ))}
        </main>
      </div>

      {/* Full leaderboard modal — opens for the clicked category */}
      {openCategory && (
        <LeaderboardModal
          category={openCategory}
          entries={allEntries[activeCategory!]}
          names={nameMap}
          connectedAddress={connectedAddress}
          activeCategory={activeCategory!}
          onCategoryChange={setActiveCategory}
          onClose={() => setActiveCategory(null)}
        />
      )}
    </>
  );
};
