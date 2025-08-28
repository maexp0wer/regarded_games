// src/components/FillOrderButton.tsx
'use client';

import { useEffect, useMemo } from 'react';
import { useAccount, useSimulateContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { contractAddresses, exchangeABI } from '@/lib/contracts';
import { useUserHoldingsContext } from '@/context/UserHoldingsContext';
import { useExchangeContext } from '@/context/ExchangeContext';
import { useTradingFormContext } from '@/context/TradingFormContext';
import { Order, OrderType } from '@/hooks/useExchange';

interface FillOrderButtonProps { order: Order; }

export function FillOrderButton({ order }: FillOrderButtonProps) {
  const { chain } = useAccount();
  const { refetch: refetchHoldings } = useUserHoldingsContext();
  const { refetchOrders } = useExchangeContext();
  const { amountAsBigInt, needsApproval, tradeSide, setAmount } = useTradingFormContext();
  const addresses = chain ? contractAddresses[chain.id as keyof typeof contractAddresses] : undefined;

  const isBid = order.orderType === OrderType.BID;
  const canInteract = (isBid && tradeSide === 'sell') || (!isBid && tradeSide === 'buy');
  const { refetchAllowances } = useTradingFormContext();

  const amountToProvide = useMemo(() => {
    const maxFromOrder = isBid ? order.fimRemaining : order.usdcRemaining;
    return amountAsBigInt < maxFromOrder ? amountAsBigInt : maxFromOrder;
  }, [amountAsBigInt, order, isBid]);

  const { data: fillOrderRequest, error } = useSimulateContract({
    address: addresses?.Exchange,
    abi: exchangeABI,
    functionName: 'fillOrder',
    args: [order.id, amountToProvide],
    query: { enabled: canInteract && !needsApproval && amountToProvide > 0n }
  });
  const { writeContract: fillOrder, data: fillOrderHash, isPending: isFilling } = useWriteContract();
  const { isLoading: isWaitingForFill, isSuccess: isFillSuccess } = useWaitForTransactionReceipt({ hash: fillOrderHash });
  
  useEffect(() => {
    if (isFillSuccess) {
      refetchHoldings();
      refetchOrders();
      setAmount('');
      refetchAllowances();
    }
  }, [isFillSuccess, refetchHoldings, refetchOrders, setAmount]);

  // If the user's selected trade side doesn't match the order, show nothing interactive
  if (!canInteract) {
    return <span className="text-xs text-text/50">--</span>;
  }

  const isLoading = isFilling || isWaitingForFill;

  return (
    <button 
      onClick={() => fillOrder(fillOrderRequest!.request)} 
      disabled={isLoading || !fillOrderRequest} 
      className="px-2 py-1 bg-success text-bg rounded-md text-xs disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {isLoading ? '...' : 'Fill'}
    </button>
  );
}