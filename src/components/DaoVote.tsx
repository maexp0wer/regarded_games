'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Interactive governance poll for the landing page's JOIN THE DAO card — a
 * forum vote stripped to its core: the question, the season parameters it
 * decides, and three options you can actually cast a mock ballot on.
 *
 * Results stay hidden until you vote, the way a Discourse poll hides them from
 * non-voters. Your ballot is added to the standing tally (150 votes already
 * cast), so the percentages shift by the one vote you brought — voting Reject
 * moves Ratify 94% → 93%, and the Manifest still passes. Voting again moves
 * the ballot; "Remove vote" puts the poll back.
 *
 * No live data — the tally is a fixed prop. Colors are hardcoded to the dark
 * palette like the other landing card graphics; the card chassis is always
 * dark regardless of theme.
 */

/* Dark theme palette (hardcoded) + the DAO card's orange accent. */
const ACCENT        = '#FF8C00';
const ACCENT_LINE   = 'rgba(255, 140, 0, 0.40)';
const ACCENT_FILL   = 'rgba(255, 140, 0, 0.07)';
const CARD2_COLOR   = '#1F1A30';
const BORDER_COLOR  = '#251F3D';
const BORDER2_COLOR = '#4C3F7A';
const TXT1_COLOR    = '#EDE7FB';
const TXT_COLOR     = '#9E97BD';
const PURPLE_COLOR  = '#9D4EDD';
const GOLD_COLOR    = '#FFC300';

/* The season parameters the ballot actually decides, in the contract's own
   terms (auctionDuration / tradingDuration / victoryThresholdBps /
   baseMultiplierBps). The Gini goal is the victory threshold exactly as the
   contract stores it: one value in BPS, measured from the season's starting
   Gini — not a pair of per-class targets. The game derives those from it,
   gI + V(1 - gI) for the Oligarchy and gI(1 - V/M) for the Masses, with M the
   compensation multiplier shown here. */
const TERMS: { label: string; value: ReactNode }[] = [
  { label: 'Auction Phase', value: <>30 <span style={{ fontSize: '9px', color: TXT_COLOR }}>DAYS</span></> },
  { label: 'Gini Goal',     value: <>3000 <span style={{ fontSize: '9px', color: TXT_COLOR }}>BPS</span></> },
  { label: 'Trading Phase', value: <>90 <span style={{ fontSize: '9px', color: TXT_COLOR }}>DAYS</span></> },
  { label: 'C. Multiplier',  value: <>1.20&times;</> },
];

/** Ballots already cast — 141 / 6 / 3 of 150, i.e. exactly 94 / 4 / 2 %. */
const OPTIONS = [
  { id: 'ratify',  label: 'Ratify',  votes: 141 },
  { id: 'abstain', label: 'Abstain', votes:   6 },
  { id: 'reject',  label: 'Reject',  votes:   3 },
];
const RATIFY_INDEX = 0;

/** Voter chips beside the tally — both classes voted it through. */
const VOTER_CHIPS = [PURPLE_COLOR, GOLD_COLOR, PURPLE_COLOR, GOLD_COLOR, GOLD_COLOR, PURPLE_COLOR];

const REVEAL_MS = 900;

/* Ballot cast → tally lands (REVEAL_MS) → a beat to read it → the card turns.
   Long enough that the count-up is over and the result has registered. */
const FLIP_MS = 1800;
/* Moving an already-cast vote: the tally is already on screen, so the beat is
   just long enough to see the radio move. Re-clicking the option you already
   voted for turns the card at once — there is nothing new to read. */
const FLIP_MOVED_MS = 800;

interface DaoVoteProps {
  /** Fired a beat after a ballot is cast, once the tally has landed — the card
      owner uses it to turn the card over. Not fired when a vote is removed. */
  onVoteCast?: () => void;
}

