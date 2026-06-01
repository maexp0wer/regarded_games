'use client';

import { useQuery } from '@tanstack/react-query';
import { formatUnits } from 'viem';
import { useTenantPonderUrl } from '@/context/TenantContext';

export function useLastTradePrice(seasonAddress: string | undefined) {
  const PONDER_URL = useTenantPonderUrl();
  return useQuery({
    queryKey: ['lastTradePrice', seasonAddress?.toLowerCase(), PONDER_URL],
    queryFn: async () => {
      const res = await fetch(PONDER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query LastTrade($season: String!) {
            tradess(where: { seasonAddress: $season }, orderBy: "timestamp", orderDirection: "desc", limit: 1) {
              items { fimAmount usdcAmount }
            }
          }`,
          variables: { season: seasonAddress!.toLowerCase() },
        }),
      });
      const json = await res.json();
      const item = json?.data?.tradess?.items?.[0];
      if (!item) return 0;
      const fim = Number(formatUnits(BigInt(item.fimAmount), 18));
      const usdc = Number(formatUnits(BigInt(item.usdcAmount), 6));
      return fim > 0 ? usdc / fim : 0;
    },
    enabled: !!seasonAddress,
    refetchInterval: 5000,
  });
}
