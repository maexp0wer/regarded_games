'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  useAccount, useConnect, useDisconnect, useChainId,
  useSimulateContract, useWriteContract, useWaitForTransactionReceipt,
  useSwitchChain, usePublicClient
} from 'wagmi';
import { parseUnits, formatUnits, Address, zeroAddress } from 'viem'; // 👈 Import `zeroAddress`
import { hardhat } from 'wagmi/chains';
import { auctionTemplateABI, erc20ABI, contractAddresses } from '@/lib/contracts';

// The interface for the hook's return value
export interface AuctionState {
  isMounted: boolean;
  isConnected: boolean;
  address?: Address;
  connect: () => void;
  disconnect: () => void;
  isWrongNetwork: boolean;
  switchNetwork?: () => void;
  usdcAmount: string;
  setUsdcAmount: (amount: string) => void;
  buttonState: 'approve' | 'buy' | 'loading_allowance' | 'approving' | 'buying' | 'enter_amount' | 'success';
  buttonText: string;
  isButtonDisabled: boolean;
  handleActionClick: () => void;
  currentAllowance: string;
  error?: string;
}

export function useAuction(): AuctionState {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const [usdcAmount, setUsdcAmount] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [allowance, setAllowance] = useState<bigint | null>(null);
  const [isAllowanceLoading, setIsAllowanceLoading] = useState(true);

  const { address, isConnected, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient();
  
  const addresses = chain ? contractAddresses[chain.id as keyof typeof contractAddresses] : undefined;
  const isWrongNetwork = isConnected && !addresses;
  const amountToSpend = usdcAmount ? parseUnits(usdcAmount, 6) : 0n;

  const fetchAllowance = useCallback(async () => {
    if (!address || !addresses || !publicClient) return;
    setIsAllowanceLoading(true);
    try {
      const allowanceResult = await publicClient.readContract({
        address: addresses.usdc, abi: erc20ABI, functionName: 'allowance', args: [address, addresses.treasury],
      });
      setAllowance(allowanceResult);
    } catch (error) { console.error("Failed to fetch allowance:", error); setAllowance(null); }
    finally { setIsAllowanceLoading(false); }
  }, [address, addresses, publicClient]);

  useEffect(() => { fetchAllowance(); }, [fetchAllowance]);

  const handleBuySuccess = useCallback(() => {
    setShowSuccess(true);
    fetchAllowance();
    const timer = setTimeout(() => {
      setShowSuccess(false);
      setUsdcAmount('');
    }, 5000);
    return () => clearTimeout(timer);
  }, [fetchAllowance]);

  const needsApproval = !showSuccess && allowance !== null && allowance < amountToSpend;

  // --- Transactions (WITH THE DEFINITIVE FIX) ---
  const { data: approveRequest } = useSimulateContract({
    // 🔴 THE FIX IS HERE 🔴
    // We provide a valid fallback address when the hook should be disabled.
    // `zeroAddress` is a correctly typed, safe placeholder.
    address: addresses?.usdc ?? zeroAddress,
    abi: erc20ABI,
    functionName: 'approve',
    args: [addresses?.treasury ?? zeroAddress, amountToSpend],
    query: {
      // The enabled flag still controls whether the simulation actually RUNS.
      enabled: needsApproval && !!addresses,
    }
  });

  const { writeContract: approve, data: approveHash, isPending: isApproving } = useWriteContract();
  const { isLoading: isWaitingForApproval, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({ hash: approveHash });
  useEffect(() => { if(isApprovalSuccess) fetchAllowance(); }, [isApprovalSuccess, fetchAllowance]);

  const { data: buyFimRequest, error: buyFimError } = useSimulateContract({
    // 🔴 THE FIX IS HERE 🔴
    // We also provide a safe fallback address for this hook.
    address: addresses?.auction ?? zeroAddress,
    abi: auctionTemplateABI,
    functionName: 'buyFIM',
    args: [amountToSpend],
    query: {
      enabled: !needsApproval && amountToSpend > 0n && !!addresses,
    }
  });

  const { writeContract: buyFIM, data: buyFimHash, isPending: isBuying } = useWriteContract();
  const { isLoading: isWaitingForBuy, isSuccess: isBuySuccess } = useWaitForTransactionReceipt({ hash: buyFimHash });
  useEffect(() => { if (isBuySuccess) handleBuySuccess(); }, [isBuySuccess, handleBuySuccess]);

  // ... (State machine, handleActionClick, and return object remain the same as the previous correct version) ...
  const buttonState = useMemo(() => {
    if (showSuccess) return 'success';
    if (isAllowanceLoading) return 'loading_allowance';
    if (isApproving || isWaitingForApproval) return 'approving';
    if (isBuying || isWaitingForBuy) return 'buying';
    if (amountToSpend === 0n) return 'enter_amount';
    if (needsApproval) return 'approve';
    return 'buy';
  }, [showSuccess, isAllowanceLoading, isApproving, isWaitingForApproval, isBuying, isWaitingForBuy, amountToSpend, needsApproval]);

  const handleActionClick = () => {
    if (buttonState === 'approve' && approveRequest) {
      approve(approveRequest.request);
    } else if (buttonState === 'buy' && buyFimRequest) {
      buyFIM(buyFimRequest.request);
    }
  };

  const buttonText = {
    success: 'Success!', loading_allowance: 'Verifying...', approving: 'Approving...', buying: 'Processing...',
    enter_amount: 'Enter an amount', approve: `Approve ${usdcAmount} USDC`, buy: 'Buy FIM',
  }[buttonState];
  
  const isButtonDisabled = {
    success: true, loading_allowance: true, approving: true, buying: true, enter_amount: true,
    approve: !approveRequest, buy: !buyFimRequest,
  }[buttonState];

  if (!isMounted) {
    return {
      isMounted: false, isConnected: false, address: undefined, connect: () => {}, disconnect: () => {}, isWrongNetwork: false, switchNetwork: undefined,
      usdcAmount: '', setUsdcAmount: () => {}, buttonState: 'loading_allowance', buttonText: 'Loading...', isButtonDisabled: true, handleActionClick: () => {},
      currentAllowance: '...', error: undefined,
    };
  }
  
  return {
    isMounted, isConnected, address,
    connect: () => connect({ connector: connectors[0] }),
    disconnect, isWrongNetwork,
    switchNetwork: switchChain ? () => switchChain({ chainId: hardhat.id }) : undefined,
    usdcAmount, setUsdcAmount, buttonState, buttonText, isButtonDisabled, handleActionClick,
    currentAllowance: allowance !== null ? formatUnits(allowance, 6) : '...',
    error: buyFimError?.message,
  };
}