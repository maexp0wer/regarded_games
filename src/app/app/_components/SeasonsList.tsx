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
    const isAuction = season.phase === 'AUCTION';

    const phaseLabel = (isBootstrap || isVictoryPending) ? 'On Hold' : isPayout ? 'Payout' : season.phase.charAt(0) + season.phase.slice(1).toLowerCase();
    const subPhaseLabel = isBootstrap ? 'Bootstrap' : isVictoryPending ? 'Settlement' : null;
    const phaseColor = (isBootstrap || isVictoryPending) ? 'var(--color-danger)' : isAuction ? 'var(--color-gold)' : isPayout ? 'var(--color-blue)' : 'var(--color-green)';
    const phaseDotGlow = (isBootstrap || isVictoryPending) ? '0 0 8px var(--color-danger)' : isAuction ? '0 0 8px var(--color-gold)' : isPayout ? '0 0 8px var(--color-blue)' : '0 0 8px var(--color-green)';

    const showTimeStat = isTrading || isBootstrap || isAuction;
    const statusLabel = isTrading ? 'Ends' : 'Trading Starts';
    const statusTime = (isVictoryPending || isBootstrap) ? 'SHORTLY' : isTrading ? formatDate(season.seasonEndTime) : formatDate(season.tradingStartTime);

    if (!season.config) return null;

    const num = String(seasonNumber).padStart(2, '0');

    return (
        <Link href={`/${slug}`} className="block group">
          <div
            className="card-app transition-all group-hover:border-border-bright"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-start gap-6">
              {/* Left column: big season number + pills (desktop) */}
              <div className="shrink-0 hidden sm:flex sm:flex-col sm:items-start sm:gap-2">
                <p
                  className="font-display font-extrabold leading-none tracking-[-0.04em]"
                  style={{ fontSize: 'clamp(48px, 6vw, 72px)', color: 'var(--color-text)' }}
                >
                  S<em className="not-italic font-medium" style={{ color: 'var(--color-muted2)', fontVariantNumeric: 'tabular-nums' }}>{num}</em>
                </p>
                <div className="flex flex-col gap-1.5">
                  <div
                    className="pill border"
                    style={{ color: phaseColor, borderColor: phaseColor + '33', background: phaseColor + '10' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: phaseColor, boxShadow: phaseDotGlow }} />
                    {phaseLabel}
                  </div>
                  {subPhaseLabel && (
                    <div className="pill border" style={{ color: 'var(--color-gold)', borderColor: 'rgba(245,184,0,0.3)', background: 'rgba(245,184,0,0.08)' }}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--color-gold)', boxShadow: '0 0 8px var(--color-gold)' }} />
                      {subPhaseLabel}
                    </div>
                  )}
                </div>
              </div>

              {/* Main content */}
              <div className="flex-1 min-w-0 flex flex-col gap-4">
                {/* Mobile header: small season number + pills */}
                <div className="flex sm:hidden items-center flex-wrap gap-2">
                  <p
                    className="font-display font-extrabold leading-none tracking-[-0.04em]"
                    style={{ fontSize: '24px', color: 'var(--color-text)' }}
                  >
                    S<em className="not-italic font-medium" style={{ color: 'var(--color-muted2)', fontVariantNumeric: 'tabular-nums' }}>{num}</em>
                  </p>
                  <div
                    className="pill border"
                    style={{ color: phaseColor, borderColor: phaseColor + '33', background: phaseColor + '10' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: phaseColor, boxShadow: phaseDotGlow }} />
                    {phaseLabel}
                  </div>
                  {subPhaseLabel && (
                    <div className="pill border" style={{ color: 'var(--color-gold)', borderColor: 'rgba(245,184,0,0.3)', background: 'rgba(245,184,0,0.08)' }}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--color-gold)', boxShadow: '0 0 8px var(--color-gold)' }} />
                      {subPhaseLabel}
                    </div>
                  )}
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="section-label mb-1">Prize Pool</p>
                    <span className="font-mono font-bold text-[18px]" style={{ color: 'var(--color-gold)', fontVariantNumeric: 'tabular-nums' }}>
                      ${(giniData?.prizePool ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <p className="section-label mb-1">Participants</p>
                    <span className="font-mono font-bold text-[18px] text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {(giniData?.playerCount ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <p className="section-label mb-1">Multiplier</p>
                    <span className="font-mono font-bold text-[18px] text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {(season.config.baseBeta / 10000 + Math.pow(1 - (gCurrent / 10000), 2)).toFixed(2)}×
                    </span>
                  </div>
                  {showTimeStat && (
                    <div>
                      <p className="section-label mb-1">{statusLabel}</p>
                      <span className="font-mono font-semibold text-[13px] text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {statusTime}
                      </span>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div>
                  <p className="section-label mb-2">Victory Progress</p>
                  <VictoryProgressBar
                    seasonAddress={season.season}
                    gini={gCurrent}
                    gInitial={gInitialRaw ? Number(gInitialRaw) : 5000}
                    victoryThresholdBps={season.config.victoryThresholdBps}
                    baseBeta={season.config.baseBeta}
                    phase={season.phase}
                  />
                </div>
              </div>

              {/* Arrow */}
              <svg
                className="w-5 h-5 shrink-0 self-center transition-transform group-hover:translate-x-1"
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
                style={{ color: 'var(--color-text2)', opacity: 0.4 }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>
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
    <div className="w-full p-12 text-center">
      <span className="section-label animate-pulse">Scanning Seasons…</span>
    </div>
  );

  const display = [...(seasonsData || [])].reverse();
  const filtered = display.filter(s => showAll ? true : (s.phase !== 'PAYOUT' && s.phase !== 'ENDED'));

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display font-extrabold text-[28px] tracking-[-0.02em] text-text">
          {showAll ? 'All Seasons' : 'Active Seasons'}
        </h2>
        <button
          onClick={() => setShowAll(!showAll)}
          className="btn-secondary px-4 py-2 text-[11px]"
        >
          {showAll ? 'Show Active' : 'Show All'}
        </button>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-4">
        {filtered.map((s) => (
          <SeasonCard key={s.season} season={s} totalCount={display.length} index={s.id} />
        ))}
        {filtered.length === 0 && (
          <div
            className="card-app text-center py-16"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <p className="section-label opacity-40">No active seasons found</p>
          </div>
        )}
      </div>
    </div>
  );
}