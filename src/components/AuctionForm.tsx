// src/components/AuctionForm.tsx
'use client';

import { useAuctionContext } from '@/context/AuctionContext';

export function AuctionForm() {
  const { usdcAmount, setUsdcAmount, buttonText, isButtonDisabled, handleActionClick, currentAllowance, buyFimError } = useAuctionContext();

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm space-y-4">
      <h2 className="text-2xl font-semibold">Auction Portal</h2>
      <div>
        <label htmlFor="usdc-amount" className="block text-sm font-medium text-gray-700 text-left">USDC Amount</label>
        <input id="usdc-amount" type="number" value={usdcAmount} onChange={(e) => setUsdcAmount(e.target.value)} placeholder="e.g., 100" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
      </div>
      <button onClick={handleActionClick} disabled={isButtonDisabled} className="w-full px-4 py-2 text-white rounded-lg bg-green-500 disabled:bg-gray-400">
        {buttonText}
      </button>
      <p className="text-xs text-gray-500">Current Allowance: {currentAllowance} USDC</p>
      {buyFimError && <p className="text-red-500 text-sm">Error: {buyFimError}</p>}
    </div>
  );
}