'use client';

import { useQuery } from '@tanstack/react-query';
import { formatUnits } from 'viem';
import { useTenantPonderUrl } from '@/context/TenantContext';

export interface AuctionMint {
  id: string;
  fimAmount: number;
  usdcAmount: number;
  timestamp: number;
}

const QUERY = `
  query GetMyAuctionMints($season: String!, $player: String!) {
    auctionMintss(
      where: { seasonAddress: $season, playerAddress: $player }
      orderBy: "timestamp"
      orderDirection: "desc"
    ) {
      items { id fimAmount usdcAmount timestamp }
    }
  }
`;

export function useMyAuctionMints(
  seasonAddress: string | undefined,
  userAddress: string | undefined,
) {
  const PONDER_URL = useTenantPonderUrl();
  return useQuery({
    queryKey: ['myAuctionMints', seasonAddress?.toLowerCase(), userAddress?.toLowerCase(), PONDER_URL],
    queryFn: async () => {
      const res = await fetch(PONDER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: QUERY,
          variables: {
            season: seasonAddress!.toLowerCase(),
            player: userAddress!.toLowerCase(),
          },
        }),
      });
      const json = await res.json();
      const items: any[] = json.data?.auctionMintss?.items ?? [];
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
