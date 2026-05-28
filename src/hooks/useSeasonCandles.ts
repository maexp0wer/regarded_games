'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAllPonderItems } from '@/lib/ponder';
import { CandleData } from '@/utils/chartData';
import { useTenantPonderUrl } from '@/context/TenantContext';

interface SeasonCandle {
  bucketTs: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  closePrice: string;
  capBuyerVolume: string;
  socBuyerVolume: string;
  giniBps: number;
}

const QUERY = `
  query GetSeasonCandles($season: String!, $tf: String!, $after: String, $limit: Int!) {
    candless(
      where: { seasonAddress: $season, timeframe: $tf }
      orderBy: "bucketTs"
      orderDirection: "asc"
      after: $after
      limit: $limit
    ) {
      items {
        bucketTs openPrice highPrice lowPrice closePrice
        capBuyerVolume socBuyerVolume giniBps
      }
      pageInfo { endCursor hasNextPage }
    }
  }
`;

export function useSeasonCandles(
  seasonAddress: string | undefined,
  timeframe: string,
): { data: CandleData[] } {
  const PONDER_URL = useTenantPonderUrl();
  return useQuery({
    queryKey: ['seasonCandles', seasonAddress?.toLowerCase(), timeframe, PONDER_URL],
    enabled: !!seasonAddress,
    queryFn: async () => {
      const items = await fetchAllPonderItems<SeasonCandle>(
        PONDER_URL,
        QUERY,
        { season: seasonAddress!.toLowerCase(), tf: timeframe },
        (d) => d.candless,
      );
      return items.map((c): CandleData => ({
        time:           Number(BigInt(c.bucketTs)),
        open:           Number(BigInt(c.openPrice))  / 1e6,
        high:           Number(BigInt(c.highPrice))  / 1e6,
        low:            Number(BigInt(c.lowPrice))   / 1e6,
        close:          Number(BigInt(c.closePrice)) / 1e6,
        capBuyerVolume: Number(BigInt(c.capBuyerVolume)) / 1e18,
        socBuyerVolume: Number(BigInt(c.socBuyerVolume)) / 1e18,
        giniBps:        c.giniBps,
      }));
    },
    refetchInterval: 5000,
    staleTime: 4000,
  }) as { data: CandleData[] };
}
