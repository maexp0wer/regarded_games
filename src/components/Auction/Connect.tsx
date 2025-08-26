// src/components/AuctionConnect.tsx
'use client';
import { useAuctionContext } from '@/context/AuctionContext';

export function Connect() {
  const { isMounted, isConnected, address, connect, disconnect } = useAuctionContext();
  
  if (!isMounted) return <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />; // Placeholder for SSR

  if (!isConnected) {
    return <button onClick={connect} className="px-4 py-2 bg-blue-500 text-white rounded-lg">Connect Wallet</button>;
  }
  return (
    <div className="text-center">
      <p className="text-sm font-mono truncate" title={address}>Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
      <button onClick={disconnect} className="text-xs text-red-500 hover:underline">Disconnect</button>
    </div>
  );
}