'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { usePublicClient, useReadContracts } from 'wagmi';
import { Address, formatUnits, erc20Abi } from 'viem';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

// Assets & Hooks
import { useTenantDeployment, useTenantChainId } from '@/context/TenantContext';
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';
import type { Abi } from 'abitype';
import { useSeasonGini } from '@/hooks/useSeasonGini';
import { useSeasonPhase } from '@/hooks/useSeasonPhase';
import { useSeasonVictory } from '@/hooks/useSeasonVictory';
import { useBatchPlayerPercentiles } from '@/hooks/useBatchPlayerPercentiles';
import { usePayout } from '@/hooks/usePayout';
import { useOpenOrders } from '@/hooks/useOpenOrders';
import { useMyTrades, MyTrade } from '@/hooks/useMyTrades';
import { useMyAuctionMints, AuctionMint } from '@/hooks/useMyAuctionMints';
import { useLastTradePrice } from '@/hooks/useLastTradePrice';

// Shared Components
import { PercentileCircle } from './PercentileCircle';
import { SeasonPhasePills } from './SeasonPhasePills';
import { CountdownTicker } from './CountdownTicker';

const formatDateShort = (timestamp: number) => {
  if (!timestamp) return '—';
  return new Date(timestamp * 1000).toLocaleString(undefined, {
    month: 'short', day: '2-digit', year: 'numeric',
  });
};

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

interface SeasonPosition {
  id: number;
  season: string;
  fim: string;
  phase: string;
  balance: bigint;
}

interface AggregatePosition {
  netSize: number;
  entryPrice: number;
}

function computePosition(trades: MyTrade[], auctionMints: AuctionMint[]): AggregatePosition | null {
  if (trades.length === 0 && auctionMints.length === 0) return null;

  let netSize = 0;
  let weightedCost = 0;

  for (const m of auctionMints) {
    netSize += m.fimAmount;
    weightedCost += m.usdcAmount;
  }

  for (const t of trades) {
    if (t.isBuy) {
      weightedCost += t.usdcAmount;
      netSize += t.fimAmount;
    } else {
      weightedCost -= t.usdcAmount;
      netSize -= t.fimAmount;
    }
  }

  if (Math.abs(netSize) < 0.0001) return null;
  const entryPrice = Math.abs(weightedCost / netSize);
  return { netSize, entryPrice };
}

interface SeasonListDashboardProps {
  playerAddress: string;
}

