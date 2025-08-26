// src/app/app/page.tsx
'use client';

import { DAppProvider, useDAppContext } from '@/context/DAppContext';

// This is the "dumb" view component. It just displays data.
function DAppView() {
  // Call our single, powerful hook once.
  const {
    isMounted, isConnected, address, connect, disconnect, isWrongNetwork, switchNetwork,
    usdcAmount, setUsdcAmount, buttonText, isButtonDisabled, handleActionClick,
    currentAllowance, buyFimError,
    isSeasonLoading, activeSeasonId, isActiveSeason, gameSeasonAddress, auctionAddress, seasonPrizePool
  } = useDAppContext();

  // Guard against rendering on the server
  if (!isMounted) {
    return <div className="text-center p-24">Loading DApp...</div>;
  }
  
  // Render the entire UI, picking and choosing from the state.
  return (
    <main className="flex min-h-screen flex-col items-center p-8 md:p-24 bg-gray-50">
      <div className="w-full max-w-2xl text-center space-y-8">
        <h1 className="text-4xl font-bold">FIM Token Auction</h1>

        {!isConnected ? (
          <button onClick={connect} className="px-6 py-3 bg-blue-500 text-white rounded-lg text-xl">
            Connect Wallet to Begin
          </button>
        ) : (
          <>
            <div className="p-4 border rounded-lg bg-white shadow-sm">
              <p className="text-sm font-mono truncate" title={address}>Connected: {address}</p>
              <button onClick={disconnect} className="text-xs text-red-500 hover:underline">Disconnect</button>
            </div>

            {isWrongNetwork ? (
              <div className="p-4 border rounded-lg bg-yellow-50 text-yellow-800">
                <p>Wrong Network Detected</p>
                <button onClick={switchNetwork} className="mt-2 px-4 py-2 bg-yellow-500 text-white rounded-lg">Switch to Hardhat</button>
              </div>
            ) : (
              <>
                <div className="p-4 border rounded-lg bg-white shadow-sm space-y-4">
                  <h2 className="text-2xl font-semibold">Auction Portal</h2>
                  <div>
                    <label htmlFor="usdc-amount" className="block text-sm font-medium text-gray-700">USDC Amount</label>
                    <input id="usdc-amount" type="number" value={usdcAmount} onChange={(e) => setUsdcAmount(e.target.value)} placeholder="e.g., 100" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
                  </div>
                  <button onClick={handleActionClick} disabled={isButtonDisabled} className="w-full px-4 py-2 text-white rounded-lg bg-green-500 disabled:bg-gray-400">
                    {buttonText}
                  </button>
                  <p className="text-xs text-gray-500">Current Allowance: {currentAllowance} USDC</p>
                  {buyFimError && <p className="text-red-500 text-sm">Error: {buyFimError}</p>}
                </div>
                
                <div className="p-4 border rounded-lg bg-white shadow-sm text-left">
                  <h2 className="text-2xl font-semibold mb-4">On-Chain Season Data</h2>
                  {isSeasonLoading ? (
                    <p>Loading season data...</p>
                  ) : activeSeasonId !== null ? (
                    <div className="space-y-2 font-mono text-sm">
                      <p><strong>Active Season ID:</strong> {activeSeasonId}</p>
                      <p><strong>Is Active:</strong> {isActiveSeason ? 'Yes' : 'No'}</p>
                      {/* 2. ADD the display logic for the prize pool */}
                      <p className="text-lg">
                        <strong>Prize Pool:</strong> 
                        <span className="font-bold text-green-600 ml-2">
                          ${seasonPrizePool} USDC
                        </span>
                      </p>
                      <p><strong>GameSeason Contract:</strong> {gameSeasonAddress}</p>
                      <p><strong>Auction Contract:</strong> {auctionAddress}</p>
                    </div>
                  ) : (
                    <p>No active season found.</p>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}

// This is the main page component. It simply provides the context.
export default function DAppPage() {
  return (
    <DAppProvider>
      <DAppView />
    </DAppProvider>
  );
}