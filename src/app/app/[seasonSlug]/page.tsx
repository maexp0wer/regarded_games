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
import { useOpenOrders } from '@/hooks/useOpenOrders';
import { usePayout } from '@/hooks/usePayout';

// Components
import { SeasonHeader } from '../_components/SeasonHeader';
import { GiniDisplay } from '../_components/GiniDisplay';
import { SeasonDetails } from '../_components/SeasonDetails';
import { AuctionMask } from '../_components/AuctionMask';
import { AuctionActivityFeed } from '../_components/AuctionActivityFeed';
import { OrderBook } from '../_components/OrderBook';
import { TradingActivityFeed } from '../_components/TradingActivityFeed';
import { TradingMask } from '../_components/TradingMask';
import { OpenOrders } from '../_components/OpenOrders';
import { PayoutMask } from '../_components/PayoutMask';
import PlayerRankDisplay from '../_components/PlayerRankDisplay';
import { FactionDiscussionBoard } from '../_components/FactionDiscussionBoard';
import { FactionChat } from '../_components/FactionChat';
import { CountdownCard } from '../_components/CountdownCard';
import { PrizePoolCard } from '../_components/PrizePoolCard';

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

  const { data: myOrders, refetch: refetchOpenOrders } = useOpenOrders(seasonAddress, userAddress);
  const hasOrders = myOrders && myOrders.length > 0;

  const { data: percentilesMap } = useBatchPlayerPercentiles(
    seasonAddress,
    userAddress ? [userAddress] : [],
    exchangeAddress
  );
  const factionData = userAddress ? percentilesMap?.[userAddress.toLowerCase()] : undefined;

  const { payout, realizedPayout } = usePayout(seasonAddress, userAddress);
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
    <main className="pt-4 pb-16 space-y-6 animate-in fade-in duration-700">

      {/* ═══════════════════════════════════════════
          HERO ROW — always 3 equal cards
          ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
          <div className="grid grid-cols-1 xl:grid-cols-10 gap-6">
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
          <div className="grid grid-cols-1 xl:grid-cols-10 gap-6">
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
          {/* Trading mask | order book */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
            <div className="lg:col-span-2">
              <OrderBook
                seasonAddress={seasonAddress}
                isBuy={isBuy}
                isMaker={isMaker}
                onSelectOrder={handleSelectOrder}
              />
            </div>
          </div>

          {/* Open orders (3/10, conditional) | Gini (4/10) | Chat (3/10) */}
          <div className="grid grid-cols-1 xl:grid-cols-10 gap-6">
            {hasOrders && (
              <div className="xl:col-span-3">
                <OpenOrders
                  orders={myOrders || []}
                  exchangeAddress={exchangeAddress}
                  onRefresh={refetchOpenOrders}
                />
              </div>
            )}
            <div className={
              hasOrders
                ? (factionData ? 'xl:col-span-4' : 'xl:col-span-7')
                : (factionData ? 'xl:col-span-7' : 'xl:col-span-10')
            }>
              <GiniDisplay seasonAddress={seasonAddress} />
            </div>
            {factionData && (
              <div className="xl:col-span-3">
                <FactionChat
                  seasonSlug={seasonSlug}
                  isCapitalist={factionData.isCapitalist}
                />
              </div>
            )}
          </div>

          {/* Activity feed | season details */}
          <div className="grid grid-cols-1 xl:grid-cols-10 gap-6">
            <div className="xl:col-span-3">
              <TradingActivityFeed seasonAddress={seasonAddress} />
            </div>
            <div className="xl:col-span-7">
              <SeasonDetails
                tradingStart={tradingStart}
                seasonEnd={seasonEnd}
                M_dynamic={M_dynamic}
                config={config}
                seasonAddress={seasonAddress}
                xlWeighted
              />
            </div>
          </div>

          {/* Faction war room */}
          {factionData && (
            <div className="h-150">
              <FactionDiscussionBoard
                seasonSlug={seasonSlug}
                isCapitalist={factionData.isCapitalist}
              />
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════
          PAYOUT / CONCLUDED LAYOUT
          ═══════════════════════════════════════════ */}
      {isPayout && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <PayoutMask seasonAddress={seasonAddress} />
            <div className="lg:col-span-2 flex flex-col gap-6">
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
          />
        </>
      )}

      {/* Footer */}
      <div className="pt-4 flex flex-col items-center gap-2">
        <p className="font-mono text-[10px] text-text2 uppercase tracking-[0.12em] m-0">
          Protocol Reference
        </p>
        <code className="font-mono text-[11px] bg-card2 px-3 py-1 rounded-full text-text2 border border-border">
          {metadata?.address}
        </code>
      </div>
    </main>
  );
}
