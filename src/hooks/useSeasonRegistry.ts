'use client';

import { useQuery } from '@tanstack/react-query';
import { usePublicClient } from 'wagmi';
import { Address, getAddress } from 'viem';
import type { Abi } from 'abitype';
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';
import { useTenantDeployment, useTenantChainId } from '@/context/TenantContext';

/* The season registry: every season the controller has ever created, with its
   live phase. Walks GameController.seasons(i) from 0 until the call reverts —
   there is no count getter — reading getPhase() for each hit.
   Shared by SeasonsList (renders them all) and the /play/[phase] resolvers
   (pick the newest one in a phase), so both read one cache entry instead of
   duplicating the walk under different keys. */

const GAME_CONTROLLER_SEASONS_ABI = [
  {
    "type": "function",
    "name": "seasons",
    "inputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "outputs": [
      { "name": "season", "type": "address" },
      { "name": "auction", "type": "address" },
      { "name": "exchange", "type": "address" },
      { "name": "fim", "type": "address" }
    ],
    "stateMutability": "view"
  },
] as const;

const GAME_SEASON_FULL_ABI = GameSeasonAbi as Abi;

/** Hard stop on the registry walk, matching the original inline implementation. */
const MAX_SEASONS = 50;

export type SeasonRegistryEntry = {
  /** Zero-based registry index. The season NUMBER (and slug) is id + 1. */
  id: number;
  season: Address;
  phase: string;
};

/** Route slug for a registry entry — the form /app/[seasonSlug] expects. */
export const seasonSlug = (id: number) => `season_${id + 1}`;

export function useSeasonRegistry() {
  const chainId = useTenantChainId();
  const coreDeployment = useTenantDeployment();
  const controllerAddress = getAddress(coreDeployment.Controller) as Address;
  const publicClient = usePublicClient({ chainId });

  return useQuery({
    queryKey: ['allSeasons_v3', chainId, controllerAddress],
    queryFn: async () => {
      if (!controllerAddress || !publicClient) return [];
      const allSeasons: SeasonRegistryEntry[] = [];

      for (let i = 0; i < MAX_SEASONS; i++) {
        try {
          const data = await publicClient.readContract({
            address: controllerAddress,
            abi: GAME_CONTROLLER_SEASONS_ABI,
            functionName: 'seasons',
            args: [BigInt(i)] as const,
          }) as [Address, Address, Address, Address];

          const phase = await publicClient.readContract({
            address: data[0], abi: GAME_SEASON_FULL_ABI, functionName: 'getPhase'
          });

          allSeasons.push({ id: i, season: data[0], phase: phase as string });
        } catch { break; }
      }
      return allSeasons;
    },
    enabled: !!controllerAddress && !!publicClient,
    // Slow data: keeps the row set + Active/All filter phase live so new seasons
    // appear and phase transitions (e.g. TRADING → PAYOUT) move rows without a reload.
    refetchInterval: 15000,
  });
}
