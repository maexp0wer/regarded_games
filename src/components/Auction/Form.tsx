// src/components/AuctionForm.tsx
'use client';
import { useAuctionContext } from '@/context/AuctionContext';

export function Form() {
  const { usdcAmount, setUsdcAmount, buttonText, isButtonDisabled, handleActionClick, isMounted, buttonState } = useAuctionContext();

  if (!isMounted) return <div className="h-24 w-full bg-gray-200 rounded animate-pulse" />;

  const buttonColor = (state: typeof buttonState) => {
    if (state === 'approve' || state === 'approving') return 'bg-blue-500 hover:bg-blue-600';
    return 'bg-green-500 hover:bg-green-600';
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="usdc-amount" className="block text-sm font-medium text-gray-700">USDC Amount</label>
        <input id="usdc-amount" type="number" value={usdcAmount} onChange={(e) => setUsdcAmount(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
      </div>
      <button onClick={handleActionClick} disabled={isButtonDisabled}
        className={`w-full px-4 py-2 text-white rounded-lg transition-colors ${buttonColor(buttonState)} disabled:bg-gray-400`}>
        {buttonText}
      </button>
    </div>
  );
}