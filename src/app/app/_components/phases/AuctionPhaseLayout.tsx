'use client';

import { useEffect, useState } from 'react';
import { SeasonBandReveal } from '../SeasonBandReveal';
import { ChromeRevealRow } from '../ChromeRevealRow';
import { firstRowRung, useChromeRowCount } from '@/lib/seasonChromeReveal';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { ProtocolCard } from '../ProtocolCard';
import { PolicyCard } from '../PolicyCard';
import { ScheduleCard } from '../ScheduleCard';
import { LendingDistributionCard } from '../LendingDistributionCard';
import { AuctionMask } from '../AuctionMask';
import { AuctionActivityFeed } from '../AuctionActivityFeed';
import { AuctionChart } from '../AuctionChart';
import { FimDistributionChart } from '../FimDistributionChart';
import { FactionChat } from '../FactionChat';
import { useSeasonAuctionChart } from '@/hooks/useSeasonAuctionChart';
import type { SeasonConfig } from '@/hooks/useSeasonPhase';

interface AuctionPhaseLayoutProps {
  seasonAddress: `0x${string}`;
  auctionAddress: `0x${string}`;
  fimAddress: `0x${string}`;
  exchangeAddress: `0x${string}`;
  seasonSlug: string;
  formattedName: string;
  currentPhase: string | null;
  tradingStart: number;
  seasonEnd: number;
  config: SeasonConfig | null;
  M_dynamic: number;
}

/**
 * Auction / bootstrap layout.
 *
 * The content collapses on the season-page reveal ladder one fold-stage at a
 * time, and the *grouping* of components per stage is breakpoint-specific — a
 * single responsive grid can't express that (cells both reflow and regroup), so
 * we render one variant per breakpoint via `useBreakpoint` and declare the
 * matching fold-row count. The last stage is always the resting floor (the
 * ladder caps one rung below the total).
 *
 * Stages per breakpoint (top → bottom, last = floor):
 *   xl+ : pinned [4 cards | mask]; folding column [ActivityFeed] → [Chat]
 *   lg  : [4 cards + mask] → [Chat + ActivityFeed]
 *   md  : [mask] → [Protocol+Policy] → [Schedule+Lending] → [ActivityFeed] → [Chat]
 *   sm- : each component its own stage (mask, protocol, policy, schedule,
 *         lending, feed, chat)
 */
