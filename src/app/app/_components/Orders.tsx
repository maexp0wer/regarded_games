'use client';

import React, { useState } from 'react';
import { useWriteContract, usePublicClient, useReadContract } from 'wagmi';
import { formatUnits, erc20Abi } from 'viem';
import ExchangeAbi from '@/deployments/abis/Exchange.json';
import { useOpenOrders, MyOrder } from '@/hooks/useOpenOrders';
import { useMyAuctionMints, AuctionMint } from '@/hooks/useMyAuctionMints';
import { useMyTrades, MyTrade } from '@/hooks/useMyTrades';
import { useTenantChainId } from '@/context/TenantContext';
import { useLastTradePrice } from '@/hooks/useLastTradePrice';
import { usePayout } from '@/hooks/usePayout';

interface OrdersProps {
  seasonAddress: string;
  userAddress: string;
  exchangeAddress: string;
  fimAddress?: string;
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

type CancelStatus = 'idle' | 'executing' | 'mining' | 'success' | 'canceled' | 'failed';

export function Orders({ seasonAddress, userAddress, exchangeAddress, fimAddress }: OrdersProps) {
  const [activeTab, setActiveTab] = useState<TabType>('position');
  const [cancelStatus, setCancelStatus] = useState<CancelStatus>('idle');

  const { data: openOrders = [], refetch: refetchOpen } = useOpenOrders(seasonAddress, userAddress, 'open');
  const { data: filledOrders = [], refetch: refetchFilled } = useOpenOrders(seasonAddress, userAddress, 'filled');
  const { data: cancelledOrders = [], refetch: refetchCancelled } = useOpenOrders(seasonAddress, userAddress, 'cancelled');
  const { data: auctionMints = [] } = useMyAuctionMints(seasonAddress, userAddress);
  const { data: myTrades = [] } = useMyTrades(seasonAddress, userAddress);
  const { data: lastTradePrice = 0 } = useLastTradePrice(seasonAddress);
  const { userNetContrib } = usePayout(seasonAddress, userAddress);

  const chainId = useTenantChainId();
  const { data: fimBalanceRaw } = useReadContract({
    address: fimAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [userAddress as `0x${string}`],
    chainId,
    query: { enabled: !!userAddress && !!fimAddress, refetchInterval: 5000 },
  });
  const lockedFim = openOrders.reduce((acc, o) => (o.isBuy ? acc : acc + o.remainingAmount), 0);
  const totalFim = Number(formatUnits(fimBalanceRaw || 0n, 18)) + lockedFim;

  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId });

  const handleCancel = async (contractOrderId: bigint) => {
    if (!publicClient) return;
    try {
      setCancelStatus('executing');
      const hash = await writeContractAsync({
        address: exchangeAddress as `0x${string}`,
        abi: ExchangeAbi as any,
        functionName: 'cancelOrder',
        args: [contractOrderId],
      });
      setCancelStatus('mining');
      await publicClient.waitForTransactionReceipt({ hash });
      setCancelStatus('success');
      refetchOpen();
      refetchFilled();
      refetchCancelled();
    } catch (err: any) {
      const isRejection = err.shortMessage?.includes('rejected') || err.message?.includes('User rejected');
      if (isRejection) {
        setCancelStatus('canceled');
        setTimeout(() => setCancelStatus('idle'), 2000);
      } else {
        setCancelStatus('failed');
      }
    }
  };

  const isBusy = cancelStatus === 'executing' || cancelStatus === 'mining';
  const showModal = cancelStatus !== 'idle' && cancelStatus !== 'canceled';

  const toggle = (tab: TabType) => setActiveTab(tab);

  return (
    <div className="flex flex-col">

      {/* Button bar */}
      <div className="terminal-view-selector-bar terminal-view-selector-bar--chat">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className={`terminal-view-btn${activeTab === key ? ' active' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="card-app" style={{ padding: 0 }}>
        {activeTab === 'openOrders' && (
          <OpenOrdersView
            orders={openOrders}
            isPending={isBusy}
            onCancel={handleCancel}
          />
        )}
        {activeTab === 'position' && (
          <PositionView
            trades={myTrades}
            auctionMints={auctionMints}
            currentPrice={lastTradePrice}
            totalFim={totalFim}
            netContribution={userNetContrib}
          />
        )}
        {activeTab === 'history' && (
          <TradeHistoryView
            orders={[...filledOrders, ...cancelledOrders]}
            auctionMints={auctionMints}
          />
        )}
      </div>

      {/* Cancel Order Transaction Modal */}
      {showModal && (
        <div className="modal-overlay-blur">
          <div className="bg-card3 border border-border2 rounded-xl p-6 flex flex-col gap-6 w-full max-w-sm shadow-2xl">
            <div>
              <h3 className="font-display font-bold text-lg text-text">
                {cancelStatus === 'success' ? 'Order Cancelled' : cancelStatus === 'failed' ? 'Transaction Failed' : 'Cancelling Order'}
              </h3>
              <p className="font-mono text-xs text-text2 mt-1">
                {cancelStatus === 'success'
                  ? 'Your order has been cancelled on-chain.'
                  : cancelStatus === 'failed'
                  ? 'Something went wrong. Check your wallet and retry.'
                  : 'Follow the steps in your connected wallet'}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <div className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${['executing', 'mining'].includes(cancelStatus) ? 'bg-card2' : ''}`}>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono shrink-0 transition-all"
                  style={
                    cancelStatus === 'success'
                      ? { background: 'var(--color-green)', color: '#0a1e0b' }
                      : ['executing', 'mining'].includes(cancelStatus)
                      ? { background: 'var(--color-primary)', color: 'white' }
                      : { background: 'var(--color-card)', border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }
                  }
                >
                  {cancelStatus === 'success' ? '✓' : '1'}
                </div>
                <div>
                  <p className="font-mono text-xs font-semibold text-text">Confirm Cancellation</p>
                  <p className="font-mono text-[11px] text-text2">Sign the cancel transaction in your wallet</p>
                </div>
              </div>
            </div>

            {['success', 'failed'].includes(cancelStatus) && (
              <button
                onClick={() => setCancelStatus('idle')}
                className="w-full inline-flex items-center justify-center py-3 rounded-lg font-display font-bold text-sm uppercase tracking-wide transition-all hover:brightness-105"
                style={cancelStatus === 'success' ? {
                  background: 'linear-gradient(180deg, var(--color-green-hover), var(--color-green))',
                  color: '#0a1e0b',
                } : {
                  background: 'linear-gradient(180deg, var(--color-red-hover), var(--color-red))',
                  color: 'white',
                }}
              >
                {cancelStatus === 'success' ? 'Done' : 'Close & Retry'}
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

// ── Open Orders ────────────────────────────────────────────────────────────────

const OPEN_COL = '1.6fr 0.7fr 0.9fr 1fr 1fr 1fr 1fr 72px';

interface OpenOrdersViewProps {
  orders: MyOrder[];
  isPending: boolean;
  onCancel: (orderId: bigint) => void;
}

function OpenOrdersView({ orders, isPending, onCancel }: OpenOrdersViewProps) {
  return (
    <div className="p-2 bg-card">
      <div className="bg-card overflow-hidden">
        <div className="overflow-y-auto custom-scrollbar relative" style={{ height: '160px' }}>
          <div className="ledger-header sticky top-0 z-10" style={{ gridTemplateColumns: OPEN_COL }}>
            <div>Time</div>
            <div>Direction</div>
            <div className="text-right">Size</div>
            <div className="text-right">Original Size</div>
            <div className="text-right">Order Value</div>
            <div className="text-right">Price</div>
            <div />
            <div />
          </div>
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
      </div>
    </div>
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
  const orderValue = `$${(price * initialAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const pricePerFim = `$${price.toFixed(4)}`;

  return (
    <div className="ledger-row items-center" style={{ gridTemplateColumns: OPEN_COL }}>
      <span className="ledger-cell-secondary">{displayTime}</span>

      <span
        className="ledger-cell-secondary"
        style={{ color: isBuy ? 'var(--color-green)' : 'var(--color-red)' }}
      >{direction}</span>

      <span className="ledger-cell-metric">{size}</span>
      <span className="ledger-cell-metric">{originalSize}</span>
      <span className="ledger-cell-metric">{orderValue}</span>
      <span className="ledger-cell-metric">{pricePerFim}</span>

      <div />

      <div className="flex justify-end pr-2">
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

const POS_COL = '1fr 1.2fr 1fr 1fr 1fr 1.2fr';

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
  totalFim: number;
  netContribution: number;
}

function PositionView({ trades, auctionMints, currentPrice, totalFim, netContribution }: PositionViewProps) {
  const position = computePosition(trades, auctionMints);

  return (
    <div className="p-2 bg-card">
      <div className="bg-card overflow-hidden">
        <div className="overflow-y-auto custom-scrollbar relative" style={{ height: '160px' }}>
          <div className="ledger-header sticky top-0 z-10" style={{ gridTemplateColumns: POS_COL }}>
            <div>Size</div>
            <div className="text-right">Position Value</div>
            <div className="text-right">Entry Price</div>
            <div className="text-right">Current Price</div>
            <div className="text-right">PNL</div>
            <div className="text-right">Net Contribution</div>
          </div>
          {totalFim < 0.0001 ? (
            <div className="flex items-center justify-center py-6">
              <p className="section-label opacity-30">No position</p>
            </div>
          ) : (
            <PositionRow totalFim={totalFim} entryPrice={position?.entryPrice} currentPrice={currentPrice} netContribution={netContribution} />
          )}
        </div>
      </div>
    </div>
  );
}

interface PositionRowProps {
  totalFim: number;
  entryPrice: number | undefined;
  currentPrice: number;
  netContribution: number;
}

function PositionRow({ totalFim, entryPrice, currentPrice, netContribution }: PositionRowProps) {
  const positionValue = totalFim * currentPrice;
  const pnl = entryPrice !== undefined ? (currentPrice - entryPrice) * totalFim : null;
  const pnlPositive = pnl !== null && pnl >= 0;
  const netPositive = netContribution >= 0;

  return (
    <div className="ledger-row items-center" style={{ gridTemplateColumns: POS_COL }}>
      <span className="ledger-cell-metric" style={{ textAlign: 'left' }}>{Math.round(totalFim).toLocaleString()}</span>

      <span className="ledger-cell-metric">
        ${positionValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>

      <span className="ledger-cell-metric">
        {entryPrice !== undefined ? `$${entryPrice.toFixed(4)}` : '—'}
      </span>

      <span className="ledger-cell-metric">${currentPrice.toFixed(4)}</span>

      <span
        className="ledger-cell-metric"
        style={{ color: pnl !== null ? (pnlPositive ? 'var(--color-green)' : 'var(--color-red)') : 'var(--color-text2)' }}
      >
        {pnl !== null
          ? `${pnlPositive ? '+' : ''}$${pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : '—'}
      </span>

      <span
        className="ledger-cell-metric"
        style={{ color: netPositive ? 'var(--color-green)' : 'var(--color-red)' }}
      >
        {netPositive ? '+' : '-'}${Math.abs(netContribution).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
    <div className="p-2 bg-card">
      <div className="bg-card overflow-hidden">
        <div className="overflow-y-auto custom-scrollbar relative" style={{ height: '160px' }}>
          <div className="ledger-header sticky top-0 z-10" style={{ gridTemplateColumns: HIST_COL }}>
            <div>Time</div>
            <div>Direction</div>
            <div className="text-right">Price</div>
            <div className="text-right">Size</div>
            <div className="text-right">Trade Value</div>
          </div>
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
      </div>
    </div>
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
    <div className="ledger-row items-center" style={{ gridTemplateColumns: HIST_COL }}>
      <span className="ledger-cell-secondary">{displayTime}</span>

      <span
        className="ledger-cell-secondary"
        style={{ color: isCancelled ? 'var(--color-text2)' : isBuy ? 'var(--color-green)' : 'var(--color-red)' }}
      >{direction}</span>

      <span className="ledger-cell-metric">${pricePerFim}</span>
      <span className="ledger-cell-metric">{displaySize}</span>
      <span className="ledger-cell-metric">{displayValue}</span>
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
      className="ledger-row items-center"
      style={{
        gridTemplateColumns: HIST_COL,
        boxShadow: 'inset 3px 0 0 0 var(--color-gold)',
      }}
    >
      <span className="ledger-cell-secondary">{displayTime}</span>

      <span className="ledger-cell-secondary" style={{ color: 'var(--color-gold)' }}>Auction</span>

      <span className="ledger-cell-metric">${pricePerFim}</span>
      <span className="ledger-cell-metric">{displaySize}</span>
      <span className="ledger-cell-metric">{displayValue}</span>
    </div>
  );
}
