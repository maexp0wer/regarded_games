'use client';

import { useEffect, useState } from 'react';
import { SeasonBandReveal } from '../SeasonBandReveal';
import { ChromeRevealRow } from '../ChromeRevealRow';
import { ChromeRevealAtRow } from '../ChromeRevealAtRow';
import { firstRowRung, useChromeRowCount } from '@/lib/seasonChromeReveal';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { ProtocolCard } from '../ProtocolCard';
import { PolicyCard } from '../PolicyCard';
import { ScheduleCard } from '../ScheduleCard';
import { LendingDistributionCard } from '../LendingDistributionCard';
import { AuctionMask } from '../AuctionMask';
import { AuctionPanelMenu } from '../AuctionPanelMenu';
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
 * Mirrors TradingPhaseLayout's scroll/viewport structure:
 *   xl/2xl : viewport-locked — band folds, AuctionPanelMenu + mask pinned full-height,
 *            detail cards reveal at deepest fold.
 *   lg      : panel+mask share one fold rung, cards in the next.
 *   md      : mask gets its own rung (detached), then panel, then cards.
 *   sm-     : same detached pattern as md.
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

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isXl  = bp === 'xl';
  const is2xl = bp === '2xl';
  const detached = mounted && (bp === 'md' || bp === 'sm' || bp === 'xs');
  const isLocked = mounted && (isXl || is2xl);

  // Fold-rung budget — matches TradingPhaseLayout exactly:
  //   xl/2xl  : navbar + band fold → 2 stages.
  //   detached: mask row + panel row + cards → 3 rungs.
  //   lg      : trading row + cards → 2 rungs.
  useChromeRowCount(isLocked ? 2 : detached ? 3 : 2);
  const rung = firstRowRung();
  const cardsRung = detached ? rung + 2 : rung + 1;
  const cardsRevealLevel = rung + 1;

  const mask = (
    <AuctionMask
      seasonAddress={seasonAddress}
      auctionAddress={auctionAddress}
      fimAddress={fimAddress}
      currentPhase={currentPhase}
    />
  );

  const panelMenu = (
    <AuctionPanelMenu
      seasonAddress={seasonAddress}
      exchangeAddress={exchangeAddress}
      seasonSlug={seasonSlug}
      points={auctionChart.points}
      timeframe={auctionChart.timeframe}
      onTimeframeChange={auctionChart.onTimeframeChange}
      maskMode={detached ? 'detached' : 'bundled'}
      auctionMask={mask}
    />
  );

  const detailCards = (
    <>
      <PolicyCard M_dynamic={M_dynamic} seasonAddress={seasonAddress} exchangeAddress={exchangeAddress} config={config} />
      <ScheduleCard tradingStart={tradingStart} seasonEnd={seasonEnd} config={config} />
      <LendingDistributionCard seasonAddress={seasonAddress} config={config} />
      <ProtocolCard
        seasonAddress={seasonAddress}
        fimAddress={fimAddress}
        auctionAddress={auctionAddress}
        exchangeAddress={exchangeAddress}
        isAuction
      />
    </>
  );

  // xl/2xl: viewport-locked — band folds above, panel + mask pinned, cards reveal below.
  if (isLocked) {
    return (
      <div className="flex h-[calc(100vh-1.5rem)] flex-col overflow-hidden">
        <SeasonBandReveal seasonAddress={seasonAddress} seasonName={formattedName} />
        <div className="flex min-h-0 flex-1 flex-col pt-5">
          <div className="min-h-0 flex-1">{panelMenu}</div>
        </div>
        <ChromeRevealAtRow level={cardsRevealLevel} className="grid grid-cols-4 gap-5 pt-5">
          {detailCards}
        </ChromeRevealAtRow>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <SeasonBandReveal seasonAddress={seasonAddress} seasonName={formattedName} />

      {detached ? (
        <>
          <ChromeRevealRow index={rung}>{mask}</ChromeRevealRow>
          <ChromeRevealRow index={rung + 1}>{panelMenu}</ChromeRevealRow>
        </>
      ) : (
        <ChromeRevealRow index={rung}>{panelMenu}</ChromeRevealRow>
      )}

      <ChromeRevealRow index={cardsRung} className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {detailCards}
      </ChromeRevealRow>
    </div>
  );
}
