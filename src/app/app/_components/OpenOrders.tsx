'use client';

import React, { useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import ExchangeAbi from '@/deployments/abis/Exchange.json';
import { MyOrder } from '@/hooks/useOpenOrders';

interface OpenOrdersProps {
  orders: MyOrder[];
  exchangeAddress: string;
  onRefresh: () => void;
}

export function OpenOrders({ orders, exchangeAddress, onRefresh }: OpenOrdersProps) {
  
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      onRefresh();
    }
  }, [isSuccess, onRefresh]);

  // 1. Accepts the numeric ID as a string (e.g., "5")
  const handleCancel = (contractOrderId: string) => {
    writeContract({
      address: exchangeAddress as `0x${string}`,
      abi: ExchangeAbi as any,
      functionName: 'cancelOrder',
      args: [BigInt(contractOrderId)] // Converts "5" to 5n
    });
  };

  return (
    <div className="card-app flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="h2-app">My Open Orders</h3>
        <span className="text-[10px] text-text2">{orders.length} Active</span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
        {orders.map((order) => {
          const progress = ((order.initialAmount - order.remainingAmount) / order.initialAmount) * 100;
          
          return (
            // 2. KEEP order.id (the composite string) for React's key
            <div key={order.id} className="bg-card2 p-3 rounded-lg relative group">
              <div 
                className="absolute bottom-0 left-0 h-1.5 rounded-xl bg-primary transition-all duration-500" 
                style={{ width: `${progress}%` }} 
              />

              <div className="flex justify-between items-center relative z-10">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase text-bg ${order.isBuy ? 'bg-success' : 'bg-danger'}`}>
                      {order.isBuy ? "buy" : "Sell"}
                    </span>
                    <span className="text-xs font-bold text-text">
                      ${order.price.toFixed(4)}
                    </span>
                  </div>
                  <span className="text-[10px] text-text2">
                    {order.remainingAmount.toFixed(0)} / {order.initialAmount.toFixed(0)} FIM Open
                  </span>
                </div>

                <button
                  // 3. CHANGE: Pass 'order.orderId' (the number) instead of 'order.id'
                  // We convert to string to ensure safety with the handleCancel signature
                  onClick={() => handleCancel(order.orderId.toString())}
                  disabled={isPending || isConfirming}
                  className="text-[10px] font-bold bg-text/50 hover:bg-primary text-bg px-3 py-1.5 rounded transition-all disabled:opacity-50"
                >
                  {isPending || isConfirming ? "..." : "Cancel"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}