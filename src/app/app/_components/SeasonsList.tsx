'use client';

import React, { useState, useMemo } from 'react';
import { useChainId, usePublicClient, useReadContract } from 'wagmi'; 
import { Address, getAddress } from 'viem';
import { base, baseSepolia, foundry } from 'wagmi/chains';
import { useQuery } from '@tanstack/react-query';
import coreDeployment from '@/deployments/core.json';
import { useSeasonGini } from '@/hooks/useSeasonGini';
import Link from 'next/link';
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';
import { VictoryProgressBar } from './VictoryProgressBar';

// --- ABI Definitions ---
const GAME_CONTROLLER_SEASONS_ABI = [
  {
    "type": "function",
    "name": "seasons",
    "inputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "outputs": [
      { "name": "season", "type": "address" },
      { "name": "auction", "type": "address" },
      { "name": "exchange", "type": "address" },
      { "name": "fim", "type": "address" }
    ],
    "stateMutability": "view"
  },
] as const;

const GAME_SEASON_FULL_ABI = GameSeasonAbi as any; 

// --- Types ---
type SeasonRegistry = {
    id: number;
  season: Address;
  phase: string;
  config: {
    createdAt: number;
    auctionDuration: number;
    gameDuration: number;
    victoryThresholdBps: number;
    baseBeta: number;
    buybackBps: number;
    liquidityBps: number;
    reinvestBps: number;
    daoBps: number;
  };
  auctionStartTime: number; 
  tradingStartTime: number;
  seasonEndTime: number;
};

// --- Helpers ---
const getControllerAddress = (chainId: number): Address | undefined => {
  const chainNameMap: { [key: number]: string } = {
    [foundry.id]: 'Controller',
    [baseSepolia.id]: 'Controller',
    [base.id]: 'Controller',
  };
  const chainName = chainNameMap[chainId];
  if (!chainName) return undefined;
  const controllerAddress = (coreDeployment as any)[chainName] as Address | undefined;
  return controllerAddress ? getAddress(controllerAddress) : undefined;
};

// Adjusted to 24-hour format
const formatDate = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false // Forces 24-hour format
    });
};

