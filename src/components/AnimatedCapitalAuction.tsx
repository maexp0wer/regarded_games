'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Decorative Capital Auction terminal for the landing page's CAPITAL AUCTION
 * card — a miniature of `/app/ico` (`IcoMask`): the same headline figures on
 * the left and the same action column on the right, topped by the closing
 * countdown. The page's section header is dropped, since the card's own title
 * already reads CAPITAL AUCTION; phase is carried by the countdown, the status
 * line and the button's own enabled state rather than by a badge.
 *
 * Animation: one run walks IcoMask's own phase machine
 * (pending → live → awaiting_finalization → claimable → already_claimed).
 * Deposits land one at a time through `live` — each flies into the Capital
 * Raised tile, ticks the figure up and drags the Final Price with it, since on
 * the real page that price is just Total Raised ÷ Auction Supply. When the
 * window closes the right column swaps the commit panel for the redeem panel,
 * exactly as IcoMask does. The run ends on the claimed auction; it does not
 * loop, because this story has an ending worth landing on.
 *
 * Playback follows the Play deck's cards: `isHovered` gates the clock, so the
 * graphic runs during the section's live window, freezes exactly where it
 * stands when that window shuts, and resumes from that point on hover. The
 * caller ORs in `belowLg` for touch devices, which have no hover to fall back
 * on and so play the auction straight through. Re-activating a finished run
 * replays it.
 *
 * No live data. Only the two headline values carry figures — Capital Raised and
 * Final Price, the pair that tells the auction's story; every other value reads
 * as a bar, which keeps the card from turning into a spreadsheet. Colors follow
 * IcoMask's meaning: green is capital in, gold is RGD out, purple is the Final
 * Price. They are hardcoded to the dark palette like the other landing card
 * graphics, because the card chassis is dark regardless of theme.
 */

/* Dark theme palette (hardcoded) + the TGE card's sunset-coral accent. */
const ACCENT       = '#FF5E62';
const CARD_COLOR   = '#161322';
const CARD2_COLOR  = '#1F1A30';
const CARD3_COLOR  = '#2A2342';
const BORDER_COLOR = '#251F3D';
const BORDER2_COLOR= '#4C3F7A';
const TXT1_COLOR   = '#EDE7FB';
const TXT_COLOR    = '#9E97BD';
const GREEN_COLOR  = '#00F5A0';
const PURPLE_COLOR = '#9D4EDD';
const GOLD_COLOR   = '#FFC300';

type Phase = 'pending' | 'live' | 'ended' | 'claimable' | 'claimed';

/** The auction supply the clearing price divides by. There is deliberately no
 *  cap or target here: the sale takes whatever it is given and prices it
 *  pro-rata, so the raised total is shown as a bare figure with no rail behind
 *  it — a progress bar would imply a goal the auction does not have. */
const POOL_SUPPLY = 30_000_000;

/** Deposits in the order they land, with the wallet each is credited to. A mix
 *  of round tickets and odd ones, the way a real book fills — they close the
 *  auction at 6,963,865 USDC, which over the auction supply clears at
 *  $0.232129. Deliberately not a flat 7,000,000: a total that lands exactly on
 *  a round number reads as invented. The player is one of the depositors, so
 *  the stream reads as a field you are part of. */
const DEPOSITS = [1_250_000, 674_290, 1_904_730, 926_845, 1_558_000, 650_000];
const ADDRESSES = ['0x7a41…c2', '0x1d90…8f', '0xbe27…04', 'You', '0xc8b2…6d', '0x59ea…3b'];

/* Cycle timeline, ms from the start of a run. */
const T_DEPOSITS  = [900, 1650, 2450, 3300, 4200, 5150];
const T_LIVE      = T_DEPOSITS[0];
const T_ENDED     = 6800;
const T_CLAIMABLE = 8600;
const T_CLAIMED   = 10600;
const T_END       = 12000;

const TICK_MS = 700;

/** A 30-day auction window, compressed into the live phase. The clock stops a
 *  beat before the window actually closes so it visibly rests on 00/00/00
 *  rather than vanishing the instant it lands. */
const AUCTION_MINUTES   = 30 * 24 * 60;
const T_COUNTDOWN_END   = T_ENDED - 400;
/** Values change far faster than the eye resolves — the countdown's minutes
 *  spin, the raised total counts — so 20 fps is plenty and costs a third of the
 *  renders a full rAF would. */
