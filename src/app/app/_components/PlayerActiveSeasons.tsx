'use client';

import React, { useMemo, useState } from 'react';
import { useChainId, usePublicClient, useReadContracts, useReadContract } from 'wagmi'; 
import { Address, formatUnits, erc20Abi } from 'viem';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

// Assets & Hooks
import coreDeployment from '@/deployments/core.json';
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';
import { useSeasonGini } from '@/hooks/useSeasonGini';
import { useBatchPlayerPercentiles } from '@/hooks/useBatchPlayerPercentiles';
import { usePayout } from '@/hooks/usePayout';

// Shared Components
import { PercentileCircle } from './PercentileCircle';
import { VictoryProgressBar } from './VictoryProgressBar';

const CONTROLLER_ABI = [
  {
    "type": "function",
    "name": "seasons",
    "inputs": [{ "name": "", "type": "uint256" }],
    "outputs": [
      { "name": "season", "type": "address" },
      { "name": "auction", "type": "address" },
      { "name": "exchange", "type": "address" },
      { "name": "fim", "type": "address" }
    ],
    "stateMutability": "view"
  },
] as const;

interface PlayerActiveSeasonsProps {
  playerAddress: string;
}

export function PlayerActiveSeasons({ playerAddress }: PlayerActiveSeasonsProps) {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const [showAll, setShowAll] = useState(false);

  const controllerAddress = useMemo(() => {
    const chainMap: Record<number, string> = { 8453: 'Controller', 84532: 'Controller', 31337: 'Controller' };
    return (coreDeployment as any)[chainMap[chainId] || 'Controller'] as Address;
  }, [chainId]);

  // 1. SCAN REGISTRY
  const { data: registry, isLoading: isScanning } = useQuery({
    queryKey: ['player-dashboard-full-registry', chainId, controllerAddress],
    queryFn: async () => {
      if (!controllerAddress || !publicClient) return [];
      const list = [];
      for (let i = 0; i < 30; i++) {
        try {
          const data = await publicClient.readContract({
            address: controllerAddress, abi: CONTROLLER_ABI, functionName: 'seasons', args: [BigInt(i)],
          });
          const [cfg, phase]: [any, any] = await Promise.all([
            publicClient.readContract({ address: data[0], abi: GameSeasonAbi as any, functionName: 'getConfig' }),
            publicClient.readContract({ address: data[0], abi: GameSeasonAbi as any, functionName: 'getPhase' })
          ]);
          const getVal = (key: string, idx: number) => cfg[key] !== undefined ? cfg[key] : cfg[idx];
          list.push({ 
            id: i + 1, 
            season: data[0], 
            fim: data[3], 
            phase: phase as string,
            config: {
              victoryThresholdBps: Number(getVal('victoryThresholdBps', 3)),
              baseBeta: Number(getVal('beta', 4) || getVal('baseBeta', 4)),
            }
          });
        } catch { break; }
      }
      return list;
    },
    enabled: !!controllerAddress && !!publicClient
  });

  // 2. CHECK BALANCES
  const { data: balanceResults, isLoading: isCheckingBalances } = useReadContracts({
    contracts: (registry || []).map(s => ({
      address: s.fim as Address,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [playerAddress as Address],
    })),
    query: { enabled: !!registry && registry.length > 0 }
  });

  const activePositions = useMemo(() => {
    if (!registry || !balanceResults) return [];
    
    const mapped = registry.map((s, idx) => ({
      ...s,
      balance: (balanceResults[idx]?.result as bigint) || 0n
    })).filter(pos => pos.balance > 0n);

    // Apply Filter logic: Default to hiding concluded seasons
    if (showAll) return mapped;
    return mapped.filter(s => s.phase !== 'PAYOUT' && s.phase !== 'ENDED');
  }, [registry, balanceResults, showAll]);

  if (isScanning || isCheckingBalances) return (
    <div className="p-12 text-center animate-pulse">
      <span className="text-primary font-display uppercase tracking-widest text-[10px]">Syncing Player Dossier...</span>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2 mb-2">
        <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold font-display uppercase text-text">Active Seasons</h2>
            <button onClick={() => setShowAll(!showAll)} className="btn-three py-2 px-4 text-xs">
                {showAll ? 'Show Active' : 'Show All'}
            </button>
        </div>
        <span className="text-[10px] font-black text-text2 uppercase tracking-widest">
            {activePositions.length} Positions
        </span>
      </div>

      <div className="grid gap-3">
        {activePositions.length === 0 ? (
          <div className="bg-card rounded-xl p-12 text-center border border-border/10">
            <span className="text-text2 text-sm italic opacity-40 uppercase font-bold tracking-widest">No Holdings Found</span>
          </div>
        ) : (
          activePositions.reverse().map((pos) => (
            <SeasonHoldingRow key={pos.season} pos={pos} playerAddress={playerAddress} />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * HELPER COMPONENT: Handles the USDC payout/claimed logic for concluded seasons
 */
function PayoutValueDisplay({ seasonAddress, playerAddress }: { seasonAddress: string, playerAddress: string }) {
    const { payout, realizedPayout, loading } = usePayout(seasonAddress, playerAddress as Address);

    if (loading) return <div className="h-6 w-20 bg-card2 animate-pulse rounded" />;

    const isClaimable = payout > 0;
    const value = isClaimable ? payout : realizedPayout;

    return (
        <div className="flex flex-col items-start">
            <span className={`text-[9px] uppercase font-bold tracking-widest mb-0.5 ${isClaimable ? 'text-primary' : 'text-text2'}`}>
                {isClaimable ? 'Claimable' : 'Claimed'}
            </span>
            <span className={`text-xl font-black tracking-tighter leading-none ${isClaimable ? 'text-primary' : 'text-text'}`}>
                ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-[10px] opacity-40 ml-1 font-sans font-bold">USDC</span>
            </span>
        </div>
    );
}

function SeasonHoldingRow({ pos, playerAddress }: { pos: any, playerAddress: string }) {
  const { data: giniData } = useSeasonGini(pos.season);
  const { data: statsMap } = useBatchPlayerPercentiles(pos.season, [playerAddress.toLowerCase()]);
  const playerStats = statsMap?.[playerAddress.toLowerCase()];

  const { data: gInitialRaw } = useReadContract({
    address: pos.season,
    abi: GameSeasonAbi as any,
    functionName: 'g_initial',
    query: { enabled: pos.phase === 'TRADING' || pos.phase === 'PAYOUT' || pos.phase === 'ENDED' }
  });

  const isAuction = pos.phase === 'AUCTION' || pos.phase === 'BOOTSTRAP';
  const isTrading = pos.phase === 'TRADING';
  const isConcluded = pos.phase === 'PAYOUT' || pos.phase === 'ENDED';
  
  const phaseColor = isAuction ? 'text-danger' : isConcluded ? 'text-info' : 'text-success';
  const phaseBg = isAuction ? 'bg-danger' : isConcluded ? 'bg-info' : 'bg-success';

  return (
    <Link href={`/season_${pos.id}`} className="block group">
      <div className="bg-card rounded-xl p-5 shadow-sm border border-transparent hover:border-border/30 transition-all overflow-hidden">
<div className="flex flex-col md:flex-row md:items-center justify-between gap-y-4 md:gap-x-4 w-full min-w-0">
  
  {/* 1. SEASON & PHASE - Compact fixed width */}
  <div className="flex flex-col items-start gap-1 md:w-28 shrink-0">
    <span className="font-bold text-lg font-display uppercase tracking-tight text-text leading-none">
      Season {pos.id}
    </span>
    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-card2 rounded-full">
      <div className={`w-1.5 h-1.5 rounded-full ${phaseBg} animate-pulse`} />
      <span className={`text-[9px] font-black ${phaseColor} tracking-widest uppercase`}>
        {pos.phase}
      </span>
    </div>
  </div>

  {/* 2. PRIZE POOL - Compact fixed width */}
  <div className="flex flex-col items-start md:w-24 shrink-0">
    <span className="text-[9px] uppercase font-bold text-text2 tracking-widest mb-0.5">Prize Pool</span>
    <span className="text-xl font-black text-text tracking-tighter leading-none">
      ${(giniData?.prizePool ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
    </span>
  </div>

  {/* 3. VICTORY PROGRESS BAR - FLUID (flex-1) */}
  <div className="flex-1 min-w-0 md:max-w-[240px]">
    {(isTrading || isConcluded) && gInitialRaw !== undefined ? (
      <div className="scale-90 origin-left">
        <VictoryProgressBar
            seasonAddress={pos.season} 
            gini={giniData?.gini || 0}
            gInitial={Number(gInitialRaw)}
            victoryThresholdBps={pos.config.victoryThresholdBps}
            baseBeta={pos.config.baseBeta}
            phase={pos.phase}
        />
      </div>
    ) : (
        <div className="h-8 flex items-center justify-center border border-dashed border-border/10 rounded-lg bg-card2/20">
            <span className="text-[8px] font-black text-text2/30 uppercase tracking-widest">
                {isAuction ? 'Auction' : 'Settled'}
            </span>
        </div>
    )}
  </div>

  {/* 4. HOLDINGS - Compact fixed width */}
  <div className="flex flex-col items-start md:w-24 shrink-0">
    <span className="text-[9px] uppercase font-bold text-text2 tracking-widest mb-0.5">Holdings</span>
    <span className="text-xl font-black text-primary tracking-tighter leading-none truncate w-full">
      {Number(formatUnits(pos.balance, 18)).toLocaleString()}
    </span>
  </div>

  {/* 5. PERCENTILE CIRCLE - Right aligned */}
  <div className="flex justify-end items-center md:w-16 shrink-0">
    {isTrading && playerStats ? (
        <PercentileCircle 
            percentage={playerStats.factionPercentile} 
            isCapitalist={playerStats.isCapitalist} 
            size="md"
        />
    ) : null}
  </div>

  {/* Desktop Chevron */}
  <div className="hidden lg:block shrink-0">
    <svg className="w-4 h-4 text-text2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
    </svg>
  </div>
</div>
      </div>
    </Link>
  );
}