export default function DaoVote({ onVoteCast }: DaoVoteProps) {
  /** Index of the option the visitor picked, or null while the poll is open. */
  const [choice, setChoice] = useState<number | null>(null);
  /* 0 → 1 ramp shared by the bars, the percentages and the voter count, so
     they can't drift apart the way three independent tweens would. */
  const [reveal, setReveal] = useState(0);
  const rampedRef = useRef(false);

  // ── Tally ramp: only on the first ballot. Changing an existing vote slides
  //    the bars to their new widths (CSS below) instead of replaying. ────────
  useEffect(() => {
    if (choice === null) { rampedRef.current = false; setReveal(0); return; }
    if (rampedRef.current) { setReveal(1); return; }
    rampedRef.current = true;

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / REVEAL_MS);
      setReveal(1 - Math.pow(1 - t, 3));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [choice]);

  /* Kept in a ref so a fresh inline closure from the parent can't restart the
     timer mid-countdown; only an actual click may do that. */
  const onVoteCastRef = useRef(onVoteCast);
  useEffect(() => { onVoteCastRef.current = onVoteCast; });

  /* Every click on an option arms the turn — including clicking the option you
     already voted for, which is how you send the card over again after turning
     it back. A fresh object per click, so re-picking the same option still
     re-arms; `null` (remove vote) cancels a pending turn. */
  const [pendingTurn, setPendingTurn] = useState<{ delay: number } | null>(null);

  useEffect(() => {
    if (!pendingTurn) return;
    const timer = setTimeout(() => onVoteCastRef.current?.(), pendingTurn.delay);
    return () => clearTimeout(timer);
  }, [pendingTurn]);

  const castVote = (i: number) => {
    const delay =
      choice === null ? FLIP_MS :       // first ballot: let the tally land
      choice === i    ? 0        :       // re-confirming: turn immediately
                        FLIP_MOVED_MS;   // moved to another option
    setPendingTurn({ delay });
    setChoice(i);
  };

  const removeVote = () => {
    setPendingTurn(null);
    setChoice(null);
  };

  const voted = choice !== null;
  const totalVotes = OPTIONS.reduce((sum, o) => sum + o.votes, 0) + (voted ? 1 : 0);
  const pctOf = (i: number) =>
    ((OPTIONS[i].votes + (choice === i ? 1 : 0)) / totalVotes) * 100;

  /* The rAF ramp owns the width while it runs; outside it, CSS eases the bars
     between tallies (re-vote) and back down to zero (remove vote). */
  const ramping = reveal > 0 && reveal < 1;
  const barTransition = ramping ? undefined : 'width 400ms ease-out';

  return (
    <div className="flex h-full w-full select-none flex-col justify-between">

      {/* ── Question ───────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <h4
          className="text-[15px] font-black uppercase leading-none tracking-[0.03em] text-white"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Season Manifest
        </h4>
        <div className="h-px w-full" style={{ backgroundColor: BORDER_COLOR }} />
      </div>

      {/* ── Terms on the table ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <div className="grid grid-cols-2 gap-x-5 gap-y-1.5">
          {TERMS.map((term) => (
            <div key={term.label} className="flex items-baseline justify-between gap-2">
              <span
                className="font-mono text-[9px] font-black uppercase tracking-[0.14em]"
                style={{ color: TXT_COLOR }}
              >
                {term.label}
              </span>
              <span
                className="font-mono text-[12px] font-bold tabular-nums"
                style={{ color: TXT1_COLOR }}
              >
                {term.value}
              </span>
            </div>
          ))}
        </div>
        <div className="h-px w-full" style={{ backgroundColor: BORDER_COLOR }} />
      </div>

      {/* ── Ballot ─────────────────────────────────────────────────────────
          Real buttons: the card flips on click, so every control here stops
          the event before it reaches the flip handler. */}
      <div className="flex flex-col gap-2.5">
        {OPTIONS.map((option, i) => {
          const selected = choice === i;
          const width = pctOf(i) * reveal;

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={(e) => { e.stopPropagation(); castVote(i); }}
              className={
                'relative flex cursor-pointer items-center gap-2.5 rounded-sm border px-3 py-2.5 text-left ' +
                'transition-colors duration-200 focus-visible:outline-none ' +
                (selected
                  ? 'focus-visible:border-white'
                  : 'border-[#251F3D] bg-[#161322] hover:border-[#4C3F7A] hover:bg-[#1F1A30] focus-visible:border-[#FF8C00]')
              }
              style={selected ? { backgroundColor: ACCENT_FILL, borderColor: ACCENT_LINE } : undefined}
            >
              <span
                className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200"
                style={{ borderColor: selected ? ACCENT : BORDER2_COLOR }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full transition-opacity duration-200"
                  style={{ backgroundColor: ACCENT, opacity: selected ? 1 : 0 }}
                />
              </span>
              <span
                className="w-14.5 shrink-0 text-[13px] leading-none transition-colors duration-300"
                style={{
                  fontFamily: 'var(--font-sans)',
                  color: selected || !voted ? TXT1_COLOR : TXT_COLOR,
                }}
              >
                {option.label}
              </span>

              {/* Tally rail, inline so each option is a single line. Always
                  rendered — only the fill grows — so nothing resizes when the
                  result lands. */}
              <div
                className="h-1.5 flex-1 overflow-hidden rounded-xs"
                style={{ backgroundColor: CARD2_COLOR }}
              >
                <div
                  className="h-full rounded-xs"
                  style={{
                    width: `${width}%`,
                    backgroundColor: i === RATIFY_INDEX ? ACCENT : BORDER2_COLOR,
                    transition: barTransition,
                  }}
                />
              </div>

              <span
                className="w-9 shrink-0 text-right font-mono text-[12px] font-bold tabular-nums transition-opacity duration-300"
                style={{ color: i === RATIFY_INDEX ? ACCENT : TXT_COLOR, opacity: voted ? 1 : 0 }}
              >
                {Math.round(width)}%
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Tally footer ───────────────────────────────────────────────── */}
      <div className="flex h-4 items-center justify-between gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em]">
        <span
          className="flex min-w-0 items-center transition-opacity duration-300"
          style={{ opacity: voted ? 1 : 0 }}
        >
          {/* Horizontal twin of the app's reveal-row collapse: the chips slide
              open rather than popping in and shunting the count sideways. */}
          <span
            className={`grid overflow-hidden transition-[grid-template-columns] duration-500 ease-out ${
              voted ? 'grid-cols-[1fr]' : 'grid-cols-[0fr]'
            }`}
          >
            <span className="flex min-w-0 items-center gap-1 pr-2">
              {VOTER_CHIPS.map((color, k) => (
                <span
                  key={k}
                  className="h-2.5 w-2.5 shrink-0 rounded-xs transition-opacity duration-300"
                  style={{
                    backgroundColor: color,
                    opacity: voted ? 0.85 : 0,
                    transitionDelay: voted ? `${200 + k * 70}ms` : '0ms',
                  }}
                />
              ))}
            </span>
          </span>
          <span className="tabular-nums" style={{ color: TXT1_COLOR }}>
            {Math.round(totalVotes * reveal)} Voters
          </span>
        </span>

        <button
          type="button"
          disabled={!voted}
          onClick={(e) => { e.stopPropagation(); removeVote(); }}
          className="shrink-0 cursor-pointer uppercase tracking-[0.14em] transition-opacity duration-300 hover:text-white focus-visible:text-white focus-visible:outline-none"
          style={{ color: ACCENT, opacity: voted ? 1 : 0 }}
        >
          Remove vote
        </button>
      </div>
    </div>
  );
}
