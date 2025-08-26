// src/hooks/useOrderActions.ts
'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { parseUnits } from 'viem';
import { useUserHoldingsContext } from '@/context/UserHoldingsContext';

export interface OrderActionsState {
  // Create Order Form State
  createUsdcAmount: string;
  setCreateUsdcAmount: (amount: string) => void;
  createFimPrice: string;
  setCreateFimPrice: (price: string) => void;
  
  // Derived values for the create order button to use
  usdcAmountToSpend: bigint;
  fimPricePerUsdc: bigint;
  hasSufficientUsdc: boolean;
}

export function useOrderActions(): OrderActionsState {
  const { isConnected } = useAccount();
  const { usdcBalanceBigInt } = useUserHoldingsContext();

  const [createUsdcAmount, setCreateUsdcAmount] = useState('');
  const [createFimPrice, setCreateFimPrice] = useState('');

  const usdcAmountToSpend = createUsdcAmount ? parseUnits(createUsdcAmount, 6) : 0n;
  const fimPricePerUsdc = createFimPrice ? parseUnits(createFimPrice, 18) : 0n;
  const hasSufficientUsdc = isConnected && usdcBalanceBigInt >= usdcAmountToSpend;

  return {
    createUsdcAmount,
    setCreateUsdcAmount,
    createFimPrice,
    setCreateFimPrice,
    usdcAmountToSpend,
    fimPricePerUsdc,
    hasSufficientUsdc,
  };
}