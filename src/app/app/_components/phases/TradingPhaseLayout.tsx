'use client';

import { MutableRefObject } from 'react';

import { SeasonBandReveal } from '../SeasonBandReveal';
import { ChromeRevealRow } from '../ChromeRevealRow';
import { firstRowRung, useChromeRowCount } from '@/lib/seasonChromeReveal';
import { ProtocolCard } from '../ProtocolCard';
import { PolicyCard } from '../PolicyCard';
import { ScheduleCard } from '../ScheduleCard';
import { LendingDistributionCard } from '../LendingDistributionCard';
import { TradingMask } from '../TradingMask';
import { FactionDiscussionBoard } from '../FactionDiscussionBoard';
import { TradingPanelMenu } from '../TradingPanelMenu';
import type { Order } from '@/hooks/useOrderBook';
import type { PercentileData } from '@/hooks/useBatchPlayerPercentiles';
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
  factionData?: PercentileData;
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
  // Two collapsible content rows below the band: trading panel + detail cards.
  useChromeRowCount(2);
  const rung = firstRowRung();

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

      {/* Trading panel — reveal rung 2. */}
      <ChromeRevealRow index={rung}>
        {factionData && showBoard && (
          <div className="hidden xl:block mb-5 animate-in slide-in-from-top-4 fade-in duration-300">
            <FactionDiscussionBoard
              seasonSlug={seasonSlug}
              isCapitalist={factionData.isCapitalist}
            />
          </div>
        )}
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
          tradingMask={
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
          }
        />
      </ChromeRevealRow>

      {/* Season detail cards — reveal rung 3. */}
      <ChromeRevealRow index={rung + 1} className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <ProtocolCard
          seasonAddress={seasonAddress}
          fimAddress={fimAddress}
          auctionAddress={auctionAddress}
          exchangeAddress={exchangeAddress}
        />
        <PolicyCard M_dynamic={M_dynamic} seasonAddress={seasonAddress} exchangeAddress={exchangeAddress} config={config} />
        <ScheduleCard tradingStart={tradingStart} seasonEnd={seasonEnd} config={config} />
        <LendingDistributionCard seasonAddress={seasonAddress} config={config} />
      </ChromeRevealRow>
    </div>
  );
}
