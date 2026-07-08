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
import { useBatchPlayerClass } from '@/hooks/useBatchPlayerClass';
import { useSeasonPlayers } from '@/hooks/useSeasonPlayers';
import { useSeasonChart } from '@/hooks/useSeasonChart';

// Phase layouts
import { AuctionPhaseLayout } from '../_components/phases/AuctionPhaseLayout';
import { TradingPhaseLayout } from '../_components/phases/TradingPhaseLayout';
import { PayoutPhaseLayout } from '../_components/phases/PayoutPhaseLayout';

export default function SeasonDetailPage() {
  const { seasonSlug } = useParams() as { seasonSlug: string };

  // 1. Routing & metadata
  const { data: metadata, isLoading: isMetaLoading } = useSeasonById(seasonSlug);
  const { address: userAddress } = useAccount();

  const seasonAddress   = metadata?.address         as `0x${string}` | undefined;
  const auctionAddress  = metadata?.auctionAddress  as `0x${string}` | undefined;
  const exchangeAddress = metadata?.exchangeAddress as `0x${string}` | undefined;
  const fimAddress      = metadata?.fimAddress      as `0x${string}` | undefined;

  // 2. Trading state (lifted — shared by TradingMask + TradingPanelMenu)
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
  const { isLoading: isGiniLoading } = useSeasonGini(seasonAddress);

  const {
    currentPhase,
    isAuctionOrBootstrap,
    isTrading,
    isPostTrading,
    tradingStart,
    seasonEnd,
    config,
  } = phase;

  const queryClient = useQueryClient();
  const prevPhaseRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevPhaseRef.current !== null && currentPhase !== null && prevPhaseRef.current !== currentPhase) {
      queryClient.invalidateQueries();
    }
    if (currentPhase !== null) prevPhaseRef.current = currentPhase;
  }, [currentPhase, queryClient]);

  const { M_dynamic, effectiveVictoryPending } = victory;

  // Clear the order queue when settlement begins so stale orders don't linger
  // behind the "Trading is halted" banner.
  useEffect(() => {
    if (effectiveVictoryPending) {
      setSelectedAsks([]);
      setSelectedBids([]);
    }
  }, [effectiveVictoryPending]);

  const { data: classMap } = useBatchPlayerClass(
    seasonAddress,
    userAddress ? [userAddress] : [],
    exchangeAddress
  );
  const factionData = userAddress ? classMap?.[userAddress.toLowerCase()] : undefined;

  // Participation: a connected wallet that holds a season stats row interacted with
  // the season. Hide the payout panel for connected non-participants; keep it for a
  // disconnected wallet so the connect gate still shows (participation unknown).
  const { data: seasonPlayers } = useSeasonPlayers(seasonAddress);
  const hasParticipated =
    !!userAddress &&
    (seasonPlayers?.some(
      (p) => p.playerAddress.toLowerCase() === userAddress.toLowerCase(),
    ) ?? false);
  const showPayout = !userAddress || hasParticipated;

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
    <main className="h-full overflow-hidden animate-in fade-in duration-700">
      {isAuctionOrBootstrap && (
        <AuctionPhaseLayout
          seasonAddress={seasonAddress}
          auctionAddress={auctionAddress}
          fimAddress={fimAddress}
          exchangeAddress={exchangeAddress}
          seasonSlug={seasonSlug}
          formattedName={formattedName}
          currentPhase={currentPhase}
          tradingStart={tradingStart}
          seasonEnd={seasonEnd}
          config={config}
          M_dynamic={M_dynamic}
        />
      )}

      {isTrading && (
        <TradingPhaseLayout
          seasonAddress={seasonAddress}
          auctionAddress={auctionAddress}
          exchangeAddress={exchangeAddress}
          fimAddress={fimAddress}
          seasonSlug={seasonSlug}
          formattedName={formattedName}
          userAddress={userAddress}
          tradingStart={tradingStart}
          seasonEnd={seasonEnd}
          config={config}
          M_dynamic={M_dynamic}
          effectiveVictoryPending={effectiveVictoryPending}
          factionData={factionData}
          showBoard={showBoard}
          onToggleBoard={() => setShowBoard((v) => !v)}
          chart={chart}
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
          onSelectOrder={handleSelectOrder}
          onRemoveOrder={handleRemoveOrder}
          onReorderAsks={handleReorderAsks}
          onReorderBids={handleReorderBids}
          openOrderBookRef={openOrderBookRef}
        />
      )}

      {/* SETTLING, TRIAGE, INVESTIGATION and PAYOUT all share the end-of-season
          layout — the PayoutMask inside swaps its action card per phase. Before
          the two-stage review (ADR-0008) this branch was PAYOUT-only and the
          in-between states (minutes back then, now up to weeks) rendered blank. */}
      {isPostTrading && (
        <PayoutPhaseLayout
          seasonAddress={seasonAddress}
          auctionAddress={auctionAddress}
          fimAddress={fimAddress}
          exchangeAddress={exchangeAddress}
          userAddress={userAddress}
          formattedName={formattedName}
          showPayout={showPayout}
          tradingStart={tradingStart}
          seasonEnd={seasonEnd}
          config={config}
          M_dynamic={M_dynamic}
        />
      )}
    </main>
  );
}
