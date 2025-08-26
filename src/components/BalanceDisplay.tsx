// src/components/BalanceDisplay.tsx
'use client';

import { useFimBalanceContext } from '@/context/FimBalanceContext';
import { useConnectionContext } from '@/context/ConnectionContext';

export function BalanceDisplay() {
  const { isConnected } = useConnectionContext();
  const { isMounted, isLoading, fimBalance, usdcBalance } = useFimBalanceContext();

  // Don't render anything on the server or if the user isn't connected.
  if (!isMounted || !isConnected) {
    return null;
  }

  return (
    // Use the main container style from your example
    <div className="p-4 rounded-lg bg-card shadow-sm w-full max-w-2xl mt-8">
      {/* Use the header style from your example */}
      <h2 className="text-xl font-semibold mb-2 text-text">Your Holdings</h2>
      
      {/* Container for the balance rows */}
      <div className="space-y-2">

        {/* --- FIM Balance Row --- */}
        {/* Use the flex row, font, and label style from your example */}
        <div className="flex justify-between items-center font-mono">
          <span className="text-text">Fake Internet Money Balance:</span>
          {isLoading ? (
            // Use the skeleton loader style from your example
            <div className="h-6 w-24 bg-card2 rounded animate-pulse" />
          ) : (
            // Use the value style from your example
            <span className="text-2xl font-bold text-primary">{fimBalance}</span>
          )}
        </div>

        {/* --- USDC Balance Row --- */}
        {/* Replicate the same pattern for the USDC balance for consistency */}
        <div className="flex justify-between items-center font-mono">
          <span className="text-text">USDC Balance:</span>
          {isLoading ? (
            <div className="h-6 w-24 bg-card2 rounded animate-pulse" />
          ) : (
            <span className="text-2xl font-bold text-primary">${usdcBalance}</span>
          )}
        </div>
        
      </div>
    </div>
  );
}