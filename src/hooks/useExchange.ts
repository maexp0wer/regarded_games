// src/hooks/useExchange.ts
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { contractAddresses, exchangeABI } from '@/lib/contracts';
import { Address, formatUnits } from 'viem';

export enum OrderType { BID, ASK }
export interface Order {
  id: bigint;
  creator: Address;
  orderType: OrderType;
  // Raw amounts from contract
  amountToSell: bigint;
  amountToBuy: bigint;
  amountFilled: bigint;
  // Derived UI values
  price: number; // ALWAYS in USDC per FIM
  fimRemaining: bigint;
  usdcRemaining: bigint;
}
export interface ExchangeState {
  isMounted: boolean;
  isLoading: boolean;
  bids: Order[];
  asks: Order[];
  refetchOrders: () => void;
}
type OrderResult = readonly [bigint, Address, number, bigint, bigint, bigint, number];

export function useExchange(): ExchangeState {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);
  const { chain } = useAccount();
  const addresses = chain ? contractAddresses[chain.id as keyof typeof contractAddresses] : undefined;
  const exchangeAddress = addresses?.Exchange;

  const { data: orderCounter, isLoading: isLoadingCounter, refetch: refetchCounter } = useReadContract({
    address: exchangeAddress, abi: exchangeABI, functionName: 'orderCounter',
    query: { enabled: !!exchangeAddress, refetchInterval: 10000 },
  });
  const totalOrders = orderCounter ? Number(orderCounter) : 0;

  const orderQueries = useMemo(() => {
    if (!exchangeAddress || totalOrders === 0) return [];
    return Array.from({ length: totalOrders }, (_, i) => ({
      address: exchangeAddress, abi: exchangeABI, functionName: 'orders', args: [BigInt(i + 1)],
    }));
  }, [exchangeAddress, totalOrders]);

  const { data: orderResults, isLoading: isLoadingOrders, refetch: refetchOrderDetails } = useReadContracts({
    contracts: orderQueries, query: { enabled: totalOrders > 0 },
  });

  const { bids, asks } = useMemo(() => {
    if (!orderResults) return { bids: [], asks: [] };
    
    const allOrders: Order[] = orderResults
      .filter(o => o.status === 'success' && (o.result as unknown as OrderResult)?.[6] === 0)
      .map(o => {
        const [id, creator, orderType, amountToSell, amountToBuy, amountFilled] = o.result as unknown as OrderResult;
        
        let price: number, fimRemaining: bigint, usdcRemaining: bigint;

        // 🔴 THE FIX IS HERE 🔴
        if (orderType === OrderType.BID) { // User is spending USDC (amountToSell) to buy FIM (amountToBuy)
          price = parseFloat(formatUnits(amountToSell, 6)) / parseFloat(formatUnits(amountToBuy, 18));
          usdcRemaining = amountToSell - amountFilled;
          // Use the correct `amountToSell` and `amountToBuy` variables from this scope
          fimRemaining = amountToSell > 0n ? (usdcRemaining * amountToBuy) / amountToSell : 0n;
        } else { // User is selling FIM (amountToSell) to receive USDC (amountToBuy)
          price = parseFloat(formatUnits(amountToBuy, 6)) / parseFloat(formatUnits(amountToSell, 18));
          fimRemaining = amountToSell - amountFilled;
          // Use the correct `amountToSell` and `amountToBuy` variables from this scope
          usdcRemaining = amountToSell > 0n ? (fimRemaining * amountToBuy) / amountToSell : 0n;
        }

        return { id, creator, orderType, amountToSell, amountToBuy, amountFilled, price, fimRemaining, usdcRemaining };
      });
      
    const bids = allOrders.filter(o => o.orderType === OrderType.BID).sort((a, b) => b.price - a.price);
    const asks = allOrders.filter(o => o.orderType === OrderType.ASK).sort((a, b) => a.price - b.price);
    
    return { bids, asks };
  }, [orderResults]);

  const refetchOrders = () => { refetchCounter(); refetchOrderDetails(); };

  return { isMounted, isLoading: isLoadingCounter || isLoadingOrders, bids, asks, refetchOrders };
}