// src/components/Exchange.tsx
'use client';

import { useExchangeContext } from '@/context/ExchangeContext';
import { useConnectionContext } from '@/context/ConnectionContext';
import { useSeasonDataContext } from '@/context/SeasonDataContext'; // 👈 1. Import the season context
import { formatUnits } from 'viem';
import { CreateBidForm } from './CreateBidForm';
import { CreateAskForm } from './CreateAskForm';
import { FillOrderButton } from './FillOrderButton';
import { CancelOrderButton } from './CancelOrderButton';
import { OrderType } from '@/hooks/useExchange';

export function Exchange() {
  const { isConnected, address: userAddress } = useConnectionContext();
  const { isMounted, isLoading, bids, asks } = useExchangeContext();
  const { phase } = useSeasonDataContext(); // 👈 2. Get the current phase

  // Don't render anything if not connected yet.
  if (!isMounted || !isConnected) {
    return null;
  }
  
  // 🔴 THE DEFINITIVE FIX IS HERE 🔴
  // If the game is not in the TRADING phase, display a message instead of the forms/order book.
  if (phase !== 'TRADING') {
    return (
      <div className="p-6 rounded-lg bg-card shadow-sm text-center w-full max-w-4xl mt-8 text-text">
        <h2 className="text-2xl font-semibold mb-2 text-text">Exchange</h2>
        <p className="text-text/70">
          The exchange is currently closed. Trading will open when the auction phase is complete.
        </p>
        <p className="mt-2 font-bold">Current Phase: {phase}</p>
      </div>
    );
  }

  // If the phase IS 'TRADING', render the full exchange UI.
  return (
    <div className="space-y-8 w-full max-w-4xl mt-8">
      {/* Order Creation Forms Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <CreateBidForm />
        <CreateAskForm />
      </div>
      
      {/* The Live Order Book */}
      <div className="p-6 rounded-lg bg-card shadow-sm text-left w-full text-text">
        <h2 className="text-2xl font-semibold mb-4 text-text">Live Order Book</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Asks (Sell Orders) */}
          <div>
            <h3 className="text-center font-bold text-danger mb-2">ASKS (Price to Sell FIM)</h3>
            <div className="border border-card2 rounded-lg">
              <div className="grid grid-cols-3 p-2 border-b border-card2 bg-card2/50 font-mono text-xs text-text/70">
                <span>Price (USDC)</span>
                <span className="text-center">Amount (FIM)</span>
                <span className="text-right">Action</span>
              </div>
              {isLoading ? <p className="p-4 text-center text-xs">Loading...</p> 
              : asks.length > 0 ? (
                asks.map(order => {
                  const isMyOrder = userAddress?.toLowerCase() === order.creator.toLowerCase();
                  return (
                    <div key={order.id.toString()} className={`grid grid-cols-3 p-2 border-b border-card2/50 items-center ${isMyOrder ? 'bg-primary/5' : ''}`}>
                      <span className="font-mono text-sm text-danger">{order.price.toFixed(4)}</span>
                      <span className="font-mono text-sm text-center">{formatUnits(order.amountRemaining, 18)}</span>
                      <div className="flex justify-end">{isMyOrder ? <CancelOrderButton orderId={order.id} /> : <FillOrderButton order={order} />}</div>
                    </div>
                  );
                })
              ) : <p className="p-4 text-center text-xs text-text/70">No open asks.</p>}
            </div>
          </div>

          {/* Bids (Buy Orders) */}
          <div>
            <h3 className="text-center font-bold text-success mb-2">BIDS (Price to Buy FIM)</h3>
            <div className="border border-card2 rounded-lg">
              <div className="grid grid-cols-3 p-2 border-b border-card2 bg-card2/50 font-mono text-xs text-text/70">
                <span>Price (USDC)</span>
                <span className="text-center">Amount (FIM)</span>
                <span className="text-right">Action</span>
              </div>
              {isLoading ? <p className="p-4 text-center text-xs">Loading...</p> 
              : bids.length > 0 ? (
                bids.map(order => {
                  const isMyOrder = userAddress?.toLowerCase() === order.creator.toLowerCase();
                  return (
                    <div key={order.id.toString()} className={`grid grid-cols-3 p-2 border-b border-card2/50 items-center ${isMyOrder ? 'bg-primary/5' : ''}`}>
                      <span className="font-mono text-sm text-success">{order.price.toFixed(4)}</span>
                      <span className="font-mono text-sm text-center">{formatUnits(order.amountToBuy - order.amountFilled, 18)}</span>
                       <div className="flex justify-end">{isMyOrder ? <CancelOrderButton orderId={order.id} /> : <FillOrderButton order={order} />}</div>
                    </div>
                  );
                })
              ) : <p className="p-4 text-center text-xs text-text/70">No open bids.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}