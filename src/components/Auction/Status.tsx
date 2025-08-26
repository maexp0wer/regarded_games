// src/components/AuctionStatus.tsx
'use client';
import { useAuctionContext } from '@/context/AuctionContext';

export function Status() {
  const { isConnected, isWrongNetwork, switchNetwork, currentAllowance, error, isMounted } = useAuctionContext();
  
  if (!isMounted || !isConnected) return null;

  if (isWrongNetwork) {
    return <button onClick={switchNetwork} className="px-4 py-2 bg-yellow-500 text-white rounded-lg">Switch to Hardhat</button>;
  }

  return (
    <div className="text-xs text-center text-gray-500 mt-2 space-y-1">
      <p>Current Allowance: {currentAllowance} USDC</p>
      {error && <p className="text-red-500">Error: {error}</p>}
    </div>
  );
}