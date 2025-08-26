// src/components/FillOrderButton.tsx
'use client';

import { useEffect, useMemo } from 'react';
import { useAccount, useReadContract, useSimulateContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { contractAddresses, exchangeABI, erc20ABI } from '@/lib/contracts';
import { useUserHoldingsContext } from '@/context/UserHoldingsContext';
import { Address } from 'viem';

interface FillOrderButtonProps {
  orderId: bigint;
}

export function FillOrderButton({ orderId }: FillOrderButtonProps) {
  const { address, chain } = useAccount();
  // We now get the correct state from the context
  const { fimBalanceBigInt, refetch: refetchHoldings } = useUserHoldingsContext();
  const addresses = chain ? contractAddresses[chain.id as keyof typeof contractAddresses] : undefined;

  // 1. Check FIM allowance for the Exchange
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: addresses?.fimToken,
    abi: erc20ABI,
    functionName: 'allowance',
    args: [address!, addresses?.exchange!],
    query: { enabled: !!address && !!addresses }
  });

  const needsApproval = useMemo(() => {
    if (allowance === undefined || fimBalanceBigInt === 0n) return false;
    return allowance < fimBalanceBigInt;
  }, [allowance, fimBalanceBigInt]);

  // 2. Prepare the FIM Approve transaction
  const { data: approveRequest } = useSimulateContract({
    address: addresses?.fimToken,
    abi: erc20ABI,
    functionName: 'approve',
    args: [addresses?.exchange!, fimBalanceBigInt], // Approve full balance
    query: { enabled: needsApproval }
  });
  const { writeContract: approve, data: approveHash, isPending: isApproving } = useWriteContract();
  const { isLoading: isWaitingForApproval, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

  // 3. Prepare the Fill Order transaction
  const { data: fillOrderRequest } = useSimulateContract({
    address: addresses?.exchange,
    abi: exchangeABI,
    functionName: 'fillBuyOrder',
    args: [orderId, fimBalanceBigInt], // Fill with full balance
    query: { enabled: !needsApproval && fimBalanceBigInt > 0n }
  });
  const { writeContract: fillOrder, data: fillOrderHash, isPending: isFilling } = useWriteContract();
  const { isLoading: isWaitingForFill, isSuccess: isFillSuccess } = useWaitForTransactionReceipt({ hash: fillOrderHash });
  
  // React to successful transactions
  useEffect(() => {
    if (isApprovalSuccess) refetchAllowance();
    if (isFillSuccess) refetchHoldings();
  }, [isApprovalSuccess, isFillSuccess, refetchAllowance, refetchHoldings]);

  const handleClick = () => {
    if (needsApproval && approveRequest) {
      approve(approveRequest.request);
    } else if (!needsApproval && fillOrderRequest) {
      fillOrder(fillOrderRequest.request);
    }
  };
  
  const isLoading = isApproving || isWaitingForApproval || isFilling || isWaitingForFill;

  if (fimBalanceBigInt === 0n) {
    return <button disabled className="px-2 py-1 text-xs text-gray-500 cursor-not-allowed">No FIM</button>;
  }

  return (
    <button onClick={handleClick} disabled={isLoading} className="px-2 py-1 bg-success text-bg rounded-md text-xs disabled:bg-gray-400">
      {isLoading ? '...' : needsApproval ? 'Approve & Fill' : 'Fill'}
    </button>
  );
}