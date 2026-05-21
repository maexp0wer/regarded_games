'use client';

import React, { useEffect, useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { formatUnits } from 'viem';
import ExchangeAbi from '@/deployments/abis/Exchange.json';
import { useOpenOrders, MyOrder } from '@/hooks/useOpenOrders';
import { useMyAuctionMints, AuctionMint } from '@/hooks/useMyAuctionMints';
import { useMyTrades, MyTrade } from '@/hooks/useMyTrades';

const PONDER_URL = 'http://127.0.0.1:42069/graphql';

interface OrdersProps {
  seasonAddress: string;
  userAddress: string;
  exchangeAddress: string;
}

type TabType = 'openOrders' | 'position' | 'history';

function formatDateTime(ts: number): string {
  const d = new Date(ts * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const TABS: { key: TabType; label: string }[] = [
  { key: 'position', label: 'Position' },
  { key: 'openOrders', label: 'Open Orders' },
  { key: 'history', label: 'Trade History' },
];

function useLastTradePrice(seasonAddress: string | undefined) {
  return useQuery({
    queryKey: ['lastTradePrice', seasonAddress?.toLowerCase()],
    queryFn: async () => {
      const res = await fetch(PONDER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query LastTrade($season: String!) {
            tradess(where: { seasonAddress: $season }, orderBy: "timestamp", orderDirection: "desc", limit: 1) {
              items { fimAmount usdcAmount }
            }
          }`,
          variables: { season: seasonAddress!.toLowerCase() },
        }),
      });
      const json = await res.json();
      const item = json?.data?.tradess?.items?.[0];
      if (!item) return 0;
      const fim = Number(formatUnits(BigInt(item.fimAmount), 18));
      const usdc = Number(formatUnits(BigInt(item.usdcAmount), 6));
      return fim > 0 ? usdc / fim : 0;
    },
    enabled: !!seasonAddress,
    refetchInterval: 5000,
  });
}

export function Orders({ seasonAddress, userAddress, exchangeAddress }: OrdersProps) {
  const [activeTab, setActiveTab] = useState<TabType | null>(null);

  const { data: openOrders = [], refetch: refetchOpen } = useOpenOrders(seasonAddress, userAddress, 'open');
  const { data: filledOrders = [], refetch: refetchFilled } = useOpenOrders(seasonAddress, userAddress, 'filled');
  const { data: cancelledOrders = [], refetch: refetchCancelled } = useOpenOrders(seasonAddress, userAddress, 'cancelled');
  const { data: auctionMints = [] } = useMyAuctionMints(seasonAddress, userAddress);
  const { data: myTrades = [] } = useMyTrades(seasonAddress, userAddress);
  const { data: lastTradePrice = 0 } = useLastTradePrice(seasonAddress);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      refetchOpen();
      refetchFilled();
      refetchCancelled();
    }
  }, [isSuccess, refetchOpen, refetchFilled, refetchCancelled]);

  const handleCancel = (contractOrderId: bigint) => {
    writeContract({
      address: exchangeAddress as `0x${string}`,
      abi: ExchangeAbi as any,
      functionName: 'cancelOrder',
      args: [contractOrderId],
    });
  };

  const toggle = (tab: TabType) => setActiveTab(prev => prev === tab ? null : tab);

  return (
    <div className="flex flex-col">

      {/* Button bar */}
      <div className="flex gap-0">
        {TABS.map(({ key, label }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => toggle(key)}
              className={`px-3 py-1.5 font-mono font-semibold uppercase tracking-widest border transition-all ${
                isActive
                  ? 'text-text2 bg-(--color-gold-15) border-(--color-gold-35)'
                  : 'text-text2 bg-card2 border-border hover:bg-border'
              }`}
              style={{ fontSize: 11, letterSpacing: '0.1em' }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Sliding content */}
      <div
        className="card-app"
        style={{
          maxHeight: activeTab ? '200px' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.25s ease-in-out',
          padding: 0,
          ...(activeTab ? {} : { border: 'none', background: 'transparent' }),
        }}
      >
        {activeTab === 'openOrders' && (
          <OpenOrdersView
            orders={openOrders}
            isPending={isPending || isConfirming}
            onCancel={handleCancel}
          />
        )}
        {activeTab === 'position' && (
          <PositionView
            trades={myTrades}
            auctionMints={auctionMints}
            currentPrice={lastTradePrice}
          />
        )}
        {activeTab === 'history' && (
          <TradeHistoryView
            orders={[...filledOrders, ...cancelledOrders]}
            auctionMints={auctionMints}
          />
        )}
      </div>
    </div>
  );
}

// ── Open Orders ────────────────────────────────────────────────────────────────

const OPEN_COL = '1.6fr 0.7fr 0.9fr 1fr 1fr 1fr 44px';

interface OpenOrdersViewProps {
  orders: MyOrder[];
  isPending: boolean;
  onCancel: (orderId: bigint) => void;
}

function OpenOrdersView({ orders, isPending, onCancel }: OpenOrdersViewProps) {
  return (
    <>
      <div
        className="grid items-center px-3 py-1"
        style={{
          gridTemplateColumns: OPEN_COL,
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-card3)',
        }}
      >
        <span className="section-label">Time</span>
        <span className="section-label">Direction</span>
        <span className="section-label">Size</span>
        <span className="section-label">Original Size</span>
        <span className="section-label">Order Value</span>
        <span className="section-label">Price</span>
        <div />
      </div>

      <div className="flex flex-col overflow-y-auto custom-scrollbar" style={{ height: '132px' }}>
        {orders.length === 0 ? (
          <div className="flex items-center justify-center py-6">
            <p className="section-label opacity-30">No open orders</p>
          </div>
        ) : (
          orders.map((order) => (
            <OpenOrderRow key={order.id} order={order} isPending={isPending} onCancel={onCancel} />
          ))
        )}
      </div>
    </>
  );
}

interface OpenOrderRowProps {
  order: MyOrder;
  isPending: boolean;
  onCancel: (orderId: bigint) => void;
}

function OpenOrderRow({ order, isPending, onCancel }: OpenOrderRowProps) {
  const { isBuy, price, initialAmount, remainingAmount, timestamp } = order;

  const displayTime = formatDateTime(timestamp);
  const direction = isBuy ? 'Buy' : 'Sell';
  const size = Math.round(remainingAmount).toLocaleString();
  const originalSize = Math.round(initialAmount).toLocaleString();
  const orderValue = `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const pricePerFim = initialAmount > 0 ? `$${(price / initialAmount).toFixed(4)}` : '$0.0000';

  return (
    <div
      className="grid items-center px-3 py-1.5"
      style={{
        gridTemplateColumns: OPEN_COL,
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <span className="font-mono text-[10px] text-text">{displayTime}</span>

      <span
        className="font-mono text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded w-fit"
        style={{
          background: isBuy ? 'var(--color-green-15)' : 'var(--color-red-15)',
          color: isBuy ? 'var(--color-green)' : 'var(--color-red)',
        }}
      >
        {direction}
      </span>

      <span className="font-mono text-[10px] text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>{size}</span>
      <span className="font-mono text-[10px] text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>{originalSize}</span>
      <span className="font-mono text-[10px] text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>{orderValue}</span>
      <span className="font-mono text-[10px] text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>{pricePerFim}</span>

      <div className="flex justify-end">
        <button
          onClick={() => onCancel(order.orderId)}
          disabled={isPending}
          className="font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded transition-all disabled:opacity-40"
          style={{
            background: 'var(--color-card)',
            color: 'var(--color-text2)',
            border: '1px solid var(--color-border)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--color-red)';
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-red-35)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--color-text2)';
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
          }}
        >
          {isPending ? '…' : 'CANCEL'}
        </button>
      </div>
    </div>
  );
}

// ── Position ───────────────────────────────────────────────────────────────────

const POS_COL = '1fr 1.2fr 1fr 1fr 1fr';

interface AggregatePosition {
  netSize: number;
  entryPrice: number;
}

function computePosition(trades: MyTrade[], auctionMints: AuctionMint[]): AggregatePosition | null {
  if (trades.length === 0 && auctionMints.length === 0) return null;

  let netSize = 0;
  let weightedCost = 0;

  for (const m of auctionMints) {
    netSize += m.fimAmount;
    weightedCost += m.usdcAmount;
  }

  for (const t of trades) {
    if (t.isBuy) {
      weightedCost += t.usdcAmount;
      netSize += t.fimAmount;
    } else {
      weightedCost -= t.usdcAmount;
      netSize -= t.fimAmount;
    }
  }

  if (Math.abs(netSize) < 0.0001) return null;
  const entryPrice = Math.abs(weightedCost / netSize);
  return { netSize, entryPrice };
}

interface PositionViewProps {
  trades: MyTrade[];
  auctionMints: AuctionMint[];
  currentPrice: number;
}

function PositionView({ trades, auctionMints, currentPrice }: PositionViewProps) {
  const position = computePosition(trades, auctionMints);

  return (
    <>
      <div
        className="grid items-center px-3 py-1"
        style={{
          gridTemplateColumns: POS_COL,
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-card3)',
        }}
      >
        <span className="section-label">Size</span>
        <span className="section-label">Position Value</span>
        <span className="section-label">Entry Price</span>
        <span className="section-label">Current Price</span>
        <span className="section-label">PNL</span>
      </div>

      <div className="flex flex-col overflow-y-auto custom-scrollbar" style={{ height: '132px' }}>
        {!position ? (
          <div className="flex items-center justify-center py-6">
            <p className="section-label opacity-30">No position</p>
          </div>
        ) : (
          <PositionRow position={position} currentPrice={currentPrice} />
        )}
      </div>
    </>
  );
}

interface PositionRowProps {
  position: AggregatePosition;
  currentPrice: number;
}

function PositionRow({ position, currentPrice }: PositionRowProps) {
  const { netSize, entryPrice } = position;
  const positionValue = netSize * currentPrice;
  const pnl = (currentPrice - entryPrice) * netSize;
  const pnlPositive = pnl >= 0;

  return (
    <div
      className="grid items-center px-3 py-1.5"
      style={{
        gridTemplateColumns: POS_COL,
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <span className="font-mono text-[10px] text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {Math.round(Math.abs(netSize)).toLocaleString()}
      </span>

      <span className="font-mono text-[10px] text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
        ${positionValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>

      <span className="font-mono text-[10px] text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
        ${entryPrice.toFixed(4)}
      </span>

      <span className="font-mono text-[10px] text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
        ${currentPrice.toFixed(4)}
      </span>

      <span
        className="font-mono text-[10px] font-semibold"
        style={{
          fontVariantNumeric: 'tabular-nums',
          color: pnlPositive ? 'var(--color-green)' : 'var(--color-red)',
        }}
      >
        {pnlPositive ? '+' : ''}${pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  );
}

// ── Trade History ──────────────────────────────────────────────────────────────

const HIST_COL = '1.8fr 1fr 1fr 1fr 1.2fr';

type HistoryEntry =
  | { kind: 'order'; data: MyOrder }
  | { kind: 'auction'; data: AuctionMint };

interface TradeHistoryViewProps {
  orders: MyOrder[];
  auctionMints: AuctionMint[];
}

function TradeHistoryView({ orders, auctionMints }: TradeHistoryViewProps) {
  const entries: HistoryEntry[] = [
    ...orders.map((o): HistoryEntry => ({ kind: 'order', data: o })),
    ...auctionMints.map((m): HistoryEntry => ({ kind: 'auction', data: m })),
  ].sort((a, b) => {
    const ta = a.kind === 'order' ? a.data.timestamp : a.data.timestamp;
    const tb = b.kind === 'order' ? b.data.timestamp : b.data.timestamp;
    return tb - ta;
  });

  return (
    <>
      <div
        className="grid items-center px-3 py-1"
        style={{
          gridTemplateColumns: HIST_COL,
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-card3)',
        }}
      >
        <span className="section-label">Time</span>
        <span className="section-label">Direction</span>
        <span className="section-label">Price</span>
        <span className="section-label">Size</span>
        <span className="section-label">Trade Value</span>
      </div>

      <div className="flex flex-col overflow-y-auto custom-scrollbar" style={{ height: '132px' }}>
        {entries.length === 0 ? (
          <div className="flex items-center justify-center py-6">
            <p className="section-label opacity-30">No history</p>
          </div>
        ) : (
          entries.map((entry) =>
            entry.kind === 'order' ? (
              <TradeHistoryOrderRow key={entry.data.id} order={entry.data} />
            ) : (
              <TradeHistoryAuctionRow key={entry.data.id} mint={entry.data} />
            )
          )
        )}
      </div>
    </>
  );
}

function TradeHistoryOrderRow({ order }: { order: MyOrder }) {
  const { isBuy, price, initialAmount, timestamp, isCancelled } = order;

  const displayTime = formatDateTime(timestamp);
  const baseDirection = isBuy ? 'Buy' : 'Sell';
  const direction = isCancelled ? `${baseDirection} - Cancelled` : baseDirection;
  const pricePerFim = initialAmount > 0 ? (price / initialAmount).toFixed(4) : '0';
  const displaySize = Math.round(initialAmount).toLocaleString();
  const displayValue = `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div
      className="grid items-center px-3 py-2"
      style={{
        gridTemplateColumns: HIST_COL,
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <span className="font-mono text-[10px] text-text">{displayTime}</span>

      <span
        className="font-mono text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded w-fit"
        style={{
          background: isBuy ? 'var(--color-green-15)' : 'var(--color-red-15)',
          color: isBuy ? 'var(--color-green)' : 'var(--color-red)',
        }}
      >
        {direction}
      </span>

      <span className="font-mono text-[10px] text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
        ${pricePerFim}
      </span>

      <span className="font-mono text-[10px] text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {displaySize}
      </span>

      <span className="font-mono text-[10px] text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {displayValue}
      </span>
    </div>
  );
}

function TradeHistoryAuctionRow({ mint }: { mint: AuctionMint }) {
  const { fimAmount, usdcAmount, timestamp } = mint;

  const displayTime = formatDateTime(timestamp);
  const pricePerFim = fimAmount > 0 ? (usdcAmount / fimAmount).toFixed(4) : '0';
  const displaySize = Math.round(fimAmount).toLocaleString();
  const displayValue = `$${usdcAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div
      className="grid items-center px-3 py-2"
      style={{
        gridTemplateColumns: HIST_COL,
        borderBottom: '1px solid var(--color-border)',
        borderLeft: '3px solid var(--color-gold)',
      }}
    >
      <span className="font-mono text-[10px] text-text">{displayTime}</span>

      <span
        className="font-mono text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded w-fit"
        style={{
          background: 'var(--color-gold-15)',
          color: 'var(--color-gold)',
        }}
      >
        Auction
      </span>

      <span className="font-mono text-[10px] text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
        ${pricePerFim}
      </span>

      <span className="font-mono text-[10px] text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {displaySize}
      </span>

      <span className="font-mono text-[10px] text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {displayValue}
      </span>
    </div>
  );
}
