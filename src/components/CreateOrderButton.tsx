// src/components/CreateOrderButton.tsx
'use client';

import { useEffect, useMemo } from 'react';
import { useAccount, useReadContract, useSimulateContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { contractAddresses, exchangeABI, erc20ABI } from '@/lib/contracts';
import { Address, formatUnits } from 'viem';
import { useExchangeContext } from '@/context/ExchangeContext';
import { useUserHoldingsContext } from '@/context/UserHoldingsContext';

interface CreateOrderButtonProps {
  usdcAmountToSpend: bigint;
  fimPricePerUsdc: bigint;
  hasSufficientUsdc: boolean;
}

export function CreateOrderButton({ usdcAmountToSpend, fimPricePerUsdc, hasSufficientUsdc }: CreateOrderButtonProps) {
  const { address, chain } = useAccount();
  const { refetchOrders } = useExchangeContext();
  const { refetch: refetchHoldings } = useUserHoldingsContext(); // Get refetch for holdings
  const addresses = chain ? contractAddresses[chain.id as keyof typeof contractAddresses] : undefined;

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: addresses?.USDC,
    abi: erc20ABI,
    functionName: 'allowance',
    args: [address!, addresses?.Exchange!],
    query: { enabled: !!address && !!addresses }
  });

  const needsApproval = useMemo(() => {
    if (allowance === undefined || usdcAmountToSpend <= 0n) return false;
    return allowance < usdcAmountToSpend;
  }, [allowance, usdcAmountToSpend]);

  const { data: approveRequest } = useSimulateContract({
    address: addresses?.USDC, abi: erc20ABI, functionName: 'approve', args: [addresses?.Exchange!, usdcAmountToSpend],
    query: { enabled: needsApproval }
  });
  const { writeContract: approve, data: approveHash, isPending: isApproving } = useWriteContract();
  const { isLoading: isWaitingForApproval, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

  const { data: createOrderRequest, error: createOrderError } = useSimulateContract({
    address: addresses?.Exchange,
    abi: exchangeABI,
    // 🔴 THE FIX IS HERE 🔴
    functionName: 'createBid', // Changed from 'createBuyOrder' to 'createBid'
    args: [usdcAmountToSpend, fimPricePerUsdc],
    query: { enabled: !needsApproval && hasSufficientUsdc && usdcAmountToSpend > 0n && fimPricePerUsdc > 0n }
  });
  const { writeContract: createOrder, data: createOrderHash, isPending: isCreating } = useWriteContract();
  const { isLoading: isWaitingForCreate, isSuccess: isCreateSuccess } = useWaitForTransactionReceipt({ hash: createOrderHash });

  useEffect(() => { if (isApprovalSuccess) refetchAllowance(); }, [isApprovalSuccess, refetchAllowance]);
  useEffect(() => {
    if (isCreateSuccess) {
      refetchOrders();
      refetchHoldings();
    }
  }, [isCreateSuccess, refetchOrders, refetchHoldings]);
  
  // --- UI State Machine ---
  type ButtonState = 'approve' | 'create' | 'approving' | 'creating' | 'insufficient_funds' | 'enter_details' | 'success';

  const buttonState: ButtonState = useMemo(() => {
    if (isCreateSuccess) return 'success';
    if (isApproving || isWaitingForApproval) return 'approving';
    if (isCreating || isWaitingForCreate) return 'creating';
    if (usdcAmountToSpend <= 0n || fimPricePerUsdc <= 0n) return 'enter_details';
    if (!hasSufficientUsdc) return 'insufficient_funds';
    if (needsApproval) return 'approve';
    return 'create';
  }, [isCreateSuccess, isApproving, isWaitingForApproval, isCreating, isWaitingForCreate, usdcAmountToSpend, fimPricePerUsdc, hasSufficientUsdc, needsApproval]);

  const buttonText = {
    approve: `Approve ${formatUnits(usdcAmountToSpend, 6)} USDC`,
    create: 'Create Buy Order',
    approving: 'Approving...',
    creating: 'Processing...',
    insufficient_funds: 'Insufficient USDC',
    enter_details: 'Enter Amount & Price',
    success: 'Order Created!',
  }[buttonState];

  const isDisabled = buttonState === 'enter_details' || buttonState === 'insufficient_funds' || buttonState === 'approving' || buttonState === 'creating' || buttonState === 'success';

  const getButtonClasses = () => {
    switch (buttonState) {
      case 'approve': case 'approving': return 'bg-primary text-bg';
      case 'create': case 'creating': return 'bg-secondary text-bg';
      case 'success': return 'bg-success text-bg';
      default: return 'bg-card3 text-white';
    }
  };

  return (
    <>
      <button
        disabled={isDisabled}
        onClick={() => {
          if (buttonState === 'approve') approve(approveRequest!.request);
          else if (buttonState === 'create') createOrder(createOrderRequest!.request);
        }}
        className={`w-full px-4 py-2 font-bold rounded-lg transition-colors ${getButtonClasses()} disabled:bg-card3 disabled:text-text/70 disabled:cursor-not-allowed`}
      >
        {buttonText}
      </button>
      <div className="text-xs text-center text-text/70 pt-2 space-y-1">
        <p>USDC Allowance for Exchange: {allowance !== undefined ? formatUnits(allowance, 6) : '...'} USDC</p>
        {createOrderError && <p className="text-danger font-semibold break-all">{createOrderError.message}</p>}
      </div>
    </>
  );
}