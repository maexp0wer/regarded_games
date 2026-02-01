'use client';

import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";

const PONDER_URL = "http://127.0.0.1:42069/graphql";

export interface MyOrder {
  id: string;
  orderId: bigint;
  isBuy: boolean;
  price: number;
  remainingAmount: number;
  initialAmount: number;
  timestamp: number;
}

export function useOpenOrders(seasonAddress: string | undefined, userAddress: string | undefined) {
  return useQuery({
    queryKey: ["myOrders", seasonAddress, userAddress],
    queryFn: async () => {
      if (!seasonAddress || !userAddress) return [];

      const query = `
        query GetMyOrders($season: String!, $maker: String!) {
          orderss(
            where: { 
              seasonAddress: $season, 
              maker: $maker, 
              active: true 
            },
            orderBy: "timestamp",
            orderDirection: "desc"
          ) {
            items {
              id
              orderId
              isBuy
              price
              initialAmount
              remainingAmount
              timestamp
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
            variables: { 
              season: seasonAddress.toLowerCase(),
              maker: userAddress.toLowerCase() 
            } 
          }),
        });

        const res = await response.json();
        const items = res.data?.orderss?.items || [];

        return items.map((o: any) => ({
          id: o.id,
          orderId: BigInt(o.orderId),
          isBuy: o.isBuy,
          // Convert BigInt strings to human numbers
          price: Number(formatUnits(BigInt(o.price), 6)), // USDC 6 decimals
          remainingAmount: Number(formatUnits(BigInt(o.remainingAmount), 18)),
          initialAmount: Number(formatUnits(BigInt(o.initialAmount), 18)),
          timestamp: Number(o.timestamp),
        })) as MyOrder[];

      } catch (e) {
        console.error("MyOrders fetch failed", e);
        return [];
      }
    },
    enabled: !!seasonAddress && !!userAddress,
    refetchInterval: 3000,
  });
}