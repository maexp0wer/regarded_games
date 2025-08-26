// src/hooks/useOrderBook.ts
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useReadContract, useReadContracts } from 'wagmi';
import { contractAddresses, exchangeABI } from '@/lib/contracts';
import { useAccount } from 'wagmi';
import { Address } from 'viem';

// The shape of a single order, processed for the UI
export interface Order {
  id: bigint;
  creator: Address;
  usdcAmountRemaining: bigint;
  fimPrice: bigint;
}

// The state provided by our hook
export interface OrderBookState {
  isMounted: boolean;
  isLoading: boolean;
  openOrders: Order[];
}

// 🔴 THE FIX (PART 1): Define the explicit tuple type returned by the smart contract.
// This must match the `orders` struct mapping in the ABI.
type OrderResult = readonly [
  id: bigint,
  creator: Address,
  usdcAmountTotal: bigint,
  usdcAmountFilled: bigint,
  fimPrice: bigint,
  status: number // enum OrderStatus (Open=0, Filled=1, Canceled=2)
];

export function useOrderBook(): OrderBookState {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const { chain } = useAccount();
  const addresses = chain ? contractAddresses[chain.id as keyof typeof contractAddresses] : undefined;
  const exchangeAddress = addresses?.exchange;

  // 1. Fetch the total number of orders ever created.
  const { data: orderCounter, isLoading: isLoadingCounter } = useReadContract({
    address: exchangeAddress,
    abi: exchangeABI,
    functionName: 'orderCounter',
    query: { enabled: !!exchangeAddress, refetchInterval: 10000 },
  });
  const totalOrders = orderCounter ? Number(orderCounter) : 0;

  // 2. Prepare a batch call to get the data for ALL orders.
  const orderQueries = useMemo(() => {
    if (!exchangeAddress || totalOrders === 0) return [];
    return Array.from({ length: totalOrders }, (_, i) => ({
      address: exchangeAddress,
      abi: exchangeABI,
      functionName: 'orders',
      args: [BigInt(i + 1)],
    }));
  }, [exchangeAddress, totalOrders]);

  // 3. Execute the batch call.
  const { data: orderResults, isLoading: isLoadingOrders } = useReadContracts({
    contracts: orderQueries,
    query: { enabled: totalOrders > 0 },
  });

  // 4. Process the raw results into a clean array of open orders.
  const openOrders = useMemo(() => {
    if (!orderResults) return [];
    
    return orderResults
      // 🔴 THE FIX (PART 2): Use a type guard and the safe double assertion.
      .filter(order => {
        if (order.status !== 'success') return false;
        // We can now safely cast the result to our known type.
        const result = order.result as unknown as OrderResult;
        // Filter for status === OrderStatus.Open (which is enum value 0)
        return result[5] === 0;
      })
      .map(order => {
        // Now that it's filtered, TypeScript knows `result` is valid and has our shape.
        const result = order.result as unknown as OrderResult;
        const [id, creator, usdcAmountTotal, usdcAmountFilled, fimPrice] = result;
        return {
          id,
          creator,
          usdcAmountRemaining: usdcAmountTotal - usdcAmountFilled,
          fimPrice,
        };
      })
      // Sort by highest price (most attractive order) first
      .sort((a, b) => (b.fimPrice > a.fimPrice ? 1 : -1));
  }, [orderResults]);

  return {
    isMounted,
    isLoading: isLoadingCounter || isLoadingOrders,
    openOrders,
  };
}