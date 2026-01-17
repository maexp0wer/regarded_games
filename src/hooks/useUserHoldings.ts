// src/hooks/useUserHoldings.ts
'use client';

import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { formatUnits} from 'viem';
import { gameSeasonABI, erc20ABI, contractAddresses } from '@/lib/contracts';
import { useConnectionContext } from '@/context/ConnectionContext';
import { useSeasonDataContext } from '@/context/SeasonDataContext';

export interface UserHoldingsState {
  isMounted: boolean;
  isLoading: boolean;
  fimBalance: string;
  fimBalanceBigInt: bigint;
  usdcBalance: string;
  usdcBalanceBigInt: bigint;
  refetch: () => void;
}

export function useUserHoldings(): UserHoldingsState {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const { address, isConnected, chain } = useConnectionContext();
  const { gameSeasonAddress } = useSeasonDataContext();
  const USDCAddress = chain ? contractAddresses[chain.id as keyof typeof contractAddresses]?.USDC : undefined;

  const { data: fimBalanceData, isLoading: isLoadingFim, refetch: refetchFim } = useReadContract({
    address: gameSeasonAddress, abi: gameSeasonABI, functionName: 'fimBalances', args: [address!],
    query: { enabled: isConnected && !!address && !!gameSeasonAddress, refetchInterval: 5000 }
  });

  const { data: usdcBalanceData, isLoading: isLoadingUSDC, refetch: refetchUSDC } = useReadContract({
    address: USDCAddress, abi: erc20ABI, functionName: 'balanceOf', args: [address!],
    query: { enabled: isConnected && !!address && !!USDCAddress, refetchInterval: 5000 }
  });

  const fimBalanceBigInt = fimBalanceData ?? 0n;
  const usdcBalanceBigInt = usdcBalanceData ?? 0n;

  const refetch = () => {
    refetchFim();
    refetchUSDC();
  };

  return {
    isMounted,
    isLoading: isLoadingFim || isLoadingUSDC,
    fimBalance: formatUnits(fimBalanceBigInt, 18),
    fimBalanceBigInt,
    usdcBalance: formatUnits(usdcBalanceBigInt, 6),
    usdcBalanceBigInt,
    refetch,
  };
}