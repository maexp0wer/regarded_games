'use client';

import React, { useState, useMemo } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { parseUnits, formatUnits, erc20Abi, maxUint256 } from 'viem';
import { Order } from '@/hooks/useOrderBook';
import Core from '@/deployments/core.json';
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
}

export function TradingMask({
  seasonAddress, exchangeAddress, fimAddress,
  isBuy, setIsBuy, isMaker, setIsMaker,
  targetAmount, setTargetAmount,
  selectedOrders, onRemoveOrder, onReorderOrders,
}: TradingMaskProps) {
  const { address, isConnected } = useAccount();
  const [price, setPrice] = useState('1.00');
  const [isPricePerFim, setIsPricePerFim] = useState(true);

  const handlePriceModeSwitch = (mode: 'Per FIM' | 'Total') => {
    const perFim = mode === 'Per FIM';
    setIsPricePerFim(perFim);
    setPrice(perFim ? '1.00' : targetAmount || '');
  };
  const [draggedGroupIdx, setDraggedGroupIdx] = useState<number | null>(null);

  const spendingToken  = isBuy ? Core.USDC : fimAddress;
  const spendingSymbol = isBuy ? 'USDC' : 'FIM';

  // --- Balance reads ---
  const { data: fimBalance } = useReadContract({
    address: fimAddress as `0x${string}`, abi: erc20Abi, functionName: 'balanceOf',
    args: [address as `0x${string}`], query: { enabled: !!address, refetchInterval: 5000 },
  });
  const { data: usdcBalance } = useReadContract({
    address: Core.USDC as `0x${string}`, abi: erc20Abi, functionName: 'balanceOf',
    args: [address as `0x${string}`], query: { enabled: !!address, refetchInterval: 5000 },
  });

  // --- Grouped queue ---
  const groupedQueue = useMemo(() => {
    const groups: GroupedOrder[] = [];
    if (!selectedOrders.length) return groups;
    let current: GroupedOrder | null = null;
    selectedOrders.forEach((order) => {
      const unitPrice = (order.amount > 0 ? order.price / order.amount : 0).toFixed(4);
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
  const { data: percentileMap } = useBatchPlayerPercentiles(seasonAddress, queueMakers);

  // --- Execution payload ---
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
      totalCostUsdcRaw += (take * order.rawPrice) / order.rawAmount;
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

  // --- Amount slider ---
  const maxForSlider = isBuy ? (usdcBalance || 0n) : (fimBalance || 0n);
  const maxDecimals  = isBuy ? 6 : 18;

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

  const walletBalanceDisplay = isBuy
    ? `${Number(formatUnits(usdcBalance || 0n, 6)).toLocaleString()} USDC`
    : `${Number(formatUnits(fimBalance || 0n, 18)).toLocaleString()} FIM`;

  // --- Drag handlers ---
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

  // --- Trade execution ---
  const { workflowStatus, handleStartFlow, getStatusText, isBusy } = useTradeExecution({
    isMaker, isBuy, targetAmount, makerTotalUsdcRaw, executionPayload,
    spendingToken: spendingToken as `0x${string}`, spendingSymbol,
    exchangeAddress: exchangeAddress as `0x${string}`,
    amountNeeded, selectedOrders, onRemoveOrder, setTargetAmount, setPrice,
  });

  const isButtonDisabled = isBusy || workflowStatus === 'success'
    || (isMaker ? (!targetAmount || !price) : selectedOrders.length === 0)
    || isSelfFill;

  const userMakers = useMemo(() => (address ? [address.toLowerCase()] : []), [address]);
  const { data: userStatsMap, isFetched: userStatsFetched } = useBatchPlayerPercentiles(seasonAddress, userMakers);
  const userStats = address ? userStatsMap?.[address.toLowerCase()] : undefined;

  const isQueueLocked = !isMaker && selectedOrders.length > 0;

  const inputBase = 'bg-transparent border-none p-0 w-full font-mono font-bold text-text outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

  if (!isConnected) {
    return (
      <div className="card-app flex items-center justify-center h-full">
        <p className="font-mono text-sm text-text2">Please connect wallet</p>
      </div>
    );
  }

  const buyActive  = { background: 'rgba(107,203,110,0.15)', color: 'var(--color-green)', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' };
  const sellActive = { background: 'rgba(255,61,138,0.15)', color: 'var(--color-pink)',  boxShadow: '0 1px 4px rgba(0,0,0,0.2)' };
  const segInactive = { color: 'var(--color-text2)', background: 'transparent' };

  const ctaBtnStyle = isBusy || workflowStatus !== 'idle'
    ? {}
    : isButtonDisabled
    ? { background: 'var(--color-card2)', color: 'var(--color-text2)', cursor: 'not-allowed' }
    : isBuy
    ? { background: 'linear-gradient(135deg, #6bcb6e, #4daa50)', color: 'var(--color-bg)', boxShadow: '0 4px 20px -6px rgba(107,203,110,0.5)' }
    : { background: 'linear-gradient(135deg, #ff7ab0, #ff3d8a)', color: 'var(--color-bg)', boxShadow: '0 4px 20px -6px rgba(255,61,138,0.5)' };

  return (
    <div
      className="card-app flex flex-col gap-4 h-full"
      style={{ borderColor: 'var(--color-border-bright)' }}
    >
      {/* ── Wallet balances row ── */}
      <div className="flex items-start justify-between pb-4">
        <div>
          <p className="section-label mb-1">FIM Balance</p>
          <div
            className="font-display font-extrabold leading-none"
            style={{
              fontSize: 'clamp(24px, 4vw, 56px)',
              color: 'var(--color-gold)',
              textShadow: '0 0 40px rgba(245,184,0,0.25)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {Number(formatUnits(fimBalance || 0n, 18)).toLocaleString()}
            <span className="font-mono font-medium text-text2 ml-2" style={{ fontSize: 14 }}>FIM</span>
          </div>
        </div>
        {userStats ? (
          <div className="flex flex-col items-end shrink-0">
            <p className="section-label mb-1">
              CURRENT RANK:{' '}
              <span style={{ color: userStats.isCapitalist ? 'var(--color-blue)' : 'var(--color-pink)' }}>
                {userStats.isCapitalist ? 'CAPITALIST' : 'SOCIALIST'}
              </span>
            </p>
            <div className="md:hidden"><PercentileCircle percentage={userStats.factionPercentile} isCapitalist={userStats.isCapitalist} size="md" /></div>
            <div className="hidden md:block"><PercentileCircle percentage={userStats.factionPercentile} isCapitalist={userStats.isCapitalist} size="lg" /></div>
          </div>
        ) : (
          <span className="section-label">{userStatsFetched ? 'No Rank Yet' : 'Loading…'}</span>
        )}
      </div>

      {/* ── Buy / Sell seg control ── */}
      <div className="seg" style={{ width: '100%' }}>
        <button
          disabled={isQueueLocked}
          onClick={() => setIsBuy(true)}
          className="seg-btn"
          style={{ ...(isBuy ? buyActive : (isQueueLocked && !isBuy) ? { ...segInactive, opacity: 0.3 } : segInactive), flex: 1, textAlign: 'center' }}
        >
          Buy
        </button>
        <button
          disabled={isQueueLocked}
          onClick={() => setIsBuy(false)}
          className="seg-btn"
          style={{ ...(!isBuy ? sellActive : (isQueueLocked && isBuy) ? { ...segInactive, opacity: 0.3 } : segInactive), flex: 1, textAlign: 'center' }}
        >
          Sell
        </button>
      </div>

      {/* ── Amount input ── */}
      <div
        className="rounded-xl flex overflow-hidden"
        style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
      >
        {/* Input area */}
        <div className="flex flex-col flex-1 p-4 gap-2">
          <div className="flex items-center justify-between">
            <span className="section-label">{isBuy ? 'Buy FIM with USDC' : 'Sell FIM for USDC'}</span>
            <span className="font-mono text-[11px] text-text2">
              Wallet · <span className="text-text font-semibold">{walletBalanceDisplay}</span>
            </span>
          </div>
          <input
            type="number"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            className={inputBase}
            style={{ fontSize: 28 }}
            placeholder={isMaker ? '0.00' : 'MAX'}
          />
          <PercentSlider value={sliderPct} onChange={handleSliderChange} disabled={isBusy} />
        </div>
        {/* Vertical Maker/Taker toggle — right side */}
        <div className="flex flex-col shrink-0" style={{ width: 64, borderLeft: '1px solid var(--color-border)' }}>
          {(['Maker', 'Taker'] as const).map((mode, i) => {
            const active = (mode === 'Maker') === isMaker;
            return (
              <button
                key={mode}
                onClick={() => setIsMaker(mode === 'Maker')}
                className="flex-1 font-mono font-semibold uppercase flex items-center justify-center transition-all"
                style={{
                  fontSize: 10, letterSpacing: '0.07em',
                  background: active ? 'var(--color-primary)' : 'transparent',
                  color: active ? 'var(--color-primary3)' : 'var(--color-text2)',
                  borderBottom: i === 0 ? '1px solid var(--color-border)' : undefined,
                }}
              >
                {mode}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Maker price input ── */}
      {isMaker && (
        <div
          className="rounded-xl flex overflow-hidden"
          style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
        >
          {/* Input area */}
          <div className="flex flex-col flex-1 p-4 gap-1">
            <span className="section-label">{isPricePerFim ? 'Price per FIM (USDC)' : 'Total Order (USDC)'}</span>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={inputBase}
              style={{ fontSize: 28 }}
              placeholder="0.00"
            />
          </div>
          {/* Vertical Per FIM/Total toggle — right side */}
          <div className="flex flex-col shrink-0" style={{ width: 64, borderLeft: '1px solid var(--color-border)' }}>
            {(['Per FIM', 'Total'] as const).map((mode, i) => {
              const active = (mode === 'Per FIM') === isPricePerFim;
              return (
                <button
                  key={mode}
                  onClick={() => handlePriceModeSwitch(mode)}
                  className="flex-1 font-mono font-semibold uppercase flex items-center justify-center transition-all text-center"
                  style={{
                    fontSize: 10, letterSpacing: '0.07em',
                    background: active ? 'var(--color-primary)' : 'transparent',
                    color: active ? 'var(--color-primary3)' : 'var(--color-text2)',
                    borderBottom: i === 0 ? '1px solid var(--color-border)' : undefined,
                    padding: '0 4px', lineHeight: 1.3,
                  }}
                >
                  {mode}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Taker: order queue ── */}
      {!isMaker && (
        <div className="flex flex-col flex-1 min-h-0">
          <p className="section-label mb-2">Order Execution Queue</p>
          <div
            className="flex-1 overflow-y-auto custom-scrollbar rounded-xl p-2 space-y-2"
            style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)' }}
          >
            {groupedQueue.length === 0 ? (
              <div className="h-full flex items-center justify-center py-10">
                <p className="section-label opacity-50">Select orders from Order Book</p>
              </div>
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
      <div
        className="mt-auto pt-4 flex flex-col gap-4"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <div className="flex justify-between items-end">
          <div>
            <p className="section-label mb-1">{isMaker ? 'Order Total' : 'Total Cost'}</p>
            <span
              className="font-mono font-bold"
              style={{ fontSize: 22, color: 'var(--color-gold)', fontVariantNumeric: 'tabular-nums' }}
            >
              ${formatDynamicUsdc(isMaker ? makerTotalUsdcRaw : executionPayload.totalCostRaw)}
            </span>
          </div>
          {!isMaker && (
            <div className="text-right">
              <p className="section-label mb-1">{isBuy ? 'Buying' : 'Selling'}</p>
              <span
                className="font-mono font-bold"
                style={{
                  fontSize: 18,
                  color: isBuy ? 'var(--color-green)' : 'var(--color-pink)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {Number(formatUnits(executionPayload.totalFimRaw, 18)).toLocaleString()} FIM
              </span>
            </div>
          )}
        </div>

        {isSelfFill && (
          <div
            className="rounded-xl px-4 py-2.5 flex items-center gap-2"
            style={{ background: 'rgba(255,61,138,0.07)', border: '1px solid rgba(255,61,138,0.2)' }}
          >
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-pink)' }}>
              Cannot fill own order
            </span>
          </div>
        )}

        <div className="relative rounded-xl overflow-hidden">
          {workflowStatus !== 'idle' && !['canceled', 'failed'].includes(workflowStatus) && (
            <div
              className="absolute inset-y-0 left-0 transition-all duration-500"
              style={{
                width: `${['approving', 'mining_approval', 'executing', 'mining_execute', 'success'].indexOf(workflowStatus) * 25}%`,
                background: workflowStatus === 'success' ? 'var(--color-green)' : 'rgba(245,184,0,0.3)',
              }}
            />
          )}
          <button
            disabled={isButtonDisabled}
            onClick={handleStartFlow}
            className="relative z-10 w-full py-4 font-display font-bold text-[15px] uppercase tracking-wide flex items-center justify-center gap-2 transition-all rounded-xl"
            style={ctaBtnStyle}
          >
            {isBusy && <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />}
            {getStatusText()}
          </button>
        </div>
      </div>
    </div>
  );
}
