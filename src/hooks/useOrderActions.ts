// src/hooks/useOrderActions.ts
'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { parseUnits } from 'viem';
import { useUserHoldingsContext } from '@/context/UserHoldingsContext';

export interface OrderActionsState {
  // Create Order Form State
  createUSDCAmount: string;
  setCreateUSDCAmount: (amount: string) => void;
  createFimPrice: string;
  setCreateFimPrice: (price: string) => void;
  
  // Derived values for the create order button to use
  USDCAmountToSpend: bigint;
  fimPricePerUSDC: bigint;
  hasSufficientUSDC: boolean;
}

export function useOrderActions(): OrderActionsState {
  const { isConnected } = useAccount();
  const { usdcBalanceBigInt } = useUserHoldingsContext();

  const [createUSDCAmount, setCreateUSDCAmount] = useState('');
  const [createFimPrice, setCreateFimPrice] = useState('');

  const USDCAmountToSpend = createUSDCAmount ? parseUnits(createUSDCAmount, 6) : 0n;
  const fimPricePerUSDC = createFimPrice ? parseUnits(createFimPrice, 18) : 0n;
  const hasSufficientUSDC = isConnected && usdcBalanceBigInt >= USDCAmountToSpend;

  return {
    createUSDCAmount,
    setCreateUSDCAmount,
    createFimPrice,
    setCreateFimPrice,
    USDCAmountToSpend,
    fimPricePerUSDC,
    hasSufficientUSDC,
  };
}