'use client';

import { formatUnits } from 'viem';
import { useMemo } from 'react';
import { useReadContract } from 'wagmi';
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';
import { useTenantChainId } from '@/context/TenantContext';
import { useSeasonPlayers, SeasonPlayer } from './useSeasonPlayers';
import { useSeasonActiveOrders } from './useSeasonActiveOrders';
import { useSeasonGini } from './useSeasonGini';
import { useYieldTotals } from './useYieldTotals';
import { useSeasonVictory } from './useSeasonVictory';
import {
  computeSettlementAggregates,
  projectPlayerPayout,
  ProjectionPlayer,
} from '@/utils/payoutProjection';

export interface SeasonProjectedPnl {
  /** Projected Season P/L (payout − netContribution) keyed by lowercased address. */
  projectedPnlByAddr: Map<string, number>;
  /** Shared raw player rows — same cache as useSeasonPlayers. */
  players: SeasonPlayer[] | undefined;
  loading: boolean;
}

/**
 * Projects every player's pool-proportional Season P/L from the shared
 * useSeasonPlayers cache — the same client-side settlement replica usePayout
 * displays, NOT the indexer's `totalPotentialPayout` (only written once a season
 * finalizes). Shared by usePlayerRank (single-player position) and
 * useSeasonLeaderboard (whole-season top-N) so the projection runs once.
 */
export function useSeasonProjectedPnl(seasonAddress: string | undefined): SeasonProjectedPnl {
  const chainId = useTenantChainId();
  const { data: allStatsData, isLoading: statsLoading } = useSeasonPlayers(seasonAddress);
  const { data: activeOrders } = useSeasonActiveOrders(seasonAddress);
  const { data: giniData } = useSeasonGini(seasonAddress);
  const { data: yieldTotals } = useYieldTotals(seasonAddress);
  const { winningSide, progressPercent } = useSeasonVictory(seasonAddress);

  const { data: dustThresholdRaw } = useReadContract({
    address: seasonAddress as `0x${string}`,
    abi: GameSeasonAbi,
    functionName: 'existentialThresholdFim',
    chainId,
    query: { enabled: !!seasonAddress },
  });

  // Distributable pool = base prize pool (auction USDC + trading fees) + reinvested
  // Aave yield bonus — mirrors usePayout so projected P&L stays consistent with the
  // figures displayed on each rail.
  const dustThresholdFim = dustThresholdRaw
    ? Number(formatUnits(dustThresholdRaw as bigint, 18))
    : 0;
  const basePool = giniData?.prizePool ?? 0;
  const yieldBonus = Number(formatUnits(BigInt(yieldTotals?.reinvest || '0'), 6));
  const poolSize = basePool + yieldBonus;

  // Project every player's pool-proportional payout once, then key Season P/L by
  // address. Aggregates must span the full player set (supply / faction boundary),
  // even though only contributing players are later ranked.
  const projectedPnlByAddr = useMemo(() => {
    const map = new Map<string, number>();
    if (!allStatsData || poolSize <= 0) return map;

    const sellEscrow = new Map<string, bigint>();
    (activeOrders ?? []).forEach((o) => {
      if (o.isBuy) return;
      const m = o.maker.toLowerCase();
      sellEscrow.set(m, (sellEscrow.get(m) ?? 0n) + BigInt(o.remainingAmount));
    });

    let totalFimSupply = 0;
    const projectionPlayers: (ProjectionPlayer & { addr: string })[] = allStatsData.map((p) => {
      const raw = BigInt(p.fimBalance) + (sellEscrow.get(p.playerAddress.toLowerCase()) ?? 0n);
      const bal = Number(formatUnits(raw < 0n ? 0n : raw, 18));
      totalFimSupply += bal;
      return {
        addr: p.playerAddress.toLowerCase(),
        bal,
        netContribUsdc: Number(formatUnits(BigInt(p.netContribution || '0'), 6)),
      };
    });

    const agg = computeSettlementAggregates(projectionPlayers, totalFimSupply, dustThresholdFim);

    for (const pp of projectionPlayers) {
      const payout = projectPlayerPayout(pp, agg, {
        poolSize,
        totalFimSupply,
        dustThresholdFim,
        isOligarchyWin: winningSide === 'cap',
        hasWinner: winningSide !== 'none',
        progress: progressPercent / 100,
      });
      map.set(pp.addr, payout - pp.netContribUsdc);
    }
    return map;
  }, [allStatsData, activeOrders, poolSize, dustThresholdFim, winningSide, progressPercent]);

  return { projectedPnlByAddr, players: allStatsData, loading: statsLoading };
}
