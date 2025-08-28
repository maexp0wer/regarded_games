// src/components/TradingForm.tsx
'use client';

import { useTradingFormContext } from "@/context/TradingFormContext";
import { useUserHoldingsContext } from "@/context/UserHoldingsContext";

export function TradingForm() {
  
  
  const { 
    isMounted, 
    tradeSide, 
    setTradeSide, 
    amount, 
    setAmount, 
    needsApproval, 
    isApproving, 
    approve,
    usdcAllowance, // 👈 Destructure new allowance data
    fimAllowance   // 👈 Destructure new allowance data
  } = useTradingFormContext();
  
  const { usdcBalance, fimBalance } = useUserHoldingsContext();

  if (!isMounted) {
    return <div className="p-6 rounded-lg bg-card shadow-sm w-full max-w-2xl mt-8 h-[200px] animate-pulse" />;
  }

  const isBuy = tradeSide === 'buy';
  const balance = isBuy ? usdcBalance : fimBalance;
  const tokenSymbol = isBuy ? 'USDC' : 'FIM';
  const decimals = isBuy ? 6 : 18;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const regex = new RegExp(`^(\\d*)(\\.?)(\\d{0,${decimals}})`);
    const match = value.match(regex);
    if (match) setAmount(match[1] + match[2] + match[3]); else if (value === '') setAmount('');
  };

  return (
    <div className="p-6 rounded-lg bg-card shadow-sm text-left w-full max-w-2xl mt-8 text-text">
      <div className="flex border-b border-card2 mb-4">
        <button 
          onClick={() => setTradeSide('buy')}
          className={`flex-1 py-2 font-semibold transition-colors ${isBuy ? 'text-primary border-b-2 border-primary' : 'text-text/70 hover:text-text'}`}
        >
          Buy FIM with USDC
        </button>
        <button 
          onClick={() => setTradeSide('sell')}
          className={`flex-1 py-2 font-semibold transition-colors ${!isBuy ? 'text-primary border-b-2 border-primary' : 'text-text/70 hover:text-text'}`}
        >
          Sell FIM for USDC
        </button>
      </div>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center text-xs text-text/70">
            <span>Amount to {isBuy ? 'Spend' : 'Sell'}</span>
            <span>Balance: {balance} {tokenSymbol}</span>
          </div>
          <input
            type="number"
            value={amount}
            onChange={handleAmountChange}
            placeholder={`e.g., 100`}
            step={isBuy ? "0.000001" : "1"}
            className="mt-1 block w-full px-3 py-2 border border-card2 bg-input rounded-md"
          />
        </div>
        
        {/* 🔴 THE FIX IS HERE: The new allowance display and button logic 🔴 */}
        <div className="text-xs text-center text-text/70 pt-2 space-y-1">
          <p>USDC Allowance for Exchange: {usdcAllowance}</p>
          <p>FIM Allowance for Exchange: {fimAllowance}</p>
        </div>

        {needsApproval && amount && (
          <button 
            disabled={isApproving || !approve}
            onClick={approve}
            className="w-full px-4 py-2 font-bold bg-primary text-bg rounded-lg disabled:bg-gray-400"
          >
            {isApproving ? 'Approving...' : `Approve ${amount} ${tokenSymbol} for Trading`}
          </button>
        )}
      </div>
    </div>
  );
}