'use client';

import { MutableRefObject, useEffect, useState } from 'react';

import { useBreakpoint } from '@/hooks/useBreakpoint';
import { SeasonBandReveal } from '../SeasonBandReveal';
import { ChromeRevealRow } from '../ChromeRevealRow';
import { ChromeRevealAtRow } from '../ChromeRevealAtRow';
import { firstRowRung, useChromeRowCount, useChromePin } from '@/lib/seasonChromeReveal';
import { ProtocolCard } from '../ProtocolCard';
import { PolicyCard } from '../PolicyCard';
import { ScheduleCard } from '../ScheduleCard';
import { LendingDistributionCard } from '../LendingDistributionCard';
import { TradingMask } from '../TradingMask';
import { FactionDiscussionBoard } from '../FactionDiscussionBoard';
import { TradingPanelMenu } from '../TradingPanelMenu';
import type { Order } from '@/hooks/useOrderBook';
import type { PlayerClassData } from '@/hooks/useBatchPlayerClass';
import type { useSeasonChart } from '@/hooks/useSeasonChart';
import type { SeasonConfig } from '@/hooks/useSeasonPhase';

interface TradingPhaseLayoutProps {
  seasonAddress: `0x${string}`;
  auctionAddress: `0x${string}`;
  exchangeAddress: `0x${string}`;
  fimAddress: `0x${string}`;
  seasonSlug: string;
  formattedName: string;
  userAddress?: `0x${string}`;

  // Schedule / policy
  tradingStart: number;
  seasonEnd: number;
  config: SeasonConfig | null;
  M_dynamic: number;
  effectiveVictoryPending: boolean;

  // Faction + discussion board
  factionData?: PlayerClassData;
  showBoard: boolean;
  onToggleBoard: () => void;

  // Chart
  chart: ReturnType<typeof useSeasonChart>;

  // Lifted trading state + handlers
  isBuy: boolean;
  setIsBuy: (v: boolean) => void;
  isMaker: boolean;
  setIsMaker: (v: boolean) => void;
  buyTargetAmount: string;
  setBuyTargetAmount: (v: string) => void;
  sellTargetAmount: string;
  setSellTargetAmount: (v: string) => void;
  selectedAsks: Order[];
  selectedBids: Order[];
  onSelectOrder: (order: Order) => void;
  onRemoveOrder: (id: string) => void;
  onReorderAsks: (orders: Order[]) => void;
  onReorderBids: (orders: Order[]) => void;
  openOrderBookRef: MutableRefObject<() => void>;
}

/**
 * Trading layout. The joined Gini header sits at the top; the full-width trading
 * panel (chart + order book + mask) follows; the four season detail cards fill
 * the bottom row. Sections size to their own content and the page scrolls. */
