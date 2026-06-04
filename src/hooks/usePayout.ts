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

  // 1. Fetch RPC Data (live/changing state). `computePayout` is the contract's
  // lazy payout calc — the source of truth for the pending figure (returns 0
  // once claimed). `hasClaimed` distinguishes "already claimed" from "nothing owed".
  const { data: rpcData, isLoading: rpcLoading, refetch: refetchRpc } = useReadContracts({
    contracts: [
      { address: seasonAddress as `0x${string}`, abi: GameSeasonAbi, functionName: 'fimBalances', args: [userAddress!], chainId },
      { address: seasonAddress as `0x${string}`, abi: GameSeasonAbi, functionName: 'computePayout', args: [userAddress!], chainId },
      { address: seasonAddress as `0x${string}`, abi: GameSeasonAbi, functionName: 'hasClaimed', args: [userAddress!], chainId },
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
    return { payout: 0, pnl: 0, userFim: 0, userNetContrib: 0, contribution: 0, fimBurned: 0, hasBalance: false, hasClaimed: false, realizedPayout: 0, loading: true, error: null, refetch };
  }

  // RPC Data Access
  const balanceRaw = rpcData[0].result as bigint || 0n;
  const pendingPayoutRaw = (rpcData[1]?.result as bigint) || 0n;  // computePayout (0 once claimed)
  const hasClaimedOnChain = (rpcData[2]?.result as boolean) || false;
  const pendingPayout = Number(formatUnits(pendingPayoutRaw, 6));

  // Handle case where Ponder data is not yet available (game not finalized or player never interacted).
  // The contract reads (payout / hasClaimed) are still authoritative even without Ponder history.
  if (!ponderData) {
      return {
          payout: pendingPayout,
          pnl: 0,
          userFim: Number(formatUnits(balanceRaw, 18)),
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

    // Total value won: live computePayout pre-claim, realized amount post-claim.
    const totalValueUsdc = hasClaimedOnChain ? realizedPayout : pendingPayout;

    return {
        payout: pendingPayout,            // Redeemable now, straight from computePayout (0 once claimed)
        pnl: totalValueUsdc - contribUsdc,
        userFim: fimBal,
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
    return { payout: 0, pnl: 0, userFim: 0, userNetContrib: 0, contribution: 0, fimBurned: 0, hasBalance: false, hasClaimed: false, realizedPayout: 0, loading: false, error: 'Failed to process payout data', refetch };
  }
}
