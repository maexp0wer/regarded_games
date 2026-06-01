'use client';

import React, { useState, useMemo } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { parseUnits, formatUnits, erc20Abi, maxUint256 } from 'viem';
import { Order } from '@/hooks/useOrderBook';
import { useOpenOrders } from '@/hooks/useOpenOrders';
import { useTenantDeployment, useTenantChainId } from '@/context/TenantContext';
import { useBatchPlayerPercentiles } from '@/hooks/useBatchPlayerPercentiles';
import { useTradeExecution, ExecutionPayload } from '@/hooks/useTradeExecution';
import { PercentileCircle } from './PercentileCircle';
import { GroupedOrder, OrderQueueItem } from './OrderQueueItem';
import { WalletButton } from './WalletButton';
import PercentSlider from '@/components/PercentSlider';
import { sliderPctToAmount } from '@/utils/sliderAmount';
import { TxModal } from './TxModal';

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
  const core = useTenantDeployment();
  const chainId = useTenantChainId();
  const [price, setPrice] = useState('1.00');
  const [isPricePerFim, setIsPricePerFim] = useState(true);
  const [draggedGroupIdx, setDraggedGroupIdx] = useState<number | null>(null);

  const handlePriceModeSwitch = (mode: 'Per FIM' | 'Total') => {
    const perFim = mode === 'Per FIM';
    setIsPricePerFim(perFim);
    setPrice(perFim ? '1.00' : targetAmount || '');
  };

  const spendingToken  = isBuy ? core.USDC : fimAddress;
  const spendingSymbol = isBuy ? 'USDC' : 'FIM';

  const { data: fimBalance } = useReadContract({
    address: fimAddress as `0x${string}`, abi: erc20Abi, functionName: 'balanceOf',
    args: [address as `0x${string}`], chainId, query: { enabled: !!address, refetchInterval: 5000 },
  });
  const { data: usdcBalance } = useReadContract({
    address: core.USDC as `0x${string}`, abi: erc20Abi, functionName: 'balanceOf',
    args: [address as `0x${string}`], chainId, query: { enabled: !!address, refetchInterval: 5000 },
  });

  // FIM escrowed in the user's open sell orders (buy orders lock USDC, not FIM)
  const { data: myOpenOrders } = useOpenOrders(seasonAddress, address, 'open');
  const lockedFim = useMemo(
    () => (myOpenOrders || []).reduce((acc, o) => (o.isBuy ? acc : acc + o.remainingAmount), 0),
    [myOpenOrders],
  );
  const availableFim = useMemo(() => Number(formatUnits(fimBalance || 0n, 18)), [fimBalance]);
  const totalFim = availableFim + lockedFim;

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

  const hasAsksInQueue = !isMaker && selectedOrders.some(o => !o.isBuy);
  const hasBidsInQueue = !isMaker && selectedOrders.some(o => o.isBuy);
  const isMixedQueue = hasAsksInQueue && hasBidsInQueue;
  const buyButtonActive = isMaker ? isBuy : hasAsksInQueue || (selectedOrders.length === 0 && isBuy);
  const sellButtonActive = isMaker ? !isBuy : hasBidsInQueue || (selectedOrders.length === 0 && !isBuy);

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
      return Math.min(100, Number((raw * 10000n) / maxForSlider) / 100);
    } catch { return 0; }
  }, [targetAmount, maxForSlider, maxDecimals]);

  const handleSliderChange = (pct: number) => {
    setTargetAmount(sliderPctToAmount(pct, Number(formatUnits(maxForSlider, maxDecimals))));
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

  const handleSideSwitch = (newIsBuy: boolean) => {
    setIsBuy(newIsBuy);
    if (!targetAmount || !isMaker) return;
    const newMax = newIsBuy ? (usdcBalance || 0n) : (fimBalance || 0n);
    const newDecimals = newIsBuy ? 6 : 18;
    try {
      if (parseUnits(targetAmount, newDecimals) > newMax) {
        setTargetAmount(formatUnits(newMax, newDecimals));
      }
    } catch {
      setTargetAmount('');
    }
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

  const { workflowStatus, txHashes, handleStartFlow, isBusy } = useTradeExecution({
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

  if (!isConnected) {
    return (
      <div className="terminal-pane connect-gate">
        <div className="terminal-pane-header">
          <span className="terminal-pane-title">Trading</span>
        </div>
        <div className="connect-gate-body">
          <span className="terminal-pane-title" style={{ color: 'var(--color-text2)' }}>Connect your wallet to participate</span>
          <WalletButton />
        </div>
      </div>
    );
  }

  if (isOnHold) {
    return (
      <div className="flex flex-col gap-4 h-full">
        <div className="terminal-pane">
          <div className="flex flex-col">
            <div
              className="font-display font-extrabold leading-none text-display-trading tabular-nums"
              style={{ color: 'var(--color-gold)', textShadow: '0 0 40px var(--color-gold-35)' }}
            >
              {totalFim.toLocaleString()}
              <span className="font-mono font-medium text-text2 ml-2 text-currency-label">FIM</span>
            </div>
            {lockedFim > 0 && (
              <span className="font-mono text-text2 text-xs mt-1.5 tabular-nums">
                ({availableFim.toLocaleString()} available to trade)
              </span>
            )}
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
      <div className="terminal-pane">
        <div className="flex items-start justify-between">
          <div className="flex flex-col mr-4 min-w-0">
            <div
              className="font-display font-extrabold leading-none text-display-trading"
              style={{ color: 'var(--color-gold)', textShadow: '0 0 40px var(--color-gold-35)', fontVariantNumeric: 'tabular-nums' }}
            >
              {totalFim.toLocaleString()}
              <span className="font-mono font-medium text-text2 ml-2 text-currency-label">FIM</span>
            </div>
            {lockedFim > 0 && (
              <span className="font-mono text-text2 text-xs mt-1.5 tabular-nums">
                ({availableFim.toLocaleString()} available to trade)
              </span>
            )}
          </div>
          {userStats && (
            <div className="flex flex-col items-end min-w-0">
              <div className="xl:hidden"><PercentileCircle percentage={userStats.factionPercentile} isCapitalist={userStats.isCapitalist} size="md" /></div>
              <div className="hidden xl:block"><PercentileCircle percentage={userStats.factionPercentile} isCapitalist={userStats.isCapitalist} size="lg" /></div>
            </div>
          )}
        </div>
      </div>

      {/* ── Trading panel card ── */}
      <div className="terminal-pane flex flex-col gap-4 flex-1 min-h-0">

        {/* ── Buy / Sell toggle ── */}
        <div className="flex rounded-lg overflow-hidden border border-border bg-card2 p-1 gap-1">
          <button
            disabled={isQueueLocked}
            onClick={() => handleSideSwitch(true)}
            className="flex-1 py-2 rounded font-display font-bold text-sm uppercase tracking-wide transition-all disabled:opacity-50"
            style={buyButtonActive ? {
              background: 'linear-gradient(180deg, var(--color-green-hover), var(--color-green))',
              color: 'var(--color-bg)',
              boxShadow: '0 2px 8px -2px var(--color-green-35)',
            } : { color: 'var(--color-text2)' }}
          >
            Buy
          </button>
          <button
            disabled={isQueueLocked}
            onClick={() => handleSideSwitch(false)}
            className="flex-1 py-2 rounded font-display font-bold text-sm uppercase tracking-wide transition-all disabled:opacity-50"
            style={sellButtonActive ? {
              background: 'linear-gradient(180deg, var(--color-red-hover), var(--color-red))',
              color: 'var(--color-bg)',
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
          <div className="bg-bg border border-border rounded-b px-3 pt-2 pb-3 flex flex-col gap-2">
            <span className="mask-label text-right">WALLET&nbsp;<span className="text-text font-semibold">{walletBalanceDisplay}</span></span>
            <div className="group flex items-center gap-2">
              <input
                type="number"
                min="0"
                max={maxForSlider > 0n ? formatUnits(maxForSlider, maxDecimals) : undefined}
                value={targetAmount}
                onChange={(e) => handleTargetAmountChange(e.target.value)}
                className="flex-1 min-w-0 bg-transparent text-input font-mono text-text outline-none placeholder:text-text2/40 tabular-nums no-spinners"
                placeholder={isMaker ? '0.00' : 'MAX'}
              />
              <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="btn-stepper" onClick={() => handleTargetAmountChange(String(Math.max(0, (parseFloat(targetAmount || '0') + 1))))}>▲</button>
                <button className="btn-stepper" onClick={() => handleTargetAmountChange(String(Math.max(0, (parseFloat(targetAmount || '0') - 1))))}>▼</button>
              </div>
              <span className="text-input font-mono font-bold text-text2 shrink-0">{isMaker && isBuy ? 'USDC' : 'FIM'}</span>
            </div>
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
            <div className="bg-bg border border-border rounded-b px-3 pt-2 pb-3 flex flex-col gap-1">
              <span className="mask-label">{isPricePerFim ? 'Price per FIM' : 'Total Order'}</span>
              <div className="group flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={price}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  className="flex-1 min-w-0 bg-transparent text-input font-mono text-text outline-none placeholder:text-text2/40 tabular-nums no-spinners"
                  placeholder="0.00"
                />
                <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="btn-stepper" onClick={() => handlePriceChange(String(Math.max(0, parseFloat((parseFloat(price || '0') + (isPricePerFim ? 0.01 : 1)).toFixed(6)))))}>▲</button>
                  <button className="btn-stepper" onClick={() => handlePriceChange(String(Math.max(0, parseFloat((parseFloat(price || '0') - (isPricePerFim ? 0.01 : 1)).toFixed(6)))))}>▼</button>
                </div>
                <span className="text-input font-mono font-bold text-text2 shrink-0">USDC</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Taker: order queue ── */}
        {!isMaker && (
          <div className="flex flex-col flex-1 min-h-0">
            <p className="section-label mb-2">Order Execution Queue</p>
            <div className="flex-1 max-h-55 overflow-y-auto custom-scrollbar rounded-lg p-2 border border-border bg-bg">
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
        <div className="mt-auto pt-4 flex flex-col gap-4 border-t border-border">
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

          {isMixedQueue && (
            <div className="rounded-lg px-4 py-2.5 flex items-center gap-2" style={{ background: 'var(--color-gold-15)', border: '1px solid var(--color-gold-35)' }}>
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-gold)' }}>
                Warning: buying &amp; selling in same transaction
              </span>
            </div>
          )}

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
            className={`btn-terminal-action ${isMixedQueue ? '' : isBuy ? 'action-buy' : 'action-sell'} gap-2`}
            style={isMixedQueue ? { background: 'linear-gradient(180deg, var(--color-gold-35), var(--color-gold-15))', color: 'var(--color-gold)', border: '1px solid var(--color-gold-35)' } : undefined}
          >
            {isBusy && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
            <span>{isMixedQueue ? 'Execute Mixed Trade' : isBuy ? 'Buy FIM' : 'Sell FIM'}</span>
          </button>
        </div>

      </div>

      {/* ── Transaction Journey Modal ── */}
      <TxModal
        status={workflowStatus}
        txHashes={txHashes}
        title="Execute Transaction"
        successTitle="Trade Confirmed"
        steps={[
          {
            label: 'Approve Spending Allowance',
            description: `Allow contract to use your ${spendingSymbol}`,
            activeStatuses: ['approving', 'mining_approval'],
            completeStatuses: ['executing', 'mining_execute', 'success'],
          },
          {
            label: 'Confirm Trade Execution',
            description: 'Sign final trade payload structure',
            activeStatuses: ['executing', 'mining_execute'],
            completeStatuses: ['success'],
          },
        ]}
        onClose={() => setTargetAmount('')}
      />

    </div>
  );
}
