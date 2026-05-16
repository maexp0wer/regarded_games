'use client';

import React, { useState } from 'react';
import { useChainId, usePublicClient } from 'wagmi';
import { Address, getAddress } from 'viem';
import { base, baseSepolia, foundry } from 'wagmi/chains';
import { useQuery } from '@tanstack/react-query';
import coreDeployment from '@/deployments/local/core.json';
import { useSeasonGini } from '@/hooks/useSeasonGini';
import { useSeasonPhase } from '@/hooks/useSeasonPhase';
import { useSeasonVictory } from '@/hooks/useSeasonVictory';
import Link from 'next/link';
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';
import { VictoryProgressBar } from './VictoryProgressBar';
import { SeasonPhasePills } from './SeasonPhasePills';

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

const formatDate = (timestamp: number) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp * 1000).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

// ============================================================================
// SUB-COMPONENT: SEASON CARD
// ============================================================================
function SeasonCard({ season }: { season: SeasonRegistry }) {
  const { data: giniData } = useSeasonGini(season.season);
  const phase = useSeasonPhase(season.season);
  const victory = useSeasonVictory(season.season);

  const seasonNumber = season.id + 1;
  const slug = `season_${seasonNumber}`;

  const {
    currentPhase,
    isAuction,
    isBootstrap,
    isTrading,
    tradingStart,
    seasonEnd,
    config,
  } = phase;
  const { gCurrent, effectiveVictoryPending } = victory;

  if (!config || !currentPhase) return null;

  const statusLabel = isTrading ? 'Ends' : 'Trading Starts';
  const showTimeStat = isTrading || isBootstrap || isAuction;
  const statusTime = (effectiveVictoryPending || isBootstrap)
    ? 'SHORTLY'
    : isTrading
    ? formatDate(seasonEnd)
    : formatDate(tradingStart);

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
            <p className="font-display font-extrabold leading-none tracking-[-0.04em] text-text text-display-season">
              S<em className="not-italic font-medium" style={{ color: 'var(--color-muted2)', fontVariantNumeric: 'tabular-nums' }}>{num}</em>
            </p>
            <SeasonPhasePills
              phase={currentPhase}
              isVictoryPending={effectiveVictoryPending}
              className="flex flex-col gap-1.5"
            />
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            {/* Mobile header: small season number + pills */}
            <div className="flex sm:hidden items-center flex-wrap gap-2">
              <p className="font-display font-extrabold leading-none tracking-[-0.04em] text-text text-season-mobile">
                S<em className="not-italic font-medium" style={{ color: 'var(--color-muted2)', fontVariantNumeric: 'tabular-nums' }}>{num}</em>
              </p>
              <SeasonPhasePills
                phase={currentPhase}
                isVictoryPending={effectiveVictoryPending}
                className="flex items-center flex-wrap gap-2"
              />
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
                  {(config.baseBeta / 10000 + Math.pow(1 - (gCurrent / 10000), 2)).toFixed(2)}×
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
            {!(isBootstrap || isAuction) && (
              <div>
                <p className="section-label mb-2">Victory Progress</p>
                <VictoryProgressBar seasonAddress={season.season} />
              </div>
            )}
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
    queryKey: ['allSeasons_v3', chainId, controllerAddress],
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

          const phase = await publicClient.readContract({
            address: data[0], abi: GAME_SEASON_FULL_ABI, functionName: 'getPhase'
          });

          allSeasons.push({
            id: i,
            season: data[0],
            phase: phase as string,
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
          <SeasonCard key={s.season} season={s} />
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
