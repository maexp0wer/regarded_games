'use client';

import { SeasonBandReveal } from '../SeasonBandReveal';
import { ChromeRevealRow } from '../ChromeRevealRow';
import { firstRowRung, useChromeRowCount } from '@/lib/seasonChromeReveal';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { ProtocolCard } from '../ProtocolCard';
import { PolicyCard } from '../PolicyCard';
import { ScheduleCard } from '../ScheduleCard';
import { LendingDistributionCard } from '../LendingDistributionCard';
import { PayoutMask } from '../PayoutMask';
import { SeasonStats } from '../SeasonStats';
import { SeasonLeaderboard } from '../SeasonLeaderboard';
import type { SeasonConfig } from '@/hooks/useSeasonPhase';

interface PayoutPhaseLayoutProps {
  seasonAddress: `0x${string}`;
  auctionAddress: `0x${string}`;
  fimAddress: `0x${string}`;
  exchangeAddress: `0x${string}`;
  userAddress?: `0x${string}`;
  formattedName: string;
  showPayout: boolean;
  tradingStart: number;
  seasonEnd: number;
  config: SeasonConfig | null;
  M_dynamic: number;
}

/**
 * Payout / concluded layout.
 *
 * SeasonBand on top, then a single content grid following the same responsive
 * column ladder as the auction phase: 5 cols (2xl) → 4 (xl) → 3 (lg) → 2 (md)
 * → 1 (sm). PayoutMask is always the single right column, spanning both of the
 * first two rows (a full-height right rail like the auction mask). The first
 * two rows grow to fill the leftover viewport height under the band; the block
 * grows past the viewport when content needs more room.
 *
 * Row-1 left ladder (columns left of the PayoutMask rail):
 *   2xl: Leaderboard (c1–2) · Stats (c3–4)   |  rail c5
 *   xl : Stats (c1–3)                          |  rail c4   · Leaderboard → row 2
 *   lg : Stats (c1–2)                          |  rail c3   · Leaderboard → row 2
 *   md : Stats (c1)                            |  rail c2   · Leaderboard → row 2
 *
 * The four detail cards (Protocol/Policy/Schedule/Lending) fill the row beneath
 * the rail span — row 2 at 2xl (rail ends there), row 3 at xl/lg/md.
 *
 * `order` floats PayoutMask directly under the band at the 1-column breakpoint;
 * from md up it's reset and explicit placement takes over. When the user hasn't
 * participated (PayoutMask hidden) the grid collapses to a single stacked
 * column. */