// ============================================================================
// SUB-COMPONENT: SEASON CARD
// ============================================================================
function SeasonCard({ season, totalCount, index }: { season: SeasonRegistry, totalCount: number, index: number }) {
    
    // 1. Fetch Live Data
    const { data: giniData } = useSeasonGini(season.season);
    
    const { data: gInitialRaw } = useReadContract({
        address: season.season,
        abi: GameSeasonAbi as any,
        functionName: 'g_initial',
        query: { enabled: season.phase === 'TRADING' || season.phase === 'PAYOUT', staleTime: Infinity }
    });

    const seasonNumber = season.id + 1;
    const slug = `season_${seasonNumber}`;

    // 2. Math & Logic (Mirrors GiniDashboard)
    const { 
        gCurrent, 
        progressPercent, 
        winningSide,
        isVictoryPending 
    } = useMemo(() => {
        if (!season.config) return { gCurrent: 0, progressPercent: 0, winningSide: 'none', isVictoryPending: false };

        const rawGini = giniData?.gini || 0;
        const playerCount = giniData?.playerCount || 0;
        
        const isAuction = season.phase === 'AUCTION' || season.phase === 'BOOTSTRAP';
        const gCurrVal = (isAuction && playerCount === 0) ? 5000 : rawGini;
        
        const rawGInit = gInitialRaw ? Number(gInitialRaw) : 0;
        const gInitVal = isAuction ? gCurrVal : rawGInit;

        const gI_Norm = gInitVal / 10000;
        const V = (season.config.victoryThresholdBps || 2500) / 10000;
        const rawBeta = (season.config.baseBeta || 14000) / 10000;
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

        const victoryPending = (season.phase === 'TRADING') && (gCurrVal >= capTarget || gCurrVal <= socTarget);

        return { 
            gCurrent: gCurrVal, 
            progressPercent: Math.min(Math.max(prog, 0), 100),
            winningSide: side,
            isVictoryPending: victoryPending
        };
    }, [giniData, season, gInitialRaw]);

    // 3. UI/Style Definitions
    const isBootstrap = season.phase === 'BOOTSTRAP';
    const isPayout = season.phase === 'PAYOUT' || season.phase === 'ENDED';
    const isTrading = season.phase === 'TRADING';

    const phaseColor = isBootstrap ? 'text-danger' : isPayout ? 'text-info' : 'text-success';
    const phaseBg = isBootstrap ? 'bg-danger' : isPayout ? 'bg-info' : 'bg-success';
    
    const statusText = isBootstrap ? 'On Hold' : isPayout ? 'Concluded' : (isTrading ? 'Ends' : 'Starts');
    const statusTime = isBootstrap ? formatDate(season.tradingStartTime) : (isTrading ? formatDate(season.seasonEndTime) : formatDate(season.tradingStartTime));

    const economicItems = [
        { label: "Buyback", value: season.config.buybackBps },
        { label: "Liquidity", value: season.config.liquidityBps },
        { label: "Prize Pool Bonus", value: season.config.reinvestBps },
        { label: "DAO Treasury", value: season.config.daoBps },
    ].filter(item => item.value > 0);

    if (!season.config) return null;

    return (
        <div className="flex flex-col gap-4 w-full mx-auto"> 
      <Link href={`/${slug}`} className="block group transition-all duration-300 hover:scale-[1.01]">
        <div className="bg-card rounded-xl p-5 shadow-sm border border-transparent group-hover:border-border/30 transition-colors">
            
            {/* --- HEADER (Flex Layout for Max Spread, Left Justified Content) --- */}
            <div className="flex justify-between items-center gap-4 mb-4 border-b border-border/40 pb-4">
                
                {/* 1. Title & Phase (Left-most, explicit width to manage shrinkage) */}
                <div className="flex flex-col items-start gap-1 w-1/4 min-w-min">
                    <span className="font-bold text-lg font-display uppercase tracking-tight text-text text-left">
                        Season {seasonNumber}
                    </span>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-card2 rounded-full">
                        <div className={`w-1.5 h-1.5 rounded-full ${phaseBg} animate-pulse`} />
                        <span className={`text-[9px] font-black ${phaseColor} tracking-widest uppercase`}>
                            {season.phase}
                        </span>
                    </div>
                </div>

                {/* 2. Prize Pool (Left-aligned content) */}
                <div className="flex flex-col items-start text-left w-1/4">
                    <span className="h3-app mb-0.5">Prize Pool</span>
                    <span className="text-xl font-black text-primary tracking-tighter leading-none">
                        ${(giniData?.prizePool ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>

                {/* 3. Participants (Left-aligned content) */}
                <div className="flex flex-col items-start text-left w-1/4">
                    <span className="h3-app mb-0.5">Participants</span>
                    <span className="text-xl font-black text-text tracking-tighter leading-none">
                        {(giniData?.playerCount ?? 0).toLocaleString()}
                    </span>
                </div>

                {/* 4. Status/Time (Left-aligned content) */}
                <div className="flex flex-col items-start text-left w-1/4">
                    <span className="h3-app sm:mb-0.5 mb-1.5 ">
                        {isBootstrap ? 'STATUS' : (isTrading ? 'SEASON ENDS' : 'TRADING STARTS')}
                    </span>
                    <span className="sm:text-sm text-xs  font-bold text-text leading-tight">
                         {isBootstrap ? 'ON HOLD' : statusTime}
                    </span>
                </div>

            </div>

            {/* --- BODY (Now 4 Columns) --- */}
<div className="grid grid-cols-4 gap-6">
    
    {/* 1. GINI / PROGRESS (Column 1) */}
    <div className="flex flex-col justify-top gap-4 mr-10">
    <span className="h3-app">Victory Progress</span>
    <VictoryProgressBar 
        seasonAddress={season.season}
        gini={gCurrent}
        gInitial={gInitialRaw ? Number(gInitialRaw) : 5000}
        victoryThresholdBps={season.config.victoryThresholdBps}
        baseBeta={season.config.baseBeta}
        phase={season.phase}
    />
    {isVictoryPending && (
        <p className="text-[10px] font-bold text-yellow-500 mt-1 uppercase tracking-wide">
            Settlement Pending
        </p>
    )}
</div>

    {/* 2. FIXED POLICY (Column 2) */}
    <div className="flex flex-col gap-4 justify-center">
        {/* Comp. Multiplier */}
        <div className="flex flex-col items-start gap-1">
            <span className="text-[9px] text-text2 uppercase tracking-widest leading-tight">Compensation Multiplier</span>
            <span className="text-sm font-bold text-primary text-left">
                {(season.config.baseBeta / 10000 + Math.pow(1 - (gCurrent / 10000), 2)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}x
            </span>
        </div>

        {/* Victory Threshold */}
        <div className="flex flex-col items-start gap-1">
            <span className="text-[9px] text-text2 uppercase tracking-widest leading-tight">Victory Threshold</span>
            <span className="text-sm font-bold text-text text-left">
                {season.config.victoryThresholdBps / 100}%
            </span>
        </div>
    </div>

    {/* 3. DYNAMIC POLICY A (Column 3) */}
    <div className="flex flex-col gap-4 justify-center">
        {economicItems.slice(0, 2).map((item) => (
            <div key={item.label} className="flex flex-col items-start gap-1">
                <span className="text-[9px] text-text2 uppercase tracking-widest leading-tight">
                    {item.label}
                </span>
                <span className="text-sm font-bold text-text text-left">
                    {(item.value / 100)}%
                </span>
            </div>
        ))}
    </div>

    {/* 4. DYNAMIC POLICY B (Column 4) */}
    <div className="flex flex-col gap-4 justify-center">
        {economicItems.slice(2, 4).map((item) => (
            <div key={item.label} className="flex flex-col items-start gap-1">
                <span className="text-[9px] text-text2 uppercase tracking-widest leading-tight">
                    {item.label}
                </span>
                <span className="text-sm font-bold text-text text-left">
                    {(item.value / 100)}%
                </span>
            </div>
        ))}
    </div>

</div>
        </div>
      </Link>
        </div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export function SeasonsList() {
  const chainId = useChainId();
  const controllerAddress = getControllerAddress(chainId);
  const [showAll, setShowAll] = useState(false);
  const publicClient = usePublicClient(); 

  const { data: seasonsData, isLoading } = useQuery({
    queryKey: ['allSeasons_v2', chainId, controllerAddress],
    queryFn: async () => {
        if (!controllerAddress || !publicClient) return [];
        const allSeasons: SeasonRegistry[] = [];
        
        for (let i = 0; i < 50; i++) {
            try {
                const data = await publicClient.readContract({
                    address: controllerAddress,
                    abi: GAME_CONTROLLER_SEASONS_ABI,
                    functionName: 'seasons',
                    args: [BigInt(i)] as const,
                }) as [Address, Address, Address, Address];

                const cfg: any = await publicClient.readContract({ 
                    address: data[0], abi: GAME_SEASON_FULL_ABI, functionName: 'getConfig' 
                });

                const phase = await publicClient.readContract({ 
                    address: data[0], abi: GAME_SEASON_FULL_ABI, functionName: 'getPhase' 
                });

                const getVal = (key: string, idx: number) => cfg[key] !== undefined ? cfg[key] : cfg[idx];
                
                const cAt = Number(getVal('createdAt', 0));
                const aDu = Number(getVal('auctionDuration', 1));
                const gDu = Number(getVal('gameDuration', 2));
                
                const parsedConfig = {
                    createdAt: cAt,
                    auctionDuration: aDu,
                    gameDuration: gDu,
                    victoryThresholdBps: Number(getVal('victoryThresholdBps', 3)),
                    baseBeta: Number(getVal('beta', 4)),
                    // Add Policy BPS for list display
                    buybackBps: Number(getVal('buybackBps', 5) || 0),
                    liquidityBps: Number(getVal('liquidityBps', 6) || 0),
                    reinvestBps: Number(getVal('reinvestBps', 7) || 0),
                    daoBps: Number(getVal('daoBps', 8) || 0),
                };

                allSeasons.push({
                    id: i,
                    season: data[0], 
                    phase: phase as string, 
                    config: parsedConfig,
                    auctionStartTime: cAt,
                    tradingStartTime: cAt + aDu, 
                    seasonEndTime: cAt + aDu + gDu, 
                });
            } catch { break; }
        }
        return allSeasons;
    },
    enabled: !!controllerAddress && !!publicClient,
});

  if (isLoading) return (
    <div className="w-full max-w-5xl p-12 text-center">
        <span className="text-primary font-display uppercase tracking-widest animate-pulse">Scanning Seasons...</span>
    </div>
  );

  const display = [...(seasonsData || [])].reverse();
  
  const filtered = display.filter(s => showAll ? true : (s.phase !== 'PAYOUT' && s.phase !== 'ENDED'));

  return (
    <div className="w-full max-w-350 space-y-6">
      
      {/* List Header */}
      <div className="flex justify-between items-center px-2">
        <h2 className="text-xl font-bold font-display uppercase text-text">
            {showAll ? 'All Seasons' : 'Active Seasons'}
        </h2>
        
        <button onClick={() => setShowAll(!showAll)} className="btn-three py-2 px-4 text-sm">
          {showAll ? 'Show Active' : 'Show All'}
        </button>
      </div>

      {/* List */}
      <div className="space-y-4">
        {filtered.map((s) => (
            <SeasonCard 
                key={s.season} 
                season={s} 
                totalCount={display.length} 
                index={s.id} 
            />
        ))}
        {filtered.length === 0 && (
            <div className="p-8 text-center bg-card rounded-xl border-border text-text2 text-sm">
                No active seasons found.
            </div>
        )}
      </div>
    </div>
  );
}