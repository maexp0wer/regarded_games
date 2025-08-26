// src/hooks/useUserHoldings.ts
'use client';

import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { formatUnits, Address } from 'viem';
import { gameSeasonABI, erc20ABI, contractAddresses } from '@/lib/contracts';
import { useConnectionContext } from '@/context/ConnectionContext';
import { useSeasonDataContext } from '@/context/SeasonDataContext';

export interface UserHoldingsState {
  isMounted: boolean;
  isLoading: boolean;
  fimBalance: string;
  fimBalanceBigInt: bigint; // 👈 ADD THIS
  usdcBalance: string;
  usdcBalanceBigInt: bigint;
  refetch: () => void; // 👈 ADD THIS
}

export function useUserHoldings(): UserHoldingsState {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const { address, isConnected, chain } = useConnectionContext();
  const { gameSeasonAddress } = useSeasonDataContext();
  const usdcAddress = chain ? contractAddresses[chain.id as keyof typeof contractAddresses]?.usdc : undefined;

  const { data: fimBalanceData, isLoading: isLoadingFim, refetch: refetchFim } = useReadContract({
    address: gameSeasonAddress, abi: gameSeasonABI, functionName: 'fimBalances', args: [address!],
    query: { enabled: isConnected && !!address && !!gameSeasonAddress, refetchInterval: 5000 }
  });

  const { data: usdcBalanceData, isLoading: isLoadingUsdc, refetch: refetchUsdc } = useReadContract({
    address: usdcAddress, abi: erc20ABI, functionName: 'balanceOf', args: [address!],
    query: { enabled: isConnected && !!address && !!usdcAddress, refetchInterval: 5000 }
  });

  const fimBalanceBigInt = fimBalanceData ?? 0n;
  const usdcBalanceBigInt = usdcBalanceData ?? 0n;

  const refetch = () => {
    refetchFim();
    refetchUsdc();
  };

  return {
    isMounted,
    isLoading: isLoadingFim || isLoadingUsdc,
    fimBalance: formatUnits(fimBalanceBigInt, 18),
    fimBalanceBigInt, // 👈 ADD THIS
    usdcBalance: formatUnits(usdcBalanceBigInt, 6),
    usdcBalanceBigInt,
    refetch, // 👈 ADD THIS
  };
}