export function SeasonListDashboard({ playerAddress }: SeasonListDashboardProps) {
  const chainId = useTenantChainId();
  const publicClient = usePublicClient({ chainId });
  const coreDeployment = useTenantDeployment();

  const [validPositions, setValidPositions] = useState<Record<string, boolean>>({});
  const [showPayout, setShowPayout] = useState(false);

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
            address: data[0], abi: GameSeasonAbi as Abi, functionName: 'getPhase'
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
      const isActivePhase = pos.phase === 'BOOTSTRAP' || pos.phase === 'AUCTION' || pos.phase === 'TRADING';
      if (isActivePhase) return pos.balance > 0n;
      // PAYOUT and ENDED only shown when toggled; row validates participation via fimBurned/payout
      return showPayout;
    });
  }, [registry, balanceResults, showPayout]);

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
            {showPayout ? 'All Seasons' : 'Active Seasons'}
          </h2>
          {displayedCount > 0 && (
            <span className="section-label px-2 py-1 bg-card2 rounded-md hidden sm:block">
              {displayedCount} Positions
            </span>
          )}
        </div>
        <button
          onClick={() => { setShowPayout(v => !v); setValidPositions({}); }}
          className="btn-game-secondary px-4 py-2 text-[11px]"
        >
          {showPayout ? 'Active Seasons' : 'All Seasons'}
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {activePositions.length === 0 || (!isSyncing && displayedCount === 0 && Object.keys(validPositions).length > 0) ? (
          <div
            className="card-app text-center py-16"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <p className="section-label opacity-40">{showPayout ? 'No positions found' : 'No active positions found'}</p>
          </div>
        ) : (
          [...activePositions].reverse().map((pos) => (
            <SeasonHoldingRow
              key={pos.season}
              pos={pos}
              playerAddress={playerAddress}
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
function SeasonHoldingRow({ pos, playerAddress, onValidation }: { pos: SeasonPosition; playerAddress: string; onValidation: (season: string, isValid: boolean) => void }) {
  const payoutData = usePayout(pos.season, playerAddress as Address);
  const { payout, pnl, realizedPayout, fimBurned, loading: payoutLoading } = payoutData;

  const isActivePhaseSeason = pos.phase === 'BOOTSTRAP' || pos.phase === 'AUCTION' || pos.phase === 'TRADING';

  let shouldRender: boolean;
  if (isActivePhaseSeason) {
    shouldRender = pos.balance > 0n;
  } else {
    // PAYOUT / ENDED: while payout data loads assume valid to avoid flash; hide once confirmed no participation
    shouldRender = payoutLoading || fimBurned > 0 || payout > 0 || realizedPayout > 0;
  }

  useEffect(() => {
    if (!isActivePhaseSeason && payoutLoading) return;
    onValidation(pos.season, shouldRender);
  }, [shouldRender, pos.season, onValidation, isActivePhaseSeason, payoutLoading]);

  if (!shouldRender) return null;

  return <SeasonHoldingRowContent pos={pos} playerAddress={playerAddress} payoutData={{ payout, pnl, realizedPayout, fimBurned }} />;
}

// ============================================================================
// ROW CONTENT
// ============================================================================
function SeasonHoldingRowContent({ pos, playerAddress, payoutData }: { pos: SeasonPosition; playerAddress: string; payoutData: { payout: number; pnl: number; realizedPayout: number; fimBurned: number } }) {
  const { data: giniData } = useSeasonGini(pos.season);
  const { data: statsMap } = useBatchPlayerPercentiles(pos.season, [playerAddress.toLowerCase()]);
  const playerStats = statsMap?.[playerAddress.toLowerCase()];

  const { currentPhase, isAuctionOrBootstrap, isTrading, isBootstrap, isAuction, isPayout, tradingStart, seasonEnd } = useSeasonPhase(pos.season);
  const { effectiveVictoryPending, progressPercent, winningSide } = useSeasonVictory(pos.season);

  const phase = currentPhase ?? pos.phase;
  const num = String(pos.id).padStart(2, '0');

  // PAYOUT is now terminal (no ENDED phase), so position data is always fetched.
  const activeAddr   = pos.season as string;
  const activePlayer = playerAddress;

  const { data: openOrders = [] }   = useOpenOrders(activeAddr, activePlayer, 'open');
  const { data: currentPrice = 0 }  = useLastTradePrice(activeAddr);
  const { data: trades = [] }       = useMyTrades(activeAddr, activePlayer);
  const { data: auctionMints = [] } = useMyAuctionMints(activeAddr, activePlayer);

  // Mirror TradingMask: wallet balance + FIM escrowed in open sell orders
  const lockedFim    = useMemo(() => openOrders.reduce((a: number, o) => o.isBuy ? a : a + o.remainingAmount, 0), [openOrders]);
  const availableFim = Number(formatUnits(pos.balance, 18));
  const totalFim     = availableFim + lockedFim;

  const position      = useMemo(() => computePosition(trades, auctionMints), [trades, auctionMints]);
  // In PAYOUT, pos.balance may be 0 after FIM is burned — fall back to netSize from trade history
  const fimForDisplay = totalFim > 0.0001 ? totalFim : (position?.netSize ?? 0);
  const holdingsLabel = pos.balance > 0n ? 'Holdings' : 'FIM Burned';

  const pnl           = position ? (currentPrice - position.entryPrice) * fimForDisplay : null;

  const { payout, pnl: seasonPnl, realizedPayout } = payoutData;
  const canClaim = payout > 0;
  const claimableAmount = canClaim ? payout : realizedPayout;
  const claimLabel = canClaim ? 'Claimable' : 'Total Claimed';

  const showTimeStat = isTrading || isBootstrap || isAuction;
  const statusLabel = isTrading ? 'Trading Ends' : 'Trading Starts';
  const countdownTarget = (effectiveVictoryPending || isBootstrap) ? 0 : isTrading ? seasonEnd : tradingStart;

  return (
    <Link href={`/season_${pos.id}`} className="block group">
      <div className="season-ledger-row">

        {/* Column 1: Season # + Phase (top) / Dates (bottom) */}
        <div className="flex flex-col gap-1.5 shrink-0 min-w-40">
          <div className="flex items-center gap-3">
            <p className="font-display font-extrabold leading-none tracking-[-0.04em] text-text text-display-season shrink-0">
              S<em className="not-italic font-medium" style={{ color: 'var(--color-text2)', fontVariantNumeric: 'tabular-nums' }}>{num}</em>
            </p>
            <SeasonPhasePills
              phase={phase}
              isVictoryPending={effectiveVictoryPending}
              className="flex items-center gap-2"
            />
          </div>
          <span className="font-mono text-[11px] text-text2">
            {tradingStart ? formatDateShort(tradingStart) : '—'} — {seasonEnd ? formatDateShort(seasonEnd) : '—'}
          </span>
        </div>

        {/* Columns 2–4: metrics — ACTIVE + PAYOUT (PAYOUT is terminal; no ENDED).
            3 paired columns: (Position/Available or Claimable) | (Standing/PnL)
            | (Prize Pool/Countdown or Season PnL) */}
        <div className="flex-1 flex flex-wrap gap-x-6 gap-y-3 md:px-6">

            {/* Col 2: Position (top) / Available or Claimable (bottom) */}
            <div className="flex flex-col gap-3 flex-1 min-w-20">
              <div className="meta-data-group">
                <span className="font-mono text-[10px] uppercase text-text2 tracking-wider">{isPayout ? holdingsLabel : 'Position'}</span>
                <span className="font-mono text-sm font-bold text-gold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {(isPayout ? fimForDisplay : totalFim).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  <span className="text-[10px] text-text2 font-normal ml-1">FIM</span>
                </span>
              </div>
              <div className="meta-data-group">
                {isPayout ? (
                  <>
                    <span className="font-mono text-[10px] uppercase text-text2 tracking-wider">{claimLabel}</span>
                    <span className="font-mono text-sm font-bold" style={{ color: canClaim ? 'var(--color-gold)' : 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>
                      ${claimableAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <span className="text-[10px] text-text2 font-normal ml-1">USDC</span>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-mono text-[10px] uppercase text-text2 tracking-wider">Available</span>
                    <span className="font-mono text-sm font-bold text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {availableFim.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      <span className="text-[10px] text-text2 font-normal ml-1">FIM</span>
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Col 3: Standing (top) / PnL (bottom) */}
            <div className="flex flex-col gap-3 flex-1 min-w-20">
              <div className="meta-data-group">
                <span className="font-mono text-[10px] uppercase text-text2 tracking-wider">{isPayout ? 'Your Result' : 'Standing'}</span>
                {playerStats ? (
                  <PercentileCircle percentage={playerStats.factionPercentile} isCapitalist={playerStats.isCapitalist} size="sm" />
                ) : (
                  <span className="font-mono text-sm text-text2">—</span>
                )}
              </div>
              {isPayout ? (
                <div className="meta-data-group">
                  <span className="font-mono text-[10px] uppercase text-text2 tracking-wider">Season PnL</span>
                  <span className="font-mono text-sm font-bold" style={{ color: seasonPnl > 0 ? 'var(--color-green)' : seasonPnl < 0 ? 'var(--color-red)' : 'var(--color-text2)', fontVariantNumeric: 'tabular-nums' }}>
                    {seasonPnl > 0 ? '+' : seasonPnl < 0 ? '-' : ''}${Math.abs(seasonPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <span className="text-[10px] text-text2 font-normal ml-1">USDC</span>
                  </span>
                </div>
              ) : (
                <div className="meta-data-group">
                  <span className="font-mono text-[10px] uppercase text-text2 tracking-wider">PnL</span>
                  <span className="font-mono text-sm font-bold" style={{ color: pnl !== null ? (pnl >= 0 ? 'var(--color-green)' : 'var(--color-red)') : 'var(--color-text2)', fontVariantNumeric: 'tabular-nums' }}>
                    {pnl !== null ? `${pnl >= 0 ? '+' : ''}$${pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                    {pnl !== null && <span className="text-[10px] text-text2 font-normal ml-1">USDC</span>}
                  </span>
                </div>
              )}
            </div>

            {/* Col 4: Prize Pool (top) / Countdown or Season PnL (bottom) */}
            <div className="flex flex-col gap-3 flex-1 min-w-20">
              <div className="meta-data-group">
                <span className="font-mono text-[10px] uppercase text-text2 tracking-wider">Prize Pool</span>
                <span className="font-mono text-sm font-bold text-gold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  ${(giniData?.prizePool ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-[10px] text-text2 font-normal ml-1">USDC</span>
                </span>
              </div>
              <div>
                {isPayout ? (
                  <div className="meta-data-group">
                    <span className="font-mono text-[10px] uppercase text-text2 tracking-wider">Status</span>
                    <span className="font-mono text-sm font-bold text-text2">Season Concluded</span>
                  </div>
                ) : (
                  showTimeStat && <CountdownTicker targetTimestamp={countdownTarget} label={statusLabel} />
                )}
              </div>
            </div>

          </div>

        {/* Column 5: Victory progress rail (active + payout seasons) */}
        {!isAuctionOrBootstrap && (
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