export function TradingPhaseLayout({
  seasonAddress,
  auctionAddress,
  exchangeAddress,
  fimAddress,
  seasonSlug,
  formattedName,
  userAddress,
  tradingStart,
  seasonEnd,
  config,
  M_dynamic,
  effectiveVictoryPending,
  factionData,
  showBoard,
  onToggleBoard,
  chart,
  isBuy,
  setIsBuy,
  isMaker,
  setIsMaker,
  buyTargetAmount,
  setBuyTargetAmount,
  sellTargetAmount,
  setSellTargetAmount,
  selectedAsks,
  selectedBids,
  onSelectOrder,
  onRemoveOrder,
  onReorderAsks,
  onReorderBids,
  openOrderBookRef,
}: TradingPhaseLayoutProps) {
  // At lg+ the panel and mask share one fold rung (bundled inside
  // TradingPanelMenu). At md and below the mask gets its own scrollpoint: it
  // becomes a separate fold rung above the panel. The breakpoint variants render
  // different DOM and rung counts, so the size must be known before picking one —
  // gate on a mounted flag to avoid flashing the wrong variant (useBreakpoint
  // returns a provisional value during SSR/first paint).
  const bp = useBreakpoint();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const detached = mounted && (bp === 'md' || bp === 'sm' || bp === 'xs');
  // xl and 2xl share the viewport-locked layout: the trading row is pinned, the
  // band folds above it, and the detail cards reveal at the deepest fold.
  const isLocked = mounted && (bp === 'xl' || bp === '2xl');

  // Fold-rung budget per breakpoint (drives how deep the scroll ladder goes):
  //   xl/2xl  : navbar + band fold, then the cards reveal — 4 stages (rowCount 2).
  //   detached: mask row + panel row + cards = 3 rungs.
  //   lg      : trading row + cards = 2 rungs.
  useChromeRowCount(isLocked ? 2 : detached ? 3 : 2);
  const rung = firstRowRung();
  // Detail cards sit after however many trading rungs precede them.
  const cardsRung = detached ? rung + 2 : rung + 1;
  // xl/2xl: cards reveal at the deepest fold (stage 3 = foldLevel 3).
  const cardsRevealLevel = rung + 1;

  // Mixed taker trade (both a buy and a sell leg queued): the mask shows the two
  // queues side by side, so it claims a second column in the bundled grid.
  const maskWide = !isMaker && selectedAsks.length > 0 && selectedBids.length > 0;

  // While the order execution queue holds orders, the panel + mask own the whole
  // screen: pin the fold ladder to the "trading row only" stage (band folded,
  // cards hidden) so neither can scroll into view. They only share the viewport
  // with the band / cards when the queue is empty. Locked breakpoints only.
  const hasQueuedOrders = selectedAsks.length > 0 || selectedBids.length > 0;
  useChromePin(isLocked && hasQueuedOrders, rung);

  const mask = (
    <TradingMask
      seasonSlug={seasonSlug}
      seasonAddress={seasonAddress}
      exchangeAddress={exchangeAddress}
      fimAddress={fimAddress}
      isBuy={isBuy}
      setIsBuy={setIsBuy}
      isMaker={isMaker}
      setIsMaker={setIsMaker}
      buyTargetAmount={buyTargetAmount}
      setBuyTargetAmount={setBuyTargetAmount}
      sellTargetAmount={sellTargetAmount}
      setSellTargetAmount={setSellTargetAmount}
      selectedAsks={selectedAsks}
      selectedBids={selectedBids}
      onRemoveOrder={onRemoveOrder}
      onReorderAsks={onReorderAsks}
      onReorderBids={onReorderBids}
      isOnHold={effectiveVictoryPending}
      onOpenOrderBook={() => openOrderBookRef.current()}
    />
  );

  const panelMenu = (
    <TradingPanelMenu
      seasonAddress={seasonAddress}
      isBuy={isBuy}
      isMaker={isMaker}
      onSelectOrder={onSelectOrder}
      onRemoveOrder={onRemoveOrder}
      selectedOrderIds={[...selectedAsks, ...selectedBids].map((o) => o.id)}
      trades={chart.trades}
      timeWindowMs={chart.timeWindowMs}
      selectedRange={chart.selectedRange}
      onClearSelection={chart.onClearSelection}
      isLive={chart.isLive}
      seasonSlug={seasonSlug}
      isCapitalist={factionData?.isCapitalist}
      showBoard={showBoard}
      onToggleBoard={onToggleBoard}
      candles={chart.candles}
      timeframe={chart.timeframe}
      onTimeframeChange={chart.onTimeframeChange}
      onCandleClick={chart.onCandleClick}
      capTargetBps={chart.capTargetBps}
      socTargetBps={chart.socTargetBps}
      userAddress={userAddress}
      exchangeAddress={exchangeAddress}
      fimAddress={fimAddress}
      openOrderBookRef={openOrderBookRef}
      maskMode={detached ? 'detached' : 'bundled'}
      maskWide={maskWide}
      tradingMask={mask}
      isOnHold={effectiveVictoryPending}
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
      />
    </>
  );

  // xl/2xl: the trading row is pinned across every scroll stage; the navbar and
  // band fold above it (growing the panel) and the detail cards reveal below it at
  // the deepest fold. The phase is viewport-locked so the pinned row + revealed
  // cards share the height instead of scrolling. Band lives inside the lock so the
  // panel flexes as it folds.
  if (isLocked) {
    return (
      <div className="flex h-[calc(100vh-1.5rem)] flex-col overflow-hidden">
        <SeasonBandReveal seasonAddress={seasonAddress} seasonName={formattedName} />
        {/* Pinned trading row — flex column so the panel (flex-1) fills the
            space the band/board leave free; flexes as the band folds above. */}
        <div className="flex min-h-0 flex-1 flex-col pt-5">
          {factionData && showBoard && (
            <div className="mb-5 shrink-0 animate-in slide-in-from-top-4 fade-in duration-300">
              <FactionDiscussionBoard seasonSlug={seasonSlug} isCapitalist={factionData.isCapitalist} />
            </div>
          )}
          <div className="min-h-0 flex-1">{panelMenu}</div>
        </div>
        {/* Detail cards — slide in at the deepest fold, sharing the locked height. */}
        <ChromeRevealAtRow
          level={cardsRevealLevel}
          className="grid grid-cols-4 gap-5 pt-5"
        >
          {detailCards}
        </ChromeRevealAtRow>
      </div>
    );
  }

  return (
    // No flex gap: each ChromeRevealRow owns its top gap so it folds away with
    // the row (a parent gap would persist around a collapsed row).
    <div className="flex flex-col">
      {/* SeasonBand — reveal rung 1: folds on the staged scroll-down ladder. */}
      <SeasonBandReveal seasonAddress={seasonAddress} seasonName={formattedName} />

      {/* Optional discussion board — large screens only (outside the fixed grid) */}
      {factionData && showBoard && (
        <div className="hidden md:block xl:hidden">
          <div className="animate-in slide-in-from-top-4 fade-in duration-300 pt-5">
            <FactionDiscussionBoard
              seasonSlug={seasonSlug}
              isCapitalist={factionData.isCapitalist}
            />
          </div>
        </div>
      )}

      {detached ? (
        // md and below: mask owns the first scrollpoint, panel the next.
        <>
          {/* Trading mask — its own reveal rung. */}
          <ChromeRevealRow index={rung}>{mask}</ChromeRevealRow>
          {/* Trading panel — its own reveal rung. */}
          <ChromeRevealRow index={rung + 1}>{panelMenu}</ChromeRevealRow>
        </>
      ) : (
        // lg+: panel + mask share one reveal rung (bundled in TradingPanelMenu).
        <ChromeRevealRow index={rung}>
          {factionData && showBoard && (
            <div className="hidden xl:block mb-5 animate-in slide-in-from-top-4 fade-in duration-300">
              <FactionDiscussionBoard
                seasonSlug={seasonSlug}
                isCapitalist={factionData.isCapitalist}
              />
            </div>
          )}
          {panelMenu}
        </ChromeRevealRow>
      )}

      {/* Season detail cards — last reveal rung. */}
      <ChromeRevealRow index={cardsRung} className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {detailCards}
      </ChromeRevealRow>
    </div>
  );
}
