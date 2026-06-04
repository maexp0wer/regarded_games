'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';

// Hooks
import { useSeasonGini, useSeasonById } from '@/hooks/useSeasonGini';
import { useSeasonPhase } from '@/hooks/useSeasonPhase';
import { useSeasonVictory } from '@/hooks/useSeasonVictory';
import { Order } from '@/hooks/useOrderBook';
import { useBatchPlayerPercentiles } from '@/hooks/useBatchPlayerPercentiles';

// Components
import { GiniDisplay } from '../_components/GiniDisplay';
import { ProtocolCard } from '../_components/ProtocolCard';
import { PolicyCard } from '../_components/PolicyCard';
import { ScheduleCard } from '../_components/ScheduleCard';
import { LendingDistributionCard } from '../_components/LendingDistributionCard';
import { AuctionMask } from '../_components/AuctionMask';
import { AuctionActivityFeed } from '../_components/AuctionActivityFeed';
import { TradingMask } from '../_components/TradingMask';
import { PayoutMask } from '../_components/PayoutMask';
import { SeasonStats } from '../_components/SeasonStats';
import { FactionDiscussionBoard } from '../_components/FactionDiscussionBoard';
import { FactionChat } from '../_components/FactionChat';
import { TradingPanelMenu } from '../_components/TradingPanelMenu';
import { useSeasonChart } from '@/hooks/useSeasonChart';

