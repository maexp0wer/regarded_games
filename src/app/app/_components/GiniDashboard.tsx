'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { useSeasonGini } from "@/hooks/useSeasonGini";
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';

// Icons
import Ritardo from '@/components/icons/Ritardo.svg';
import Carlo from '@/components/icons/Carlo.svg';

// ============================================================================
// 1. HELPER: COUNTDOWN HOOK
// ============================================================================
function useCountdown(targetTimestamp: number) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const update = () => {
      const now = Math.floor(Date.now() / 1000);
      if (!targetTimestamp || targetTimestamp <= now) {
        setTimeLeft("Finished");
        return;
      }
      const diff = targetTimestamp - now;
      const d = Math.floor(diff / 86400);
      const h = Math.floor((diff % 86400) / 3600);
      const m = Math.floor((diff % 3600) / 60);
      setTimeLeft(`${d}d ${h}h ${m}m`);
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [targetTimestamp]);

  return timeLeft;
}

// ============================================================================
// 2. SUB-COMPONENT: AUCTION GAUGE (0-100%)
// ============================================================================
function AuctionGauge({ gCurrent, socTarget, capTarget }: { gCurrent: number, socTarget: number, capTarget: number }) {
  const gNorm = gCurrent / 10000;
  
  return (
    <div className="relative w-full h-2 bg-card2 rounded-full">
      
      {/* --- ICONS (TOP) --- */}
      <div className="absolute bottom-4 -translate-x-1/2 flex flex-col items-center z-10" style={{ left: `${(socTarget / 10000) * 100}%` }}>
        <Carlo className="w-14 h-auto opacity-90" viewBox="0 0 600 800"/>
      </div>
      <div className="absolute bottom-4 -translate-x-1/2 flex flex-col items-center z-10" style={{ left: `${(capTarget / 10000) * 100}%` }}>
        <Ritardo className="w-14 h-auto opacity-90" viewBox="0 0 600 800"/>
      </div>

      {/* --- TARGETS (BOTTOM - SHORT LINES) --- */}
      <div className="absolute top-2 -translate-x-1/2 flex flex-col items-center z-10" style={{ left: `${(socTarget / 10000) * 100}%` }}>
        {/* Adjusted: h-4 -> h-3 */}
        <div className="w-0.5 h-3 bg-danger/20 mb-1"></div>
        <span className="text-lg font-black text-danger font-mono leading-none">{socTarget.toFixed(0)}</span>
        <span className="text-[9px] uppercase font-bold text-danger/50 tracking-widest mt-0.5">Target</span>
      </div>

      <div className="absolute top-2 -translate-x-1/2 flex flex-col items-center z-10" style={{ left: `${(capTarget / 10000) * 100}%` }}>
        {/* Adjusted: h-4 -> h-3 */}
        <div className="w-0.5 h-3 bg-info/20 mb-1"></div>
        <span className="text-lg font-black text-info font-mono leading-none">{capTarget.toFixed(0)}</span>
        <span className="text-[9px] uppercase font-bold text-info/50 tracking-widest mt-0.5">Target</span>
      </div>

      {/* --- CURRENT GINI (BOTTOM - LONG LINE) --- */}
      <div 
        className="absolute top-2 -translate-x-1/2 flex flex-col items-center transition-all duration-700 ease-out z-40"
        style={{ left: `${gNorm * 100}%` }}
      >
        {/* Adjusted: h-12 -> h-16 */}
        <div className="w-0.5 h-16 bg-primary mb-1"></div>
        <div className="bg-card px- py-1 rounded-lg flex flex-col items-center">
            <span className="text-3xl font-black font-mono leading-none tracking-tighter text-primary">
                {gCurrent.toLocaleString()}
            </span>
            <span className="text-[9px] font-bold text-text2 uppercase tracking-widest mt-0.5 whitespace-nowrap">
                Current
            </span>
        </div>
      </div>

      {/* Dots */}
      <div className="absolute inset-0 flex items-center">
        <div className="absolute w-3 h-3 rounded-full z-20 -translate-x-1/2 shadow-lg transition-all duration-700 bg-primary" style={{ left: `${gNorm * 100}%` }} />
        <div className="absolute w-2 h-2 bg-danger rounded-full z-20 -translate-x-1/2" style={{ left: `${(socTarget / 10000) * 100}%` }} />
        <div className="absolute w-2 h-2 bg-info rounded-full z-20 -translate-x-1/2" style={{ left: `${(capTarget / 10000) * 100}%` }} />
      </div>
    </div>
  );
}


