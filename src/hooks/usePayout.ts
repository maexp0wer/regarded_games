'use client';

import { useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';
import { useTenantChainId } from '@/context/TenantContext';
import { useSeasonPlayers } from './useSeasonPlayers';
import { useSeasonActiveOrders } from './useSeasonActiveOrders';
import { useSeasonGini } from './useSeasonGini';
import { useYieldTotals } from './useYieldTotals';
import { useSeasonVictory } from './useSeasonVictory';
import { useSeasonPhase } from './useSeasonPhase';
import {
  computeSettlementAggregates,
  projectPlayerPayout,
  ProjectionPlayer,
} from '@/utils/payoutProjection';

export interface PayoutData {
  payout: number;           // Projected/realized USDC payout (pool-proportional)
  yieldPayout: number;      // Portion of payout attributable to the Aave yield bonus (pure P/L upside)
  pnl: number;              // payout − net contribution
  userFim: number;          // Live FIM Balance (from RPC; season ledger — zeroed at claim)
  finalFim: number;         // Finalized season holdings (from Ponder; survives the claim)
  userNetContrib: number;   // Raw Net Contribution in USDC (from Ponder)
  contribution: number;     // netContrib − fimHeld: 0 when all trades at 1 USDC/FIM
  fimBurned: number;        // FIM Burned (from Ponder)
  hasBalance: boolean;
  hasClaimed: boolean;
  realizedPayout: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePayout(seasonAddress: string | undefined, userAddress: string | undefined): PayoutData {
  const chainId = useTenantChainId();

  // 1. Live RPC reads. `computePayout` is the contract's exact lazy payout calc —
  //    authoritative once the season is in DISTRIBUTION (returns 0 before settlement
  //    and once claimed). `hasClaimed` distinguishes "already claimed" from "nothing owed".
  const { data: rpcData, isLoading: rpcLoading, refetch: refetchRpc } = useReadContracts({
    contracts: [
      { address: seasonAddress as `0x${string}`, abi: GameSeasonAbi, functionName: 'fimBalances', args: [userAddress!], chainId },
      { address: seasonAddress as `0x${string}`, abi: GameSeasonAbi, functionName: 'computePayout', args: [userAddress!], chainId },
      { address: seasonAddress as `0x${string}`, abi: GameSeasonAbi, functionName: 'hasClaimed', args: [userAddress!], chainId },
      { address: seasonAddress as `0x${string}`, abi: GameSeasonAbi, functionName: 'existentialThresholdFim', chainId },
      { address: seasonAddress as `0x${string}`, abi: GameSeasonAbi, functionName: 'forcedDraw', chainId },
    ],
    query: { enabled: !!seasonAddress && !!userAddress }
  });

  // 2. Ponder + derived inputs for the client-side projection.
  const { data: players, isLoading: playersLoading, refetch: refetchPlayers } = useSeasonPlayers(seasonAddress);
  const { data: activeOrders } = useSeasonActiveOrders(seasonAddress);
  const { data: giniData } = useSeasonGini(seasonAddress);
  const { data: yieldTotals } = useYieldTotals(seasonAddress);
  const { winningSide, progressPercent } = useSeasonVictory(seasonAddress);
  const { isPayout } = useSeasonPhase(seasonAddress);

  const ponderData = (seasonAddress && userAddress && players)
    ? players.find(p => p.playerAddress.toLowerCase() === userAddress.toLowerCase()) ?? null
    : null;

  // Distributable pool: base prize pool (auction USDC + trading fees) + reinvested
  // Aave yield bonus — the same `seasonPrincipals` the contract pays out from.
  const dustThresholdFim = rpcData?.[3]?.result
    ? Number(formatUnits(rpcData[3].result as bigint, 18))
    : 0;
  // Any Council flag (ADR-0008) forces the whole season to settle as a draw —
  // every player is repriced to the draw distribution, not just the flagged one.
  const isForcedDraw = rpcData?.[4]?.result === true;
  const basePool = giniData?.prizePool ?? 0;
  const yieldBonus = Number(formatUnits(BigInt(yieldTotals?.reinvest || '0'), 6));
  const poolSize = basePool + yieldBonus;

  // Every payout term is linear in pool size, so the yield-bonus-attributed slice
  // of any payout is just its pro-rata fraction of the total pool. It costs the
  // player nothing, so the whole slice is upside (pure P/L).
  const yieldFraction = poolSize > 0 ? yieldBonus / poolSize : 0;

  // Project the user's pool-proportional payout, mirroring on-chain settlement.
  const projectedPayout = useMemo(() => {
    if (!userAddress || !players || poolSize <= 0) return 0;

    // Effective FIM held = wallet balance + the player's own escrowed sell-order FIM
    // (refunded before payout). Burned FIM is excluded — it no longer counts toward t_i.
    const sellEscrow = new Map<string, bigint>();
    (activeOrders ?? []).forEach((o) => {
      if (o.isBuy) return;
      const m = o.maker.toLowerCase();
      sellEscrow.set(m, (sellEscrow.get(m) ?? 0n) + BigInt(o.remainingAmount));
    });

    let totalFimSupply = 0;
    const projectionPlayers: ProjectionPlayer[] = players.map((p) => {
      const raw = BigInt(p.fimBalance) + (sellEscrow.get(p.playerAddress.toLowerCase()) ?? 0n);
      const bal = Number(formatUnits(raw < 0n ? 0n : raw, 18));
      totalFimSupply += bal;
      return {
        bal,
        netContribUsdc: Number(formatUnits(BigInt(p.netContribution || '0'), 6)),
      };
    });

    const meIdx = players.findIndex(
      (p) => p.playerAddress.toLowerCase() === userAddress.toLowerCase(),
    );
    if (meIdx === -1) return 0;

    const agg = computeSettlementAggregates(projectionPlayers, totalFimSupply, dustThresholdFim);
    return projectPlayerPayout(projectionPlayers[meIdx], agg, {
      poolSize,
      totalFimSupply,
      dustThresholdFim,
      isOligarchyWin: !isForcedDraw && winningSide === 'cap',
      hasWinner: !isForcedDraw && winningSide !== 'none',
      progress: progressPercent / 100,
    });
  }, [userAddress, players, activeOrders, poolSize, dustThresholdFim, winningSide, progressPercent, isForcedDraw]);

  // --- MERGE LOGIC ---
  const isLoading = rpcLoading || playersLoading;
  const refetch = () => { refetchRpc(); refetchPlayers(); };

  if (isLoading || !rpcData) {
    return { payout: 0, yieldPayout: 0, pnl: 0, userFim: 0, finalFim: 0, userNetContrib: 0, contribution: 0, fimBurned: 0, hasBalance: false, hasClaimed: false, realizedPayout: 0, loading: true, error: null, refetch };
  }

  // RPC Data Access
  const balanceRaw = rpcData[0].result as bigint || 0n;
  const pendingPayoutRaw = (rpcData[1]?.result as bigint) || 0n;  // computePayout (0 before settlement / once claimed)
  const hasClaimedOnChain = (rpcData[2]?.result as boolean) || false;
  const pendingPayout = Number(formatUnits(pendingPayoutRaw, 6));

  // Source priority for the displayed payout:
  //   1. Claimed → realized amount (from Ponder PayoutClaimed).
  //   2. In DISTRIBUTION → the contract's exact computePayout (authoritative;
  //      already includes yield + fees + Net-Contribution weighting). Its zeros
  //      are real (swept season, flagged wallet, dust) — never fall back to the
  //      projection here, DISTRIBUTION only starts once everything is final.
  //   3. Otherwise (TRADING through INVESTIGATION) → the client-side projection.
  const resolvePayout = (realized: number) =>
    hasClaimedOnChain ? realized
      : isPayout ? pendingPayout
      : projectedPayout;

  // Handle case where Ponder data is not yet available (game not finalized or player never interacted).
  // The contract reads (payout / hasClaimed) are still authoritative even without Ponder history.
  if (!ponderData) {
      const payout = resolvePayout(0);
      return {
          payout,
          yieldPayout: payout * yieldFraction,
          pnl: 0,
          userFim: Number(formatUnits(balanceRaw, 18)),
          finalFim: 0,
          userNetContrib: 0,
          contribution: 0,
          fimBurned: 0,
          hasBalance: balanceRaw > 0n,
          hasClaimed: hasClaimedOnChain,
          realizedPayout: 0,
          loading: false,
          error: null,
          refetch
      };
  }

  try {
    // Ponder Data (Convert string values to BigInt for safe math)
    const claimedPayoutRaw = BigInt(ponderData.realizedPayout || "0");
    const contribRaw = BigInt(ponderData.netContribution || "0");
    const burnedRaw = BigInt(ponderData.fimBurned || "0");

    // Formatting
    const contribUsdc = Number(formatUnits(contribRaw, 6));         // Net Contrib (Ponder)
    const fimBal = Number(formatUnits(balanceRaw, 18));            // Live FIM (RPC)
    const burned = Number(formatUnits(burnedRaw, 18));             // FIM Burned (Ponder)
    const realizedPayout = Number(formatUnits(claimedPayoutRaw, 6)); // Already Claimed (Ponder, via PayoutClaimed)

    const effectivePayout = resolvePayout(realizedPayout);

    return {
        payout: effectivePayout,          // Pool-proportional payout (projected, or exact once settled/claimed)
        yieldPayout: effectivePayout * yieldFraction,
        pnl: effectivePayout - contribUsdc,
        userFim: fimBal,
        finalFim: Number(formatUnits(BigInt(ponderData.fimBalance || '0'), 18)),
        userNetContrib: contribUsdc,
        contribution: contribUsdc - fimBal,
        fimBurned: burned,
        hasBalance: balanceRaw > 0n,
        hasClaimed: hasClaimedOnChain,
        realizedPayout: realizedPayout,
        loading: false,
        error: null,
        refetch
    };
  } catch (e) {
    console.error("Error processing payout data:", e);
    return { payout: 0, yieldPayout: 0, pnl: 0, userFim: 0, finalFim: 0, userNetContrib: 0, contribution: 0, fimBurned: 0, hasBalance: false, hasClaimed: false, realizedPayout: 0, loading: false, error: 'Failed to process payout data', refetch };
  }
}
