'use client';

import React, { useState, useMemo } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { parseUnits, formatUnits, erc20Abi, maxUint256 } from 'viem';
import { Order } from '@/hooks/useOrderBook';
import Core from '@/deployments/local/core.json';
import { useBatchPlayerPercentiles } from '@/hooks/useBatchPlayerPercentiles';
import { useTradeExecution, ExecutionPayload } from '@/hooks/useTradeExecution';
import { PercentileCircle } from './PercentileCircle';
import { GroupedOrder, OrderQueueItem } from './OrderQueueItem';
import PercentSlider from '@/components/PercentSlider';

interface TradingMaskProps {
  seasonSlug: string;
  seasonAddress: string;
  exchangeAddress: string;
  fimAddress: string;
  isBuy: boolean;
  setIsBuy: (v: boolean) => void;
  isMaker: boolean;
  setIsMaker: (v: boolean) => void;
  targetAmount: string;
  setTargetAmount: (v: string) => void;
  selectedOrders: Order[];
  onRemoveOrder: (id: string) => void;
  onMoveOrder: (index: number, direction: -1 | 1) => void;
  onReorderOrders: (newOrders: Order[]) => void;
  isOnHold?: boolean;
  onOpenOrderBook?: () => void;
}

export function TradingMask({
  seasonAddress, exchangeAddress, fimAddress,
  isBuy, setIsBuy, isMaker, setIsMaker,
  targetAmount, setTargetAmount,
  selectedOrders, onRemoveOrder, onReorderOrders,
  isOnHold = false,
  onOpenOrderBook,
}: TradingMaskProps) {
  const { address, isConnected } = useAccount();
  const [price, setPrice] = useState('1.00');
  const [isPricePerFim, setIsPricePerFim] = useState(true);
  const [draggedGroupIdx, setDraggedGroupIdx] = useState<number | null>(null);

  const handlePriceModeSwitch = (mode: 'Per FIM' | 'Total') => {
    const perFim = mode === 'Per FIM';
    setIsPricePerFim(perFim);
    setPrice(perFim ? '1.00' : targetAmount || '');
  };

  const spendingToken  = isBuy ? Core.USDC : fimAddress;
  const spendingSymbol = isBuy ? 'USDC' : 'FIM';

  const { data: fimBalance } = useReadContract({
    address: fimAddress as `0x${string}`, abi: erc20Abi, functionName: 'balanceOf',
    args: [address as `0x${string}`], query: { enabled: !!address, refetchInterval: 5000 },
  });
  const { data: usdcBalance } = useReadContract({
    address: Core.USDC as `0x${string}`, abi: erc20Abi, functionName: 'balanceOf',
    args: [address as `0x${string}`], query: { enabled: !!address, refetchInterval: 5000 },
  });

  const groupedQueue = useMemo(() => {
    const groups: GroupedOrder[] = [];
    if (!selectedOrders.length) return groups;
    let current: GroupedOrder | null = null;
    selectedOrders.forEach((order) => {
      const unitPrice = order.pricePerFim.toFixed(4);
      if (current && current.maker === order.maker && current.unitPrice === unitPrice) {
        current.amount += order.amount; current.price += order.price;
        current.ids.push(order.id); current.orders.push(order);
      } else {
        if (current) groups.push(current);
        current = { ...order, unitPrice, ids: [order.id], orders: [order], amount: order.amount, price: order.price };
      }
    });
    if (current) groups.push(current);
    return groups;
  }, [selectedOrders]);

  const queueMakers = useMemo(() =>
    Array.from(new Set(groupedQueue.map(g => g.maker?.toLowerCase()).filter(Boolean))),
    [groupedQueue]
  );
  const { data: percentileMap } = useBatchPlayerPercentiles(seasonAddress, queueMakers, exchangeAddress);

  const executionPayload = useMemo<ExecutionPayload>(() => {
    if (isMaker) return { ids: [], amounts: [], totalCostRaw: 0n, totalFimRaw: 0n };
    const targetAmountRaw = targetAmount ? parseUnits(targetAmount, 18) : maxUint256;
    let remaining = targetAmountRaw;
    const ids: bigint[] = []; const amounts: bigint[] = [];
    let totalCostUsdcRaw = 0n; let totalFimFilledRaw = 0n;
    for (const order of selectedOrders) {
      if (remaining <= 0n) break;
      const take = remaining > order.rawAmount ? order.rawAmount : remaining;
      ids.push(BigInt(order.orderId.toString())); amounts.push(take);
      totalCostUsdcRaw += (take * order.rawPrice) / order.rawInitialAmount;
      totalFimFilledRaw += take; remaining -= take;
    }
    return { ids, amounts, totalCostRaw: totalCostUsdcRaw, totalFimRaw: totalFimFilledRaw };
  }, [isMaker, targetAmount, selectedOrders]);

  const makerTotalUsdcRaw = useMemo(() => {
    if (!isMaker || !targetAmount || !price) return 0n;
    try {
      const total = isPricePerFim ? Number(targetAmount) * Number(price) : Number(price);
      return parseUnits(total.toFixed(6), 6);
    } catch { return 0n; }
  }, [isMaker, isPricePerFim, targetAmount, price]);

  const amountNeeded = useMemo(() => {
    if (!isConnected) return 0n;
    if (isMaker) return isBuy ? makerTotalUsdcRaw : parseUnits(targetAmount || '0', 18);
    return isBuy ? executionPayload.totalCostRaw : executionPayload.totalFimRaw;
  }, [isBuy, isMaker, targetAmount, makerTotalUsdcRaw, executionPayload, isConnected]);

  const isSelfFill = useMemo(() =>
    !isMaker && !!address && selectedOrders.some(o => o.maker.toLowerCase() === address.toLowerCase()),
    [selectedOrders, address, isMaker]
  );

  const formatDynamicUsdc = (raw: bigint) => {
    const v = Number(formatUnits(raw, 6));
    if (v === 0 && raw > 0n) return '< 0.000001';
    const d = v > 0 && v < 1 ? 6 : 2;
    return v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
  };

  const maxQueueFim = useMemo(() =>
    !isMaker ? selectedOrders.reduce((acc, o) => acc + o.rawAmount, 0n) : 0n,
    [isMaker, selectedOrders]
  );

  const maxForSlider = isMaker
    ? (isBuy ? (usdcBalance || 0n) : (fimBalance || 0n))
    : maxQueueFim;
  const maxDecimals = isMaker ? (isBuy ? 6 : 18) : 18;

  const sliderPct = useMemo(() => {
    if (!targetAmount || maxForSlider === 0n) return 0;
    try {
      const raw = parseUnits(targetAmount, maxDecimals);
      return Math.min(100, Math.round(Number((raw * 100n) / maxForSlider)));
    } catch { return 0; }
  }, [targetAmount, maxForSlider, maxDecimals]);

  const handleSliderChange = (pct: number) => {
    setTargetAmount(formatUnits((maxForSlider * BigInt(pct)) / 100n, maxDecimals));
  };

  const handleTargetAmountChange = (val: string) => {
    if (val !== '' && Number(val) < 0) return;
    if (!isMaker && maxQueueFim > 0n && val !== '') {
      try {
        if (parseUnits(val, 18) > maxQueueFim) {
          setTargetAmount(formatUnits(maxQueueFim, 18));
          return;
        }
      } catch { /* invalid parse, fall through */ }
    }
    setTargetAmount(val);
  };

  const handlePriceChange = (val: string) => {
    if (val !== '' && Number(val) < 0) return;
    setPrice(val);
  };

  const walletBalanceDisplay = isBuy
    ? `${Number(formatUnits(usdcBalance || 0n, 6)).toLocaleString()} USDC`
    : `${Number(formatUnits(fimBalance || 0n, 18)).toLocaleString()} FIM`;

  const handleRemoveGroup = (group: GroupedOrder) => group.ids.forEach(id => onRemoveOrder(id));
  const handleMoveGroupButton = (groupIdx: number, direction: -1 | 1) => {
    const newGroups = [...groupedQueue];
    const [moved] = newGroups.splice(groupIdx, 1);
    newGroups.splice(groupIdx + direction, 0, moved);
    onReorderOrders(newGroups.flatMap(g => g.orders));
  };
  const handleGroupDragOver = (e: React.DragEvent, overGroupIdx: number) => {
    e.preventDefault();
    if (draggedGroupIdx === null || draggedGroupIdx === overGroupIdx) return;
    const newGroups = [...groupedQueue];
    const [moved] = newGroups.splice(draggedGroupIdx, 1);
    newGroups.splice(overGroupIdx, 0, moved);
    setDraggedGroupIdx(overGroupIdx);
    onReorderOrders(newGroups.flatMap(g => g.orders));
  };

  const { workflowStatus, handleStartFlow, isBusy } = useTradeExecution({
    isMaker, isBuy, targetAmount, makerTotalUsdcRaw, executionPayload,
    spendingToken: spendingToken as `0x${string}`, spendingSymbol,
    exchangeAddress: exchangeAddress as `0x${string}`,
    amountNeeded, selectedOrders, onRemoveOrder, setTargetAmount, setPrice,
  });

  const isButtonDisabled = isBusy || workflowStatus === 'success'
    || (isMaker ? makerTotalUsdcRaw === 0n : (selectedOrders.length === 0 || executionPayload.totalCostRaw === 0n))
    || isSelfFill;

  const userMakers = useMemo(() => (address ? [address.toLowerCase()] : []), [address]);
  const { data: userStatsMap, isFetched: userStatsFetched } = useBatchPlayerPercentiles(seasonAddress, userMakers, exchangeAddress);
  const userStats = address ? userStatsMap?.[address.toLowerCase()] : undefined;

  const isQueueLocked = !isMaker && selectedOrders.length > 0;

  const showModal = workflowStatus !== 'idle' && workflowStatus !== 'canceled';

  if (!isConnected) {
    return (
      <div className="card-app flex items-center justify-center h-full">
        <p className="font-mono text-sm text-text2">Please connect wallet</p>
      </div>
    );
  }

  if (isOnHold) {
    return (
      <div className="flex flex-col gap-4 h-full">
        <div className="card-app border border-border2">
          <p className="section-label mb-1">FIM Balance</p>
          <div
            className="font-display font-extrabold leading-none text-display-trading tabular-nums"
            style={{ color: 'var(--color-gold)', textShadow: '0 0 40px var(--color-gold-35)' }}
          >
            {Number(formatUnits(fimBalance || 0n, 18)).toLocaleString()}
            <span className="font-mono font-medium text-text2 ml-2 text-currency-label">FIM</span>
          </div>
        </div>
        <div className="card-app text-center border border-border2">
          <p className="section-label">Season on Hold</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 h-full relative">

      {/* ── Wallet balances card ── */}
      <div className="p-6 rounded-lg flex items-start justify-between bg-linear-to-b from-(--color-gold-15) to-card to-10% border border-border2">
        <div>
          <p className="section-label mb-1">FIM Balance</p>
          <div
            className="font-display font-extrabold leading-none text-display-trading mr-4"
            style={{ color: 'var(--color-gold)', textShadow: '0 0 40px var(--color-gold-35)', fontVariantNumeric: 'tabular-nums' }}
          >
            {Number(formatUnits(fimBalance || 0n, 18)).toLocaleString()}
            <span className="font-mono font-medium text-text2 ml-2 text-currency-label">FIM</span>
          </div>
        </div>
        {userStats ? (
          <div className="flex flex-col items-start min-w-0">
            <span className="section-label mb-1">
              RANK:&nbsp;
              <span style={{ color: userStats.isCapitalist ? 'var(--color-gold)' : 'var(--color-purple)' }}>
                {userStats.isCapitalist ? 'CAPITALIST' : 'SOCIALIST'}
              </span>
            </span>
            <div className="xl:hidden"><PercentileCircle percentage={userStats.factionPercentile} isCapitalist={userStats.isCapitalist} size="md" /></div>
            <div className="hidden xl:block"><PercentileCircle percentage={userStats.factionPercentile} isCapitalist={userStats.isCapitalist} size="lg" /></div>
          </div>
        ) : (
          <span className="section-label">{userStatsFetched ? 'No Rank Yet' : 'Loading…'}</span>
        )}
      </div>

      {/* ── Trading panel card ── */}
      <div className="rounded-lg p-6 flex flex-col gap-4 flex-1 min-h-0 bg-card border border-border">

        {/* ── Buy / Sell toggle ── */}
        <div className="flex rounded-lg overflow-hidden border border-border bg-card2 p-1 gap-1">
          <button
            disabled={isQueueLocked}
            onClick={() => setIsBuy(true)}
            className="flex-1 py-2 rounded font-display font-bold text-sm uppercase tracking-wide transition-all disabled:opacity-50"
            style={isBuy ? {
              background: 'linear-gradient(180deg, var(--color-green-hover), var(--color-green))',
              color: '#0a1e0b',
              boxShadow: '0 2px 8px -2px var(--color-green-35)',
            } : { color: 'var(--color-text2)' }}
          >
            Buy
          </button>
          <button
            disabled={isQueueLocked}
            onClick={() => setIsBuy(false)}
            className="flex-1 py-2 rounded font-display font-bold text-sm uppercase tracking-wide transition-all disabled:opacity-50"
            style={!isBuy ? {
              background: 'linear-gradient(180deg, var(--color-red-hover), var(--color-red))',
              color: 'white',
              boxShadow: '0 2px 8px -2px var(--color-red-35)',
            } : { color: 'var(--color-text2)' }}
          >
            Sell
          </button>
        </div>

        {/* ── Amount input with embedded Maker/Taker rail ── */}
        <div>
          <div className="input-embedded-rail">
            <button
              disabled={isQueueLocked}
              onClick={() => setIsMaker(false)}
              className={`btn-input-switch ${!isMaker ? 'active' : ''}`}
            >
              Taker
            </button>
            <button
              disabled={isQueueLocked}
              onClick={() => setIsMaker(true)}
              className={`btn-input-switch ${isMaker ? 'active' : ''}`}
            >
              Maker
            </button>
          </div>
          <div className="bg-card2 border border-border rounded-b px-3 pt-2 pb-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="mask-label">{isBuy ? 'Buy FIM' : 'Sell FIM'}</span>
              <span className="mask-label">WALLET&nbsp;<span className="text-text font-semibold">{walletBalanceDisplay}</span></span>
            </div>
            <input
              type="number"
              min="0"
              value={targetAmount}
              onChange={(e) => handleTargetAmountChange(e.target.value)}
              className="w-full bg-transparent text-input font-mono text-text outline-none placeholder:text-text2/40 tabular-nums"
              placeholder={isMaker ? '0.00' : 'MAX'}
            />
            <PercentSlider value={sliderPct} onChange={handleSliderChange} disabled={isBusy} />
          </div>
        </div>

        {/* ── Maker price input with embedded Per FIM / Total rail ── */}
        {isMaker && (
          <div>
            <div className="input-embedded-rail">
              <button
                onClick={() => handlePriceModeSwitch('Per FIM')}
                className={`btn-input-switch ${isPricePerFim ? 'active' : ''}`}
              >
                Per FIM
              </button>
              <button
                onClick={() => handlePriceModeSwitch('Total')}
                className={`btn-input-switch ${!isPricePerFim ? 'active' : ''}`}
              >
                Total
              </button>
            </div>
            <div className="bg-card2 border border-border rounded-b px-3 pt-2 pb-3 flex flex-col gap-1">
              <span className="mask-label">{isPricePerFim ? 'Price per FIM (USDC)' : 'Total Order (USDC)'}</span>
              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => handlePriceChange(e.target.value)}
                className="w-full bg-transparent text-input font-mono text-text outline-none placeholder:text-text2/40 tabular-nums"
                placeholder="0.00"
              />
            </div>
          </div>
        )}

        {/* ── Taker: order queue ── */}
        {!isMaker && (
          <div className="flex flex-col flex-1 min-h-0">
            <p className="section-label mb-2">Order Execution Queue</p>
            <div className="flex-1 overflow-y-auto custom-scrollbar rounded-lg p-2 border border-border bg-bg">
              {groupedQueue.length === 0 ? (
                <button
                  onClick={onOpenOrderBook}
                  disabled={!onOpenOrderBook}
                  className="h-full w-full flex flex-col items-center justify-center py-10 gap-1.5 rounded-lg transition-colors hover:bg-card2/60 disabled:pointer-events-none"
                >
                  <p className="section-label opacity-50">Select orders from Order Book</p>
                  {onOpenOrderBook && (
                    <p className="font-mono text-[10px] uppercase tracking-widest text-text2/30">Click to open →</p>
                  )}
                </button>
              ) : (
                groupedQueue.map((group, groupIdx) => {
                  const filledBefore = groupedQueue.slice(0, groupIdx).reduce((acc, g) => acc + g.amount, 0);
                  return (
                    <OrderQueueItem
                      key={group.ids[0]}
                      group={group} groupIdx={groupIdx} groupCount={groupedQueue.length}
                      draggedGroupIdx={draggedGroupIdx} targetAmount={targetAmount}
                      filledBefore={filledBefore} stats={percentileMap?.[group.maker?.toLowerCase()]}
                      onMoveGroup={handleMoveGroupButton} onRemoveGroup={handleRemoveGroup}
                      onDragStart={setDraggedGroupIdx} onDragOver={handleGroupDragOver}
                      onDragEnd={() => setDraggedGroupIdx(null)}
                    />
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ── Summary + CTA ── */}
        <div className="mt-auto pt-4 flex flex-col gap-4" style={{ borderTop: '1px solid var(--color-border)' }}>
          <div className="flex justify-between items-end">
            <div>
              <p className="section-label mb-1">{isMaker ? 'Total' : 'Total'}</p>
              <span className="font-mono font-bold text-summary-value" style={{ color: 'var(--color-gold)', fontVariantNumeric: 'tabular-nums' }}>
                ${formatDynamicUsdc(isMaker ? makerTotalUsdcRaw : executionPayload.totalCostRaw)}
              </span>
            </div>
            {!isMaker && (
              <div className="text-right">
                <p className="section-label mb-1">{isBuy ? 'Buying' : 'Selling'}</p>
                <span
                  className="font-mono font-bold text-summary-sub tabular-nums"
                  style={{ color: isBuy ? 'var(--color-green)' : 'var(--color-red)' }}
                >
                  {Number(formatUnits(executionPayload.totalFimRaw, 18)).toLocaleString()} FIM
                </span>
              </div>
            )}
          </div>

          {isSelfFill && (
            <div className="rounded-lg px-4 py-2.5 flex items-center gap-2 surface-pink-warn">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-red">
                Cannot fill own order
              </span>
            </div>
          )}

          <button
            disabled={isButtonDisabled}
            onClick={handleStartFlow}
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-lg font-display font-bold text-[15px] uppercase tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={!isButtonDisabled ? {
              background: isBuy
                ? 'linear-gradient(180deg, var(--color-green-hover), var(--color-green))'
                : 'linear-gradient(180deg, var(--color-red-hover), var(--color-red))',
              color: isBuy ? '#0a1e0b' : 'white',
              boxShadow: isBuy
                ? '0 8px 24px -10px var(--color-green-35)'
                : '0 8px 24px -10px var(--color-red-35)',
            } : { background: 'var(--color-card3)', color: 'var(--color-text2)' }}
          >
            {isBusy && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
            <span>{isBuy ? 'Buy FIM' : 'Sell FIM'}</span>
          </button>
        </div>

      </div>

      {/* ── Transaction Journey Modal ── */}
      {showModal && (
        <div className="modal-overlay-blur">
          <div className="bg-card3 border border-border2 rounded-xl p-6 flex flex-col gap-6 w-full max-w-sm shadow-2xl">
            <div>
              <h3 className="font-display font-bold text-lg text-text">
                {workflowStatus === 'success' ? 'Trade Confirmed' : workflowStatus === 'failed' ? 'Transaction Failed' : 'Execute Transaction'}
              </h3>
              <p className="font-mono text-xs text-text2 mt-1">
                {workflowStatus === 'success'
                  ? 'Your trade has been confirmed on-chain.'
                  : workflowStatus === 'failed'
                  ? 'Something went wrong. Check your wallet and retry.'
                  : 'Follow the steps in your connected wallet'}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {/* Step 1: Approve */}
              <div className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${['approving', 'mining_approval'].includes(workflowStatus) ? 'bg-card2' : ''}`}>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono shrink-0 transition-all"
                  style={
                    ['executing', 'mining_execute', 'success'].includes(workflowStatus)
                      ? { background: 'var(--color-green)', color: '#0a1e0b' }
                      : ['approving', 'mining_approval'].includes(workflowStatus)
                      ? { background: 'var(--color-primary)', color: 'white' }
                      : { background: 'var(--color-card)', border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }
                  }
                >
                  {['executing', 'mining_execute', 'success'].includes(workflowStatus) ? '✓' : '1'}
                </div>
                <div>
                  <p className="font-mono text-xs font-semibold text-text">Approve Spending Allowance</p>
                  <p className="font-mono text-[11px] text-text2">Allow contract to use your {spendingSymbol}</p>
                </div>
              </div>

              {/* Step 2: Execute */}
              <div className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${['executing', 'mining_execute'].includes(workflowStatus) ? 'bg-card2' : ''}`}>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono shrink-0 transition-all"
                  style={
                    workflowStatus === 'success'
                      ? { background: 'var(--color-green)', color: '#0a1e0b' }
                      : ['executing', 'mining_execute'].includes(workflowStatus)
                      ? { background: 'var(--color-primary)', color: 'white' }
                      : { background: 'var(--color-card)', border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }
                  }
                >
                  {workflowStatus === 'success' ? '✓' : '2'}
                </div>
                <div>
                  <p className="font-mono text-xs font-semibold text-text">Confirm Trade Execution</p>
                  <p className="font-mono text-[11px] text-text2">Sign final trade payload structure</p>
                </div>
              </div>
            </div>

            {['success', 'failed'].includes(workflowStatus) && (
              <button
                onClick={() => setTargetAmount('')}
                className="w-full inline-flex items-center justify-center py-3 rounded-lg font-display font-bold text-sm uppercase tracking-wide transition-all hover:brightness-105"
                style={workflowStatus === 'success' ? {
                  background: 'linear-gradient(180deg, var(--color-green-hover), var(--color-green))',
                  color: '#0a1e0b',
                } : {
                  background: 'linear-gradient(180deg, var(--color-red-hover), var(--color-red))',
                  color: 'white',
                }}
              >
                {workflowStatus === 'success' ? 'Done' : 'Close & Retry'}
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
