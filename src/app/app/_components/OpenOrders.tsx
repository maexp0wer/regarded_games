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
    if (isSuccess) onRefresh();
  }, [isSuccess, onRefresh]);

  const handleCancel = (contractOrderId: string) => {
    writeContract({
      address: exchangeAddress as `0x${string}`,
      abi: ExchangeAbi as any,
      functionName: 'cancelOrder',
      args: [BigInt(contractOrderId)],
    });
  };

  return (
    <div
      className="card-app flex flex-col gap-3"
      style={{ borderColor: 'var(--color-border-bright)' }}
    >
      <div
        className="flex items-center justify-between pb-3"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <p className="section-label">My Open Orders</p>
        <span className="font-mono text-[11px] text-text2">{orders.length} Active</span>
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar">
        {orders.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="section-label opacity-30">No open orders</p>
          </div>
        ) : (
          orders.map((order) => {
            const progress = ((order.initialAmount - order.remainingAmount) / order.initialAmount) * 100;
            const isBuy = order.isBuy;

            return (
              <div
                key={order.id}
                className="relative rounded-xl overflow-hidden"
                style={{
                  background: 'var(--color-card2)',
                  border: '1px solid var(--color-border)',
                  borderLeft: `3px solid ${isBuy ? 'var(--color-green)' : 'var(--color-pink)'}`,
                }}
              >
                {/* Progress strip at bottom */}
                <div
                  className="absolute bottom-0 left-0 h-0.5 transition-all duration-500"
                  style={{
                    width: `${progress}%`,
                    background: isBuy ? 'var(--color-green)' : 'var(--color-pink)',
                  }}
                />

                <div className="flex items-center justify-between px-3 py-2.5 relative z-10">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="font-mono text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
                        style={{
                          background: isBuy ? 'rgba(107,203,110,0.12)' : 'rgba(255,61,138,0.12)',
                          color: isBuy ? 'var(--color-green)' : 'var(--color-pink)',
                        }}
                      >
                        {isBuy ? 'Buy' : 'Sell'}
                      </span>
                      <span className="font-mono text-[12px] font-semibold text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        ${order.price.toFixed(4)}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-text2" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {order.remainingAmount.toFixed(0)} / {order.initialAmount.toFixed(0)} FIM open
                    </span>
                  </div>

                  <button
                    onClick={() => handleCancel(order.orderId.toString())}
                    disabled={isPending || isConfirming}
                    className="font-mono text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
                    style={{
                      background: 'var(--color-card)',
                      color: 'var(--color-text2)',
                      border: '1px solid var(--color-border)',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-pink)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,61,138,0.4)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text2)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; }}
                  >
                    {isPending || isConfirming ? '…' : 'Cancel'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
