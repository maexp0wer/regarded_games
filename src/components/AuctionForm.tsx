// src/components/AuctionForm.tsx
'use client';

import { useAuctionContext } from '@/context/AuctionContext';
import { useUserHoldingsContext } from '@/context/UserHoldingsContext';
import { parseUnits } from 'viem';

export function AuctionForm() {
  // 1. Destructure `buttonState` so we can use it for styling
  const { 
    usdcAmount, 
    setUsdcAmount, 
    buttonState,
    buttonText, 
    isButtonDisabled, 
    handleActionClick, 
    currentAllowance, 
    buyFimError 
  } = useAuctionContext();
  
  const { usdcBalance, usdcBalanceBigInt } = useUserHoldingsContext();

  const amountToSpend = usdcAmount ? parseUnits(usdcAmount, 6) : 0n;
  const hasSufficientUsdc = usdcBalanceBigInt >= amountToSpend;

  const getButtonClasses = () => {
    switch (buttonState) {
      case 'approve':
      case 'approving':
        return 'bg-primary text-bg';
      case 'buy':
        return 'bg-primary text-bg';
      case 'buying':
      case 'success':
        return 'bg-success text-bg';
      default:
        return 'bg-card3 text-white';
    }
  };

  return (
    <div className="p-6 rounded-lg bg-card shadow-sm text-left w-full max-w-2xl mt-8 text-text">
      <h2 className="text-2xl font-semibold mb-4 text-text">Auction Portal</h2>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center text-xs text-text/70 mt-1">
            <span>Enter USDC amount to spend</span>
            <span>Balance: {usdcBalance} USDC</span>
          </div>
          <input 
            id="usdc-amount" 
            type="number" 
            value={usdcAmount} 
            onChange={(e) => setUsdcAmount(e.target.value)} 
            placeholder="e.g., 100" 
            className="mt-1 block w-full px-3 py-2 border border-card2 bg-input rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
          />
        </div>

        {usdcAmount && !hasSufficientUsdc && (
          <div className="p-2 rounded-md bg-danger/10 text-danger text-sm font-semibold text-center">
            Insufficient USDC balance.
          </div>
        )}

        {/* 🔴 THE FIX IS HERE 🔴 */}
        <button
          disabled={isButtonDisabled || (!!usdcAmount && !hasSufficientUsdc)}
          onClick={handleActionClick}
          className={`w-full px-4 py-2 font-bold rounded-lg transition-colors 
            ${getButtonClasses()} 
            disabled:cursor-not-allowed 
            ${buttonState !== 'success' ? 'disabled:bg-card3 disabled:text-white' : ''}
          `}
        >
          {buttonText}
        </button>

        <div className="text-xs text-center text-text/70 pt-2 space-y-1">
          <p>Current Allowance: {currentAllowance} USDC</p>
          {buyFimError && <p className="text-danger font-semibold">Error: {buyFimError}</p>}
        </div>
      </div>
    </div>
  );
}