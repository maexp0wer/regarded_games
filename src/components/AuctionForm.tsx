// src/components/AuctionForm.tsx
'use client';

import { useAuctionContext } from '@/context/AuctionContext';
import { useUserHoldingsContext } from '@/context/UserHoldingsContext';
import { parseUnits } from 'viem';

export function AuctionForm() {
  // 1. Destructure `buttonState` so we can use it for styling
  const { 
    USDCAmount, 
    setUSDCAmount, 
    buttonState,
    buttonText, 
    isButtonDisabled, 
    handleActionClick, 
    currentAllowance, 
    buyFimError 
  } = useAuctionContext();
  
  const { usdcBalance, usdcBalanceBigInt } = useUserHoldingsContext();

  const amountToSpend = USDCAmount ? parseUnits(USDCAmount, 6) : 0n;
  const hasSufficientUSDC = usdcBalanceBigInt >= amountToSpend;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // This regex matches numbers with up to 6 decimal places.
    // It will effectively prevent the 7th decimal from being typed.
    const regex = /^(\d*)(\.?)(\d{0,6})/;
    const match = value.match(regex);
    
    if (match) {
      // Reconstruct the sanitized value from the regex match
      const sanitizedValue = match[1] + match[2] + match[3];
      setUSDCAmount(sanitizedValue);
    } else if (value === '') {
      // Allow the user to clear the input
      setUSDCAmount('');
    }
  };

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
            id="USDC-amount" 
            type="number" 
            value={USDCAmount} 
            onChange={handleAmountChange}
            placeholder="e.g., 100" 
            className="mt-1 block w-full px-3 py-2 border border-card2 bg-input rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            step="0.000001"
          />
        </div>

        {USDCAmount && !hasSufficientUSDC && (
          <div className="p-2 rounded-md bg-danger/10 text-danger text-sm font-semibold text-center">
            Insufficient USDC balance.
          </div>
        )}

        <button
          disabled={isButtonDisabled || (!!USDCAmount && !hasSufficientUSDC)}
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