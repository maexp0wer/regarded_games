'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Playable quest board for the landing page's TESTNET QUESTS card — the real
 * board (`src/app/app/_components/QuestBoard.tsx`) stripped to its skeleton:
 * a category header with its completion pill, the progress rail, four task
 * rows, and the secured-points readout.
 *
 * The four rows carry real quests at their real point values, picked one per
 * category with the last two requiring actual play. It is a poster for the
 * board rather than a listing of it, so the set is fixed here rather than
 * fetched — but every title and reward is one the campaign really awards.
 *
 * The reader drives it: each row's EXECUTE button is live, and clicking one
 * flips that row to completed, ticks the progress rail, and ramps the points
 * counter. Rows are independent, in any order, exactly like the real board.
 * Nothing plays on its own — the board sits untouched until it is clicked.
 *
 * Clearing the last row runs the payoff: the counter lands on the full 1,000,
 * the total pops, and then `onCleared` hands off to the card, which turns
 * itself over. The hold is deliberate — flipping the instant the fourth check
 * lands would snatch the board away before the total can be read.
 *
 * No live data — the tasks are a fixed table. Colors are hardcoded to the dark
 * palette like the other landing card graphics; the card chassis is always
 * dark regardless of theme.
 */

/* Dark theme palette (hardcoded) + the quests card's coral accent. */
const ACCENT       = '#ff5e62';
const ACCENT_LINE  = 'rgba(255, 94, 98, 0.40)';
const ACCENT_FILL  = 'rgba(255, 94, 98, 0.10)';
const ACCENT_HOVER = 'rgba(255, 94, 98, 0.22)';
const CARD_COLOR   = '#161322';
const CARD2_COLOR  = '#1F1A30';
const BORDER_COLOR = '#251F3D';
const TXT1_COLOR   = '#EDE7FB';
const TXT_COLOR    = '#9E97BD';
const GREEN_COLOR  = '#00F5A0';
const GREEN_LINE   = 'rgba(0, 245, 160, 0.25)';
const GREEN_FILL   = 'rgba(0, 245, 160, 0.10)';
const GOLD_COLOR   = '#FFC300';

/** Rows are a fixed height so the run reads as one block, not four cards. */
const ROW_H = 34;

/* Four real quests and their real point values, one per category with the
   last two requiring actual play — they bookend the game's arc, buying in at
   the auction and getting paid at settlement. Titles must clear the ~163px
   title column at 10px: "Vote on the Mainnet Season 1 Manifest" needs 183px,
   so row 1 carries the trimmed form. The trading-phase quests are absent for
   the same reason — both overflow badly ("Create an Order during the Trading
   Phase" alone wants 193px) and neither survives being cut down.
   Source of truth: content/discourse/quests.json + src/app/api/quests/route.ts. */
const TASKS = [
  { title: 'Vote on Season 1 Manifest',        points: 200 },  // Join the Community
  { title: 'Retweet on X',                     points: 200 },  // Spread the Word
  { title: 'Buy FIM during the Auction Phase', points:  50 },  // Dominate the Testnet
  { title: 'Claim your payout',                points:  50 },  // Dominate the Testnet
];
const TOTAL_POINTS = TASKS.reduce((sum, t) => sum + t.points, 0);

/* Grouped by hand, not via toLocaleString: the server's locale and the
   visitor's disagree on the separator, and the mismatch trips hydration. */
const group = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const COUNT_MS = 520;

/* Payoff beats, ms from the click that clears the last row. The pop waits for
   the counter to land; the flip waits for the pop to be read. */
const POP_DELAY_MS = COUNT_MS - 60;
const POP_MS       = 420;
const FLIP_MS      = 1500;

