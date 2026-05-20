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
import { SeasonDetails } from '../_components/SeasonDetails';
import { AuctionMask } from '../_components/AuctionMask';
import { AuctionActivityFeed } from '../_components/AuctionActivityFeed';
import { TradingMask } from '../_components/TradingMask';
import { OpenOrders } from '../_components/OpenOrders';
import { PayoutMask } from '../_components/PayoutMask';
import PlayerRankDisplay from '../_components/PlayerRankDisplay';
import { FactionDiscussionBoard } from '../_components/FactionDiscussionBoard';
import { FactionChat } from '../_components/FactionChat';
import { CountdownCard } from '../_components/CountdownCard';
import { PrizePoolCard } from '../_components/PrizePoolCard';
import { CandlestickChart } from '../_components/CandlestickChart';
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

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <main className="pt-4 pb-16 space-y-2 animate-in fade-in duration-700">

      {/* ═══════════════════════════════════════════
          HERO ROW — always 3 equal cards
          ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <SeasonHeader
          seasonAddress={seasonAddress}
          seasonName={formattedName}
          playerCount={giniData?.playerCount || 0}
          currentPhase={currentPhase}
          isBootstrap={isAuctionOrBootstrap}
          isPayout={isPayout}
        />
        <PrizePoolCard
          seasonAddress={seasonAddress}
          prizePool={giniData?.prizePool || 0}
          currentPhase={currentPhase}
        />
        <CountdownCard {...heroProps} />
      </div>

      {/* ═══════════════════════════════════════════
          AUCTION / BOOTSTRAP LAYOUT
          ═══════════════════════════════════════════ */}
      {isAuctionOrBootstrap && (
        <>
          {/* Main row: buy widget (3) | gini gauge (5) | all-players chat (2) */}
          <div className="grid grid-cols-1 xl:grid-cols-10 gap-2">
            <div className="xl:col-span-3">
              <AuctionMask
                seasonAddress={seasonAddress}
                auctionAddress={auctionAddress}
                fimAddress={fimAddress}
                currentPhase={currentPhase}
              />
            </div>
            <div className="xl:col-span-5">
              <GiniDisplay seasonAddress={seasonAddress} />
            </div>
            <div className="xl:col-span-2">
              <FactionChat
                seasonSlug={seasonSlug}
                auctionMode
              />
            </div>
          </div>

          {/* Bottom row: activity | season details */}
          <div className="grid grid-cols-1 xl:grid-cols-10 gap-2">
            <div className="xl:col-span-3">
              <AuctionActivityFeed seasonAddress={seasonAddress} />
            </div>
            <div className="xl:col-span-7">
              <SeasonDetails
                tradingStart={tradingStart}
                seasonEnd={seasonEnd}
                M_dynamic={M_dynamic}
                config={config}
                seasonAddress={seasonAddress}
                fimAddress={fimAddress}
                auctionAddress={auctionAddress}
                exchangeAddress={exchangeAddress}
                isAuction
                xlWeighted
              />
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════
      TRADING LAYOUT
      ═══════════════════════════════════════════ */}
  {isTrading && (
    <>
      {/* Row 1: Gini (full width) */}
      <GiniDisplay seasonAddress={seasonAddress} />

      {/* Discussion board — large screens only, slides in below row 1 */}
      {factionData && showBoard && (
        <div className="hidden md:block animate-in slide-in-from-top-4 fade-in duration-300">
          <FactionDiscussionBoard
            seasonSlug={seasonSlug}
            isCapitalist={factionData.isCapitalist}
          />
        </div>
      )}

      {/* Row 2: Chart+OpenOrders | PanelMenu | TradingMask */}
      <div className="flex gap-2 items-stretch">
        {/* Chart column grows/shrinks as panels open */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <CandlestickChart
            candles={chart.candles}
            timeframe={chart.timeframe}
            onTimeframeChange={chart.onTimeframeChange}
            onCandleClick={chart.onCandleClick}
            selectedRange={chart.selectedRange}
            capTargetBps={chart.capTargetBps}
            socTargetBps={chart.socTargetBps}
          />
          {userAddress && (
            <OpenOrders
              seasonAddress={seasonAddress}
              userAddress={userAddress}
              exchangeAddress={exchangeAddress}
            />
          )}
        </div>

        {/* Panel menu: vertical toggle bar + sliding panel area */}
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
        />

        {/* Trading mask — fixed width */}
        <div className="shrink-0 w-90">
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
        </div>
      </div>

      {/* Row 3: SeasonDetails */}
      <SeasonDetails
        tradingStart={tradingStart}
        seasonEnd={seasonEnd}
        M_dynamic={M_dynamic}
        config={config}
        seasonAddress={seasonAddress}
        fimAddress={fimAddress}
        auctionAddress={auctionAddress}
        exchangeAddress={exchangeAddress}
        isAuction={false}
        xlWeighted
      />
    </>
  )}

      {/* ═══════════════════════════════════════════
          PAYOUT / CONCLUDED LAYOUT
          ═══════════════════════════════════════════ */}
      {isPayout && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
            <PayoutMask seasonAddress={seasonAddress} />
            <div className="lg:col-span-2 flex flex-col gap-2">
              <PlayerRankDisplay
                seasonAddress={seasonAddress}
                userAddress={userAddress || ''}
              />

              {isPayoutActionable && <GiniDisplay seasonAddress={seasonAddress} />}
            </div>
          </div>

          {!isPayoutActionable && <GiniDisplay seasonAddress={seasonAddress} />}

          <SeasonDetails
            tradingStart={tradingStart}
            seasonEnd={seasonEnd}
            M_dynamic={M_dynamic}
            config={config}
            seasonAddress={seasonAddress}
            fimAddress={fimAddress}
            auctionAddress={auctionAddress}
            exchangeAddress={exchangeAddress}
            isAuction={false}
          />
        </>
      )}

    </main>
  );
}
