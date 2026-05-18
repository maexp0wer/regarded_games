'use client';

import React, { useEffect, useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import ExchangeAbi from '@/deployments/abis/Exchange.json';
import { useOpenOrders, OrderFilter, MyOrder } from '@/hooks/useOpenOrders';

interface OpenOrdersProps {
  seasonAddress: string;
  userAddress: string;
  exchangeAddress: string;
}

const FILTER_LABELS: Record<OrderFilter, string> = {
  open: 'Orders',
  filled: 'Past',
  cancelled: 'Cancelled',
};

const COL_TEMPLATE = '1.5fr 1fr 1fr 1fr 0.8fr 52px';

function formatAge(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff >= 0 && diff < 60) return `${diff}s ago`;
  const d = new Date(ts * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

type TaggedOrder = MyOrder & { _isOpen: boolean };

export function OpenOrders({ seasonAddress, userAddress, exchangeAddress }: OpenOrdersProps) {
  const [activeFilters, setActiveFilters] = useState<Set<OrderFilter>>(new Set(['open']));

  const { data: openOrders = [], refetch: refetchOpen } = useOpenOrders(seasonAddress, userAddress, 'open');
  const { data: filledOrders = [], refetch: refetchFilled } = useOpenOrders(seasonAddress, userAddress, 'filled');
  const { data: cancelledOrders = [], refetch: refetchCancelled } = useOpenOrders(seasonAddress, userAddress, 'cancelled');

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      refetchOpen();
      refetchFilled();
      refetchCancelled();
    }
  }, [isSuccess, refetchOpen, refetchFilled, refetchCancelled]);

  const toggleFilter = (filter: OrderFilter) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(filter)) next.delete(filter);
      else next.add(filter);
      return next;
    });
  };

  const handleCancel = (contractOrderId: bigint) => {
    writeContract({
      address: exchangeAddress as `0x${string}`,
      abi: ExchangeAbi as any,
      functionName: 'cancelOrder',
      args: [contractOrderId],
    });
  };

  const orders: TaggedOrder[] = [
    ...(activeFilters.has('open') ? openOrders.map((o) => ({ ...o, _isOpen: true })) : []),
    ...(activeFilters.has('filled') ? filledOrders.map((o) => ({ ...o, _isOpen: false })) : []),
    ...(activeFilters.has('cancelled') ? cancelledOrders.map((o) => ({ ...o, _isOpen: false })) : []),
  ];

  const settledHeader =
    activeFilters.size === 1
      ? activeFilters.has('open') ? '—' : activeFilters.has('filled') ? 'Filled' : 'Cancelled'
      : 'closed';

  return (
    <div
      className="card-app flex flex-col shrink-0"
      style={{ borderColor: 'var(--color-border-bright)', padding: 0 }}
    >
      {/* Header + filter toggles */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <p className="section-label">Orders</p>

        <div className="flex items-center gap-1">
          {(Object.keys(FILTER_LABELS) as OrderFilter[]).map((filter) => {
            const isActive = activeFilters.has(filter);
            return (
              <button
                key={filter}
                onClick={() => toggleFilter(filter)}
                className="font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md transition-all"
                style={{
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text2)',
                  border: `1px solid ${isActive ? 'rgba(204,71,19,0.4)' : 'var(--color-border)'}`,
                  background: isActive ? 'rgba(204,71,19,0.08)' : 'transparent',
                }}
              >
                {FILTER_LABELS[filter]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Column headers */}
      <div
        className="grid items-center px-3 py-1"
        style={{
          gridTemplateColumns: COL_TEMPLATE,
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-card2)',
        }}
      >
        <span className="section-label">USD</span>
        <span className="section-label">Price</span>
        <span className="section-label">Amount</span>
        <span className="section-label">Created</span>
        <span className="section-label">{settledHeader}</span>
        <div />
      </div>

      {/* Order rows */}
      <div
        className="flex flex-col overflow-y-auto custom-scrollbar"
        style={{ maxHeight: '240px', paddingBottom: '16px' }}
      >
        {orders.length === 0 ? (
          <div className="flex items-center justify-center py-6">
            <p className="section-label opacity-30">No orders</p>
          </div>
        ) : (
          orders.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              showCancel={order._isOpen}
              isPending={isPending || isConfirming}
              onCancel={handleCancel}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface OrderRowProps {
  order: TaggedOrder;
  showCancel: boolean;
  isPending: boolean;
  onCancel: (orderId: bigint) => void;
}

function OrderRow({ order, showCancel, isPending, onCancel }: OrderRowProps) {
  const { isBuy, price, initialAmount, remainingAmount, timestamp, settledAt } = order;

  const isPartial = remainingAmount > 0 && remainingAmount < initialAmount;
  const displayQty = isPartial
    ? `${Math.round(remainingAmount).toLocaleString()} / ${Math.round(initialAmount).toLocaleString()}`
    : Math.round(initialAmount).toLocaleString();

  const displayUsd = `$${price.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const pricePerFim = initialAmount > 0 ? price / initialAmount : 0;

  return (
    <div
      className="grid items-center px-3 py-1.5"
      style={{
        gridTemplateColumns: COL_TEMPLATE,
        borderBottom: '1px solid var(--color-border)',
        borderLeft: `3px solid ${isBuy ? 'var(--color-green)' : 'var(--color-pink)'}`,
      }}
    >
      {/* Buy/Sell badge + USD total */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span
          className="font-mono text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0"
          style={{
            background: isBuy ? 'rgba(107,203,110,0.12)' : 'rgba(255,61,138,0.12)',
            color: isBuy ? 'var(--color-green)' : 'var(--color-pink)',
          }}
        >
          {isBuy ? 'Buy' : 'Sell'}
        </span>
        <span
          className="font-mono text-[11px] font-semibold text-text"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {displayUsd}
        </span>
      </div>

      {/* Price per FIM */}
      <span
        className="font-mono text-[10px] text-text2"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        ${pricePerFim.toFixed(4)}
      </span>

      {/* FIM quantity */}
      <span
        className="font-mono text-[10px] text-text2"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {displayQty}
      </span>

      {/* Created */}
      <span className="font-mono text-[10px] text-text2 opacity-70">
        {formatAge(timestamp)}
      </span>

      {/* Settled */}
      <span
        className="font-mono text-[10px] opacity-70"
        style={{ color: order.isCancelled ? 'var(--color-pink)' : 'var(--color-text2)' }}
      >
        {settledAt ? formatAge(settledAt) : '—'}
      </span>

      {/* Cancel */}
      <div className="flex justify-end">
        {showCancel && (
          <button
            onClick={() => onCancel(order.orderId)}
            disabled={isPending}
            className="font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded transition-all disabled:opacity-40"
            style={{
              background: 'var(--color-card)',
              color: 'var(--color-text2)',
              border: '1px solid var(--color-border)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = 'var(--color-pink)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,61,138,0.4)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = 'var(--color-text2)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
            }}
          >
            {isPending ? '…' : 'Cancel'}
          </button>
        )}
      </div>
    </div>
  );
}
