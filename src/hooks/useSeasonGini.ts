'use client';

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useReadContract } from 'wagmi';
import type { Abi } from 'viem';
import GameSeasonAbiJson from '@/deployments/abis/GameSeason.json';

const GameSeasonAbi = GameSeasonAbiJson as Abi;
import { useTenantPonderUrl, useTenantChainId } from '@/context/TenantContext';
import { useSeasonPlayers } from './useSeasonPlayers';
import { useSeasonActiveOrders } from './useSeasonActiveOrders';
import { useSeasonInfo } from './useSeasonInfo';
import { giniBpsFromBalances } from '@/utils/gini';

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
// Derives entirely from the shared season primitives (players, active orders,
// season info) plus the on-chain existential threshold. No dedicated fetch.
export function useSeasonGini(seasonAddress: string | undefined) {
  const chainId = useTenantChainId();
  const { data: thresholdRaw } = useReadContract({
    address: seasonAddress as `0x${string}`,
    abi: GameSeasonAbi,
    functionName: 'existentialThresholdFim',
    chainId,
    query: { enabled: !!seasonAddress }
  });

  const threshold = thresholdRaw ? BigInt(thresholdRaw.toString()) : 0n;

  const { data: players, isLoading: playersLoading } = useSeasonPlayers(seasonAddress);
  const { data: activeOrders, isLoading: ordersLoading } = useSeasonActiveOrders(seasonAddress);
  const { data: seasonInfo, isLoading: infoLoading } = useSeasonInfo(seasonAddress);

  const data = useMemo<SeasonLiveStats | null>(() => {
    if (!seasonAddress || !players) return null;

    const sellOrders = (activeOrders ?? []).filter((o) => !o.isBuy);
    const exchangeAddr = seasonInfo?.exchangeAddress?.toLowerCase();

    // 1. Aggregate tokens locked in SELL orders
    const orderWealth: Record<string, bigint> = {};
    sellOrders.forEach((o) => {
      const m = o.maker.toLowerCase();
      orderWealth[m] = (orderWealth[m] || 0n) + BigInt(o.remainingAmount);
    });

    // 2. Combine Wallet + Sell Orders (using effective balance: fimBalance + fimBurned)
    const wealthMap = new Map<string, bigint>();
    players.forEach((p) => {
      const effectiveBalance = BigInt(p.fimBalance) + BigInt(p.fimBurned || "0");
      wealthMap.set(p.playerAddress.toLowerCase(), effectiveBalance);
    });
    Object.entries(orderWealth).forEach(([maker, amt]) => {
      wealthMap.set(maker, (wealthMap.get(maker) || 0n) + amt);
    });

    // 3. Collect raw-wei balances (exchange excluded). The existential-threshold
    //    filter and all integer math happen inside giniBpsFromBalances, which
    //    replays the contract's _calculateReg exactly — no float, no truncation.
    const balances: bigint[] = [];
    wealthMap.forEach((total, player) => {
      if (player !== exchangeAddr) {
        balances.push(total);
      }
    });

    // 4. Sum every player's finalized payout. Only populated during settlement/
    // payout; this total already includes the reinvested Aave yield, so the
    // frontend can derive the "Prize Pool Bonus" even when the YieldHarvested
    // event hasn't been indexed (reinvest bucket would otherwise read 0).
    const totalDistributableRaw = players.reduce(
      (acc, p) => acc + BigInt(p.totalPotentialPayout || "0"),
      0n
    );

    // playerCount mirrors the contract's effectivePopulation: holders clearing
    // the existential threshold (the same set Gini is computed over).
    const playerCount = balances.reduce((n, b) => (b >= threshold ? n + 1 : n), 0);

    return {
      gini: giniBpsFromBalances(balances, threshold),
      playerCount,
      prizePool: Number(BigInt(seasonInfo?.prizePool || "0")) / 1_000_000,
      distributablePayout: Number(totalDistributableRaw) / 1_000_000
    };
  }, [seasonAddress, players, activeOrders, seasonInfo, threshold]);

  const isLoading = !!seasonAddress && (playersLoading || ordersLoading || infoLoading);

  return { data, isLoading };
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
