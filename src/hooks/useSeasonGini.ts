'use client';

import { useQuery } from "@tanstack/react-query";
import { useReadContract } from 'wagmi';
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';

const PONDER_URL = "http://127.0.0.1:42069/graphql";

// --- Types ---
export interface SeasonLiveStats {
  gini: number;       // BPS (0-10000)
  playerCount: number;
  prizePool: number;
}

export interface SeasonMetadata {
  address: string;
  fimAddress: string;
  exchangeAddress: string;
}

// --- Helper: Gini Math (Matches Solidity) ---
function calculateGiniBps(balances: number[]): number {
  if (balances.length === 0) return 0;
  
  // 1. Sort Ascending (Poorest to Richest)
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

  // Formula: G = (2 * Sum(i * y) / (N * Total)) - (N+1)/N
  const term1 = (2 * accumulator) / (N * totalBalance);
  const term2 = (N + 1) / N;
  const gini = term1 - term2;

  // Convert to BPS and clamp
  return Math.max(0, Math.floor(gini * 10000));
}

// --- Hook 1: Live Stats (Gini & Pool) ---
export function useSeasonGini(seasonAddress: string | undefined) {
  // 1. Fetch the threshold from the blockchain (Source of Truth)
  const { data: thresholdRaw } = useReadContract({
    address: seasonAddress as `0x${string}`,
    abi: GameSeasonAbi as any,
    functionName: 'existentialThreshold', // Matches your Solidity variable
    query: { enabled: !!seasonAddress }
  });

  const threshold = thresholdRaw ? BigInt(thresholdRaw.toString()) : 0n;

  return useQuery<SeasonLiveStats | null>({
    // 2. Add threshold to queryKey so it refetches if the threshold changes
    queryKey: ["seasonGini", seasonAddress?.toLowerCase(), threshold.toString()],
    queryFn: async () => {
      if (!seasonAddress) return null;

      const addr = seasonAddress.toLowerCase();

      const query = `
        query GetSeasonLiveStats($address: String!) {
          playerSeasonStatss(
            where: { seasonAddress: $address },
            orderBy: "fimBalance",
            orderDirection: "asc",
            limit: 1000 
          ) {
            items {
              playerAddress
              fimBalance
            }
          }
          seasonss(where: { address: $address }) {
            items {
              prizePool
              exchangeAddress
            }
          }
        }
      `;

      try {
        const response = await fetch(PONDER_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, variables: { address: addr } }),
        });

        const result = await response.json();
        const rawPlayers = result?.data?.playerSeasonStatss?.items || [];
        const seasonInfo = result?.data?.seasonss?.items[0];
        const exchangeAddr = seasonInfo?.exchangeAddress?.toLowerCase();

        // 3. APPLY THE EXISTENTIAL FILTER
        // We filter out the Exchange AND anyone below the threshold.
        // Because they are "non-existent," they are removed from the count (N).
        const validPlayers = rawPlayers.filter((p: any) => {
            const isExchange = exchangeAddr && p.playerAddress.toLowerCase() === exchangeAddr;
            const isAboveThreshold = BigInt(p.fimBalance) >= threshold;
            return !isExchange && isAboveThreshold;
        });

        // 4. Normalize Balances (Wei -> Ether) using only the valid participants
        const balances = validPlayers.map((p: any) => {
            return Number(BigInt(p.fimBalance) / 1000000000000000000n);
        });

        const giniBps = calculateGiniBps(balances);

        const rawPool = BigInt(seasonInfo?.prizePool || "0");
        const prizePoolFormatted = Number(rawPool) / 1_000_000;

        return {
          gini: giniBps,
          playerCount: validPlayers.length, // Now reflects only active players
          prizePool: prizePoolFormatted
        };
      } catch (error) {
        console.error("Indexer Error:", error);
        return { gini: 0, playerCount: 0, prizePool: 0 };
      }
    },
    enabled: !!seasonAddress,
    refetchInterval: 5000,
  });
}

// --- Hook 2: Metadata by Slug ---
export function useSeasonById(slug: string | undefined) {
  return useQuery<SeasonMetadata | null>({
    queryKey: ["seasonById", slug],
    queryFn: async () => {
      if (!slug) return null;

      // Extract number from slug (e.g. "season_1" -> "1")
      const numberPart = slug.replace(/[^0-9]/g, '');
      if (!numberPart) return null;
      
      // Convert to 0-based index for DB lookup
      const dbId = (BigInt(numberPart) - 1n).toString();
      
      const query = `
        query GetSeasonByNumber($id: BigInt!) {
          seasonss(where: { seasonId: $id }) {
            items {
              address
              fimAddress
              exchangeAddress
              auctionAddress
            }
          }
        }
      `;

      try {
        const response = await fetch(PONDER_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            query, 
            variables: { id: dbId } 
          }),
        });

        const result = await response.json();
        const item = result?.data?.seasonss?.items[0];

        if (!item) return null;

        return {
          address: item.address,
          fimAddress: item.fimAddress,
          exchangeAddress: item.exchangeAddress,
          auctionAddress: item.auctionAddress
        };
      } catch (error) {
        console.error("Failed to fetch season metadata:", error);
        return null;
      }
    },
    enabled: !!slug,
    staleTime: Infinity,
  });
}