export default function AirdropQuestBoard({ onCleared }: { onCleared?: () => void }) {
  const [done, setDone] = useState<boolean[]>(() => TASKS.map(() => false));
  const [points, setPoints] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);

  const pointsRef = useRef(0);

  const completedCount = done.filter(Boolean).length;
  const cleared = completedCount === TASKS.length;
  const earned = TASKS.reduce((sum, t, i) => (done[i] ? sum + t.points : sum), 0);

  // ── Points counter ────────────────────────────────────────────────────────
  useEffect(() => {
    const from = pointsRef.current;
    if (from === earned) return;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { pointsRef.current = earned; setPoints(earned); return; }

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_MS);
      const value = from + (earned - from) * (1 - Math.pow(1 - t, 3));
      pointsRef.current = value;
      setPoints(value);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [earned]);

  /* ── Payoff: hold on the cleared board, then hand the card over ──────────
     The callback lives in a ref so an inline arrow from the parent can't
     restart the timer, and it is fired once — a late re-render must not turn
     the card a second time (which would turn it back). */
  const onClearedRef = useRef(onCleared);
  useEffect(() => { onClearedRef.current = onCleared; }, [onCleared]);

  const handedOffRef = useRef(false);
  useEffect(() => {
    if (!cleared || handedOffRef.current) return;
    handedOffRef.current = true;
    const timer = setTimeout(() => onClearedRef.current?.(), FLIP_MS);
    return () => clearTimeout(timer);
  }, [cleared]);

  /* The card flips on click, so every live control inside it has to keep its
     click to itself (same guard the HeroCard's own action button uses). */
  const execute = (i: number) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setDone((prev) => prev.map((v, k) => (k === i ? true : v)));
  };

  const progressPct = (completedCount / TASKS.length) * 100;

  return (
    <div className="flex h-full w-full select-none flex-col justify-between">


      {/* ── Progress + task rows ───────────────────────────────────────── */}
      <div className="flex flex-col gap-2">

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span
              className="font-mono text-[9px] font-black uppercase tracking-[0.16em]"
              style={{ color: TXT_COLOR }}
            >
              Progress
            </span>
            <span
              className="rounded-[3px] px-1.5 py-[3px] font-mono text-[8px] font-black uppercase tracking-[0.14em] tabular-nums"
              style={{
                backgroundColor: cleared ? GREEN_COLOR : ACCENT,
                color: '#0D0B14',
                transition: 'background-color 300ms ease-out',
              }}
            >
              {String(completedCount).padStart(2, '0')} / {String(TASKS.length).padStart(2, '0')} Completed
            </span>
          </div>
          <div
            className="h-[5px] w-full overflow-hidden rounded-[2px]"
            style={{ backgroundColor: CARD2_COLOR }}
          >
            <div
              className="h-full rounded-[2px]"
              style={{
                width: `${progressPct}%`,
                backgroundColor: cleared ? GREEN_COLOR : ACCENT,
                transition: 'width 420ms cubic-bezier(0.22, 1, 0.36, 1), background-color 300ms ease-out',
              }}
            />
          </div>
        </div>

        {/* Rows are flush-stacked like the real board: shared 1px borders,
            rounded only at the ends of the run. */}
        <div>
          {TASKS.map((task, i) => {
            const isDone = done[i];
            const isFirst = i === 0;
            const isLast = i === TASKS.length - 1;

            return (
              <div
                key={i}
                className="flex items-center gap-2 border px-2.5"
                style={{
                  height: ROW_H,
                  backgroundColor: isDone ? GREEN_FILL : CARD2_COLOR,
                  borderColor: isDone ? GREEN_LINE : BORDER_COLOR,
                  borderBottomWidth: isLast ? 1 : 0,
                  borderTopLeftRadius: isFirst ? 4 : 0,
                  borderTopRightRadius: isFirst ? 4 : 0,
                  borderBottomLeftRadius: isLast ? 4 : 0,
                  borderBottomRightRadius: isLast ? 4 : 0,
                  opacity: isDone ? 0.62 : 1,
                  transition: 'background-color 300ms ease-out, border-color 300ms ease-out, opacity 300ms ease-out',
                }}
              >
                {/* Step number */}
                <span
                  className="w-[13px] shrink-0 font-mono text-[8px] font-black uppercase tracking-widest tabular-nums"
                  style={{ color: isDone ? GREEN_COLOR : TXT_COLOR, transition: 'color 300ms ease-out' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>

                {/* Title, in the real board's display face. `truncate` is a
                    backstop, not a plan: every title here is measured to fit,
                    but a future edit shouldn't be able to overflow the row. */}
                <span
                  className="min-w-0 flex-1 truncate text-[10px] font-bold leading-none tracking-[0.02em]"
                  style={{
                    fontFamily: 'var(--font-display)',
                    color: isDone ? TXT_COLOR : TXT1_COLOR,
                    transition: 'color 300ms ease-out',
                  }}
                >
                  {task.title}
                </span>

                {/* Reward */}
                <span
                  className="shrink-0 whitespace-nowrap font-mono text-[9px] font-bold tabular-nums"
                  style={{ color: isDone ? GREEN_COLOR : GOLD_COLOR, transition: 'color 300ms ease-out' }}
                >
                  +{task.points} PTS
                </span>

                {/* Action cell — width pinned so the button → check swap can't
                    shuffle the reward column. */}
                <span className="ml-2 flex w-[60px] shrink-0 justify-end">
                  {isDone ? (
                    <motion.span
                      className="grid h-[18px] w-[18px] place-items-center rounded-full border font-mono text-[9px] font-black"
                      style={{ borderColor: GREEN_COLOR, backgroundColor: GREEN_FILL, color: GREEN_COLOR }}
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 520, damping: 24 }}
                      role="img"
                      aria-label="Completed"
                    >
                      ✓
                    </motion.span>
                  ) : (
                    <button
                      type="button"
                      onClick={execute(i)}
                      onMouseEnter={() => setHovered(i)}
                      onMouseLeave={() => setHovered(null)}
                      aria-label={`Execute: ${task.title}`}
                      /* The press feedback has to be a CSS `active:` state, not
                         React state: the button unmounts in the same commit as
                         the click, so a pressed flag would never paint. */
                      className="cursor-pointer rounded-[3px] border px-[7px] py-[3px] font-mono text-[8px] font-black uppercase tracking-[0.12em] transition-transform duration-100 active:scale-90"
                      style={{
                        borderColor: hovered === i ? ACCENT : ACCENT_LINE,
                        backgroundColor: hovered === i ? ACCENT_HOVER : ACCENT_FILL,
                        color: ACCENT,
                      }}
                    >
                      Execute
                    </button>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Secured points ─────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between rounded-[4px] border px-2.5 py-[7px]"
        style={{
          backgroundColor: CARD_COLOR,
          borderColor: cleared ? GREEN_LINE : BORDER_COLOR,
          transition: 'border-color 300ms ease-out',
        }}
      >
        <span
          className="font-mono text-[9px] font-black uppercase tracking-[0.16em]"
          style={{ color: TXT_COLOR }}
        >
          Secured Points
        </span>
        <motion.span
          /* The full total pops once, as the counter lands on it — the beat
             that says "banked" before the card turns. */
          animate={cleared ? { scale: [1, 1.14, 1] } : { scale: 1 }}
          transition={cleared ? { duration: POP_MS / 1000, delay: POP_DELAY_MS / 1000, ease: 'easeOut' } : { duration: 0 }}
          className="font-mono text-[13px] font-bold tabular-nums"
          style={{
            color: points > 0 ? GREEN_COLOR : TXT1_COLOR,
            transition: 'color 300ms ease-out',
            transformOrigin: 'right center',
          }}
        >
          {group(Math.round(points))}
          <span className="ml-1 font-mono text-[9px] font-medium" style={{ color: TXT_COLOR }}>
            / {group(TOTAL_POINTS)} PTS
          </span>
        </motion.span>
      </div>
    </div>
  );
}
