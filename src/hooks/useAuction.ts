// src/hooks/useAuction.ts
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, useSimulateContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits, Address, zeroAddress } from 'viem';
import { auctionTemplateABI, erc20ABI, contractAddresses } from '@/lib/contracts';

// This is the "return type" of our hook. It defines everything the UI components can use.
export interface AuctionState {
  usdcAmount: string;
  setUsdcAmount: (amount: string) => void;
  buttonState: 'approve' | 'buy' | 'loading_allowance' | 'approving' | 'buying' | 'enter_amount' | 'success' | 'no_wallet';
  buttonText: string;
  isButtonDisabled: boolean;
  handleActionClick: () => void;
  currentAllowance: string;
  buyFimError?: string;
}

export function useAuction(): AuctionState {
  const { address, isConnected, chain } = useAccount();
  const publicClient = usePublicClient();
  
  const [usdcAmount, setUsdcAmount] = useState('');
  const [allowance, setAllowance] = useState<bigint | null>(null);
  const [isAllowanceLoading, setIsAllowanceLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  const addresses = chain ? contractAddresses[chain.id as keyof typeof contractAddresses] : undefined;
  const amountToSpend = usdcAmount ? parseUnits(usdcAmount, 6) : 0n;

  const fetchAllowance = useCallback(async () => {
    // We don't need to check isConnected here, as the hook's enabled flags handle it.
    if (!address || !addresses || !publicClient) {
      // If we're not connected, ensure allowance is reset
      setAllowance(null);
      setIsAllowanceLoading(false);
      return;
    }
    setIsAllowanceLoading(true);
    try {
      const result = await publicClient.readContract({
        address: addresses.usdc, abi: erc20ABI, functionName: 'allowance', args: [address, addresses.treasury],
      });
      setAllowance(result);
    } catch (e) { console.error("Failed to fetch allowance", e); setAllowance(null); }
    finally { setIsAllowanceLoading(false); }
  }, [address, addresses, publicClient]);

  // Refetch allowance whenever the user or chain changes
  useEffect(() => {
    fetchAllowance();
  }, [fetchAllowance]);

  const needsApproval = !showSuccess && allowance !== null && allowance < amountToSpend;
  
  const { data: approveRequest } = useSimulateContract({
    address: addresses?.usdc ?? zeroAddress, abi: erc20ABI, functionName: 'approve', args: [addresses?.treasury ?? zeroAddress, amountToSpend], query: { enabled: needsApproval && !!addresses },
  });
  const { writeContract: approve, data: approveHash, isPending: isApproving } = useWriteContract();
  const { isLoading: isWaitingForApproval, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({ hash: approveHash });
  useEffect(() => { if (isApprovalSuccess) fetchAllowance(); }, [isApprovalSuccess, fetchAllowance]);

  const { data: buyFimRequest, error: rawBuyFimError } = useSimulateContract({
    address: addresses?.auction ?? zeroAddress, abi: auctionTemplateABI, functionName: 'buyFIM', args: [amountToSpend], query: { enabled: !needsApproval && amountToSpend > 0n && !!addresses },
  });
  const { writeContract: buyFIM, data: buyFimHash, isPending: isBuying } = useWriteContract();
  const { isLoading: isWaitingForBuy, isSuccess: isBuySuccess } = useWaitForTransactionReceipt({ hash: buyFimHash });
  const handleBuySuccess = useCallback(() => { setShowSuccess(true); fetchAllowance(); const timer = setTimeout(() => { setShowSuccess(false); setUsdcAmount(''); }, 5000); return () => clearTimeout(timer); }, [fetchAllowance]);
  useEffect(() => { if (isBuySuccess) handleBuySuccess(); }, [isBuySuccess, handleBuySuccess]);

  const buttonState = useMemo(() => {
    // 🔴 THE FIX IS HERE: We check isConnected directly from the useAccount hook.
    if (!isConnected || !addresses) return 'no_wallet';
    if (showSuccess) return 'success';
    if (isAllowanceLoading) return 'loading_allowance';
    if (isApproving || isWaitingForApproval) return 'approving';
    if (isBuying || isWaitingForBuy) return 'buying';
    if (amountToSpend === 0n) return 'enter_amount';
    if (needsApproval) return 'approve';
    return 'buy';
  }, [isConnected, addresses, showSuccess, isAllowanceLoading, isApproving, isWaitingForApproval, isBuying, isWaitingForBuy, amountToSpend, needsApproval]);
  
  const handleActionClick = () => { if (buttonState === 'approve' && approveRequest) approve(approveRequest.request); else if (buttonState === 'buy' && buyFimRequest) buyFIM(buyFimRequest.request); };
  
  return {
    usdcAmount,
    setUsdcAmount,
    buttonState,
    buttonText: { success: 'Success!', loading_allowance: 'Verifying...', approving: 'Approving...', buying: 'Processing...', enter_amount: 'Enter an amount', approve: `Approve ${usdcAmount} USDC`, buy: 'Buy FIM', no_wallet: 'Connect Wallet First' }[buttonState],
    isButtonDisabled: ['success', 'loading_allowance', 'approving', 'buying', 'enter_amount', 'no_wallet'].includes(buttonState) || (buttonState === 'approve' && !approveRequest) || (buttonState === 'buy' && !buyFimRequest),
    handleActionClick,
    currentAllowance: allowance !== null ? formatUnits(allowance, 6) : '...',
    buyFimError: rawBuyFimError?.message,
  };
}