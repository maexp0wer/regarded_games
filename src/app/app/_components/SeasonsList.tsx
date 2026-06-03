'use client';

import React, { useState } from 'react';
import { usePublicClient } from 'wagmi';
import { Address, getAddress } from 'viem';
import { useQuery } from '@tanstack/react-query';
import { useTenantDeployment, useTenantChainId } from '@/context/TenantContext';
import { useSeasonGini } from '@/hooks/useSeasonGini';
import { useSeasonPhase } from '@/hooks/useSeasonPhase';
import { useSeasonVictory } from '@/hooks/useSeasonVictory';
import Link from 'next/link';
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';
import { SeasonPhasePills } from './SeasonPhasePills';
import { CountdownTicker } from './CountdownTicker';

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
const formatDateShort = (timestamp: number) => {
  if (!timestamp) return '—';
  return new Date(timestamp * 1000).toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
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
  const { gCurrent, effectiveVictoryPending, progressPercent, winningSide } = victory;

  if (!config || !currentPhase) return null;

  const num = String(seasonNumber).padStart(2, '0');

  const showTimeStat = isTrading || isBootstrap || isAuction;
  const statusLabel = isTrading ? 'Trading Ends' : 'Trading Starts';
  const countdownTarget = (effectiveVictoryPending || isBootstrap) ? 0 : isTrading ? seasonEnd : tradingStart;

  const multiplier = (config.baseMultiplierBps / 10000 + Math.pow(1 - (gCurrent / 10000), 2)).toFixed(2);

  return (
    <Link href={`/${slug}`} className="block group">
      <div className="season-ledger-row">

        {/* Column 1: Identity */}
        <div className="flex items-center gap-4 min-w-50">
          <p className="font-display font-extrabold leading-none tracking-[-0.04em] text-text text-display-season shrink-0">
            S<em className="not-italic font-medium" style={{ color: 'var(--color-text2)', fontVariantNumeric: 'tabular-nums' }}>{num}</em>
          </p>
          <div className="meta-data-group">
            <SeasonPhasePills
              phase={currentPhase}
              isVictoryPending={effectiveVictoryPending}
              className="flex items-center gap-2"
            />
            <span className="font-mono text-[11px] text-text2">
              {tradingStart ? formatDateShort(tradingStart) : '—'} — {seasonEnd ? formatDateShort(seasonEnd) : '—'}
            </span>
          </div>
        </div>

        {/* Column 2: Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1 md:px-6">
          <div className="meta-data-group">
            <span className="font-mono text-[10px] uppercase text-text2 tracking-wider">Prize Pool</span>
            <span className="font-mono text-sm font-bold text-gold" style={{ fontVariantNumeric: 'tabular-nums' }}>
              ${(giniData?.prizePool ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-[10px] text-text2 font-normal ml-1">USDC</span>
            </span>
          </div>
          <div className="meta-data-group">
            <span className="font-mono text-[10px] uppercase text-text2 tracking-wider">Players</span>
            <span className="font-mono text-sm font-bold text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {(giniData?.playerCount ?? 0).toLocaleString()}
            </span>
          </div>
          <div className="meta-data-group">
            <span className="font-mono text-[10px] uppercase text-text2 tracking-wider">Multiplier</span>
            <span className="font-mono text-sm font-bold text-green" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {multiplier}×
            </span>
          </div>
          {showTimeStat && (
            <CountdownTicker targetTimestamp={countdownTarget} label={statusLabel} />
          )}
        </div>

        {/* Column 3: Victory progress rail */}
        {!(isAuction || isBootstrap) && (
          <div className="w-full md:w-50 flex flex-col gap-1.5 shrink-0">
            <span className="font-mono text-[9px] uppercase text-text2 tracking-wider md:text-right block">
              Victory Progress
            </span>
            <div className="progress-rail-container">
              <div
                className="progress-rail-fill"
                style={{
                  width: `${progressPercent}%`,
                  ...(winningSide === 'cap' && { background: 'linear-gradient(90deg, var(--color-gold) 0%, var(--color-gold-70) 100%)' }),
                  ...(winningSide === 'soc' && { background: 'linear-gradient(90deg, var(--color-purple) 0%, var(--color-purple-70) 100%)' }),
                }}
              />
              <div className="progress-rail-overlay-text">
                {winningSide === 'none'
                  ? 'BALANCED'
                  : `${progressPercent.toFixed(1)}% ${winningSide === 'cap' ? 'BOURGEOIS' : 'PROLETARIAN'}`
                }
              </div>
            </div>
          </div>
        )}

      </div>
    </Link>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export function SeasonsList() {
  const chainId = useTenantChainId();
  const coreDeployment = useTenantDeployment();
  const controllerAddress = getAddress(coreDeployment.Controller) as Address;
  const [showAll, setShowAll] = useState(false);
  const publicClient = usePublicClient({ chainId });

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
      <span className="section-label animate-pulse">Reading Ledger…</span>
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
          className="btn-game-secondary px-4 py-2 text-[11px]"
        >
          {showAll ? 'Show Active' : 'Show All'}
        </button>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-3">
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