const FRAME_MS = 50;

const COUNTDOWN_LABELS = ['Days', 'Hrs', 'Min'] as const;

/** Cumulative raised after each deposit lands. */
const TOTALS = DEPOSITS.reduce<number[]>((acc, d) => [...acc, (acc[acc.length - 1] ?? 0) + d], []);

/**
 * Every value on the card is a pure function of one number: how far into the
 * story the clock has run. That is what makes freezing free — stop the clock
 * and the whole dashboard simply holds where it stands, with nothing to unwind
 * and no timers left in flight.
 */
function frameAt(t: number) {
  const phase: Phase =
    t < T_LIVE      ? 'pending'   :
    t < T_ENDED     ? 'live'      :
    t < T_CLAIMABLE ? 'ended'     :
    t < T_CLAIMED   ? 'claimable' : 'claimed';

  let landed = 0;
  while (landed < T_DEPOSITS.length && t >= T_DEPOSITS[landed]) landed++;

  /* The printed total eases toward the newest deposit rather than snapping, so
     a deposit reads as money arriving instead of a value swap. */
  const to    = landed > 0 ? TOTALS[landed - 1] : 0;
  const from  = landed > 1 ? TOTALS[landed - 2] : 0;
  const since = landed > 0 ? t - T_DEPOSITS[landed - 1] : 0;
  const eased = 1 - Math.pow(1 - Math.min(1, Math.max(0, since / TICK_MS)), 3);

  const closed = Math.min(1, Math.max(0, (t - T_LIVE) / (T_COUNTDOWN_END - T_LIVE)));

  return {
    phase,
    landed,
    raised: from + (to - from) * eased,
    remaining: Math.round(AUCTION_MINUTES * (1 - closed)),
  };
}

const FIRST_FRAME = frameAt(0);
const LAST_FRAME  = frameAt(T_END);

