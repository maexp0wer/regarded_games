'use client';

import { useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { useQuery } from '@tanstack/react-query'; // Import Query
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';

const PONDER_URL = "http://127.0.0.1:42069/graphql";

export interface PayoutData {
  payout: number;
  pnl: number;
  userFim: number;
  userNetContrib: number;
  hasBalance: boolean;
  hasClaimed: boolean; // New flag
  loading: boolean;
  refetch: () => void;
}

export function usePayout(seasonAddress: string, userAddress: string | undefined): PayoutData {
  
  // 1. Fetch RPC Data (Unclaimed / Live State)
  const { data: rpcData, isLoading: rpcLoading, refetch: refetchRpc } = useReadContracts({
    contracts: [
      { address: seasonAddress as `0x${string}`, abi: GameSeasonAbi, functionName: 'finalPayoutUSDC', args: [userAddress!] },
      { address: seasonAddress as `0x${string}`, abi: GameSeasonAbi, functionName: 'netContributions', args: [userAddress!] },
      { address: seasonAddress as `0x${string}`, abi: GameSeasonAbi, functionName: 'fimBalances', args: [userAddress!] }
    ],
    query: { enabled: !!seasonAddress && !!userAddress }
  });

  // 2. Fetch Ponder Data (Claimed / Historical State)
  const { data: ponderData, isLoading: ponderLoading, refetch: refetchPonder } = useQuery({
    queryKey: ["payoutHistory", seasonAddress, userAddress],
    queryFn: async () => {
      if (!seasonAddress || !userAddress) return null;
      const query = `
        query GetHistory($season: String!, $player: String!) {
          playerSeasonStats(seasonAddress: $season, playerAddress: $player) {
            realizedPayout
          }
        }
      `;
      const res = await fetch(PONDER_URL, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { season: seasonAddress.toLowerCase(), player: userAddress.toLowerCase() } })
      });
      const json = await res.json();
      return json?.data?.playerSeasonStats;
    },
    enabled: !!seasonAddress && !!userAddress
  });

  // --- MERGE LOGIC ---
  const isLoading = rpcLoading || ponderLoading;

  const refetch = () => { refetchRpc(); refetchPonder(); };

  if (isLoading || !rpcData) {
    return { payout: 0, pnl: 0, userFim: 0, userNetContrib: 0, hasBalance: false, hasClaimed: false, loading: true, refetch };
  }

  try {
    const unclaimedPayoutRaw = rpcData[0].result as bigint || 0n;
    const contribRaw = rpcData[1].result as bigint || 0n;
    const balanceRaw = rpcData[2].result as bigint || 0n;
    const claimedPayoutRaw = BigInt(ponderData?.realizedPayout || "0");

    // Total Value = What is sitting in contract + What was already taken out
    const totalValueRaw = unclaimedPayoutRaw + claimedPayoutRaw;

    // Formatting
    const payoutUsdc = Number(formatUnits(unclaimedPayoutRaw, 6)); // Redeemable Now
    const totalValueUsdc = Number(formatUnits(totalValueRaw, 6));  // Total Won
    const contribUsdc = Number(formatUnits(contribRaw, 6)); 
    const fimBal = Number(formatUnits(balanceRaw, 18));

    return {
        payout: payoutUsdc, // This goes to 0 after claim
        pnl: totalValueUsdc - contribUsdc, // This stays constant!
        userFim: fimBal,
        userNetContrib: contribUsdc,
        hasBalance: balanceRaw > 0n,
        hasClaimed: claimedPayoutRaw > 0n,
        loading: false,
        refetch
    };
  } catch (e) {
    return { payout: 0, pnl: 0, userFim: 0, userNetContrib: 0, hasBalance: false, hasClaimed: false, loading: false, refetch };
  }
}