'use client';

import { useEffect, useState } from 'react';

/**
 * Live yield ledger for the landing page's CAPTURE VALUE card — the Lending
 * Distribution pane from the auction / trading / payout dashboards
 * (`src/app/app/_components/LendingDistributionCard.tsx`) reduced to its
 * skeleton: the accruing yield, then — under its own title — the four-segment
 * allocation bar and the stream legend it drives. Nothing is captioned — the venue badge, the live
 * dot and the ticking figure carry it, and every label the card can do without
 * is left out. Aave leads the row: it is the answer to "deployed where?", and
 * the figure only means anything once you know where it is earning.
 *
 * The bar is the real one: same four streams, same DIST_COLORS ramp, same
 * flex-weighted segments, and the same two-way hover link between a legend row
 * and its segment. Highlighting is hover-only and never sticks — leaving a
 * segment, a row, or the graphic altogether puts every stream back to rest.
 *
 * Nothing here swallows a click. The bar and the legend are inert to the
 * pointer beyond the highlight, so a click anywhere on them bubbles to the
 * HeroCard and flips the card, exactly as clicking the frame around them
 * does.
 *
 * The ticking total is the whole claim of the card — the pool earns while the
 * season plays — and it runs on the same gate as the deck's other graphics:
 * `ownCardsLive` gives it a 3.2s burst as the cards fly in, hover keeps it
 * running after that, and below lg (no hover to fall back on) the card ORs in
 * `belowLg` so it simply runs for as long as it is mounted. Paused, the figure
 * freezes where it stood and the live dot stops with it rather than claiming a
 * feed that isn't moving.
 *
 * The clock is compressed so the movement is visible in a few seconds on
 * screen; the split is a plausible policy, not a quoted one, because the
 * shares are set per season by DAO vote.
 *
 * No live data — the total is a local counter. Colors are hardcoded to the
 * dark palette like the other landing card graphics; the card chassis is
 * always dark regardless of theme.
 */

/* Dark theme palette (hardcoded) + the economics card's orange accent. */
const ACCENT       = '#FF8C00';
const ACCENT_LINE  = 'rgba(255, 140, 0, 0.40)';
const ACCENT_FILL  = 'rgba(255, 140, 0, 0.10)';
const CARD3_COLOR  = '#2B2544';
const BORDER_COLOR = '#251F3D';
const TXT1_COLOR   = '#EDE7FB';
const TXT_COLOR    = '#9E97BD';
const GREEN_COLOR  = '#00F5A0';

/* The four yield streams, biggest share first — the order
   LendingDistributionCard sorts into, paired with the same DIST_COLORS ramp
   (purple → gold → magenta → orange, which is also the sunset order). */
const STREAMS = [
  { label: 'Buyback',           bps: 4000, color: '#9D4EDD' },
  { label: 'Liquidity',         bps: 2500, color: '#FFC300' },
  { label: 'Prize Pool Bonus',  bps: 2000, color: '#D81B60' },
  { label: 'DAO Treasury',      bps: 1500, color: '#FF8C00' },
];

/** Yield already booked when the card comes into view, and the compressed
    accrual rate in USDC per second (a season's worth of drip, sped up enough
    to read as motion). */
const BASE_YIELD = 1284.37;
const RATE = 1.35;
const TICK_MS = 120;

/* Pinned to en-US rather than the visitor's locale: the first frame is server
   rendered, and a locale-formatted number is the classic hydration mismatch. */
const usd = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Aave's ghost mark, stylised to a single silhouette. */
function AaveGhost({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={(size * 22) / 18} viewBox="0 0 18 22" fill="none" aria-hidden="true">
      <path
        d="M9 0C4 0 0 4.4 0 10v12l3-3 3 3 3-3 3 3 3-3 3 3V10c0-5.6-4-10-9-10Z"
        fill="currentColor"
      />
      <circle cx="6.1" cy="9.6" r="1.9" fill="#0D0B14" />
      <circle cx="11.9" cy="9.6" r="1.9" fill="#0D0B14" />
    </svg>
  );
}

interface YieldDistributionProps {
  /** Play gate, ORed together by the card: the fly-in window, card hover, and
      below-lg where there is no hover. False freezes the ledger in place. */
  isHovered: boolean;
}

