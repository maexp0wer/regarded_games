// src/components/CreateOrderForm.tsx
'use client';

import { useOrderActionsContext } from '@/context/OrderActionsContext';
import { useConnectionContext } from '@/context/ConnectionContext';
import { useUserHoldingsContext } from '@/context/UserHoldingsContext';
import { CreateOrderButton } from './CreateOrderButton';

export function CreateOrderForm() {
  const { isConnected } = useConnectionContext();
  const { createUSDCAmount, setCreateUSDCAmount, createFimPrice, setCreateFimPrice, USDCAmountToSpend, fimPricePerUSDC, hasSufficientUSDC } = useOrderActionsContext();
  const { usdcBalance } = useUserHoldingsContext();
      
  if (!isConnected) return null;

  return (
    // Use the main container style from your design system
    <div className="p-6 rounded-lg bg-card shadow-sm text-left w-full max-w-2xl mt-8 text-text">
      <h2 className="text-2xl font-semibold mb-4 text-text">Create Buy Order</h2>
      
      <div className="space-y-4">
        {/* USDC Amount Input */}
        <div>
          <div className="flex justify-between items-center text-xs text-text/70 mt-1">
            <span>USDC amount to spend</span>
            <span>Balance: {usdcBalance} USDC</span>
          </div>
          <input 
            id="create-USDC-amount" 
            type="number" 
            value={createUSDCAmount} 
            onChange={(e) => setCreateUSDCAmount(e.target.value)} 
            placeholder="e.g., 500" 
            className="mt-1 block w-full px-3 py-2 border border-card2 bg-input rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
          />
        </div>

        {/* FIM Price Input */}
        <div>
          <div className="flex justify-between items-center text-xs text-text/70 mt-1">
            <span>Price (FIM per USDC)</span>
          </div>
          <input 
            id="create-fim-price" 
            type="number" 
            value={createFimPrice} 
            onChange={(e) => setCreateFimPrice(e.target.value)} 
            placeholder="e.g., 1.5" 
            className="mt-1 block w-full px-3 py-2 border border-card2 bg-input rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Insufficient balance warning, styled to match */}
        {createUSDCAmount && !hasSufficientUSDC && (
          <div className="p-2 rounded-md bg-danger/10 text-danger text-sm font-semibold text-center">
            Insufficient USDC balance.
          </div>
        )}

        {/* The smart button handles all its own logic and styling */}
        <CreateOrderButton
          usdcAmountToSpend={USDCAmountToSpend}
          fimPricePerUsdc={fimPricePerUSDC}
          hasSufficientUsdc={hasSufficientUSDC}
        />
      </div>
    </div>
  );
}