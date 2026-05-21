'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAccount } from 'wagmi';

// Hooks
import { useSeasonGini, useSeasonById } from '@/hooks/useSeasonGini';
import { useSeasonPhase } from '@/hooks/useSeasonPhase';
import { useSeasonVictory } from '@/hooks/useSeasonVictory';
import { Order } from '@/hooks/useOrderBook';
import { useBatchPlayerPercentiles } from '@/hooks/useBatchPlayerPercentiles';
import { usePayout } from '@/hooks/usePayout';

// Components
import { SeasonHeader } from '../_components/SeasonHeader';
import { GiniDisplay } from '../_components/GiniDisplay';
import { ProtocolCard } from '../_components/ProtocolCard';
import { PolicyCard } from '../_components/PolicyCard';
import { ScheduleCard } from '../_components/ScheduleCard';
import { LendingDistributionCard } from '../_components/LendingDistributionCard';
import { AuctionMask } from '../_components/AuctionMask';
import { AuctionActivityFeed } from '../_components/AuctionActivityFeed';
import { TradingMask } from '../_components/TradingMask';
import { PayoutMask } from '../_components/PayoutMask';
import PlayerRankDisplay from '../_components/PlayerRankDisplay';
import { FactionDiscussionBoard } from '../_components/FactionDiscussionBoard';
import { FactionChat } from '../_components/FactionChat';
import { CountdownCard } from '../_components/CountdownCard';
import { PrizePoolCard } from '../_components/PrizePoolCard';
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
  const [showBoard, setShowBoard] = useState(false);
  const [isBuy, setIsBuy] = useState(true);
  const [isMaker, setIsMaker] = useState(false);
  const [targetAmount, setTargetAmount] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<Order[]>([]);

  // 3. Trading handlers
  const handleSelectOrder = (order: Order) => {
    if (!selectedOrders.find((o) => o.id === order.id))
      setSelectedOrders((prev) => [...prev, order]);
  };
  const handleRemoveOrder = (id: string) =>
    setSelectedOrders((prev) => prev.filter((o) => o.id !== id));
  const handleMoveOrder = (index: number, direction: -1 | 1) => {
    const next = [...selectedOrders];
    if (index + direction < 0 || index + direction >= next.length) return;
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    setSelectedOrders(next);
  };
  const handleReorderOrders = (orders: Order[]) => setSelectedOrders(orders);

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

  const { payout, realizedPayout } = usePayout(seasonAddress, userAddress);
  const chart = useSeasonChart(seasonAddress);
  const isPayoutActionable = !!userAddress && payout > 0 && realizedPayout === 0;

  // JIT faction sync
  useEffect(() => {
    if (!userAddress || !factionData) return;
    fetch('/api/discourse/sync-faction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: userAddress, seasonAddress, fimAddress, seasonSlug }),
    }).catch((e) => console.error('JIT Sync Failed:', e));
  }, [userAddress, factionData?.isCapitalist]);

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

  // ─── Shared hero props ────────────────────────────────────────────────────
  const heroProps = {
    tradingStart,
    seasonEnd,
    isAuction,
    isBootstrap: isAuctionOrBootstrap,
    isPayout,
    isVictoryPending: effectiveVictoryPending,
    isTimeLimitExpired: isTradingTimeExpired,
    winningSide,
    progressPercent,
  };

  // ─── Shared sidebar for GiniDisplay ──────────────────────────────────────
  const giniSidebar = (
    <>
      <SeasonHeader
        seasonAddress={seasonAddress}
        seasonName={formattedName}
        playerCount={giniData?.playerCount || 0}
        currentPhase={currentPhase}
        isBootstrap={isAuctionOrBootstrap}
        isPayout={isPayout}
        variant="sidebar"
      />
      <div style={{ height: 1, background: 'var(--color-border)' }} />
      <PrizePoolCard
        seasonAddress={seasonAddress}
        prizePool={giniData?.prizePool || 0}
        currentPhase={currentPhase}
        variant="sidebar"
      />
      <div style={{ height: 1, background: 'var(--color-border)' }} />
      <CountdownCard {...heroProps} variant="sidebar" />
    </>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <main className="pt-4 pb-16 animate-in fade-in duration-700">


      {/* ═══════════════════════════════════════════
          AUCTION / BOOTSTRAP LAYOUT
          ═══════════════════════════════════════════ */}
      {isAuctionOrBootstrap && (
        <>
          {/* Main row: buy widget (3) | gini gauge (5) | all-players chat (2) */}
          <div className="grid grid-cols-1 xl:grid-cols-10 gap-5">
            <div className="xl:col-span-3 relative">
              <AuctionMask
                seasonAddress={seasonAddress}
                auctionAddress={auctionAddress}
                fimAddress={fimAddress}
                currentPhase={currentPhase}
              />
              {/* Vertical: h-[80%] and top-[10%] */}
              
              {/* Horizontal: w-[80%] and left-[10%] */}
              
            </div>
            <div className="xl:col-span-5 relative">
              <GiniDisplay seasonAddress={seasonAddress} sidebar={giniSidebar} />
              {/* Vertical: h-[80%] and top-[10%] */}
              
              {/* Horizontal: w-[80%] and left-[10%] */}
              
            </div>
            <div className="xl:col-span-2">
              <FactionChat
                seasonSlug={seasonSlug}
                auctionMode
              />
            </div>
          </div>

          {/* Bottom row: activity | season detail cards */}
          <div className="grid grid-cols-1 xl:grid-cols-10 gap-5">
            <div className="xl:col-span-3 relative">
              <AuctionActivityFeed seasonAddress={seasonAddress} />
              {/* Vertical: h-[80%] and top-[10%] */}
              
              {/* Horizontal: w-[80%] and left-[10%] */}
              
            </div>
            <div className="xl:col-span-7 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              <div className="relative p-0">
                <ProtocolCard
                  seasonAddress={seasonAddress}
                  fimAddress={fimAddress}
                  auctionAddress={auctionAddress}
                  exchangeAddress={exchangeAddress}
                  isAuction
                />
              </div>
              <div className="relative p-0">
                <PolicyCard M_dynamic={M_dynamic} config={config} />                
              </div>
              <div className="relative p-0">
                <ScheduleCard tradingStart={tradingStart} seasonEnd={seasonEnd} config={config} />
              </div>
              <div className="relative">
                <LendingDistributionCard seasonAddress={seasonAddress} config={config} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════
      TRADING LAYOUT
      ═══════════════════════════════════════════ */}
  {isTrading && (
    <>
      {/* Row 1: Gini with integrated sidebar */}
      <GiniDisplay seasonAddress={seasonAddress} sidebar={giniSidebar} />

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
      <TradingPanelMenu
        seasonAddress={seasonAddress}
        isBuy={isBuy}
        isMaker={isMaker}
        onSelectOrder={handleSelectOrder}
        selectedOrderIds={selectedOrders.map(o => o.id)}
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
            targetAmount={targetAmount}
            setTargetAmount={setTargetAmount}
            selectedOrders={selectedOrders}
            onRemoveOrder={handleRemoveOrder}
            onMoveOrder={handleMoveOrder}
            onReorderOrders={handleReorderOrders}
            isOnHold={effectiveVictoryPending}
          />
        }
      />

      {/* Horizontal divider - full width */}
      <div className="h-px bg-border" />

      {/* Row 3: Season detail cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
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
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="relative">
              <PayoutMask seasonAddress={seasonAddress} />
            </div>
            <div className="lg:col-span-2 flex flex-col gap-5">
              <PlayerRankDisplay
                seasonAddress={seasonAddress}
                userAddress={userAddress || ''}
              />
              {isPayoutActionable && (
                <>
                  {/* Horizontal: w-[80%] and left-[10%] */}
                  <div className="h-px bg-border mx-[10%]" />
                  <GiniDisplay seasonAddress={seasonAddress} sidebar={giniSidebar} />
                </>
              )}
            </div>
          </div>          

          {!isPayoutActionable && (
            <>
              <GiniDisplay seasonAddress={seasonAddress} sidebar={giniSidebar} />
              {/* Horizontal: w-[80%] and left-[10%] */}
              <div className="h-px bg-border mx-[10%]" />
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
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

    </main>
  );
}
