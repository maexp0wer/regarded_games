// src/hooks/useTradingForm.ts
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAccount, useReadContract, useSimulateContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { contractAddresses, erc20ABI } from '@/lib/contracts';
import { Address, parseUnits, formatUnits } from 'viem';

export type TradeSide = 'buy' | 'sell';

export interface TradingFormState {
  isMounted: boolean;
  tradeSide: TradeSide;
  setTradeSide: (side: TradeSide) => void;
  amount: string;
  setAmount: (amount: string) => void;
  amountAsBigInt: bigint;
  needsApproval: boolean;
  isApproving: boolean;
  approve: (() => void) | undefined;
  usdcAllowance: string;
  fimAllowance: string;
  refetchAllAllowances: () => void; // The single refetch function
}

export function useTradingForm(): TradingFormState {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);
  
  const { address, chain } = useAccount();
  const addresses = chain ? contractAddresses[chain.id as keyof typeof contractAddresses] : undefined;

  const [tradeSide, setTradeSide] = useState<TradeSide>('buy');
  const [amount, setAmount] = useState('');

  const tokenToTrade = useMemo(() => {
    if (!addresses) return undefined;
    return tradeSide === 'buy' ? addresses.USDC : addresses.FIMToken;
  }, [tradeSide, addresses]);
  
  const decimals = useMemo(() => (tradeSide === 'buy' ? 6 : 18), [tradeSide]);
  const amountAsBigInt = useMemo(() => {
    if (!amount) return 0n;
    try { return parseUnits(amount, decimals); } catch { return 0n; }
  }, [amount, decimals]);

  // --- 🔴 THE FIX: Centralized Allowance Fetching 🔴 ---
  const { data: usdcAllowanceData, refetch: refetchUsdcAllowance } = useReadContract({
    address: addresses?.USDC, abi: erc20ABI, functionName: 'allowance', args: [address!, addresses?.Exchange!],
    query: { enabled: !!address && !!addresses }
  });
  const { data: fimAllowanceData, refetch: refetchFimAllowance } = useReadContract({
    address: addresses?.FIMToken, abi: erc20ABI, functionName: 'allowance', args: [address!, addresses?.Exchange!],
    query: { enabled: !!address && !!addresses }
  });

  const activeAllowance = tradeSide === 'buy' ? usdcAllowanceData : fimAllowanceData;
  const needsApproval = useMemo(() => {
    if (activeAllowance === undefined || amountAsBigInt === 0n) return false;
    return activeAllowance < amountAsBigInt;
  }, [activeAllowance, amountAsBigInt]);

  const { data: approveRequest } = useSimulateContract({
    address: tokenToTrade, abi: erc20ABI, functionName: 'approve', args: [addresses?.Exchange!, amountAsBigInt],
    query: { enabled: needsApproval }
  });
  
  const { writeContract, data: approveHash, isPending: isSubmittingApproval } = useWriteContract();
  const { isLoading: isWaitingForApproval, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

  const refetchAllAllowances = useCallback(() => {
    refetchUsdcAllowance();
    refetchFimAllowance();
  }, [refetchUsdcAllowance, refetchFimAllowance]);

  useEffect(() => {
    if (isApprovalSuccess) {
      refetchAllAllowances();
    }
  }, [isApprovalSuccess, refetchAllAllowances]);

  useEffect(() => { setAmount(''); }, [tradeSide]);

  const approve = useMemo(() => {
    if (approveRequest) return () => writeContract(approveRequest.request);
    return undefined;
  }, [approveRequest, writeContract]);

  return {
    isMounted,
    tradeSide,
    setTradeSide,
    amount,
    setAmount,
    amountAsBigInt,
    needsApproval,
    isApproving: isSubmittingApproval || isWaitingForApproval,
    approve,
    usdcAllowance: usdcAllowanceData !== undefined ? formatUnits(usdcAllowanceData, 6) : '...',
    fimAllowance: fimAllowanceData !== undefined ? formatUnits(fimAllowanceData, 18) : '...',
    refetchAllAllowances,
  };
}