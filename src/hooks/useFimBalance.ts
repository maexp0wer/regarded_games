// src/hooks/useFimBalance.ts
'use client';

import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { formatUnits, Address } from 'viem';
import { gameSeasonABI, erc20ABI, contractAddresses } from '@/lib/contracts';
import { useConnectionContext } from '@/context/ConnectionContext';
import { useSeasonDataContext } from '@/context/SeasonDataContext';

export interface FimBalanceState {
  isMounted: boolean;
  isLoading: boolean;
  fimBalance: string;
  fimBalanceBigInt: bigint;
  usdcBalance: string;
  usdcBalanceBigInt: bigint;
}

export function useFimBalance(): FimBalanceState {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  // 1. Get dependencies from other contexts
  const { address, isConnected, chain } = useConnectionContext(); // Get the `chain` object
  const { gameSeasonAddress } = useSeasonDataContext();

  // 🔴 THE FIX IS HERE 🔴
  // 2. Correctly derive the USDC contract address for the current chain.
  const usdcAddress = chain ? contractAddresses[chain.id as keyof typeof contractAddresses]?.usdc : undefined;

  // --- Fetch FIM Balance (Existing) ---
  const { data: fimBalanceData, isLoading: isLoadingFim } = useReadContract({
    address: gameSeasonAddress,
    abi: gameSeasonABI,
    functionName: 'fimBalances',
    args: [address!],
    query: {
      enabled: isConnected && !!address && !!gameSeasonAddress,
      refetchInterval: 5000,
    }
  });

  // --- Fetch USDC Balance ---
  const { data: usdcBalanceData, isLoading: isLoadingUsdc } = useReadContract({
    address: usdcAddress, // Use the correctly derived address
    abi: erc20ABI,
    functionName: 'balanceOf',
    args: [address!],
    query: {
      enabled: isConnected && !!address && !!usdcAddress, // Enable only when we have the address
      refetchInterval: 5000,
    }
  });

  const fimBalanceBigInt = fimBalanceData ?? 0n;
  const usdcBalanceBigInt = usdcBalanceData ?? 0n;

  return {
    isMounted,
    isLoading: isLoadingFim || isLoadingUsdc,
    fimBalance: formatUnits(fimBalanceBigInt, 18),
    fimBalanceBigInt,
    usdcBalance: formatUnits(usdcBalanceBigInt, 6),
    usdcBalanceBigInt,
  };
}