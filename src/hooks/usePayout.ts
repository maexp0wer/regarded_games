'use client';

import { useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';
import { useTenantChainId } from '@/context/TenantContext';
import { useSeasonPlayers } from './useSeasonPlayers';

export interface PayoutData {
  payout: number;           // Unclaimed payout (Calculated from Ponder)
  pnl: number;              // PnL (Calculated from Ponder)
  userFim: number;          // Live FIM Balance (from RPC)
  userNetContrib: number;   // Final Net Contribution (from Ponder)
  fimBurned: number;        // FIM Burned (from Ponder)
  hasBalance: boolean;
  hasClaimed: boolean;
  realizedPayout: number;
  loading: boolean;
  refetch: () => void;
}

export function usePayout(seasonAddress: string | undefined, userAddress: string | undefined): PayoutData {
  const chainId = useTenantChainId();

  // 1. Fetch RPC Data (Only need live/changing state: FIM Balance)
  const { data: rpcData, isLoading: rpcLoading, refetch: refetchRpc } = useReadContracts({
    contracts: [
      // fimBalances is the only value that changes frequently or is needed live.
      { address: seasonAddress as `0x${string}`, abi: GameSeasonAbi, functionName: 'fimBalances', args: [userAddress!], chainId }
    ],
    query: { enabled: !!seasonAddress && !!userAddress }
  });

  // 2. Derive Ponder Data (constant/historical) from the shared player cache.
  const { data: players, isLoading: playersLoading, refetch: refetchPlayers } = useSeasonPlayers(seasonAddress);
  const ponderData = (seasonAddress && userAddress && players)
    ? players.find(p => p.playerAddress.toLowerCase() === userAddress.toLowerCase()) ?? null
    : null;

  // --- MERGE LOGIC ---
  const isLoading = rpcLoading || playersLoading;
  const refetch = () => { refetchRpc(); refetchPlayers(); };

  if (isLoading || !rpcData) {
    return { payout: 0, pnl: 0, userFim: 0, userNetContrib: 0, fimBurned: 0, hasBalance: false, hasClaimed: false, realizedPayout: 0, loading: true, refetch };
  }

  // RPC Data Access (fimBalances is rpcData[0])
  const balanceRaw = rpcData[0].result as bigint || 0n;

  // Handle case where Ponder data is not yet available (game not finalized or player never interacted)
  if (!ponderData) {
      return {
          payout: 0,
          pnl: 0,
          userFim: Number(formatUnits(balanceRaw, 18)),
          userNetContrib: 0,
          fimBurned: 0,
          hasBalance: balanceRaw > 0n,
          hasClaimed: false,
          realizedPayout: 0,
          loading: false,
          refetch
      };
  }

  try {
    // Ponder Data (Convert string values to BigInt for safe math)
    const claimedPayoutRaw = BigInt(ponderData.realizedPayout || "0");
    const totalValueRaw = BigInt(ponderData.totalPotentialPayout || "0");
    const contribRaw = BigInt(ponderData.netContribution || "0");
    const burnedRaw = BigInt(ponderData.fimBurned || "0");

    // CALCULATE UNCLAIMED PAYOUT: Total Winnings - Total Already Claimed
    const unclaimedPayoutRaw = totalValueRaw > claimedPayoutRaw
        ? totalValueRaw - claimedPayoutRaw
        : 0n;

    // Formatting
    const payoutUsdc = Number(formatUnits(unclaimedPayoutRaw, 6)); // Redeemable Now (CALCULATED)
    const totalValueUsdc = Number(formatUnits(totalValueRaw, 6));  // Total Won (Ponder)
    const contribUsdc = Number(formatUnits(contribRaw, 6));         // Net Contrib (Ponder)
    const fimBal = Number(formatUnits(balanceRaw, 18));            // Live FIM (RPC)
    const burned = Number(formatUnits(burnedRaw, 18));             // FIM Burned (Ponder)
    const realizedPayout = Number(formatUnits(claimedPayoutRaw, 6)); // Already Claimed (Ponder)

    return {
        payout: payoutUsdc,
        pnl: totalValueUsdc - contribUsdc,
        userFim: fimBal,
        userNetContrib: contribUsdc,
        fimBurned: burned,
        hasBalance: balanceRaw > 0n,
        hasClaimed: claimedPayoutRaw > 0n,
        realizedPayout: realizedPayout,
        loading: false,
        refetch
    };
  } catch (e) {
    console.error("Error processing payout data:", e);
    return { payout: 0, pnl: 0, userFim: 0, userNetContrib: 0, fimBurned: 0, hasBalance: false, hasClaimed: false, realizedPayout: 0, loading: false, refetch };
  }
}
