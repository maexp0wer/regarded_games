// src/components/AuctionForm.tsx
'use client';

import { useAuctionContext } from '@/context/AuctionContext';

export function AuctionForm() {
  const { usdcAmount, setUsdcAmount, buttonText, isButtonDisabled, handleActionClick, currentAllowance, buyFimError } = useAuctionContext();

  return (
    <div className="p-4 rounded-lg bg-card shadow-sm space-y-4">
      <h2 className="text-2xl font-semibold text-text">Auction Portal</h2>
      <div>
        <label htmlFor="usdc-amount" className="block text-sm font-medium text-text text-left">USDC Amount</label>
        <input id="usdc-amount" type="number" value={usdcAmount} onChange={(e) => setUsdcAmount(e.target.value)} placeholder="e.g., 100" className="mt-1 block w-full px-3 py-2 text-text bg-card2 rounded-md"/>
      </div>
      <button onClick={handleActionClick} disabled={isButtonDisabled} className="w-full px-4 py-2 text-bg rounded-lg bg-success disabled:bg-card2 disabled:text-text">
        {buttonText}
      </button>
      <p className="text-xs text-text2">Current Allowance: {currentAllowance} USDC</p>
      {buyFimError && <p className="text-error text-sm">Error: {buyFimError}</p>}
    </div>
  );
}