export function AuctionPhaseLayout({
  seasonAddress,
  auctionAddress,
  fimAddress,
  exchangeAddress,
  seasonSlug,
  formattedName,
  currentPhase,
  tradingStart,
  seasonEnd,
  config,
  M_dynamic,
}: AuctionPhaseLayoutProps) {
  const bp = useBreakpoint();
  const auctionChart = useSeasonAuctionChart(seasonAddress);

  // The breakpoint variants render different DOM and fold-row counts, so the
  // exact size must be known before we pick one. useBreakpoint reports a
  // provisional value during SSR/first paint; gate on a mounted flag to avoid
  // flashing the wrong variant, then render the real one.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const is2xl = bp === '2xl';
  const isXl = bp === 'xl';
  const isLg = bp === 'lg';
  const isMd = bp === 'md';
  const isSm = bp === 'sm' || bp === 'xs';

  // Content fold-row count per breakpoint (the last is the non-folding floor).
  // xl/2xl/lg: FimDistributionChart sits beside AuctionChart in the same rung.
  // md: FimDistributionChart gets its own rung after the chart (+1 vs. original 6).
  // sm: same pattern (+1 vs. original 8).
  const rowCount = isXl || is2xl ? 2 : isLg ? 3 : isMd ? 7 : 9;
  useChromeRowCount(mounted ? rowCount : 0);
  const r = firstRowRung(); // first content rung (2) — the AuctionChart
  const c = r + 1;          // content rungs below the chart start here

  // ── Component renderers (kept DRY across the breakpoint variants) ──
  const mask = (
    <AuctionMask
      seasonAddress={seasonAddress}
      auctionAddress={auctionAddress}
      fimAddress={fimAddress}
      currentPhase={currentPhase}
    />
  );
  const protocol = (
    <ProtocolCard
      seasonAddress={seasonAddress}
      fimAddress={fimAddress}
      auctionAddress={auctionAddress}
      exchangeAddress={exchangeAddress}
      isAuction
    />
  );
  const policy = (
    <PolicyCard M_dynamic={M_dynamic} seasonAddress={seasonAddress} exchangeAddress={exchangeAddress} config={config} />
  );
  const schedule = <ScheduleCard tradingStart={tradingStart} seasonEnd={seasonEnd} config={config} />;
  const lending = <LendingDistributionCard seasonAddress={seasonAddress} config={config} />;
  const chat = <FactionChat seasonSlug={seasonSlug} auctionMode />;
  const feed = <AuctionActivityFeed seasonAddress={seasonAddress} className="h-full" />;
  const chart = (
    <AuctionChart
      points={auctionChart.points}
      timeframe={auctionChart.timeframe}
      onTimeframeChange={auctionChart.onTimeframeChange}
    />
  );
  const fimDistribution = (
    <FimDistributionChart
      seasonAddress={seasonAddress}
      exchangeAddress={exchangeAddress}
    />
  );

  return (
    // Root fills at least the viewport (minus the AppShell's pb-6 = 1.5rem). No
    // flex gap: each reveal row owns its top gap so it folds away with the row.
    <div className="flex min-h-[calc(100vh-1.5rem)] flex-col">
      {/* SeasonBand — reveal rung 1: folds on the staged scroll-down ladder. */}
      <SeasonBandReveal seasonAddress={seasonAddress} seasonName={formattedName} />

      {/* AuctionChart + FimDistributionChart — first content rung (r).
          xl/2xl/lg: side-by-side in the same h-112 row (dist chart fixed w-72).
          md/sm: AuctionChart full-width here; FimDistributionChart in a separate
          rung below (c+0 rung; all subsequent content rungs shift by +1). */}
      {mounted && (isXl || is2xl || isLg) && (
        <ChromeRevealRow index={r}>
          <div className="flex gap-5 h-112">
            <div className="flex-1 min-w-0 h-full">{chart}</div>
            <div className="w-72 h-full">{fimDistribution}</div>
          </div>
        </ChromeRevealRow>
      )}
      {mounted && (isMd || isSm) && (
        <>
          <ChromeRevealRow index={r}>
            <div className="h-112">{chart}</div>
          </ChromeRevealRow>
          <ChromeRevealRow index={c}>
            <div className="h-72">{fimDistribution}</div>
          </ChromeRevealRow>
        </>
      )}

      {/* ── xl : 4 cols — [Protocol/Policy] [Schedule/Lending] [Chat/Feed] [mask].
          Nothing in the content folds here (one rung = the resting floor); only
          the navbar and band fold above it. The two card columns stack their
          pair as equal-height rows (2 cols × 2 rows); col 3 stacks Chat over Feed
          (reversed), both spanning the row height; col 4 is the mask. ── */}
      {mounted && isXl && (
        <ChromeRevealRow index={c} className="grid grid-cols-4 grid-rows-2 gap-5">
          {/* Col 1: Protocol over Policy — equal-height rows. */}
          <div className="col-start-1 row-start-1 flex flex-col">{protocol}</div>
          <div className="col-start-1 row-start-2 flex flex-col">{policy}</div>
          {/* Col 2: Schedule over Lending — equal-height rows. */}
          <div className="col-start-2 row-start-1 flex flex-col">{schedule}</div>
          <div className="col-start-2 row-start-2 flex flex-col">{lending}</div>

          {/* Col 3: Chat over Feed (reversed). Each takes one grid row and
              stretches to fill it, so together they span the column height set
              by the two card rows / the mask. */}
          <div className="col-start-3 row-start-1 flex min-h-0 flex-col">{chat}</div>
          <div className="col-start-3 row-start-2 flex min-h-0 flex-col">{feed}</div>

          {/* Col 4: AuctionMask spanning both rows; min height anchors the grid. */}
          <div className="col-start-4 row-span-2 row-start-1 flex min-h-112 flex-col">{mask}</div>
        </ChromeRevealRow>
      )}

      {/* ── 2xl : same as xl with equal-height cards, but Chat and ActivityFeed
          get their own columns (side by side) instead of stacked. 5 cols × 2
          rows — [Protocol/Policy] [Schedule/Lending] [Chat] [Feed] [mask], the
          last three spanning both rows. Nothing in the content folds (one floor
          rung); only the navbar and band fold above it. ── */}
      {mounted && is2xl && (
        <ChromeRevealRow index={c} className="grid grid-cols-5 grid-rows-2 gap-5">
          {/* Col 1: Protocol over Policy — equal-height rows. */}
          <div className="col-start-1 row-start-1 flex flex-col">{protocol}</div>
          <div className="col-start-1 row-start-2 flex flex-col">{policy}</div>
          {/* Col 2: Schedule over Lending — equal-height rows. */}
          <div className="col-start-2 row-start-1 flex flex-col">{schedule}</div>
          <div className="col-start-2 row-start-2 flex flex-col">{lending}</div>

          {/* Col 3: Chat — spans both rows. */}
          <div className="col-start-3 row-span-2 row-start-1 flex min-h-0 flex-col">{chat}</div>
          {/* Col 4: ActivityFeed — spans both rows. */}
          <div className="col-start-4 row-span-2 row-start-1 flex min-h-0 flex-col">{feed}</div>

          {/* Col 5: AuctionMask — spans both rows; min height anchors the grid. */}
          <div className="col-start-5 row-span-2 row-start-1 flex min-h-112 flex-col">{mask}</div>
        </ChromeRevealRow>
      )}

      {/* ── lg : [cards + mask] → [Feed + Chat floor].
          Stage 1: 3 cols — col1 Protocol/Policy, col2 Schedule/Lending, col3
          mask spanning both card rows. ── */}
      {mounted && isLg && (
        <>
          <ChromeRevealRow
            index={c}
            className="grid grid-cols-3 grid-rows-2 gap-5"
          >
            <div className="col-start-1 row-start-1 flex flex-col">{protocol}</div>
            <div className="col-start-1 row-start-2 flex flex-col">{policy}</div>
            <div className="col-start-2 row-start-1 flex flex-col">{schedule}</div>
            <div className="col-start-2 row-start-2 flex flex-col">{lending}</div>
            <div className="col-start-3 row-span-2 row-start-1 flex min-h-112 flex-col">{mask}</div>
          </ChromeRevealRow>
          <ChromeRevealRow index={c + 1} className="grid grid-cols-2 gap-5">
            <div className="flex min-h-112 flex-col">{feed}</div>
            <div className="flex min-h-112 flex-col">{chat}</div>
          </ChromeRevealRow>
        </>
      )}

      {/* ── md : [dist] → [mask] → [Protocol+Policy] → [Schedule+Lending] → [Feed] → [Chat floor]
          FimDistributionChart is rung c (rendered above); content rungs start at c+1. ── */}
      {mounted && isMd && (
        <>
          <ChromeRevealRow index={c + 1} className="flex min-h-112 flex-col">
            {mask}
          </ChromeRevealRow>
          <ChromeRevealRow index={c + 2} className="grid grid-cols-2 gap-5">
            <div className="flex flex-col">{protocol}</div>
            <div className="flex flex-col">{policy}</div>
          </ChromeRevealRow>
          <ChromeRevealRow index={c + 3} className="grid grid-cols-2 gap-5">
            <div className="flex flex-col">{schedule}</div>
            <div className="flex flex-col">{lending}</div>
          </ChromeRevealRow>
          {/* Feed sizes to its content (no min-h) so its short table doesn't
              leave a tall empty box above the Chat. */}
          <ChromeRevealRow index={c + 4} className="flex flex-col">
            {feed}
          </ChromeRevealRow>
          <ChromeRevealRow index={c + 5} className="flex min-h-112 flex-col">
            {chat}
          </ChromeRevealRow>
        </>
      )}

      {/* ── sm and below : each component its own stage.
          FimDistributionChart is rung c (rendered above); content rungs start at c+1. ── */}
      {mounted && isSm && (
        <>
          <ChromeRevealRow index={c + 1} className="flex min-h-112 flex-col">
            {mask}
          </ChromeRevealRow>
          <ChromeRevealRow index={c + 2} className="flex flex-col">
            {protocol}
          </ChromeRevealRow>
          <ChromeRevealRow index={c + 3} className="flex flex-col">
            {policy}
          </ChromeRevealRow>
          <ChromeRevealRow index={c + 4} className="flex flex-col">
            {schedule}
          </ChromeRevealRow>
          <ChromeRevealRow index={c + 5} className="flex flex-col">
            {lending}
          </ChromeRevealRow>
          {/* Feed sizes to its content (no min-h) so its short table doesn't
              leave a tall empty box above the Chat. */}
          <ChromeRevealRow index={c + 6} className="flex flex-col">
            {feed}
          </ChromeRevealRow>
          <ChromeRevealRow index={c + 7} className="flex min-h-112 flex-col">
            {chat}
          </ChromeRevealRow>
        </>
      )}
    </div>
  );
}
