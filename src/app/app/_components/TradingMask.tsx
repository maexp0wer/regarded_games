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
  seasonSlug, seasonAddress, exchangeAddress, fimAddress, isBuy, setIsBuy, isMaker, setIsMaker,
  targetAmount, setTargetAmount, selectedOrders, onRemoveOrder, onMoveOrder, onReorderOrders
}: TradingMaskProps) {

  const { address, isConnected } = useAccount();

  const [price, setPrice] = useState("");
  const [isPricePerFim, setIsPricePerFim] = useState(false);
  const [draggedGroupIdx, setDraggedGroupIdx] = useState<number | null>(null);

  const spendingToken = isBuy ? Core.USDC : fimAddress;
  const spendingSymbol = isBuy ? "USDC" : "FIM";

  // --- 1. BALANCE READS ---
  const { data: fimBalance } = useReadContract({
    address: fimAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    query: { enabled: !!address, refetchInterval: 5000 }
  });

  const { data: usdcBalance } = useReadContract({
    address: Core.USDC as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    query: { enabled: !!address, refetchInterval: 5000 }
  });


  // --- 2. CALCULATIONS ---

  const groupedQueue = useMemo(() => {
    const groups: GroupedOrder[] = [];
    if (selectedOrders.length === 0) return groups;

    let current: GroupedOrder | null = null;

    selectedOrders.forEach((order) => {
        const unitPrice = (order.amount > 0 ? order.price / order.amount : 0).toFixed(4);

        if (current && current.maker === order.maker && current.unitPrice === unitPrice) {
            current.amount += order.amount;
            current.price += order.price;
            current.ids.push(order.id);
            current.orders.push(order);
        } else {
            if (current) groups.push(current);
            current = {
                ...order,
                unitPrice,
                ids: [order.id],
                orders: [order],
                amount: order.amount,
                price: order.price
            };
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

  const executionPayload = useMemo<ExecutionPayload>(() => {
    if (isMaker) return { ids: [], amounts: [], totalCostRaw: 0n, totalFimRaw: 0n };
    const targetAmountRaw = targetAmount ? parseUnits(targetAmount, 18) : maxUint256;
    let remainingToFill = targetAmountRaw;
    const ids: bigint[] = [];
    const amounts: bigint[] = [];
    let totalCostUsdcRaw = 0n;
    let totalFimFilledRaw = 0n;

    for (const order of selectedOrders) {
      if (remainingToFill <= 0n) break;
      const take = remainingToFill > order.rawAmount ? order.rawAmount : remainingToFill;
      ids.push(BigInt(order.orderId.toString()));
      amounts.push(take);
      const cost = (take * order.rawPrice) / order.rawAmount;
      totalCostUsdcRaw += cost;
      totalFimFilledRaw += take;
      remainingToFill -= take;
    }
    return { ids, amounts, totalCostRaw: totalCostUsdcRaw, totalFimRaw: totalFimFilledRaw };
  }, [isMaker, targetAmount, selectedOrders]);

  const makerTotalUsdcRaw = useMemo(() => {
    if (!isMaker || !targetAmount || !price) return 0n;
    try {
        if (isPricePerFim) {
            const total = Number(targetAmount) * Number(price);
            return parseUnits(total.toFixed(6), 6);
        } else {
            return parseUnits(Number(price).toFixed(6), 6);
        }
    } catch { return 0n; }
  }, [isMaker, isPricePerFim, targetAmount, price]);

  const amountNeeded = useMemo(() => {
    if (!isConnected) return 0n;
    if (isMaker) {
      return isBuy ? makerTotalUsdcRaw : parseUnits(targetAmount || "0", 18);
    }
    return isBuy ? executionPayload.totalCostRaw : executionPayload.totalFimRaw;
  }, [isBuy, isMaker, targetAmount, makerTotalUsdcRaw, executionPayload, isConnected]);

  const isSelfFill = useMemo(() => {
    if (!address || isMaker) return false;
    return selectedOrders.some(o => o.maker.toLowerCase() === address.toLowerCase());
  }, [selectedOrders, address, isMaker]);

  // --- 3. DYNAMIC FORMATTER FOR COST ---
  const formatDynamicUsdc = (rawUsdc: bigint) => {
    const value = Number(formatUnits(rawUsdc, 6));
    if (value === 0 && rawUsdc > 0n) return "< 0.000001";
    const decimals = value > 0 && value < 1 ? 6 : 2;
    return value.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  // --- 4. ACTIONS ---

  const handleRemoveGroup = (group: GroupedOrder) => {
    group.ids.forEach(id => onRemoveOrder(id));
  };

  const handleMoveGroupButton = (groupIdx: number, direction: -1 | 1) => {
    const newGroups = [...groupedQueue];
    const [movedGroup] = newGroups.splice(groupIdx, 1);
    newGroups.splice(groupIdx + direction, 0, movedGroup);
    const flattened = newGroups.flatMap(g => g.orders);
    onReorderOrders(flattened);
  };

  const handleGroupDragOver = (e: React.DragEvent, overGroupIdx: number) => {
    e.preventDefault();
    if (draggedGroupIdx === null || draggedGroupIdx === overGroupIdx) return;

    const newGroups = [...groupedQueue];
    const [movedGroup] = newGroups.splice(draggedGroupIdx, 1);
    newGroups.splice(overGroupIdx, 0, movedGroup);

    setDraggedGroupIdx(overGroupIdx);

    const flattened = newGroups.flatMap(g => g.orders);
    onReorderOrders(flattened);
  };

  // --- 5. TRADE EXECUTION HOOK ---
  const { workflowStatus, handleStartFlow, getStatusText, isBusy } = useTradeExecution({
    isMaker, isBuy, targetAmount, makerTotalUsdcRaw, executionPayload,
    spendingToken: spendingToken as `0x${string}`,
    spendingSymbol,
    exchangeAddress: exchangeAddress as `0x${string}`,
    amountNeeded,
    selectedOrders,
    onRemoveOrder,
    setTargetAmount,
    setPrice,
  });

  const isButtonDisabled = isBusy || workflowStatus === 'success' || (isMaker ? (!targetAmount || !price) : selectedOrders.length === 0) || isSelfFill;
  const inputClass = "bg-transparent border-none p-0 w-full text-2xl font-mono font-black text-text outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
  const userMakers = useMemo(() => (address ? [address.toLowerCase()] : []), [address]);
  const { data: userStatsMap, isFetched: userStatsFetched } = useBatchPlayerPercentiles(seasonAddress, userMakers);

  if (!isConnected) return <div className="p-6 bg-card rounded-xl border border-border/10 text-center text-text2 text-sm">Please Connect Wallet</div>;

  const userStats = address ? userStatsMap?.[address.toLowerCase()] : undefined;

  return (
    <div className="flex flex-col h-full">
    <div className="bg-card rounded-t-2xl p-6 pb-2 shadow-sm space-y-3 flex flex-col">
      {/* WALLET BALANCES */}
<div className="grid grid-cols-2 pb-4 border-b border-border/10">
    {/* FIM Balance */}
    <div className="flex flex-col text-left">
        <span className="h3-app mb-1">FIM Balance</span>
        <span className="text-lg md:text-2xl font-black text-primary block leading-none">
            {Number(formatUnits(fimBalance || 0n, 18)).toLocaleString()}
        </span>
    </div>

    {/* Stats Section */}
    <div className="flex flex-col text-left">

        <div className="flex items-center h-full">
            {userStats ? (
                <PercentileCircle
                    percentage={userStats.factionPercentile}
                    isCapitalist={userStats.isCapitalist}
                    size="lg"
                />
            ) : (
                <span className="text-text2 text-[10px] uppercase font-bold tracking-widest opacity-50">
                    {userStatsFetched ? "No Rank Yet" : "Loading..."}
                </span>
            )}
        </div>
    </div>
</div>
  </div>
      <div className="bg-card rounded-b-2xl p-6 pt-2 shadow-sm space-y-3 h-full flex flex-col">

      {/* TOP TOGGLES */}
      <div className="flex bg-card2 rounded-2xl w-full mb-5">
          {(() => {
            const isLocked = !isMaker && selectedOrders.length > 0;
            return (
              <>
                <button
                  disabled={isLocked}
                  onClick={() => setIsBuy(true)}
                  className={`flex-1 py-2 text-[10px] font-black uppercase rounded-2xl transition-all
                    ${isBuy ? 'bg-success text-card' : 'text-text2 hover:text-text hover:bg-text/10'}
                    ${isLocked ? 'cursor-not-allowed' : ''}
                    ${isLocked && !isBuy ? 'opacity-30' : ''}
                  `}
                >
                  Buy
                </button>
                <button
                  disabled={isLocked}
                  onClick={() => setIsBuy(false)}
                  className={`flex-1 py-2 text-[10px] font-black uppercase rounded-2xl transition-all
                    ${!isBuy ? 'bg-danger text-card' : 'text-text2 hover:text-text hover:bg-text/10'}
                    ${isLocked ? 'cursor-not-allowed' : ''}
                    ${isLocked && isBuy ? 'opacity-30' : ''}
                  `}
                >
                  Sell
                </button>
              </>
            );
          })()}
      </div>

      <div className="space-y-4 flex-1 overflow-hidden flex flex-col">

        {/* INPUT 1: AMOUNT */}
        <div className="bg-card2 rounded-xl flex items-stretch overflow-hidden">
          <div className="flex-1 pl-4 py-3 pr-2">
            <label className="h4-app block mb-1">Amount (FIM)</label>
            <input
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className={`${inputClass} w-full`}
              placeholder={isMaker ? "0.00" : "MAX"}
            />
          </div>
          <div className="w-18 flex flex-col shrink-0 border-l border-border/10">
            <button
              onClick={() => setIsMaker(false)}
              className={`flex-1 text-[10px] font-black uppercase transition-all flex items-center justify-center
                ${!isMaker ? 'bg-primary text-card' : 'bg-card2 text-text2 hover:text-text hover:bg-text/10'}`}
            >
              Taker
            </button>
            <button
              onClick={() => setIsMaker(true)}
              className={`flex-1 text-[10px] font-black uppercase transition-all flex items-center justify-center
                ${isMaker ? 'bg-primary text-card' : 'bg-card2 text-text2 hover:text-text hover:bg-text/10'}`}
            >
              Maker
            </button>
          </div>
        </div>

        {isMaker ? (
          <>
            {/* MAKER INPUTS */}
            <div className="bg-card2 rounded-xl flex items-stretch overflow-hidden">
              <div className="flex-1 pl-4 py-3 pr-2">
                <label className="h4-app block mb-1">
                    {isPricePerFim ? "Price / 1 FIM (USDC)" : "Total Order (USDC)"}
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className={`${inputClass} w-full`}
                  placeholder="0.00"
                />
              </div>
              <div className="w-18 flex flex-col shrink-0 border-l border-border/10">
                <button
                  onClick={() => setIsPricePerFim(false)}
                  className={`flex-1 text-[10px] font-black uppercase transition-all flex items-center justify-center
                    ${!isPricePerFim ? 'bg-text/70 text-card' : 'bg-card2 text-text2 hover:text-text hover:bg-text/10'}`}
                >
                  Total
                </button>
                <button
                  onClick={() => setIsPricePerFim(true)}
                  className={`flex-1 text-[10px] font-black uppercase transition-all flex items-center justify-center
                    ${isPricePerFim ? 'bg-text/70 text-card' : 'bg-card2 text-text2 hover:text-text hover:bg-text/10'}`}
                >
                  Unit
                </button>
              </div>
            </div>
          </>
        ) : (
          /* TAKER EXECUTION QUEUE (GROUPED) */
        <div className="flex flex-col flex-1">
          <label className="h3-app mb-2 px-1">Order Execution Queue</label>
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-card p-2 rounded-xl space-y-2 border border-border/10">
            {groupedQueue.length === 0 ? (
              <div className="h-full bg-card rounded-xl flex flex-col items-center justify-center opacity-80 py-10">
                <p className="h3-app">Select Order(s) from Order Book</p>
              </div>
            ) : (
              groupedQueue.map((group, groupIdx) => {
                const filledBefore = groupedQueue.slice(0, groupIdx).reduce((acc, g) => acc + g.amount, 0);
                return (
                  <OrderQueueItem
                    key={group.ids[0]}
                    group={group}
                    groupIdx={groupIdx}
                    groupCount={groupedQueue.length}
                    draggedGroupIdx={draggedGroupIdx}
                    targetAmount={targetAmount}
                    filledBefore={filledBefore}
                    stats={percentileMap?.[group.maker?.toLowerCase()]}
                    onMoveGroup={handleMoveGroupButton}
                    onRemoveGroup={handleRemoveGroup}
                    onDragStart={setDraggedGroupIdx}
                    onDragOver={handleGroupDragOver}
                    onDragEnd={() => setDraggedGroupIdx(null)}
                  />
                );
              })
            )}
          </div>
        </div>
        )}
      </div>

      {/* SUMMARY & MULTI-STEP ACTION */}
      <div className="space-y-4 mt-auto pt-4 border-t border-border/10">
        <div className="flex justify-between items-end px-1">
          <div className="flex flex-col text-left">
            <span className="h3-app">{isMaker ? "Order Total" : "Total Cost"}</span>
            <span className="text-lg md:text-2xl font-black text-primary block leading-none">
                ${formatDynamicUsdc(isMaker ? makerTotalUsdcRaw : executionPayload.totalCostRaw)}
            </span>
          </div>
          {!isMaker && (
            <div className="text-right">
                <span className="text-[9px] font-bold text-text2 uppercase tracking-widest block">
                    {isBuy ? "Buying" : "Selling"}
                </span>
                <span className={`text-sm font-black leading-none ${isBuy ? 'text-success' : 'text-danger'}`}>
                    {Number(formatUnits(executionPayload.totalFimRaw, 18)).toLocaleString()} FIM
                </span>
            </div>
          )}
        </div>

        {/* SELF FILL ERROR MESSAGE */}
        {isSelfFill && (
            <div className="bg-danger/10 border border-danger/20 rounded-lg p-2 flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-danger" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-[10px] font-bold text-danger uppercase tracking-wide">Cannot fill own order</span>
            </div>
        )}

        <div className="relative w-full rounded-xl overflow-hidden shadow-lg transition-all active:scale-[0.98]">
            {workflowStatus !== 'idle' && !['canceled', 'failed'].includes(workflowStatus) && (
                <div className={`absolute top-0 left-0 h-full transition-all duration-500 ${workflowStatus === 'success' ? 'bg-success' : 'bg-primary/30'}`} style={{ width: `${['approving', 'mining_approval', 'executing', 'mining_execute', 'success'].indexOf(workflowStatus) * 25}%` }} />
            )}
            <button disabled={isButtonDisabled} onClick={handleStartFlow}
                className={`relative w-full py-4 font-black text-[10px] uppercase tracking-widest z-10 flex items-center justify-center gap-2 transition-all
                    ${isButtonDisabled && workflowStatus === 'idle' ? 'bg-card2 text-text2' : 'text-card'}
                    ${isBusy ? 'text-text' : ''}
                    ${workflowStatus === 'idle' && !isButtonDisabled ? 'bg-primary hover:brightness-110 shadow-primary/20 shadow-lg' : ''}
                    ${workflowStatus === 'success' ? 'bg-success' : ''}
                    ${['failed', 'canceled'].includes(workflowStatus) ? 'bg-danger' : ''}
                `}>
                {isBusy && <div className="w-3 h-3 border-2 border-text border-t-transparent rounded-full animate-spin" />}
                {getStatusText()}
            </button>
        </div>
      </div>
     </div>
    </div>
  );
}