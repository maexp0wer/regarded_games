// src/components/CreateOrderButton.tsx
'use client';

import { useEffect, useMemo } from 'react';
import { useAccount, useReadContract, useSimulateContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { contractAddresses, ExchangeABI, erc20ABI } from '@/lib/contracts';
import { Address, formatUnits } from 'viem';

interface CreateOrderButtonProps {
  USDCAmountToSpend: bigint;
  fimPricePerUSDC: bigint;
  hasSufficientUSDC: boolean;
}

export function CreateOrderButton({ USDCAmountToSpend, fimPricePerUSDC, hasSufficientUSDC }: CreateOrderButtonProps) {
  const { address, chain } = useAccount();
  const addresses = chain ? contractAddresses[chain.id as keyof typeof contractAddresses] : undefined;

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: addresses?.USDC,
    abi: erc20ABI,
    functionName: 'allowance',
    args: [address!, addresses?.Exchange!],
    query: { enabled: !!address && !!addresses }
  });

  const needsApproval = useMemo(() => {
    if (allowance === undefined || USDCAmountToSpend <= 0n) return false;
    return allowance < USDCAmountToSpend;
  }, [allowance, USDCAmountToSpend]);

  const { data: approveRequest } = useSimulateContract({
    address: addresses?.USDC, abi: erc20ABI, functionName: 'approve', args: [addresses?.Exchange!, USDCAmountToSpend],
    query: { enabled: needsApproval }
  });
  const { writeContract: approve, data: approveHash, isPending: isApproving } = useWriteContract();
  const { isLoading: isWaitingForApproval, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

  const { data: createOrderRequest, error: createOrderError } = useSimulateContract({
    address: addresses?.Exchange, abi: ExchangeABI, functionName: 'createBuyOrder', args: [USDCAmountToSpend, fimPricePerUSDC],
    query: { enabled: !needsApproval && hasSufficientUSDC && USDCAmountToSpend > 0n && fimPricePerUSDC > 0n }
  });
  const { writeContract: createOrder, data: createOrderHash, isPending: isCreating } = useWriteContract();
  const { isLoading: isWaitingForCreate, isSuccess: isCreateSuccess } = useWaitForTransactionReceipt({ hash: createOrderHash });

  useEffect(() => { if (isApprovalSuccess) refetchAllowance(); }, [isApprovalSuccess, refetchAllowance]);
  
  // --- UI State Machine ---
  type ButtonState = 'approve' | 'create' | 'approving' | 'creating' | 'insufficient_funds' | 'enter_details' | 'success';

  const buttonState: ButtonState = useMemo(() => {
    if (isCreateSuccess) return 'success';
    if (isApproving || isWaitingForApproval) return 'approving';
    if (isCreating || isWaitingForCreate) return 'creating';
    if (USDCAmountToSpend <= 0n || fimPricePerUSDC <= 0n) return 'enter_details';
    if (!hasSufficientUSDC) return 'insufficient_funds';
    if (needsApproval) return 'approve';
    return 'create';
  }, [isCreateSuccess, isApproving, isWaitingForApproval, isCreating, isWaitingForCreate, USDCAmountToSpend, fimPricePerUSDC, hasSufficientUSDC, needsApproval]);

  const buttonText = {
    approve: `Approve ${formatUnits(USDCAmountToSpend, 6)} USDC`,
    create: 'Create Buy Order',
    approving: 'Approving...',
    creating: 'Processing...',
    insufficient_funds: 'Insufficient USDC',
    enter_details: 'Enter Amount & Price',
    success: 'Order Created!',
  }[buttonState];

  const isDisabled = !createOrderRequest && !approveRequest;

  const getButtonClasses = () => {
    switch (buttonState) {
      case 'approve':
      case 'approving':
        return 'bg-primary text-bg';
      case 'create':
      case 'creating':
        return 'bg-secondary text-bg'; // Example: Use a secondary color for creating
      case 'success':
        return 'bg-success text-bg';
      default:
        return 'bg-card3 text-white';
    }
  };

  return (
    <>
      <button
        disabled={isDisabled}
        onClick={() => {
          if (buttonState === 'approve') approve(approveRequest!.request);
          if (buttonState === 'create') createOrder(createOrderRequest!.request);
        }}
        className={`w-full px-4 py-2 font-bold rounded-lg transition-colors ${getButtonClasses()} disabled:bg-card3 disabled:text-text/70 disabled:cursor-not-allowed`}
      >
        {buttonText}
      </button>
      <div className="text-xs text-center text-text/70 pt-2 space-y-1">
        <p>USDC Allowance for Exchange: {allowance !== undefined ? formatUnits(allowance, 6) : '...'} USDC</p>
        {createOrderError && <p className="text-danger font-semibold">Error: {createOrderError.message}</p>}
      </div>
    </>
  );
}