'use client';

import { useQuery } from '@tanstack/react-query';
import { formatUnits } from 'viem';
import { useTenantPonderUrl } from '@/context/TenantContext';
import { fetchAllPonderItems } from '@/lib/ponder';

export interface AuctionMint {
  id: string;
  fimAmount: number;
  usdcAmount: number;
  timestamp: number;
}

const QUERY = `
  query GetMyAuctionMints($season: String!, $player: String!, $after: String, $limit: Int!) {
    auctionMintss(
      where: { seasonAddress: $season, playerAddress: $player }
      orderBy: "timestamp"
      orderDirection: "desc"
      after: $after
      limit: $limit
    ) {
      items { id fimAmount usdcAmount timestamp }
      pageInfo { endCursor hasNextPage }
    }
  }
`;

interface RawMint {
  id: string;
  fimAmount: string;
  usdcAmount: string;
  timestamp: string;
}

export function useMyAuctionMints(
  seasonAddress: string | undefined,
  userAddress: string | undefined,
) {
  const PONDER_URL = useTenantPonderUrl();
  return useQuery({
    queryKey: ['myAuctionMints', seasonAddress?.toLowerCase(), userAddress?.toLowerCase(), PONDER_URL],
    queryFn: async () => {
      const items = await fetchAllPonderItems<RawMint>(
        PONDER_URL,
        QUERY,
        {
          season: seasonAddress!.toLowerCase(),
          player: userAddress!.toLowerCase(),
        },
        (d) => d.auctionMintss,
      );
      return items.map((m): AuctionMint => ({
        id: m.id,
        fimAmount: Number(formatUnits(BigInt(m.fimAmount), 18)),
        usdcAmount: Number(formatUnits(BigInt(m.usdcAmount), 6)),
        timestamp: Number(m.timestamp),
      }));
    },
    enabled: !!seasonAddress && !!userAddress,
    refetchInterval: 15000,
  });
}
