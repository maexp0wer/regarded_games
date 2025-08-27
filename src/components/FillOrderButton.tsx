// src/components/FillOrderButton.tsx
'use client';

import { useEffect, useMemo } from 'react';
import { useAccount, useReadContract, useSimulateContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { contractAddresses, ExchangeABI, erc20ABI } from '@/lib/contracts';
import { useUserHoldingsContext } from '@/context/UserHoldingsContext';
import { Order } from '@/hooks/useOrderBook'; // Import the Order type
import { Address } from 'viem';

interface FillOrderButtonProps {
  order: Order; // Pass the entire order object
}

export function FillOrderButton({ order }: FillOrderButtonProps) {
  const { address, chain } = useAccount();
  const { fimBalanceBigInt, refetch: refetchHoldings } = useUserHoldingsContext();
  const addresses = chain ? contractAddresses[chain.id as keyof typeof contractAddresses] : undefined;

  // --- Smart Calculation Logic ---
  const { fimAmountToSell, isMyOrder } = useMemo(() => {
    if (!order) return { fimAmountToSell: 0n, isMyOrder: false };
    // Calculate the max FIM this order can still buy
    const maxFimOrderCanBuy = (order.USDCAmountRemaining * order.fimPrice) / BigInt(10**6);
    // The user can only sell what they have, or what the order can afford, whichever is smaller
    const actualAmount = fimBalanceBigInt < maxFimOrderCanBuy ? fimBalanceBigInt : maxFimOrderCanBuy;
    return {
      fimAmountToSell: actualAmount,
      isMyOrder: address?.toLowerCase() === order.creator.toLowerCase(),
    };
  }, [order, fimBalanceBigInt, address]);

  // --- WAGMI Hooks ---
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: addresses?.FIMToken, abi: erc20ABI, functionName: 'allowance', args: [address!, addresses?.Exchange!],
    query: { enabled: !!address && !!addresses }
  });
  const needsApproval = allowance !== undefined && allowance < fimAmountToSell;

  const { data: approveRequest } = useSimulateContract({
    address: addresses?.FIMToken, abi: erc20ABI, functionName: 'approve', args: [addresses?.Exchange!, fimAmountToSell],
    query: { enabled: needsApproval && fimAmountToSell > 0n }
  });
  const { writeContract: approve, data: approveHash, isPending: isApproving } = useWriteContract();
  const { isLoading: isWaitingForApproval, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

  const { data: fillOrderRequest } = useSimulateContract({
    address: addresses?.Exchange, abi: ExchangeABI, functionName: 'fillBuyOrder', args: [order.id, fimAmountToSell],
    query: { enabled: !needsApproval && fimAmountToSell > 0n && !isMyOrder }
  });
  const { writeContract: fillOrder, data: fillOrderHash, isPending: isFilling } = useWriteContract();
  const { isLoading: isWaitingForFill, isSuccess: isFillSuccess } = useWaitForTransactionReceipt({ hash: fillOrderHash });
  
  useEffect(() => {
    if (isApprovalSuccess) refetchAllowance();
    if (isFillSuccess) refetchHoldings();
  }, [isApprovalSuccess, isFillSuccess, refetchAllowance, refetchHoldings]);

  const handleClick = () => {
    if (needsApproval) {
      approve(approveRequest!.request);
    } else {
      fillOrder(fillOrderRequest!.request);
    }
  };
  
  const isLoading = isApproving || isWaitingForApproval || isFilling || isWaitingForFill;

  if (isMyOrder) {
    return <span className="text-xs text-gray-500">Your Order</span>;
  }
  if (fimAmountToSell === 0n) {
    return <button disabled className="px-2 py-1 text-xs text-gray-500 cursor-not-allowed">No FIM</button>;
  }

  return (
    <button onClick={handleClick} disabled={isLoading || (!approveRequest && !fillOrderRequest)} className="px-2 py-1 bg-success text-bg rounded-md text-xs disabled:bg-gray-400">
      {isLoading ? '...' : needsApproval ? 'Approve & Fill' : 'Fill'}
    </button>
  );
}