// src/components/ConnectionDisplay.tsx
'use client';

import { useConnectionContext } from '@/context/ConnectionContext';

export function ConnectionDisplay() {
  const { isMounted, isConnected, isWrongNetwork, address, connect, disconnect, switchNetwork } = useConnectionContext();

  if (!isMounted) return <div className="p-4 rounded-lg bg-gray-200 animate-pulse h-24 w-full" />;

  if (!isConnected) {
    return (
      <div className="p-4 rounded-lg bg-card shadow-sm">
        <button onClick={connect} className="px-6 py-3 bg-primary text-bg rounded-lg text-xl">
          Connect
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg bg-card shadow-sm space-y-4">
      <div>
        <p className="text-sm font-mono truncate text-text" title={address}>Connected: {address}</p>
        <button onClick={disconnect} className="text-xs text-red-500 hover:underline">Disconnect</button>
      </div>
      {isWrongNetwork && (
        <div className="p-4 bg-yellow-50 text-yellow-800 rounded">
          <p>Wrong Network Detected</p>
          <button onClick={switchNetwork} className="mt-2 px-4 py-2 bg-yellow-500 text-white rounded-lg">
            Switch to Hardhat
          </button>
        </div>
      )}
    </div>
  );
}