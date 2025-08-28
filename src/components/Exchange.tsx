// src/components/Exchange.tsx
'use client';

import { useExchangeContext } from '@/context/ExchangeContext';
import { useConnectionContext } from '@/context/ConnectionContext';
import { formatUnits } from 'viem';
import { CreateBidForm } from './CreateBidForm';
import { CreateAskForm } from './CreateAskForm';
import { FillOrderButton } from './FillOrderButton';
import { CancelOrderButton } from './CancelOrderButton';

export function Exchange() {
  const { isConnected, address: userAddress } = useConnectionContext();
  const { isMounted, isLoading, bids, asks } = useExchangeContext();

  if (!isMounted || !isConnected) return null;

  return (
    <div className="space-y-8 w-full max-w-4xl mt-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <CreateBidForm />
        <CreateAskForm />
      </div>
      
      <div className="p-6 rounded-lg bg-card shadow-sm text-left w-full text-text">
        <h2 className="text-2xl font-semibold mb-4 text-text">Live Order Book</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Asks (Sellers) */}
          <div>
            <h3 className="text-center font-bold text-danger mb-2">ASKS (Sellers offering FIM)</h3>
            <div className="border border-card2 rounded-lg">
              <div className="grid grid-cols-4 p-2 border-b border-card2 bg-card2/50 font-mono text-xs text-text/70">
                <span className="text-left">Price (USDC)</span>
                <span className="text-center">Amount (FIM)</span>
                <span className="text-center">Total (USDC)</span>
                <span className="text-right">Action</span>
              </div>
              {isLoading ? <p className="p-4 text-center text-xs">Loading...</p> 
              : asks.length > 0 ? (
                asks.map(order => {
                  const isMyOrder = userAddress?.toLowerCase() === order.creator.toLowerCase();
                  return (
                    <div key={`ask-${order.id.toString()}`} className={`grid grid-cols-4 p-2 border-b border-card2/50 items-center text-sm ${isMyOrder ? 'bg-primary/5' : ''}`}>
                      <span className="font-mono text-danger font-semibold">{order.price.toFixed(4)}</span>
                      {/* 🔴 FIX: Increased FIM decimal precision */}
                      <span className="font-mono text-center">{parseFloat(formatUnits(order.fimRemaining, 18)).toFixed(4)}</span>
                      {/* 🔴 NEW: Display remaining USDC value */}
                      <span className="font-mono text-center text-text/70">${parseFloat(formatUnits(order.usdcRemaining, 6)).toFixed(2)}</span>
                      <div className="flex justify-end">{isMyOrder ? <CancelOrderButton orderId={order.id} /> : <FillOrderButton order={order} />}</div>
                    </div>
                  );
                })
              ) : <p className="p-4 text-center text-xs text-text/70">No open asks.</p>}
            </div>
          </div>

          {/* Bids (Buyers) */}
          <div>
            <h3 className="text-center font-bold text-success mb-2">BIDS (Buyers wanting FIM)</h3>
            <div className="border border-card2 rounded-lg">
              <div className="grid grid-cols-4 p-2 border-b border-card2 bg-card2/50 font-mono text-xs text-text/70">
                <span className="text-left">Price (USDC)</span>
                <span className="text-center">Amount (FIM)</span>
                <span className="text-center">Total (USDC)</span>
                <span className="text-right">Action</span>
              </div>
              {isLoading ? <p className="p-4 text-center text-xs">Loading...</p> 
              : bids.length > 0 ? (
                bids.map(order => {
                  const isMyOrder = userAddress?.toLowerCase() === order.creator.toLowerCase();
                  return (
                    <div key={`bid-${order.id.toString()}`} className={`grid grid-cols-4 p-2 border-b border-card2/50 items-center text-sm ${isMyOrder ? 'bg-primary/5' : ''}`}>
                      <span className="font-mono text-success font-semibold">{order.price.toFixed(4)}</span>
                      {/* 🔴 FIX: Increased FIM decimal precision */}
                      <span className="font-mono text-center">{parseFloat(formatUnits(order.fimRemaining, 18)).toFixed(4)}</span>
                      {/* 🔴 NEW: Display remaining USDC value */}
                      <span className="font-mono text-center text-text/70">${parseFloat(formatUnits(order.usdcRemaining, 6)).toFixed(2)}</span>
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