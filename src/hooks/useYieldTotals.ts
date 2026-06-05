'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAllPonderItems } from '@/lib/ponder';
import { useTenantPonderUrl } from '@/context/TenantContext';

interface YieldEvent {
  buybackAmt: string;
  liquidityAmt: string;
  reinvestAmt: string;
  daoAmt: string;
}

interface YieldTotals {
  buyback: string;
  liquidity: string;
  reinvest: string;
  dao: string;
}

const QUERY = `
  query GetYieldEvents($address: String!, $after: String, $limit: Int!) {
    yieldEventss(where: { seasonAddress: $address }, after: $after, limit: $limit) {
      items { buybackAmt liquidityAmt reinvestAmt daoAmt }
      pageInfo { endCursor hasNextPage }
    }
  }
`;

export function useYieldTotals(seasonAddress: string | undefined, _trigger?: unknown) {
  const PONDER_URL = useTenantPonderUrl();

  const { data, isLoading } = useQuery<YieldTotals>({
    queryKey: ['yieldTotals', seasonAddress?.toLowerCase(), PONDER_URL],
    enabled: !!seasonAddress,
    queryFn: async () => {
      const events = await fetchAllPonderItems<YieldEvent>(
        PONDER_URL,
        QUERY,
        { address: seasonAddress!.toLowerCase() },
        (d) => d.yieldEventss,
      );

      let buyback = 0n;
      let liquidity = 0n;
      let reinvest = 0n;
      let dao = 0n;
      for (const e of events) {
        buyback  += BigInt(e.buybackAmt  || '0');
        liquidity += BigInt(e.liquidityAmt || '0');
        reinvest  += BigInt(e.reinvestAmt  || '0');
        dao       += BigInt(e.daoAmt       || '0');
      }

      return {
        buyback:  buyback.toString(),
        liquidity: liquidity.toString(),
        reinvest:  reinvest.toString(),
        dao:       dao.toString(),
      };
    },
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  return {
    data: data ?? { buyback: '0', liquidity: '0', reinvest: '0', dao: '0' },
    loading: isLoading,
  };
}
