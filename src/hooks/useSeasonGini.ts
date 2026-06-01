'use client';

import { useQuery } from "@tanstack/react-query";
import { useReadContract } from 'wagmi';
import { formatUnits } from "viem";
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';
import { useTenantPonderUrl, useTenantChainId } from '@/context/TenantContext';

const CONTROLLER_SEASONS_ABI = [
  {
    type: "function",
    name: "seasons",
    inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "season", type: "address" },
      { name: "auction", type: "address" },
      { name: "exchange", type: "address" },
      { name: "fim", type: "address" },
    ],
    stateMutability: "view",
  },
] as const;

// --- Types ---
export interface SeasonLiveStats {
  gini: number;       // BPS (0-10000)
  playerCount: number;
  prizePool: number;          // Base pool: auction-contributed USDC only (no yield)
  distributablePayout: number; // Sum of finalized player payouts (includes reinvested yield)
}

export interface SeasonMetadata {
  address: string;
  fimAddress: string;
  exchangeAddress: string;
  auctionAddress: string;
}

// --- Helper: Gini Math ---
function calculateGiniBps(balances: number[]): number {
  if (balances.length === 0) return 0;
  const sorted = [...balances].sort((a, b) => a - b);
  const N = sorted.length;
  let accumulator = 0;
  let totalBalance = 0;

  for (let i = 0; i < N; i++) {
    const bal = sorted[i];
    const rank = i + 1;
    accumulator += rank * bal;
    totalBalance += bal;
  }

  if (totalBalance === 0) return 0;
  const term1 = (2 * accumulator) / (N * totalBalance);
  const term2 = (N + 1) / N;
  const gini = term1 - term2;
  return Math.max(0, Math.floor(gini * 10000));
}

// --- Hook 1: Metadata by Slug ---
export function useSeasonById(slug: string | undefined) {
  const PONDER_URL = useTenantPonderUrl();
  return useQuery<SeasonMetadata | null>({
    queryKey: ["seasonById", slug, PONDER_URL],
    queryFn: async () => {
      if (!slug) return null;
      const numberPart = slug.replace(/[^0-9]/g, '');
      if (!numberPart) return null;
      const dbId = (BigInt(numberPart) - 1n).toString();

      const query = `
        query GetSeasonByNumber($id: BigInt!) {
          seasonss(where: { seasonId: $id }) {
            items { address fimAddress exchangeAddress auctionAddress }
          }
        }
      `;

      const response = await fetch(PONDER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { id: dbId } }),
      });

      const result = await response.json();
      return result?.data?.seasonss?.items[0] || null;
    },
    enabled: !!slug,
    staleTime: Infinity,
  });
}

// --- Hook 2: The Core Logic (Gini + Unfilled Orders) ---
export function useSeasonGini(seasonAddress: string | undefined) {
  const PONDER_URL = useTenantPonderUrl();
  const chainId = useTenantChainId();
  const { data: thresholdRaw } = useReadContract({
    address: seasonAddress as `0x${string}`,
    abi: GameSeasonAbi as any,
    functionName: 'existentialThreshold',
    chainId,
    query: { enabled: !!seasonAddress }
  });

  const threshold = thresholdRaw ? BigInt(thresholdRaw.toString()) : 0n;

  return useQuery<SeasonLiveStats | null>({
    queryKey: ["seasonGini", seasonAddress?.toLowerCase(), threshold.toString(), PONDER_URL],
    queryFn: async () => {
      if (!seasonAddress) return null;
      const addr = seasonAddress.toLowerCase();

      const query = `
        query GetGiniData($address: String!) {
          playerSeasonStatss(where: { seasonAddress: $address }, limit: 1000) {
            items { playerAddress fimBalance fimBurned totalPotentialPayout }
          }
          orderss(where: { seasonAddress: $address, active: true, isBuy: false }, limit: 1000) {
            items { maker remainingAmount }
          }
          seasonss(where: { address: $address }) {
            items { prizePool exchangeAddress }
          }
        }
      `;

      const response = await fetch(PONDER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { address: addr } }),
      });

      const result = await response.json();
      const rawPlayers = result?.data?.playerSeasonStatss?.items || [];
      const rawOrders = result?.data?.orderss?.items || [];
      const seasonInfo = result?.data?.seasonss?.items[0];
      const exchangeAddr = seasonInfo?.exchangeAddress?.toLowerCase();

      // 1. Aggregate tokens locked in SELL orders
      const orderWealth: Record<string, bigint> = {};
      rawOrders.forEach((o: any) => {
        const m = o.maker.toLowerCase();
        orderWealth[m] = (orderWealth[m] || 0n) + BigInt(o.remainingAmount);
      });

      // 2. Combine Wallet + Sell Orders (using effective balance: fimBalance + fimBurned)
      const wealthMap = new Map<string, bigint>();
      rawPlayers.forEach((p: any) => {
        const effectiveBalance = BigInt(p.fimBalance) + BigInt(p.fimBurned || "0");
        wealthMap.set(p.playerAddress.toLowerCase(), effectiveBalance);
      });
      Object.entries(orderWealth).forEach(([maker, amt]) => {
        wealthMap.set(maker, (wealthMap.get(maker) || 0n) + amt);
      });

      // 3. Filter by Threshold & Calculate
      const balances: number[] = [];
      wealthMap.forEach((total, player) => {
        if (player !== exchangeAddr && total >= threshold) {
          balances.push(Number(total / 1000000000000000000n));
        }
      });

      // 4. Sum every player's finalized payout. Only populated during settlement/
      // payout; this total already includes the reinvested Aave yield, so the
      // frontend can derive the "Prize Pool Bonus" even when the YieldHarvested
      // event hasn't been indexed (reinvest bucket would otherwise read 0).
      const totalDistributableRaw = rawPlayers.reduce(
        (acc: bigint, p: any) => acc + BigInt(p.totalPotentialPayout || "0"),
        0n
      );

      return {
        gini: calculateGiniBps(balances),
        playerCount: balances.length,
        prizePool: Number(BigInt(seasonInfo?.prizePool || "0")) / 1_000_000,
        distributablePayout: Number(totalDistributableRaw) / 1_000_000
      };
    },
    enabled: !!seasonAddress,
    refetchInterval: 5000,
  });
}

// --- Hook 3: Combined "By ID" Hook ---
export function useGiniById(slug: string | undefined) {
  // First, get the address
  const { data: metadata, isLoading: loadingMeta } = useSeasonById(slug);
  
  // Second, get the Gini using that address
  const giniQuery = useSeasonGini(metadata?.address);

  return {
    ...giniQuery,
    isLoading: loadingMeta || giniQuery.isLoading,
    metadata
  };
}