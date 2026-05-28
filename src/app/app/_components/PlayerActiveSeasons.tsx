'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { usePublicClient, useReadContracts } from 'wagmi';
import { Address, formatUnits, erc20Abi } from 'viem';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

// Assets & Hooks
import { useTenantDeployment, useTenantChainId } from '@/context/TenantContext';
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';
import { useSeasonGini } from '@/hooks/useSeasonGini';
import { useSeasonPhase } from '@/hooks/useSeasonPhase';
import { useSeasonVictory } from '@/hooks/useSeasonVictory';
import { useBatchPlayerPercentiles } from '@/hooks/useBatchPlayerPercentiles';
import { usePayout } from '@/hooks/usePayout';

// Shared Components
import { PercentileCircle } from './PercentileCircle';
import { VictoryProgressBar } from './VictoryProgressBar';
import { SeasonPhasePills } from './SeasonPhasePills';

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
  const chainId = useTenantChainId();
  const publicClient = usePublicClient({ chainId });
  const coreDeployment = useTenantDeployment();
  const [showAll, setShowAll] = useState(false);

  const [validPositions, setValidPositions] = useState<Record<string, boolean>>({});

  const controllerAddress = coreDeployment.Controller as Address;

  // 1. SCAN REGISTRY (addresses + phase only — math is owned by per-row hooks)
  const { data: registry, isLoading: isScanning } = useQuery({
    queryKey: ['player-dashboard-registry-v2', chainId, controllerAddress],
    queryFn: async () => {
      if (!controllerAddress || !publicClient) return [];
      const list = [];
      for (let i = 0; i < 30; i++) {
        try {
          const data = await publicClient.readContract({
            address: controllerAddress, abi: CONTROLLER_ABI, functionName: 'seasons', args: [BigInt(i)],
          });
          const phase = await publicClient.readContract({
            address: data[0], abi: GameSeasonAbi as any, functionName: 'getPhase'
          });
          list.push({
            id: i + 1,
            season: data[0],
            fim: data[3],
            phase: phase as string,
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
      chainId,
    })),
    query: { enabled: !!registry && registry.length > 0 }
  });

  const activePositions = useMemo(() => {
    if (!registry || !balanceResults) return [];

    return registry.map((s, idx) => ({
      ...s,
      balance: (balanceResults[idx]?.result as bigint) || 0n
    })).filter(pos => {
      if (pos.phase === 'BOOTSTRAP' || pos.phase === 'AUCTION' || pos.phase === 'TRADING') {
        return pos.balance > 0n;
      }
      return true;
    });
  }, [registry, balanceResults]);

  const handleValidation = useCallback((season: string, isValid: boolean) => {
    setValidPositions(prev => {
      if (prev[season] === isValid) return prev;
      return { ...prev, [season]: isValid };
    });
  }, []);

  const displayedCount = Object.values(validPositions).filter(Boolean).length;
  const isSyncing = isScanning || isCheckingBalances;

  if (isSyncing) return (
    <div className="w-full p-12 text-center">
      <span className="section-label animate-pulse">Syncing Player Dossier…</span>
    </div>
  );

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="font-display font-extrabold text-[28px] tracking-[-0.02em] text-text">
            Active Seasons
          </h2>
          {displayedCount > 0 && (
            <span className="section-label px-2 py-1 bg-card2 rounded-md hidden sm:block">
              {displayedCount} Positions
            </span>
          )}
        </div>
        <button
          onClick={() => setShowAll(!showAll)}
          className="btn-game-secondary px-4 py-2 text-[11px]"
        >
          {showAll ? 'Show Active' : 'Show All'}
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {activePositions.length === 0 || (!isSyncing && displayedCount === 0 && Object.keys(validPositions).length > 0) ? (
          <div
            className="card-app text-center py-16"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <p className="section-label opacity-40">No holdings found</p>
          </div>
        ) : (
          activePositions.reverse().map((pos) => (
            <SeasonHoldingRow
              key={pos.season}
              pos={pos}
              playerAddress={playerAddress}
              showAll={showAll}
              onValidation={handleValidation}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ROW WRAPPER
// ============================================================================
function SeasonHoldingRow({ pos, playerAddress, showAll, onValidation }: any) {
  const { payout, pnl, realizedPayout, loading: payoutLoading } = usePayout(pos.season, playerAddress as Address);

  const isParticipant = pos.balance > 0n || payout > 0 || realizedPayout > 0;
  const matchesFilter = showAll ? true : (pos.phase !== 'PAYOUT' && pos.phase !== 'ENDED');
  const shouldRender = isParticipant && matchesFilter;

  useEffect(() => {
    if (pos.balance > 0n || !payoutLoading) {
      onValidation(pos.season, shouldRender);
    }
  }, [pos.balance, payoutLoading, shouldRender, pos.season, onValidation]);

  if (!shouldRender) return null;

  return <SeasonHoldingRowContent pos={pos} playerAddress={playerAddress} payoutData={{ payout, pnl, realizedPayout }} />;
}

// ============================================================================
// ROW CONTENT
// ============================================================================
function SeasonHoldingRowContent({ pos, playerAddress, payoutData }: any) {
  const { data: giniData } = useSeasonGini(pos.season);
  const { data: statsMap } = useBatchPlayerPercentiles(pos.season, [playerAddress.toLowerCase()]);
  const playerStats = statsMap?.[playerAddress.toLowerCase()];

  const { currentPhase, isAuctionOrBootstrap, isPayout } = useSeasonPhase(pos.season);
  const { effectiveVictoryPending } = useSeasonVictory(pos.season);

  const phase = currentPhase ?? pos.phase;
  const isConcluded = isPayout || phase === 'ENDED';
  const num = String(pos.id).padStart(2, '0');

  // Payout parsing logic
  const { payout, pnl, realizedPayout } = payoutData;
  const canClaim = payout > 0;
  const claimableAmount = canClaim ? payout : realizedPayout;
  const claimLabel = canClaim ? 'Claimable' : 'Total Claimed';

  return (
    <Link href={`/season_${pos.id}`} className="block group">
      <div
        className="card-app transition-all group-hover:border-border-bright"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-start gap-6">

          {/* Left column: big season number + pills (desktop) */}
          <div className="shrink-0 hidden sm:flex sm:flex-col sm:items-start sm:gap-2">
            <p className="font-display font-extrabold leading-none tracking-[-0.04em] text-text text-display-season">
              S<em className="not-italic font-medium" style={{ color: 'var(--color-text2)', fontVariantNumeric: 'tabular-nums' }}>{num}</em>
            </p>
            <SeasonPhasePills
              phase={phase}
              isVictoryPending={effectiveVictoryPending}
              className="flex flex-col gap-1.5"
            />
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            {/* Mobile header: small season number + pills */}
            <div className="flex sm:hidden items-center flex-wrap gap-2">
              <p className="font-display font-extrabold leading-none tracking-[-0.04em] text-text text-season-mobile">
                S<em className="not-italic font-medium" style={{ color: 'var(--color-text2)', fontVariantNumeric: 'tabular-nums' }}>{num}</em>
              </p>
              <SeasonPhasePills
                phase={phase}
                isVictoryPending={effectiveVictoryPending}
                className="flex items-center flex-wrap gap-2"
              />
            </div>

            {/* Stats grid dynamically rendering based on concluded vs active */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {isConcluded ? (
                <>
                  <div>
                    <p className="section-label mb-1">{claimLabel}</p>
                    <span className="font-mono font-bold text-[18px]" style={{ color: canClaim ? 'var(--color-gold)' : 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>
                      ${claimableAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <span className="text-[12px] opacity-40 ml-1 font-sans font-bold">USDC</span>
                    </span>
                  </div>

                  <div>
                    <p className="section-label mb-1">Prize Pool</p>
                    <span className="font-mono font-bold text-[18px] text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      ${(giniData?.prizePool ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div>
                    <p className="section-label mb-1">Season PnL</p>
                    <span className="font-mono font-bold text-[18px]" style={{ color: pnl > 0 ? 'var(--color-green)' : pnl < 0 ? 'var(--color-red)' : 'var(--color-text2)', fontVariantNumeric: 'tabular-nums' }}>
                      {pnl > 0 ? '+' : pnl < 0 ? '-' : ''}${Math.abs(pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <span className="text-[12px] opacity-40 ml-1 font-sans font-bold">USDC</span>
                    </span>
                  </div>

                  {playerStats && (
                    <div>
                      <p className="section-label mb-1">Your result</p>
                      <div className="mt-1">
                        <PercentileCircle
                          percentage={playerStats.factionPercentile}
                          isCapitalist={playerStats.isCapitalist}
                          size="md"
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <p className="section-label mb-1">Holdings</p>
                    <span className="font-mono font-bold text-[18px]" style={{ color: 'var(--color-gold)', fontVariantNumeric: 'tabular-nums' }}>
                      {Number(formatUnits(pos.balance, 18)).toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <p className="section-label mb-1">Prize Pool</p>
                    <span className="font-mono font-bold text-[18px] text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      ${(giniData?.prizePool ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {playerStats && (
                    <div>
                      <p className="section-label mb-1">Your Standing</p>
                      <div className="mt-1">
                        <PercentileCircle
                          percentage={playerStats.factionPercentile}
                          isCapitalist={playerStats.isCapitalist}
                          size="md"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Progress bar */}
            {!isAuctionOrBootstrap && (
              <div>
                <p className="section-label mb-2">Victory Progress</p>
                <VictoryProgressBar seasonAddress={pos.season} />
              </div>
            )}
          </div>

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
