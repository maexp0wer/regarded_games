// src/components/OrderBookDisplay.tsx
'use client';

import { useOrderBookContext } from '@/context/OrderBookContext';
import { useConnectionContext } from '@/context/ConnectionContext';
import { formatUnits } from 'viem';
import { FillOrderButton } from './FillOrderButton'; // Import the new smart button

export function OrderBookDisplay() {
  const { isConnected } = useConnectionContext();
  const { isMounted, isLoading, openOrders } = useOrderBookContext();

  // We only want to render this component on the client after wallet state is known
  if (!isMounted || !isConnected) {
    return null;
  }

  return (
    <div className="p-4 rounded-lg bg-card shadow-sm w-full max-w-2xl mt-8">
      <h2 className="text-xl font-semibold mb-2 text-text">Live Order Book</h2>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-sm text-text">
          <thead className="border-b border-card2 text-text/70">
            <tr>
              <th className="p-2">Price (FIM per USDC)</th>
              <th className="p-2 text-right">Available (USDC)</th>
              <th className="p-2">Creator</th>
              <th className="p-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // Skeleton loader for the table body
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-card2/50">
                  <td className="p-2"><div className="h-4 w-24 bg-card2 rounded animate-pulse" /></td>
                  <td className="p-2 text-right"><div className="h-4 w-16 bg-card2 rounded animate-pulse ml-auto" /></td>
                  <td className="p-2"><div className="h-4 w-20 bg-card2 rounded animate-pulse" /></td>
                  <td className="p-2 text-right"><div className="h-6 w-12 bg-card2 rounded animate-pulse ml-auto" /></td>
                </tr>
              ))
            ) : openOrders.length > 0 ? (
              openOrders.map(order => (
                <tr key={order.id.toString()} className="border-b border-card2/50 hover:bg-card2/50">
                  <td className="p-2 text-primary font-bold">
                    {/* FIM price has 18 decimals */}
                    {parseFloat(formatUnits(order.fimPrice, 18)).toFixed(4)}
                  </td>
                  <td className="p-2 text-right text-success">
                    {/* USDC has 6 decimals */}
                    {formatUnits(order.USDCAmountRemaining, 6)}
                  </td>
                  <td className="p-2 opacity-70">
                    {`${order.creator.slice(0, 6)}...${order.creator.slice(-4)}`}
                  </td>
                  <td className="p-2 text-right">
                    {/* Render the self-contained smart button for each order */}
                    <FillOrderButton order={order} />
                  </td>
                </tr>
              ))
            ) : (
              // Message for when there are no open orders
              <tr>
                <td colSpan={4} className="p-4 text-center text-text/70">
                  No open buy orders.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}