// ============================================================================
// 3. SUB-COMPONENT: TRADING / PAYOUT GAUGE (Zoomed)
// ============================================================================
function TradingGauge({ gCurrent, gInitial, socTarget, capTarget, winningSide, progress, phase }: any) {
  
  // Dynamic Scale
  const viewMin = Math.max(0, socTarget - 500);
  const viewMax = Math.min(10000, capTarget + 500);
  const viewSpan = viewMax - viewMin;

  const getPosition = (bps: number) => {
    if (viewSpan <= 0) return 50;
    const pct = ((bps - viewMin) / viewSpan) * 100;
    return Math.min(Math.max(pct, 0), 100);
  };

  const isFinal = phase === "PAYOUT";

  return (
    <>
      <div className="absolute top-6 left-6 right-6 flex justify-between items-start">
        <h2 className="text-xs font-bold uppercase text-text2 tracking-widest">
           {isFinal ? "Final Gini Position" : "Live Gini Position"}
        </h2>
        <div className="text-right">
            <span className="text-xs uppercase text-text2 font-bold block">Start Line (Initial) {gInitial.toLocaleString()} BPS</span>
        </div>
      </div>

      <div className="relative w-full h-2 bg-card2 rounded-full my-16">
        
        {/* Initial Marker (Track Tick) */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-text2/30 rounded-full z-10 -translate-x-1/2 border-2 border-card"
          style={{ left: `${getPosition(gInitial)}%` }}
        />

        {/* --- ICONS (TOP) --- */}
        <div className="absolute bottom-4 -translate-x-1/2 flex flex-col items-center z-10" style={{ left: `${getPosition(socTarget)}%` }}>
           <Carlo className="w-14 h-auto opacity-90" viewBox="0 0 600 800"/>
        </div>
        <div className="absolute bottom-4 -translate-x-1/2 flex flex-col items-center z-10" style={{ left: `${getPosition(capTarget)}%` }}>
           <Ritardo className="w-14 h-auto opacity-90" viewBox="0 0 600 800"/>
        </div>

        {/* --- TARGETS (BOTTOM - SHORT LINES) --- */}
        <div className="absolute top-2 -translate-x-1/2 flex flex-col items-center z-10" style={{ left: `${getPosition(socTarget)}%` }}>
            {/* Adjusted: h-4 -> h-3 */}
            <div className="w-0.5 h-3 bg-danger/20 mb-1"></div>
            <span className="text-lg font-black text-danger font-mono leading-none">{socTarget.toFixed(0)}</span>
            
            <div className="flex flex-col items-center gap-1 mt-0.5">
                <span className="text-[9px] uppercase font-bold text-danger/50 tracking-widest">Target</span>
                {winningSide === 'soc' && (
                    <span className="text-[9px] font-black text-white bg-danger px-1.5 py-0.5 rounded animate-pulse whitespace-nowrap shadow-sm">
                        {progress.toFixed(1)}% Progress
                    </span>
                )}
            </div>
        </div>

        <div className="absolute top-2 -translate-x-1/2 flex flex-col items-center z-10" style={{ left: `${getPosition(capTarget)}%` }}>
            {/* Adjusted: h-4 -> h-3 */}
            <div className="w-0.5 h-3 bg-info/20 mb-1"></div>
            <span className="text-lg font-black text-info font-mono leading-none">{capTarget.toFixed(0)}</span>
            
            <div className="flex flex-col items-center gap-1 mt-0.5">
                <span className="text-[9px] uppercase font-bold text-info/50 tracking-widest">Target</span>
                {winningSide === 'cap' && (
                    <span className="text-[9px] font-black text-white bg-info px-1.5 py-0.5 rounded animate-pulse whitespace-nowrap shadow-sm">
                        {progress.toFixed(1)}% Progress
                    </span>
                )}
            </div>
        </div>

        {/* --- CURRENT GINI (BOTTOM - LONG LINE) --- */}
        <div 
          className="absolute top-2 -translate-x-1/2 flex flex-col items-center transition-all duration-700 ease-out z-40"
          style={{ left: `${getPosition(gCurrent)}%` }}
        >
          {/* Adjusted: h-12 -> h-16 */}
          <div className="w-0.5 h-18 bg-primary mb-2"></div>
          
          <div className="bg-card px-2 py-1 rounded-lg flex flex-col items-center">
              <span className="text-3xl font-black font-mono leading-none tracking-tighter text-primary">
                  {gCurrent.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-text2 uppercase tracking-widest mt-0.5 whitespace-nowrap">
                  {isFinal ? "Final" : "Current"}
              </span>
          </div>
        </div>

        {/* Dots */}
        <div className="absolute inset-0 flex items-center">
            <div className="absolute w-3 h-3 rounded-full z-20 -translate-x-1/2 shadow-lg transition-all duration-700 bg-primary" style={{ left: `${getPosition(gCurrent)}%` }} />
            <div className="absolute w-2 h-2 bg-danger rounded-full z-20 -translate-x-1/2" style={{ left: `${getPosition(socTarget)}%` }} />
            <div className="absolute w-2 h-2 bg-info rounded-full z-20 -translate-x-1/2" style={{ left: `${getPosition(capTarget)}%` }} />
        </div>
      </div>
    </>
  );
}

// ============================================================================
// 4. MAIN PARENT COMPONENT
// ============================================================================
export function GiniDashboard({ seasonAddress, seasonName }: { seasonAddress: string, seasonName: string }) {
  
  // --- A. Data Fetching ---
  const { data: giniData, isLoading: isGiniLoading } = useSeasonGini(seasonAddress);
  
  const { data: rawConfig, isLoading: isConfigLoading } = useReadContract({
    address: seasonAddress as `0x${string}`,
    abi: GameSeasonAbi as any,
    functionName: 'getConfig',
    query: { enabled: !!seasonAddress, staleTime: Infinity }
  });

  // FIX: Destructure 'refetch' so we can force update when phase changes
  const { data: gInitialRaw, refetch: refetchGInitial } = useReadContract({
    address: seasonAddress as `0x${string}`,
    abi: GameSeasonAbi as any,
    functionName: 'g_initial',
    // Removed staleTime: Infinity to allow refetching, or keep it but rely on manual refetch
    query: { enabled: !!seasonAddress } 
  });

  // AUTO-REFRESH: Phase updates automatically every 3 seconds
  const { data: phase } = useReadContract({
    address: seasonAddress as `0x${string}`,
    abi: GameSeasonAbi as any,
    functionName: 'getPhase',
    query: { enabled: !!seasonAddress, refetchInterval: 3000 }
  });

  // --- B. Phase Change Effect ---
  // If phase becomes TRADING, we must fetch g_initial because it was 0 during auction
  useEffect(() => {
    if (phase === "TRADING") {
        refetchGInitial();
    }
  }, [phase, refetchGInitial]);


  // --- C. Logic & Math ---
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
    const safeDefaults = { config: null, gCurrent: 5000, gInitial: 5000, capTargetBps: 0, socTargetBps: 0, M_dynamic: 0, progressPercent: 0, winningSide: 'none', isVictoryPending: false };
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
    let side = 'none';

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

    // CHECK VICTORY CONDITION: If Gini crosses target during trading
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
  const isAuction = currentPhase === "AUCTION";
  const isBootstrap = currentPhase === "BOOTSTRAP";
  const isPayout = currentPhase === "PAYOUT";
  
  // Timers
  const tradingStart = (config?.createdAt || 0) + (config?.auctionDuration || 0);
  const seasonEnd = (config?.createdAt || 0) + (config?.auctionDuration || 0) + (config?.gameDuration || 0);
  
  const targetTime = (isAuction || isBootstrap) ? tradingStart : seasonEnd;
  const countdownText = useCountdown(targetTime);
  const formatDate = (ts: number) => ts ? new Date(ts * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' }) : "TBD";

  const economicItems = config ? [
    { label: "Buyback", value: config.buybackBps },
    { label: "Liquidity", value: config.liquidityBps },
    { label: "Reinvestment", value: config.reinvestBps },
    { label: "DAO Treasury", value: config.daoBps },
  ].filter(item => item.value > 0) : [];


  // --- E. Loading ---
  if (isGiniLoading || isConfigLoading) {
    return (
      <div className="w-full py-24 bg-card rounded-3xl animate-pulse flex items-center justify-center">
        <span className="text-text2 uppercase font-black tracking-widest text-xs">Loading Season Data...</span>
      </div>
    );
  }

  // --- F. Render ---
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
      
      {/* 1. HEADER */}
      <div className="lg:col-span-2 bg-card rounded-2xl p-4 md:p-6 shadow-sm flex flex-row justify-between items-center gap-2 h-full">
        <div className="flex flex-col items-start gap-1 md:gap-2">
          <h1 className="text-lg md:text-3xl font-bold font-display uppercase tracking-tight text-text text-left">
            {seasonName}
          </h1>
          <div className="flex items-center gap-1.5 px-2 md:px-3 py-0.5 md:py-1 bg-card2 rounded-full">
            {/* Adjusted Colors: Danger (Bootstrap), Info (Payout), Success (Default) */}
            <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${isBootstrap ? 'bg-danger' : isPayout ? 'bg-info' : 'bg-success'} animate-pulse`} />
            <span className={`text-[9px] md:text-xs font-black ${isBootstrap ? 'text-danger' : isPayout ? 'text-info' : 'text-success'} tracking-widest uppercase`}>
              {currentPhase || "UNKNOWN"}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center">
            <span className="text-[8px] md:text-[10px] uppercase font-bold text-text2 tracking-widest block mb-0.5 md:mb-1">Total Prize Pool</span>
            <span className="text-lg md:text-3xl font-black text-primary tracking-tighter block leading-none">
                ${(giniData?.prizePool || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
        </div>

        <div className="flex flex-col items-end">
            <span className="text-[8px] md:text-[10px] uppercase font-bold text-text2 tracking-widest block mb-0.5 md:mb-1">Participants</span>
            <span className="text-lg md:text-3xl font-black text-text tracking-tighter block leading-none">
                {(giniData?.playerCount || 0).toLocaleString()}
            </span>
        </div>
      </div>

      {/* 2. STATUS BOX */}
      {/* Logic: Show Warning if Bootstrap OR Victory Pending. Else show Countdown or Concluded. */}
      <div className={`lg:col-span-1 bg-card rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center h-full min-h-25 ${(isBootstrap || isVictoryPending) ? 'border border-yellow-500/20 bg-yellow-500/5' : ''}`}>
        
        {/* Warning State */}
        {(isBootstrap || isVictoryPending) && (
          <div className="space-y-1">
             <div className="flex items-center justify-center gap-2 mb-1">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
               </svg>
               <span className="text-[10px] uppercase font-bold text-yellow-500 tracking-widest">
                  {isVictoryPending ? "Settlement Pending" : "Season On Hold"}
               </span>
             </div>
             <p className="text-xs text-text2 font-bold max-w-50 mx-auto leading-tight">
               {isVictoryPending ? "Victory condition met. Preparing for Payout Phase." : "Trading operations paused pending final configuration."}
             </p>
          </div>
        )}

        {/* Payout State */}
        {isPayout && (
          <div>
            <span className="text-[10px] uppercase font-bold text-text2 tracking-widest block mb-1">Status</span>
            <span className="text-3xl font-black text-text font-display tracking-tight block">
                Season Concluded
            </span>
          </div>
        )}

        {/* Standard Countdown State */}
        {(!isBootstrap && !isVictoryPending && !isPayout) && (
          <>
            <span className="text-[10px] uppercase font-bold text-text2 tracking-widest block mb-1">
                {isAuction ? "Trading Start In" : "Season Ends In"}
            </span>
            <span className="text-3xl font-black text-text font-display tracking-tight block">
                {countdownText}
            </span>
          </>
        )}
      </div>

      {/* 3. GAUGE */}
      {/* Height increased slightly to accommodate bottom markers */}
      <div className="lg:col-span-2 bg-card rounded-2xl p-8 relative overflow-hidden flex flex-col justify-center min-h-75 shadow-sm">
        {(isAuction || isBootstrap) ? (
            <>
                <h2 className="absolute top-6 left-6 text-xs font-bold uppercase text-text2 tracking-widest">
                  Live Gini
                </h2>
                <AuctionGauge 
                    gCurrent={gCurrent} 
                    socTarget={socTargetBps} 
                    capTarget={capTargetBps} 
                />
            </>
        ) : (
            <TradingGauge 
                gCurrent={gCurrent} 
                gInitial={gInitial} 
                socTarget={socTargetBps} 
                capTarget={capTargetBps} 
                winningSide={winningSide}
                progress={progressPercent}
                phase={currentPhase}
            />
        )}
      </div>

      {/* 4. INFO */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-card rounded-2xl p-6 shadow-sm space-y-3">
            <h3 className="text-[10px] font-black uppercase text-text2 tracking-widest border-b border-border/50 pb-2">Schedule</h3>
            <div className="flex justify-between text-xs">
              <span className="text-text2">Trading Start</span>
              <span className="font-bold text-text">{formatDate(tradingStart)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-text2">Season End</span>
              <span className="font-bold text-text">{formatDate(seasonEnd)}</span>
            </div>
        </div>

        <div className="bg-card rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-[10px] font-black uppercase text-text2 tracking-widest border-b border-border/50 pb-2">Policy</h3>
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-text2">Current Multiplier (M)</span>
                  <span className="text-lg font-bold text-primary">
                    {M_dynamic.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}x
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-text2">Victory Threshold</span>
                  <span className="text-sm font-bold text-text">{((config?.victoryThresholdBps || 0) / 100).toFixed(0)}%</span>
                </div>
                {economicItems.map((item) => (
                  <div key={item.label} className="flex justify-between items-center">
                      <span className="text-xs text-text2">{item.label}</span>
                      <span className="text-sm font-bold text-text">{(item.value / 100)}%</span>
                  </div>
                ))}
            </div>
        </div>

      </div>

    </div>
  );
}