export default function SeasonDetailPage() {
  const { seasonSlug } = useParams() as { seasonSlug: string };

  // 1. Routing & metadata
  const { data: metadata, isLoading: isMetaLoading } = useSeasonById(seasonSlug);
  const { address: userAddress } = useAccount();

  const seasonAddress   = metadata?.address         as `0x${string}` | undefined;
  const auctionAddress  = metadata?.auctionAddress  as `0x${string}` | undefined;
  const exchangeAddress = metadata?.exchangeAddress as `0x${string}` | undefined;
  const fimAddress      = metadata?.fimAddress      as `0x${string}` | undefined;

  // 2. Trading state (lifted)
  const openOrderBookRef = useRef<() => void>(() => {});
  const [showBoard, setShowBoard] = useState(false);
  const [isBuy, setIsBuy] = useState(true);
  const [isMaker, setIsMaker] = useState(false);
  const [buyTargetAmount, setBuyTargetAmount] = useState('');
  const [sellTargetAmount, setSellTargetAmount] = useState('');
  const [selectedAsks, setSelectedAsks] = useState<Order[]>([]);
  const [selectedBids, setSelectedBids] = useState<Order[]>([]);

  // 3. Trading handlers
  const handleSelectOrder = (order: Order) => {
    // maker ask (isBuy=false) → taker buys FIM; maker bid (isBuy=true) → taker sells FIM
    if (!order.isBuy) {
      if (!selectedAsks.find((o) => o.id === order.id))
        setSelectedAsks((prev) => [...prev, order]);
    } else {
      if (!selectedBids.find((o) => o.id === order.id))
        setSelectedBids((prev) => [...prev, order]);
    }
  };
  const handleRemoveOrder = (id: string) => {
    setSelectedAsks((prev) => prev.filter((o) => o.id !== id));
    setSelectedBids((prev) => prev.filter((o) => o.id !== id));
  };
  const handleReorderAsks = (orders: Order[]) => setSelectedAsks(orders);
  const handleReorderBids = (orders: Order[]) => setSelectedBids(orders);

  // 4. Unified season state
  const phase   = useSeasonPhase(seasonAddress);
  const victory = useSeasonVictory(seasonAddress);
  const { data: giniData, isLoading: isGiniLoading } = useSeasonGini(seasonAddress);

  const {
    currentPhase,
    isAuction,
    isAuctionOrBootstrap,
    isTrading,
    isPayout,
    tradingStart,
    seasonEnd,
    isTradingTimeExpired,
    config,
  } = phase;

  const queryClient = useQueryClient();
  const prevPhaseRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevPhaseRef.current !== null && currentPhase !== null && prevPhaseRef.current !== currentPhase) {
      queryClient.invalidateQueries();
    }
    if (currentPhase !== null) prevPhaseRef.current = currentPhase;
  }, [currentPhase]);

  const {
    M_dynamic,
    winningSide,
    progressPercent,
    effectiveVictoryPending,
  } = victory;

  const { data: percentilesMap } = useBatchPlayerPercentiles(
    seasonAddress,
    userAddress ? [userAddress] : [],
    exchangeAddress
  );
  const factionData = userAddress ? percentilesMap?.[userAddress.toLowerCase()] : undefined;

  const chart = useSeasonChart(seasonAddress);


  const formattedName = seasonSlug?.replace(/_/g, ' ') || 'Season Dashboard';

  // 5. Loading / error states
  if (isMetaLoading || isGiniLoading || phase.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gold animate-pulse font-mono text-sm uppercase tracking-widest">
        Reading Ledger…
      </div>
    );
  }

  if (!seasonAddress || !exchangeAddress || !fimAddress || !auctionAddress) {
    return (
      <div className="min-h-screen flex items-center justify-center text-text2 text-center font-mono text-sm">
        Blockchain Data Unavailable
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <main className="pt-4 pb-16 animate-in fade-in duration-700">


      {/* ═══════════════════════════════════════════
          AUCTION / BOOTSTRAP LAYOUT
          ═══════════════════════════════════════════ */}
      {isAuctionOrBootstrap && (
        <div className="flex flex-col gap-5">
          <GiniDisplay seasonAddress={seasonAddress} seasonName={formattedName} />

          {/* Row 1: Chat | Activity Feed | Auction Mask */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <FactionChat seasonSlug={seasonSlug} auctionMode />
            <AuctionActivityFeed seasonAddress={seasonAddress} />
            <AuctionMask
              seasonAddress={seasonAddress}
              auctionAddress={auctionAddress}
              fimAddress={fimAddress}
              currentPhase={currentPhase}
            />
          </div>

          {/* Row 2: Protocol / Policy / Schedule / Lending */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            <ProtocolCard
              seasonAddress={seasonAddress}
              fimAddress={fimAddress}
              auctionAddress={auctionAddress}
              exchangeAddress={exchangeAddress}
              isAuction
            />
            <PolicyCard M_dynamic={M_dynamic} config={config} />
            <ScheduleCard tradingStart={tradingStart} seasonEnd={seasonEnd} config={config} />
            <LendingDistributionCard seasonAddress={seasonAddress} config={config} />
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
      TRADING LAYOUT
      ═══════════════════════════════════════════ */}
  {isTrading && (
    <>
      {/* Row 1: Gini with integrated sidebar */}
      <GiniDisplay seasonAddress={seasonAddress} seasonName={formattedName} />

      {/* Separator + optional discussion board — large screens only */}
      {factionData && showBoard ? (
        <div className="hidden md:block">
          <div className="animate-in slide-in-from-top-4 fade-in duration-300">
            <FactionDiscussionBoard
              seasonSlug={seasonSlug}
              isCapitalist={factionData.isCapitalist}
            />
          </div>
        </div>
      ) : (
        <div/>
      )}

      {/* Trading panel: single component handles both mobile and desktop layouts */}
      <div className="mt-5">
        <TradingPanelMenu
          seasonAddress={seasonAddress}
          isBuy={isBuy}
          isMaker={isMaker}
          onSelectOrder={handleSelectOrder}
          onRemoveOrder={handleRemoveOrder}
          selectedOrderIds={[...selectedAsks, ...selectedBids].map(o => o.id)}
          trades={chart.trades}
          timeWindowMs={chart.timeWindowMs}
          selectedRange={chart.selectedRange}
          onClearSelection={chart.onClearSelection}
          isLive={chart.isLive}
          seasonSlug={seasonSlug}
          isCapitalist={factionData?.isCapitalist}
          showBoard={showBoard}
          onToggleBoard={() => setShowBoard((v) => !v)}
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
              onRemoveOrder={handleRemoveOrder}
              onReorderAsks={handleReorderAsks}
              onReorderBids={handleReorderBids}
              isOnHold={effectiveVictoryPending}
              onOpenOrderBook={() => openOrderBookRef.current()}
            />
          }
        />
      </div>

      {/* Row 3: Season detail cards */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <div className="relative p-0">
          <ProtocolCard
            seasonAddress={seasonAddress}
            fimAddress={fimAddress}
            auctionAddress={auctionAddress}
            exchangeAddress={exchangeAddress}
          />
          {/* Vertical: h-[80%] and top-[10%] */}
          
          {/* Horizontal: w-[80%] and left-[10%] */}
          
        </div>

        <div className="relative p-0">
          <PolicyCard M_dynamic={M_dynamic} config={config} />
          {/* Vertical: h-[80%] and top-[10%] */}
          
          {/* Horizontal: w-[80%] and left-[10%] */}
          
        </div>

        <div className="relative p-0">
          <ScheduleCard tradingStart={tradingStart} seasonEnd={seasonEnd} config={config} />
        </div>

        <div className="relative">
          <LendingDistributionCard seasonAddress={seasonAddress} config={config} />
        </div>
      </div>
    </>
  )}

      {/* ═══════════════════════════════════════════
          PAYOUT / CONCLUDED LAYOUT
          ═══════════════════════════════════════════ */}
      {isPayout && (
        <div className="flex flex-col gap-5">
          {/* Row 1: Gini with integrated sidebar */}
          <GiniDisplay seasonAddress={seasonAddress} seasonName={formattedName} />

          {/* Row 2: PayoutMask first in DOM (top on sm/xs), right on md+ */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_28rem] gap-5">
            <div className="order-2 md:order-1">
              <SeasonStats
                seasonAddress={seasonAddress}
                userAddress={userAddress || ''}
                exchangeAddress={exchangeAddress}
              />
            </div>
            <div className="order-1 md:order-2">
              <PayoutMask seasonAddress={seasonAddress} className="h-full" />
            </div>
          </div>

          {/* Row 3: Protocol / Policy / Schedule / Lending */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            <ProtocolCard
              seasonAddress={seasonAddress}
              fimAddress={fimAddress}
              auctionAddress={auctionAddress}
              exchangeAddress={exchangeAddress}
            />
            <PolicyCard M_dynamic={M_dynamic} config={config} />
            <ScheduleCard tradingStart={tradingStart} seasonEnd={seasonEnd} config={config} />
            <LendingDistributionCard seasonAddress={seasonAddress} config={config} />
          </div>
        </div>
      )}

    </main>
  );
}
