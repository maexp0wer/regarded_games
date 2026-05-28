'use client';

import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { useTenantPonderUrl } from '@/context/TenantContext';

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
}

const OPEN_QUERY = `
  query GetMyOpenOrders($season: String!, $maker: String!) {
    orderss(
      where: { seasonAddress: $season, maker: $maker, active: true }
      orderBy: "timestamp"
      orderDirection: "desc"
    ) {
      items {
        id orderId isBuy price initialAmount remainingAmount isCancelled timestamp settledAt
      }
    }
  }
`;

const HISTORY_QUERY = `
  query GetMyHistoryOrders($season: String!, $maker: String!, $cancelled: Boolean!) {
    orderss(
      where: { seasonAddress: $season, maker: $maker, active: false, isCancelled: $cancelled }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: 50
    ) {
      items {
        id orderId isBuy price initialAmount remainingAmount isCancelled timestamp settledAt
      }
    }
  }
`;

function mapOrder(o: any): MyOrder {
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
  };
}

export function useOpenOrders(
  seasonAddress: string | undefined,
  userAddress: string | undefined,
  filter: OrderFilter = 'open',
) {
  const PONDER_URL = useTenantPonderUrl();
  return useQuery({
    queryKey: ["myOrders", seasonAddress, userAddress, filter, PONDER_URL],
    queryFn: async () => {
      if (!seasonAddress || !userAddress) return [];

      const isOpen = filter === 'open';
      const variables = isOpen
        ? { season: seasonAddress.toLowerCase(), maker: userAddress.toLowerCase() }
        : { season: seasonAddress.toLowerCase(), maker: userAddress.toLowerCase(), cancelled: filter === 'cancelled' };

      try {
        const response = await fetch(PONDER_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: isOpen ? OPEN_QUERY : HISTORY_QUERY, variables }),
        });
        const res = await response.json();
        const items = res.data?.orderss?.items || [];
        return items.map(mapOrder) as MyOrder[];
      } catch (e) {
        console.error("useOpenOrders fetch failed", e);
        return [];
      }
    },
    enabled: !!seasonAddress && !!userAddress,
    refetchInterval: filter === 'open' ? 3000 : 15000,
  });
}