export function PayoutPhaseLayout({
  seasonAddress,
  auctionAddress,
  fimAddress,
  exchangeAddress,
  userAddress,
  formattedName,
  showPayout,
  tradingStart,
  seasonEnd,
  config,
  M_dynamic,
}: PayoutPhaseLayoutProps) {
  const bp = useBreakpoint();
  const isMd = bp === 'md';
  const is2xl = bp === '2xl';

  // Disconnected: SeasonStats has no data, so the leaderboard takes its slot in
  // the fill block (beside the PayoutMask connect-gate) and the 4 cards take the
  // below section. At 2xl the cards move up into the fill row, leaving nothing
  // below. Connected non-participant uses the non-showPayout branch.
  const disconnected = !userAddress;

  // Collapsible content rows below the band:
  //   connected participant → fill grid + below section (2); at md the below
  //                      section splits so the 4 cards get their own point (3).
  //   disconnected     → fill grid + cards below (2); at 2xl cards move into the
  //                      fill row so there's a single rung (1).
  //   non-participant  → leaderboard + cards (2).
  const rowCount = showPayout
    ? disconnected
      ? is2xl
        ? 1
        : 2
      : isMd
        ? 3
        : 2
    : 2;
  useChromeRowCount(rowCount);
  const rung = firstRowRung();

  // The four detail cards, reused across the layout variants.
  const protocolCard = (
    <ProtocolCard
      seasonAddress={seasonAddress}
      fimAddress={fimAddress}
      auctionAddress={auctionAddress}
      exchangeAddress={exchangeAddress}
    />
  );
  const policyCard = (
    <PolicyCard M_dynamic={M_dynamic} seasonAddress={seasonAddress} exchangeAddress={exchangeAddress} config={config} />
  );
  const scheduleCard = <ScheduleCard tradingStart={tradingStart} seasonEnd={seasonEnd} config={config} />;
  const lendingCard = <LendingDistributionCard seasonAddress={seasonAddress} config={config} />;
  const detailCards = (
    <>
      {protocolCard}
      {policyCard}
      {scheduleCard}
      {lendingCard}
    </>
  );
  const leaderboard = <SeasonLeaderboard seasonAddress={seasonAddress} seasonName={formattedName} />;
  const payoutMask = <PayoutMask seasonAddress={seasonAddress} className="h-full max-h-none" />;

  return (
    // Root fills at least the viewport (minus the AppShell's pb-6 = 1.5rem). No
    // flex gap: each reveal row owns its top gap so it folds away with the row.
    <div className="flex min-h-[calc(100vh-1.5rem)] flex-col">
      {/* SeasonBand — reveal rung 1: folds on the staged scroll-down ladder. */}
      <SeasonBandReveal seasonAddress={seasonAddress} seasonName={formattedName} />

      {!showPayout ? (
        // Connected non-participant: no PayoutMask/SeasonStats (both empty).
        // Leaderboard then cards.
        <>
          <ChromeRevealRow index={rung}>{leaderboard}</ChromeRevealRow>
          <ChromeRevealRow index={rung + 1} className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {detailCards}
          </ChromeRevealRow>
        </>
      ) : disconnected ? (
        // Disconnected: PayoutMask shows its connect-gate (right rail), the
        // Leaderboard takes the SeasonStats slot, and the 4 cards sit below.
        // At 2xl the cards move up beside the leaderboard so nothing is below.
        is2xl ? (
          // 2xl: single fill row — [4 cards 2×2] [Leaderboard] [Mask].
          <ChromeRevealRow index={rung} className="grid grid-cols-5 grid-rows-2 gap-5">
            <div className="col-start-1 row-start-1 flex flex-col">{protocolCard}</div>
            <div className="col-start-1 row-start-2 flex flex-col">{policyCard}</div>
            <div className="col-start-2 row-start-1 flex flex-col">{scheduleCard}</div>
            <div className="col-start-2 row-start-2 flex flex-col">{lendingCard}</div>
            <div className="custom-scrollbar col-start-3 col-span-2 row-span-2 row-start-1 flex min-h-0 flex-col overflow-y-auto">
              {leaderboard}
            </div>
            <div className="col-start-5 row-span-2 row-start-1 flex min-h-0 flex-col">{payoutMask}</div>
          </ChromeRevealRow>
        ) : (
          // md/lg/xl: fill row [Leaderboard | Mask], cards below.
          // md = 3 cols (leaderboard 2, mask 1); lg/xl widen the leaderboard.
          <>
            <ChromeRevealRow
              index={rung}
              className="grid grid-cols-1 gap-5 md:grid-rows-[minmax(0,1fr)_minmax(0,1fr)] md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4"
            >
              <div className="order-first flex min-h-0 flex-col md:order-0 md:col-start-3 md:row-span-2 md:row-start-1 lg:col-start-3 xl:col-start-4">
                {payoutMask}
              </div>
              <div className="custom-scrollbar flex min-h-0 flex-col overflow-y-auto md:col-start-1 md:col-span-2 md:row-span-2 md:row-start-1 lg:col-span-2 xl:col-span-3">
                {leaderboard}
              </div>
            </ChromeRevealRow>
            <ChromeRevealRow index={rung + 1} className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              {detailCards}
            </ChromeRevealRow>
          </>
        )
      ) : (
        // Connected participant. Fill block: SeasonStats (left) + PayoutMask
        // (right rail); leaderboard joins at 2xl. Below: leaderboard (under 2xl)
        // + cards, split into their own scrollpoint at md.
        <>
          <ChromeRevealRow
            index={rung}
            className="grid grid-cols-1 gap-5 md:grid-rows-[minmax(0,1fr)_minmax(0,1fr)] md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
          >
            {/* PayoutMask — right rail, spans both rows. */}
            <div className="order-first flex min-h-0 flex-col md:order-0 md:col-start-2 md:row-span-2 md:row-start-1 lg:col-start-3 xl:col-start-4 2xl:col-start-5">
              {payoutMask}
            </div>
            {/* SeasonStats — spans both rows, left of the rail. */}
            <div className="flex min-h-0 flex-col md:col-start-1 md:row-span-2 md:row-start-1 lg:col-span-2 xl:col-span-3 2xl:col-start-3 2xl:col-span-2">
              <SeasonStats
                seasonAddress={seasonAddress}
                userAddress={userAddress || ''}
                exchangeAddress={exchangeAddress}
              />
            </div>
            {/* SeasonLeaderboard — 2xl only: c1–2, spans both rows. */}
            <div className="custom-scrollbar hidden min-h-0 overflow-y-auto 2xl:col-start-1 2xl:col-span-2 2xl:row-span-2 2xl:row-start-1 2xl:flex 2xl:flex-col">
              {leaderboard}
            </div>
          </ChromeRevealRow>

          {isMd ? (
            <>
              <ChromeRevealRow index={rung + 1}>
                <div className="custom-scrollbar flex flex-col overflow-y-auto">{leaderboard}</div>
              </ChromeRevealRow>
              <ChromeRevealRow index={rung + 2} className="grid grid-cols-2 gap-5">
                {detailCards}
              </ChromeRevealRow>
            </>
          ) : (
            <ChromeRevealRow index={rung + 1} className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              <div className="custom-scrollbar flex flex-col overflow-y-auto md:col-span-2 xl:col-span-2 xl:row-span-2 2xl:hidden">
                {leaderboard}
              </div>
              {detailCards}
            </ChromeRevealRow>
          )}
        </>
      )}
    </div>
  );
}
