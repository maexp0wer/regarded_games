'use client';

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { useTenantPonderUrl } from '@/context/TenantContext';
import { useSeasonActiveOrders } from './useSeasonActiveOrders';

export type OrderFilter = 'open' | 'filled' | 'cancelled';

export interface MyOrder {
  id: string;
  orderId: bigint;
  isBuy: boolean;
  price: number;
  remainingAmount: number;
  initialAmount: number;
  isCancelled: boolean;
  timestamp: number;
  settledAt?: number;
  feePaid: number;
}

// History (active: false) orders are NOT held by the shared active-orders
// primitive, so the filled/cancelled variants keep their own fetch.
const HISTORY_QUERY = `
  query GetMyHistoryOrders($season: String!, $maker: String!, $cancelled: Boolean!) {
    orderss(
      where: { seasonAddress: $season, maker: $maker, active: false, isCancelled: $cancelled }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: 50
    ) {
      items {
        id orderId isBuy price initialAmount remainingAmount isCancelled timestamp settledAt feePaid
      }
    }
  }
`;

interface RawOrder {
  id: string;
  orderId: string;
  isBuy: boolean;
  price: string;
  remainingAmount: string;
  initialAmount: string;
  isCancelled: boolean;
  timestamp: string;
  settledAt: string | null | undefined;
  feePaid?: string | null;
}

function mapOrder(o: RawOrder): MyOrder {
  return {
    id: o.id,
    orderId: BigInt(o.orderId),
    isBuy: o.isBuy,
    price: Number(formatUnits(BigInt(o.price), 6)),
    remainingAmount: Number(formatUnits(BigInt(o.remainingAmount), 18)),
    initialAmount: Number(formatUnits(BigInt(o.initialAmount), 18)),
    isCancelled: o.isCancelled,
    timestamp: Number(o.timestamp),
    settledAt: o.settledAt ? Number(o.settledAt) : undefined,
    feePaid: o.feePaid ? Number(formatUnits(BigInt(o.feePaid), 6)) : 0,
  };
}

export function useOpenOrders(
  seasonAddress: string | undefined,
  userAddress: string | undefined,
  filter: OrderFilter = 'open',
) {
  const PONDER_URL = useTenantPonderUrl();
  const isOpen = filter === 'open';

  // 'open' derives from the shared active-orders cache (filter by maker).
  const {
    data: activeOrders,
    isLoading: activeLoading,
    refetch: refetchActive,
  } = useSeasonActiveOrders(isOpen ? seasonAddress : undefined);

  const openOrders = useMemo<MyOrder[]>(() => {
    if (!isOpen || !userAddress || !activeOrders) return [];
    const maker = userAddress.toLowerCase();
    return activeOrders
      .filter((o) => o.maker.toLowerCase() === maker)
      .map(mapOrder)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [isOpen, userAddress, activeOrders]);

  // 'filled' / 'cancelled' keep their own history fetch.
  const {
    data: historyOrders,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["myOrdersHistory", seasonAddress, userAddress, filter, PONDER_URL],
    enabled: !isOpen && !!seasonAddress && !!userAddress,
    queryFn: async () => {
      if (!seasonAddress || !userAddress) return [];
      const variables = {
        season: seasonAddress.toLowerCase(),
        maker: userAddress.toLowerCase(),
        cancelled: filter === 'cancelled',
      };
      try {
        const response = await fetch(PONDER_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: HISTORY_QUERY, variables }),
        });
        const res = await response.json();
        const items = res.data?.orderss?.items || [];
        return items.map(mapOrder) as MyOrder[];
      } catch (e) {
        console.error("useOpenOrders fetch failed", e);
        return [];
      }
    },
    refetchInterval: 15000,
  });

  return {
    data: isOpen ? openOrders : (historyOrders ?? []),
    isLoading: isOpen ? activeLoading : historyLoading,
    refetch: isOpen ? refetchActive : refetchHistory,
  };
}
