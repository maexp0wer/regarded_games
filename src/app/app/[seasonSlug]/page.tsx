'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useReadContract } from 'wagmi';
import { useAccount } from 'wagmi';

// Hooks/Abis
import { useSeasonGini, useSeasonById } from '@/hooks/useSeasonGini';
import { Order } from '@/hooks/useOrderBook'; // Import Order type
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';

// PRESENTATIONAL COMPONENTS
import { SeasonHeader } from '../_components/SeasonHeader';
import { GiniDisplay } from '../_components/GiniDisplay';
import { SeasonDetails } from '../_components/SeasonDetails';
import { AuctionMask } from '../_components/AuctionMask';
import { AuctionActivityFeed } from '../_components/AuctionActivityFeed';
import { OrderBook } from '../_components/OrderBook';
import { TradingActivityFeed } from '../_components/TradingActivityFeed';
import { TradingMask } from '../_components/TradingMask';
import { OpenOrders } from '../_components/OpenOrders';
import { useOpenOrders } from '@/hooks/useOpenOrders';
import { PayoutMask } from '../_components/PayoutMask';

// ============================================================================
// PAGE COMPONENT: SeasonDetailPage
// ============================================================================
export default function SeasonDetailPage() {
  const { seasonSlug } = useParams() as { seasonSlug: string };
  
  // --- 1. Routing & Metadata ---
  const { data: metadata, isLoading: isMetaLoading } = useSeasonById(seasonSlug);
  const { address: userAddress } = useAccount();
  
  const seasonAddress = metadata?.address || '0x0';
  const auctionAddress = metadata?.auctionAddress || '0x0';
  const exchangeAddress = metadata?.exchangeAddress || '0x0';
  const fimAddress = metadata?.fimAddress || '0x0';

  // --- 2. TRADING STATE (Lifted from Dashboard) ---
  const [isBuy, setIsBuy] = useState(true);
  const [isMaker, setIsMaker] = useState(false); // Default to Taker
  const [targetAmount, setTargetAmount] = useState("");
  const [selectedOrders, setSelectedOrders] = useState<Order[]>([]);

  // --- 3. TRADING HANDLERS ---
  const handleSelectOrder = (order: Order) => {
    // Prevent duplicates
    if (!selectedOrders.find(o => o.id === order.id)) {
      setSelectedOrders(prev => [...prev, order]);
    }
  };

  const handleRemoveOrder = (id: string) => {
    setSelectedOrders(prev => prev.filter(o => o.id !== id));
  };

  const handleMoveOrder = (index: number, direction: -1 | 1) => {
    const newOrders = [...selectedOrders];
    // Boundary checks
    if (index + direction < 0 || index + direction >= newOrders.length) return;
    
    const temp = newOrders[index];
    newOrders[index] = newOrders[index + direction];
    newOrders[index + direction] = temp;
    setSelectedOrders(newOrders);
  };

  const handleReorderOrders = (newOrders: Order[]) => {
  setSelectedOrders(newOrders);
};

  // --- 4. Data Fetching (Gini & Config) ---
  const { data: giniData, isLoading: isGiniLoading } = useSeasonGini(seasonAddress);
  
  const { data: rawConfig, isLoading: isConfigLoading } = useReadContract({
    address: seasonAddress as `0x${string}`,
    abi: GameSeasonAbi as any,
    functionName: 'getConfig',
    query: { enabled: !!seasonAddress, staleTime: Infinity }
  });

  const { data: gInitialRaw, refetch: refetchGInitial } = useReadContract({
    address: seasonAddress as `0x${string}`,
    abi: GameSeasonAbi as any,
    functionName: 'g_initial',
    query: { enabled: !!seasonAddress } 
  });

  const { data: phase, isLoading: isPhaseLoading } = useReadContract({
    address: seasonAddress as `0x${string}`,
    abi: GameSeasonAbi as any,
    functionName: 'getPhase',
    query: { enabled: !!seasonAddress, refetchInterval: 3000 }
  });

  const { 
    data: myOrders, 
    refetch: refetchOpenOrders 
  } = useOpenOrders(seasonAddress, userAddress);

  const hasOrders = myOrders && myOrders.length > 0;

  // --- 5. Phase Change Effect ---
  useEffect(() => {
    if (phase === "TRADING") {
        refetchGInitial();
    }
  }, [phase, refetchGInitial]);


  // --- 6. Logic & Math (Gini Calculations) ---
  const { 
    config, 
    gCurrent, 
    gInitial, 
    capTargetBps, 
    socTargetBps, 
    M_dynamic,
    progressPercent,
    winningSide,
    isVictoryPending
  } = useMemo(() => {
    const safeDefaults = { config: null, gCurrent: 5000, gInitial: 5000, capTargetBps: 0, socTargetBps: 0, M_dynamic: 0, progressPercent: 0, winningSide: 'none' as 'soc' | 'cap' | 'none', isVictoryPending: false };
    if (!rawConfig) return safeDefaults;

    const currentPhase = phase as string;
    const isAuction = currentPhase === "AUCTION" || currentPhase === "BOOTSTRAP";
    const isTradingPhase = currentPhase === "TRADING";

    const r = rawConfig as any;
    const getVal = (key: string, index: number) => r[key] !== undefined ? r[key] : r[index];

    const cfg = {
      createdAt: Number(getVal('createdAt', 0)),
      auctionDuration: Number(getVal('auctionDuration', 1)),
      gameDuration: Number(getVal('gameDuration', 2)),
      victoryThresholdBps: Number(getVal('victoryThresholdBps', 3)),
      baseBeta: Number(getVal('beta', 4)), 
      buybackBps: Number(getVal('buybackBps', 5)),
      liquidityBps: Number(getVal('liquidityBps', 6)),
      reinvestBps: Number(getVal('reinvestBps', 7)),
      daoBps: Number(getVal('daoBps', 8)),
    };

    const rawGini = giniData?.gini || 0;
    const rawGInit = gInitialRaw ? Number(gInitialRaw) : 0;
    const playerCount = giniData?.playerCount || 0;
    
    let gCurrVal = 0;
    let gInitVal = 0;

    if (isAuction) {
        gCurrVal = playerCount === 0 ? 5000 : rawGini;
        gInitVal = gCurrVal; 
    } else {
        gInitVal = rawGInit;
        gCurrVal = rawGini;
    }

    const gI_Norm = gInitVal / 10000;
    const V = cfg.victoryThresholdBps / 10000;
    const rawBeta = cfg.baseBeta / 10000;
    const M = rawBeta + Math.pow(1 - gI_Norm, 2);

    const capTargetNorm = gI_Norm + (V * (1 - gI_Norm));
    const socTerm = M > 0 ? (V / M) : 0;
    const socTargetNorm = gI_Norm * (1 - socTerm);

    const capTarget = capTargetNorm * 10000;
    const socTarget = socTargetNorm * 10000;

    let prog = 0;
    let side: 'soc' | 'cap' | 'none' = 'none';

    if (!isAuction) {
        if (gCurrVal > gInitVal) {
            side = 'cap';
            const dist = capTarget - gInitVal;
            const covered = gCurrVal - gInitVal;
            prog = dist > 0 ? (covered / dist) * 100 : 0;
        } else if (gCurrVal < gInitVal) {
            side = 'soc';
            const dist = gInitVal - socTarget;
            const covered = gInitVal - gCurrVal;
            prog = dist > 0 ? (covered / dist) * 100 : 0;
        }
    }

    const victoryConditionMet = isTradingPhase && (gCurrVal >= capTarget || gCurrVal <= socTarget);

    return { 
        config: cfg, 
        gCurrent: gCurrVal, 
        gInitial: gInitVal,
        capTargetBps: capTarget, 
        socTargetBps: socTarget, 
        M_dynamic: M,
        progressPercent: Math.min(Math.max(prog, 0), 100),
        winningSide: side,
        isVictoryPending: victoryConditionMet
    };
  }, [giniData, rawConfig, gInitialRaw, phase]);

  // --- D. UI State ---
  const currentPhase = phase as string;
  const isAuctionOrBootstrap = currentPhase === "AUCTION" || currentPhase === "BOOTSTRAP";
  const isTrading = currentPhase === "TRADING";
  const isPayout = currentPhase === "PAYOUT";
  
  const tradingStart = (config?.createdAt || 0) + (config?.auctionDuration || 0);
  const seasonEnd = (config?.createdAt || 0) + (config?.auctionDuration || 0) + (config?.gameDuration || 0);

  const formattedName = seasonSlug?.replace(/_/g, " ") || 'Season Dashboard';

  // --- E. Loading & Error States ---
  if (isMetaLoading || isGiniLoading || isConfigLoading || isPhaseLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-primary animate-pulse font-display text-xl uppercase tracking-widest">
        Reading Ledger...
      </div>
    );
  }

  if (!metadata || !seasonAddress) return (
    <div className="min-h-screen p-24 text-text text-center">Blockchain Data Unavailable</div>
  );


  // --- F. Render (Conditional Layout) ---
  return (
    <main className="p-4 md:p-8 max-w-350 mx-auto space-y-6 animate-in fade-in duration-700">
      
      {/* Root Grid: 3 Columns on Large Screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ROW 1: HEADER & STATUS (Always 3 columns) */}
        <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-3 gap-6">
             <SeasonHeader 
                seasonName={formattedName}
                prizePool={giniData?.prizePool || 0}
                playerCount={giniData?.playerCount || 0}
                currentPhase={currentPhase}
                isBootstrap={isAuctionOrBootstrap} 
                isPayout={isPayout}
                isVictoryPending={isVictoryPending}
                tradingStart={tradingStart}
                seasonEnd={seasonEnd}
             />
        </div>

        {/* ========================================================= */}
        {/* AUCTION / BOOTSTRAP LAYOUT */}
        {/* ========================================================= */}
        {isAuctionOrBootstrap && (
          <>
            <div className="lg:col-span-1 h-full">
              <AuctionMask 
                seasonAddress={seasonAddress}
                auctionAddress={auctionAddress}
                fimAddress={fimAddress}
                currentPhase={currentPhase}
              />
            </div>

            <div className="lg:col-span-2 h-full">
              <GiniDisplay 
                gCurrent={gCurrent} 
                gInitial={gInitial}
                socTargetBps={socTargetBps} 
                capTargetBps={capTargetBps} 
                winningSide={winningSide}
                progressPercent={progressPercent}
                currentPhase={currentPhase}
                isAuction={true}
                isBootstrap={isAuctionOrBootstrap}
              />
            </div>

            <div className="lg:col-span-1 h-full">
              <AuctionActivityFeed seasonAddress={seasonAddress} />
            </div>

            <div className="lg:col-span-2 h-full">
              <SeasonDetails 
                tradingStart={tradingStart}
                seasonEnd={seasonEnd}
                M_dynamic={M_dynamic}
                config={config}
              />
            </div>
          </>
        )}

       {/* ========================================================= */}
        {/* TRADING LAYOUT (Integrated Logic) */}
        {/* ========================================================= */}
        {isTrading && (
          <>
            {/* ROW 2 - TradingMask (1/3) + OrderBook (2/3) */}
            
            {/* 1/3 Width: TradingMask (With State Passed Down) */}
            <div className="lg:col-span-1 h-full"> 
              <TradingMask
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
              />
            </div>

            <div className="lg:col-span-2 h-full"> 
              <OrderBook
                seasonAddress={seasonAddress}
                isBuy={isBuy}
                isMaker={isMaker}
                onSelectOrder={handleSelectOrder}
              />
            </div>
            
            
            {/* ROW 3 - OpenOrders (1/3) + GiniDisplay (2/3) */}            
            
              {/* 1. Open Orders: Only render this div if orders exist */}
              {hasOrders && (
                <div className="lg:col-span-1 h-full">
                  <OpenOrders 
                    orders={myOrders || []}
                    exchangeAddress={exchangeAddress}
                    onRefresh={refetchOpenOrders} 
                  />
                </div>
              )}

              {/* 2. Gini Display: Change the width class based on hasOrders */}
              <div className={`h-full ${hasOrders ? "lg:col-span-2" : "lg:col-span-3"}`}>
                <GiniDisplay 
                  gCurrent={gCurrent} 
                  gInitial={gInitial}
                  socTargetBps={socTargetBps} 
                  capTargetBps={capTargetBps} 
                  winningSide={winningSide}
                  progressPercent={progressPercent}
                  currentPhase={currentPhase}
                  isAuction={false}
                  isBootstrap={false}
                />
              </div>
            
            
            {/* ROW 4 - TradingActivityFeed (1/3) + SeasonDetails (2/3) */}
            
            <div className="lg:col-span-1 h-full"> 
              <TradingActivityFeed seasonAddress={seasonAddress}/>
            </div>

            <div className="lg:col-span-2 h-full"> 
              <SeasonDetails 
                tradingStart={tradingStart}
                seasonEnd={seasonEnd}
                M_dynamic={M_dynamic}
                config={config}
              />
            </div>
          </>
        )}

        {/* ========================================================= */}
{/* PAYOUT / CONCLUDED LAYOUT */}
{/* ========================================================= */}
{isPayout && (
    <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT: REDEEM MASK */}
        <div className="lg:col-span-1 h-full">
            <PayoutMask seasonAddress={seasonAddress} />
        </div>

        {/* CENTER: RESULTS VISUALIZATION */}
        <div className="lg:col-span-2 h-full">
            <GiniDisplay 
                gCurrent={gCurrent} 
                gInitial={gInitial} 
                socTargetBps={socTargetBps} 
                capTargetBps={capTargetBps} 
                winningSide={winningSide} 
                progressPercent={progressPercent} 
                currentPhase={currentPhase} 
                isAuction={false} 
                isBootstrap={false}
            />
        </div>

        {/* BOTTOM: FINAL MANIFEST (Optional, reusing existing component) */}
        <div className="lg:col-span-3">
             <SeasonDetails 
                tradingStart={tradingStart} 
                seasonEnd={seasonEnd} 
                M_dynamic={M_dynamic} 
                config={config} 
             />
        </div>
    </div>
)}

      </div>

      {/* Footer Reference */}
      <div className="pt-8 flex flex-col items-center gap-2">
        <p className="text-[9px] font-mono text-text2 uppercase tracking-widest">Protocol Reference</p>
        <code className="text-[10px] bg-card2 px-3 py-1 rounded-full text-text2 font-mono">
          {metadata?.address}
        </code>
      </div>
    </main>
  );
}