export default function AnimatedCapitalAuction({ isHovered }: { isHovered: boolean }) {
  const [frame, setFrame] = useState(FIRST_FRAME);
  /** Milliseconds into the story. Advances only while active, and is never
   *  rewound on pause — that is what lets a hover pick the auction back up
   *  exactly where the section's live window dropped it. */
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (!isHovered) return;   // frozen where it stands

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      elapsedRef.current = T_END;
      setFrame(LAST_FRAME);
      return;
    }

    /* Re-activating a story that already ran replays it from the top, so a
       reader who comes back to the section gets the auction again rather than
       a card parked on its own ending. */
    if (elapsedRef.current >= T_END) elapsedRef.current = 0;

    let raf = 0;
    let painted = 0;
    let prev = performance.now();

    const step = (now: number) => {
      elapsedRef.current = Math.min(T_END, elapsedRef.current + (now - prev));
      prev = now;
      const done = elapsedRef.current >= T_END;
      if (done || now - painted >= FRAME_MS) {
        painted = now;
        setFrame(frameAt(elapsedRef.current));
      }
      /* Runs out and stops rather than looping: the auction has an ending, and
         landing on it is the point. */
      if (!done) raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [isHovered]);

  const { phase, landed, raised: shownRaised, remaining } = frame;
  const settled = phase === 'claimable' || phase === 'claimed';
  const redeeming = phase === 'ended' || settled;

  /* Days / hours / minutes still on the clock. */
  const clock = [
    Math.floor(remaining / 1440),
    Math.floor((remaining % 1440) / 60),
    remaining % 60,
  ];

  /* The price the real page prints, Total Raised ÷ Auction Supply, so both
     headline figures move together off a single input. */
  const price = shownRaised / POOL_SUPPLY;

  const money = (n: number) => Math.round(n).toLocaleString('en-US');

  return (
    <div className="h-full w-full select-none">

      {/* ── Main grid — IcoMask's 3fr / 2fr split. There is no section header:
             the card's own title already says Capital Auction, so the phase
             pill lives at the top of the action column instead, where it reads
             as the state of the thing you are about to act on. ───────────── */}
      <div className="grid h-full grid-cols-[3fr_2fr] gap-1.5">

        {/* LEFT: valuation matrices */}
        <div className="flex min-h-0 flex-col gap-1.5">

          {/* Capital Raised — headline figure, and where deposits land. */}
          <Pane className="relative min-h-0 flex-1 overflow-hidden">
              {/* The unit rides on the label row so the figure gets the pane's
                  full width — inline it would crowd the number. */}
              <div className="flex items-baseline justify-between gap-1">
                <PaneTitle>Capital Raised</PaneTitle>
                <Unit>USDC</Unit>
              </div>
              <span
                className="font-mono text-[23px] font-bold leading-none tabular-nums transition-colors duration-300"
                style={{ color: GREEN_COLOR }}
              >
                {money(shownRaised)}
              </span>

              {/* Incoming deposits — each one flies in, then the next replaces
                  it, so `live` reads as a stream rather than a single event. */}
              <AnimatePresence>
                {phase === 'live' && landed > 0 && (
                  <motion.span
                    key={landed}
                    className="absolute right-1 top-1 rounded-[3px] border px-1 py-[1px] font-mono text-[9px] font-bold leading-none"
                    style={{
                      backgroundColor: CARD2_COLOR,
                      borderColor: 'rgba(0, 245, 160, 0.35)',
                      color: GREEN_COLOR,
                    }}
                    initial={{ opacity: 0, x: 14, y: 4 }}
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  >
                    + {ADDRESSES[landed - 1]}
                  </motion.span>
                )}
              </AnimatePresence>
          </Pane>

          {/* Price discovery panel */}
          <Pane className="min-h-0 flex-1">
            <div className="flex items-baseline justify-between gap-1">
              <PaneTitle>Final Price</PaneTitle>
              <Unit>USDC / RGD</Unit>
            </div>
            <span
              className="font-mono text-[23px] font-black leading-none tabular-nums transition-colors duration-300"
              style={{ color: PURPLE_COLOR }}
            >
              ${price.toFixed(6)}
            </span>
            <span className="font-mono text-[8.5px] leading-none" style={{ color: TXT_COLOR }}>
              Total Raised &divide; Auction Supply
            </span>
          </Pane>
        </div>

        {/* RIGHT: the action column, which swaps panels on close like IcoMask */}
        <Pane className="flex min-h-0 flex-col gap-2">

          {/* IcoMask only shows the countdown while the window is open. Its
              space is held either way so the panel below never jumps. */}
          <div
            className="flex items-end gap-1 transition-opacity duration-500"
            style={{ opacity: phase === 'live' ? 1 : 0 }}
          >
            {clock.map((value, i) => (
              <div
                key={COUNTDOWN_LABELS[i]}
                className="flex flex-1 flex-col items-center rounded-[3px] border py-[2px]"
                style={{ backgroundColor: CARD2_COLOR, borderColor: BORDER_COLOR }}
              >
                <span
                  className="font-mono text-[12px] font-bold leading-none tabular-nums"
                  style={{ color: TXT1_COLOR }}
                >
                  {String(value).padStart(2, '0')}
                </span>
                <span
                  className="font-mono text-[8px] font-bold uppercase leading-none tracking-[0.06em]"
                  style={{ color: TXT_COLOR }}
                >
                  {COUNTDOWN_LABELS[i]}
                </span>
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {!redeeming ? (
              <motion.div
                key="commit"
                className="flex min-h-0 flex-1 flex-col gap-1.5"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
              >
                <PaneTitle>Commit USDC</PaneTitle>

                {/* Sizing rail — the AmountInput reduced to its frame. */}
                <div
                  className="flex flex-col gap-1.5 rounded-[4px] border p-2"
                  style={{ backgroundColor: CARD3_COLOR, borderColor: BORDER2_COLOR }}
                >
                  <Rail width={phase === 'live' ? 46 : 0} color={TXT1_COLOR} />
                  <div className="relative h-[4px] w-full rounded-full" style={{ backgroundColor: CARD2_COLOR }}>
                    <span
                      className="absolute top-0 h-[4px] rounded-full transition-[width] duration-700 ease-out"
                      style={{ width: phase === 'live' ? '46%' : '0%', backgroundColor: ACCENT }}
                    />
                    <span
                      className="absolute top-1/2 h-[8px] w-[8px] -translate-y-1/2 rounded-full transition-[left] duration-700 ease-out"
                      style={{ left: phase === 'live' ? '46%' : '0%', backgroundColor: ACCENT }}
                    />
                  </div>
                </div>

                <Cta
                  label={phase === 'live' ? 'Deposit' : 'Not Open'}
                  enabled={phase === 'live'}
                />
              </motion.div>
            ) : (
              <motion.div
                key="redeem"
                className="flex min-h-0 flex-1 flex-col gap-1.5"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
              >
                <PaneTitle>Clearing Status</PaneTitle>
                <div
                  className="flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase leading-tight tracking-[0.06em] transition-colors duration-300"
                  style={{ color: phase === 'ended' ? GOLD_COLOR : GREEN_COLOR }}
                >
                  <span
                    className={`h-[5px] w-[5px] shrink-0 rounded-full ${phase === 'claimed' ? '' : 'animate-pulse'}`}
                    style={{ backgroundColor: phase === 'ended' ? GOLD_COLOR : GREEN_COLOR }}
                  />
                  {phase === 'ended' ? 'Awaiting Close' : phase === 'claimable' ? 'Claims Unlocked' : 'Claimed'}
                </div>

                {/* RGD owed, as the rail it fills once the auction settles. */}
                <div
                  className="flex flex-col gap-1.5 rounded-[4px] border p-2"
                  style={{ backgroundColor: CARD2_COLOR, borderColor: BORDER_COLOR }}
                >
                  <PaneTitle>RGD to Claim</PaneTitle>
                  <Rail width={settled ? 78 : 0} color={GOLD_COLOR} />
                </div>

                <Cta
                  label={phase === 'claimed' ? 'Claimed' : phase === 'claimable' ? 'Claim Tokens' : 'Finalizing'}
                  enabled={phase === 'claimable'}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </Pane>
      </div>
    </div>
  );
}

/* ── Small parts ──────────────────────────────────────────────────────── */

function Pane({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`flex flex-col justify-center gap-1 rounded-[4px] border px-1.5 py-1.5 ${className}`}
      style={{ backgroundColor: CARD_COLOR, borderColor: BORDER_COLOR }}
    >
      {children}
    </div>
  );
}

function PaneTitle({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="font-mono text-[9px] font-bold uppercase leading-none tracking-[0.1em]"
      style={{ color: TXT_COLOR }}
    >
      {children}
    </span>
  );
}

function Unit({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[8.5px] leading-none" style={{ color: TXT_COLOR }}>
      {children}
    </span>
  );
}

/** A proportion drawn as a bar — the sized amount, the RGD owed. Never a
 *  progress bar: nothing here counts toward a target. */
function Rail({ width, color }: { width: number; color: string }) {
  return (
    <span
      className="block h-[6px] w-full overflow-hidden rounded-[2px]"
      style={{ backgroundColor: CARD2_COLOR }}
    >
      <span
        className="block h-full rounded-[2px] transition-[width,background-color] duration-700 ease-out"
        style={{ width: `${width}%`, backgroundColor: color, opacity: 0.9 }}
      />
    </span>
  );
}

/**
 * The real page's Deposit and Claim are the same control — `.btn-game-primary`:
 * a sunset gradient fill, white text with a soft drop, and a purple glow, all
 * falling to 40% opacity while the phase disables it. The class itself can't be
 * reused here (its padding is sized for a real page, and its CSS vars would
 * resolve to the light palette while this chassis stays dark), so the dark
 * theme's values are inlined the way the rest of this graphic does it.
 */
const SUNSET = 'linear-gradient(90deg, #9D4EDD 0%, #D81B60 45%, #FF8C00 75%, #FFC300 100%)';
const SUNSET_GLOW = '0 2px 8px rgba(157, 78, 221, 0.35)';

function Cta({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div
      className="mt-auto flex h-[22px] shrink-0 items-center justify-center rounded-[4px] transition-opacity duration-300"
      style={{
        background: SUNSET,
        opacity: enabled ? 1 : 0.4,
        boxShadow: enabled ? SUNSET_GLOW : 'none',
      }}
    >
      <span
        className="text-[10.5px] font-black uppercase tracking-[0.12em]"
        style={{
          fontFamily: 'var(--font-display)',
          color: '#FFFFFF',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
        }}
      >
        {label}
      </span>
    </div>
  );
}
