// src/components/FillOrderButton.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAccount, useReadContract, useSimulateContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { contractAddresses, exchangeABI, erc20ABI } from '@/lib/contracts';
import { useUserHoldingsContext } from '@/context/UserHoldingsContext';
import { Address, parseUnits } from 'viem';
import { Order, OrderType } from '@/hooks/useExchange';
import { useExchangeContext } from '@/context/ExchangeContext';

interface FillOrderButtonProps {
  order: Order;
}

export function FillOrderButton({ order }: FillOrderButtonProps) {
  const { address, chain } = useAccount();
  const { usdcBalanceBigInt, fimBalanceBigInt, refetch: refetchHoldings } = useUserHoldingsContext();
  const { refetchOrders } = useExchangeContext();
  const addresses = chain ? contractAddresses[chain.id as keyof typeof contractAddresses] : undefined;

  const [fillAmount, setFillAmount] = useState('');

  // --- Smart State Calculation ---
  const isBid = order.orderType === OrderType.BID; // True if this is a buy order (user sells FIM)
  const tokenToProvide = isBid ? addresses?.FIMToken : addresses?.USDC;
  const balanceToCheck = isBid ? fimBalanceBigInt : usdcBalanceBigInt;
  const decimals = isBid ? 18 : 6;

  const amountToProvide = fillAmount ? parseUnits(fillAmount, decimals) : 0n;
  
  const maxAmountUserCanProvide = useMemo(() => {
    let maxFromOrder: bigint;
    if (isBid) { // Order wants FIM, defined by its remaining USDC
      maxFromOrder = (order.amountRemaining * order.amountToBuy) / order.amountToSell;
    } else { // Order wants USDC
      maxFromOrder = order.amountRemaining;
    }
    // User can provide the lesser of what they have and what the order can take
    return balanceToCheck < maxFromOrder ? balanceToCheck : maxFromOrder;
  }, [order, balanceToCheck, isBid]);
  
  const hasSufficientBalance = balanceToCheck >= amountToProvide;
  const exceedsOrderCapacity = amountToProvide > maxAmountUserCanProvide;

  // --- Wagmi Hooks ---
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenToProvide,
    abi: erc20ABI,
    functionName: 'allowance',
    args: [address!, addresses?.Exchange!],
    query: { enabled: !!address && !!addresses && !!tokenToProvide }
  });

  const needsApproval = allowance !== undefined && allowance < amountToProvide;

  const { data: approveRequest } = useSimulateContract({
    address: tokenToProvide,
    abi: erc20ABI,
    functionName: 'approve',
    args: [addresses?.Exchange!, amountToProvide],
    query: { enabled: needsApproval && amountToProvide > 0n }
  });
  const { writeContract: approve, data: approveHash, isPending: isApproving } = useWriteContract();
  const { isLoading: isWaitingForApproval, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

  const { data: fillOrderRequest, error: fillError } = useSimulateContract({
    address: addresses?.Exchange,
    abi: exchangeABI,
    functionName: 'fillOrder',
    args: [order.id, amountToProvide],
    query: { enabled: !needsApproval && hasSufficientBalance && !exceedsOrderCapacity && amountToProvide > 0n }
  });
  const { writeContract: fillOrder, data: fillOrderHash, isPending: isFilling } = useWriteContract();
  const { isLoading: isWaitingForFill, isSuccess: isFillSuccess } = useWaitForTransactionReceipt({ hash: fillOrderHash });
  
  useEffect(() => {
    if (isApprovalSuccess) refetchAllowance();
    if (isFillSuccess) {
      refetchHoldings();
      refetchOrders();
      setFillAmount(''); // Reset form on success
    }
  }, [isApprovalSuccess, isFillSuccess, refetchAllowance, refetchHoldings, refetchOrders]);

  const handleClick = () => {
    if (needsApproval && approveRequest) {
      approve(approveRequest.request);
    } else if (!needsApproval && fillOrderRequest) {
      fillOrder(fillOrderRequest.request);
    }
  };
  
  const isLoading = isApproving || isWaitingForApproval || isFilling || isWaitingForFill;

  let buttonText = 'Fill';
  if (isLoading) buttonText = '...';
  else if (needsApproval) buttonText = 'Approve';

  let isDisabled = isLoading || (!approveRequest && !fillOrderRequest) || exceedsOrderCapacity;
  if (fillError) console.log(fillError);

  return (
    <div className="flex items-center gap-1 justify-end">
      <input
        type="number"
        value={fillAmount}
        onChange={e => setFillAmount(e.target.value)}
        placeholder="Amount"
        className="w-16 bg-input rounded text-xs p-1 border border-card2"
      />
      <button 
        onClick={handleClick} 
        disabled={isDisabled} 
        className="px-2 py-1 bg-success text-bg rounded-md text-xs disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {buttonText}
      </button>
    </div>
  );
}