export default function YieldDistribution({ isHovered }: YieldDistributionProps) {
  /** Seconds of compressed accrual banked so far — held, not reset, on pause. */
  const [elapsed, setElapsed] = useState(0);
  /** Stream under the cursor; null whenever the pointer is off both readouts. */
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    if (!isHovered) return;
    const id = setInterval(() => setElapsed((s) => s + TICK_MS / 1000), TICK_MS);
    return () => clearInterval(id);
  }, [isHovered]);

  const total = BASE_YIELD + elapsed * RATE;

  /* Resting segments sit at 70% like the real bar; picking one lifts it to
     full and pushes the rest back so the eye follows the pair. */
  const segmentOpacity = (i: number) =>
    hovered === null ? 0.7 : hovered === i ? 1 : 0.4;

  return (
    <div
      className="flex h-full w-full select-none flex-col justify-between"
      onMouseLeave={() => setHovered(null)}
    >

      {/* ── Venue and accruing total ───────────────────────────────────────
          Unlabelled on purpose: the mark says where the money is, and a figure
          ticking under a live dot needs no caption to say what it is. */}
      <div className="flex items-center justify-between gap-3">
        <span className="flex shrink-0 items-center gap-2.5">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border"
            style={{ borderColor: ACCENT_LINE, backgroundColor: ACCENT_FILL, color: ACCENT }}
          >
            <AaveGhost size={16} />
          </span>
          <span
            className="font-mono text-[13px] font-bold uppercase tracking-[0.1em]"
            style={{ color: TXT1_COLOR }}
          >
            Aave V3
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-2">
          <span
            className={`h-1.5 w-1.5 rounded-full transition-opacity duration-300 ${
              isHovered ? 'animate-pulse' : ''
            }`}
            style={{ backgroundColor: GREEN_COLOR, opacity: isHovered ? 1 : 0.35 }}
          />
          <span
            className="font-mono text-[21px] font-bold leading-none tabular-nums"
            style={{ color: TXT1_COLOR }}
          >
            ${usd(total)}
            <span
              className="ml-1.5 text-[10px] font-black tracking-[0.14em]"
              style={{ color: TXT_COLOR }}
            >
              USDC
            </span>
          </span>
        </span>
      </div>

      {/* ── Title of the split ─────────────────────────────────────────────
          Below the venue row, not above it: the card's own header already
          names the card, and this names the bar and legend under it. The rule
          carries the turn from what accrued to how it is divided. */}
      <div className="flex flex-col gap-2">
        <div className="h-px w-full" style={{ backgroundColor: BORDER_COLOR }} />
        <h4
          className="text-[15px] font-black uppercase leading-none tracking-[0.03em] text-white"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Lending Distribution
        </h4>
      </div>

      {/* ── The allocation bar ─────────────────────────────────────────── */}
      <div
        role="img"
        aria-label={`Yield allocation: ${STREAMS.map((s) => `${s.label} ${s.bps / 100}%`).join(', ')}`}
        className="flex h-10 w-full overflow-hidden rounded-md"
        style={{ backgroundColor: CARD3_COLOR }}
        onMouseLeave={() => setHovered(null)}
      >
        {STREAMS.map((stream, i) => (
          <div
            key={stream.label}
            onMouseEnter={() => setHovered(i)}
            className="h-full transition-opacity duration-200"
            style={{
              flex: stream.bps,
              backgroundColor: stream.color,
              opacity: segmentOpacity(i),
            }}
          />
        ))}
      </div>

      {/* ── Stream legend ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2" onMouseLeave={() => setHovered(null)}>
        {STREAMS.map((stream, i) => {
          const isFocused = hovered === i;
          return (
            <div
              key={stream.label}
              onMouseEnter={() => setHovered(i)}
              className="flex w-full items-baseline justify-between gap-3"
            >
              <span
                className="flex items-center gap-2 font-mono text-[12px] transition-colors duration-200"
                style={{ color: isFocused ? TXT1_COLOR : TXT_COLOR }}
              >
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full transition-transform duration-200"
                  style={{
                    backgroundColor: stream.color,
                    transform: isFocused ? 'scale(1.5)' : 'scale(1)',
                  }}
                />
                {stream.label}
              </span>
              <span
                className="font-mono text-[13px] font-semibold tabular-nums"
                style={{ color: stream.color }}
              >
                ${usd((total * stream.bps) / 10000)}
                <span className="ml-1 font-normal" style={{ color: TXT_COLOR }}>
                  ({stream.bps / 100}%)
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
