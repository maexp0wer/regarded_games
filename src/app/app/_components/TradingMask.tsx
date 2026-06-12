'use client';

import React, { useState, useMemo } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { parseUnits, formatUnits, erc20Abi, maxUint256, type Abi } from 'viem';
import { Order } from '@/hooks/useOrderBook';
import { useOpenOrders } from '@/hooks/useOpenOrders';
import { useTenantDeployment, useTenantChainId } from '@/context/TenantContext';
import { useBatchPlayerPercentiles } from '@/hooks/useBatchPlayerPercentiles';
import { useGiniImpact } from '@/hooks/useGiniImpact';
import { useTradeExecution, ExecutionPayload } from '@/hooks/useTradeExecution';
import { useCollateral } from '@/hooks/useCollateral';
import { netFimToReceive } from '@/utils/collateral';
import Link from 'next/link';
import GameSeasonAbiJson from '@/deployments/abis/GameSeason.json';
import ExchangeAbiJson from '@/deployments/abis/Exchange.json';

const GameSeasonAbi = GameSeasonAbiJson as Abi;
const ExchangeAbi = ExchangeAbiJson as Abi;
import { PercentileCircle } from './PercentileCircle';
import { GroupedOrder, OrderQueueItem } from './OrderQueueItem';
import { WalletButton } from './WalletButton';
import PercentSlider from '@/app/app/_components/PercentSlider';
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
  buyTargetAmount: string;
  setBuyTargetAmount: (v: string) => void;
  sellTargetAmount: string;
  setSellTargetAmount: (v: string) => void;
  selectedAsks: Order[];
  selectedBids: Order[];
  onRemoveOrder: (id: string) => void;
  onReorderAsks: (newOrders: Order[]) => void;
  onReorderBids: (newOrders: Order[]) => void;
  isOnHold?: boolean;
  onOpenOrderBook?: () => void;
}

export function TradingMask({
  seasonAddress, exchangeAddress, fimAddress,
  isBuy, setIsBuy, isMaker, setIsMaker,
  buyTargetAmount, setBuyTargetAmount, sellTargetAmount, setSellTargetAmount,
  selectedAsks, selectedBids, onRemoveOrder, onReorderAsks, onReorderBids,
  isOnHold = false,
  onOpenOrderBook,
}: TradingMaskProps) {
  const { address, isConnected } = useAccount();
  const core = useTenantDeployment();
  const chainId = useTenantChainId();
  const [price, setPrice] = useState('1.00');
  const [draggedAskGroupIdx, setDraggedAskGroupIdx] = useState<number | null>(null);
  const [draggedBidGroupIdx, setDraggedBidGroupIdx] = useState<number | null>(null);

  // Combined flat array used for all execution math
  const selectedOrders = useMemo(() => [...selectedAsks, ...selectedBids], [selectedAsks, selectedBids]);

  // In taker mode the order queue is the source of truth for direction (the
  // Buy/Sell toggle is locked once orders are queued). `isBuy` only drives maker
  // mode and the empty-queue default — never read it directly for takers, or the
  // labels, spending token, and approval amount drift out of sync with the queue.
  const hasAsksInQueue = !isMaker && selectedAsks.length > 0;
  const hasBidsInQueue = !isMaker && selectedBids.length > 0;
  const isMixedQueue = hasAsksInQueue && hasBidsInQueue;
  const directionIsBuy = isMaker || selectedOrders.length === 0 ? isBuy : hasAsksInQueue;

  const spendingToken  = directionIsBuy ? core.USDC : fimAddress;
  const spendingSymbol = directionIsBuy ? 'USDC' : 'FIM';

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

  // Wallets below the on-chain existential threshold are excluded from the Gini
  // calculation and the final payout. Warn the player so the state is visible.
  const { data: existentialThresholdRaw } = useReadContract({
    address: seasonAddress as `0x${string}`, abi: GameSeasonAbi,
    functionName: 'existentialThresholdFim', chainId, query: { enabled: !!seasonAddress },
  });
  const existentialThreshold = useMemo(
    () => Number(formatUnits((existentialThresholdRaw as bigint) ?? 0n, 18)),
    [existentialThresholdRaw],
  );
  const belowThreshold = existentialThreshold > 0 && totalFim < existentialThreshold;

  // Trade fee charged by the Exchange on the taker's USDC leg of every fill.
  // Immutable per season — read once. tradeFeeBps=100 → 1.00%.
  const { data: tradeFeeBpsRaw } = useReadContract({
    address: exchangeAddress as `0x${string}`, abi: ExchangeAbi,
    functionName: 'tradeFeeBps', chainId, query: { enabled: !!exchangeAddress, staleTime: Infinity },
  });
  const tradeFeeBps = (tradeFeeBpsRaw as bigint | undefined) ?? 0n;
  const feePct = Number(tradeFeeBps) / 100;

  const buildGroupedQueue = (orders: Order[]): GroupedOrder[] => {
    const groups: GroupedOrder[] = [];
    if (!orders.length) return groups;
    let current: GroupedOrder | null = null;
    orders.forEach((order) => {
      const unitPrice = order.pricePerFim.toFixed(4);
      if (current && current.maker === order.maker && current.unitPrice === unitPrice && current.isBuy === order.isBuy) {
        current.amount += order.amount; current.price += order.price;
        current.ids.push(order.id); current.orders.push(order);
      } else {
        if (current) groups.push(current);
        current = { ...order, unitPrice, ids: [order.id], orders: [order], amount: order.amount, price: order.price };
      }
    });
    if (current) groups.push(current);
    return groups;
  };

  const groupedAskQueue = useMemo(() => buildGroupedQueue(selectedAsks), [selectedAsks]);
  const groupedBidQueue = useMemo(() => buildGroupedQueue(selectedBids), [selectedBids]);

  const queueMakers = useMemo(() =>
    Array.from(new Set(
      [...groupedAskQueue, ...groupedBidQueue].map(g => g.maker?.toLowerCase()).filter(Boolean)
    )),
    [groupedAskQueue, groupedBidQueue]
  );
  const { data: percentileMap } = useBatchPlayerPercentiles(seasonAddress, queueMakers, exchangeAddress);

  const executionPayload = useMemo<ExecutionPayload>(() => {
    if (isMaker) return { ids: [], amounts: [], totalCostRaw: 0n, totalFimRaw: 0n };
    const ids: bigint[] = []; const amounts: bigint[] = [];
    let totalCostUsdcRaw = 0n; let totalFimFilledRaw = 0n;

    // SELL legs (selling into bids) MUST precede BUY legs (taking asks) in the
    // ids array. The Exchange checks collateral per-leg in array order: a sell
    // leg releases the taker's lock immediately, so placing sells first means
    // those releases land before any buy leg's sufficiency check — making the
    // effective collateral requirement NET (buy − sell) instead of GROSS.
    const sellLimitRaw = sellTargetAmount ? parseUnits(sellTargetAmount, 18) : maxUint256;
    let sellRemaining = sellLimitRaw;
    for (const order of selectedBids) {
      if (sellRemaining <= 0n) break;
      const take = sellRemaining > order.rawAmount ? order.rawAmount : sellRemaining;
      ids.push(BigInt(order.orderId.toString())); amounts.push(take);
      totalCostUsdcRaw += (take * order.rawPrice) / order.rawInitialAmount;
      totalFimFilledRaw += take; sellRemaining -= take;
    }

    const buyLimitRaw = buyTargetAmount ? parseUnits(buyTargetAmount, 18) : maxUint256;
    let buyRemaining = buyLimitRaw;
    for (const order of selectedAsks) {
      if (buyRemaining <= 0n) break;
      const take = buyRemaining > order.rawAmount ? order.rawAmount : buyRemaining;
      ids.push(BigInt(order.orderId.toString())); amounts.push(take);
      totalCostUsdcRaw += (take * order.rawPrice) / order.rawInitialAmount;
      totalFimFilledRaw += take; buyRemaining -= take;
    }

    return { ids, amounts, totalCostRaw: totalCostUsdcRaw, totalFimRaw: totalFimFilledRaw };
  }, [isMaker, buyTargetAmount, sellTargetAmount, selectedAsks, selectedBids]);

  // Per-direction USDC split of the taker fill, walked with per-leg limits.
  // Needed for fees on mixed queues, where buy legs add a fee to USDC paid and
  // sell legs net it out of USDC received.
  const legs = useMemo(() => {
    if (isMaker) return { buyCostRaw: 0n, sellProceedsRaw: 0n };
    let buyCostRaw = 0n; let sellProceedsRaw = 0n;

    const buyLimitRaw = buyTargetAmount ? parseUnits(buyTargetAmount, 18) : maxUint256;
    let buyRemaining = buyLimitRaw;
    for (const order of selectedAsks) {
      if (buyRemaining <= 0n) break;
      const take = buyRemaining > order.rawAmount ? order.rawAmount : buyRemaining;
      buyCostRaw += (take * order.rawPrice) / order.rawInitialAmount;
      buyRemaining -= take;
    }

    const sellLimitRaw = sellTargetAmount ? parseUnits(sellTargetAmount, 18) : maxUint256;
    let sellRemaining = sellLimitRaw;
    for (const order of selectedBids) {
      if (sellRemaining <= 0n) break;
      const take = sellRemaining > order.rawAmount ? order.rawAmount : sellRemaining;
      sellProceedsRaw += (take * order.rawPrice) / order.rawInitialAmount;
      sellRemaining -= take;
    }

    return { buyCostRaw, sellProceedsRaw };
  }, [isMaker, buyTargetAmount, sellTargetAmount, selectedAsks, selectedBids]);

  const legsFim = useMemo(() => {
    if (isMaker) return { buyFimRaw: 0n, sellFimRaw: 0n };
    let buyFimRaw = 0n; let sellFimRaw = 0n;

    const buyLimitRaw = buyTargetAmount ? parseUnits(buyTargetAmount, 18) : maxUint256;
    let buyRemaining = buyLimitRaw;
    for (const order of selectedAsks) {
      if (buyRemaining <= 0n) break;
      const take = buyRemaining > order.rawAmount ? order.rawAmount : buyRemaining;
      buyFimRaw += take; buyRemaining -= take;
    }

    const sellLimitRaw = sellTargetAmount ? parseUnits(sellTargetAmount, 18) : maxUint256;
    let sellRemaining = sellLimitRaw;
    for (const order of selectedBids) {
      if (sellRemaining <= 0n) break;
      const take = sellRemaining > order.rawAmount ? order.rawAmount : sellRemaining;
      sellFimRaw += take; sellRemaining -= take;
    }

    return { buyFimRaw, sellFimRaw };
  }, [isMaker, buyTargetAmount, sellTargetAmount, selectedAsks, selectedBids]);

  const makerTargetAmount = isBuy ? buyTargetAmount : sellTargetAmount;

  const makerTotalUsdcRaw = useMemo(() => {
    if (!isMaker || !makerTargetAmount || !price) return 0n;
    try {
      const total = Number(makerTargetAmount) * Number(price);
      return parseUnits(total.toFixed(6), 6);
    } catch { return 0n; }
  }, [isMaker, makerTargetAmount, price]);

  // Taker buy fills route price→maker AND fee→Exchange, so the USDC allowance
  // must cover price + fee (rounded up) or the fill reverts. Sell fills spend
  // FIM (allowance unaffected) and the fee is netted out of USDC received.
  const takerBuyFeeRaw = useMemo(
    () => (tradeFeeBps > 0n ? (legs.buyCostRaw * tradeFeeBps + 9999n) / 10000n : 0n),
    [legs.buyCostRaw, tradeFeeBps],
  );

  const amountNeeded = useMemo(() => {
    if (!isConnected) return 0n;
    if (isMaker) return isBuy ? makerTotalUsdcRaw : parseUnits(sellTargetAmount || '0', 18);
    return directionIsBuy ? legs.buyCostRaw + takerBuyFeeRaw : executionPayload.totalFimRaw;
  }, [isBuy, directionIsBuy, isMaker, sellTargetAmount, makerTotalUsdcRaw, executionPayload, legs, takerBuyFeeRaw, isConnected]);

  // Sell fills net the fee out of USDC received (floor, matching the contract).
  const takerSellFeeRaw = useMemo(
    () => (tradeFeeBps > 0n ? (legs.sellProceedsRaw * tradeFeeBps) / 10000n : 0n),
    [legs.sellProceedsRaw, tradeFeeBps],
  );
  // Net USDC delta for the taker: sell proceeds (after fee) minus buy cost (with fee).
  const takerNetRaw = (legs.sellProceedsRaw - takerSellFeeRaw) - (legs.buyCostRaw + takerBuyFeeRaw);
  // Contribution delta: USDC net paid minus FIM net received, both at 1:1.
  // Buying/selling at exactly 1 USDC/FIM yields 0; deviation shows what was donated/extracted.
  // FIM is 18 decimals, USDC 6 — divide by 1e12 to align units before subtracting.
  const contributionDeltaRaw = (legs.buyCostRaw - legs.sellProceedsRaw) - (legsFim.buyFimRaw - legsFim.sellFimRaw) / 10n ** 12n;
  const showTakerFee = !isMaker && (legs.buyCostRaw > 0n || legs.sellProceedsRaw > 0n);

  // Approximate effect of this fill on the season's live Gini (BPS). Reuses the
  // exact live-population math so the delta is consistent with the displayed Gini.
  const giniImpact = useGiniImpact(
    seasonAddress, address, selectedAsks, selectedBids,
    legsFim.buyFimRaw, legsFim.sellFimRaw,
  );

  const isSelfFill = useMemo(() =>
    !isMaker && !!address && selectedOrders.some(o => o.maker.toLowerCase() === address.toLowerCase()),
    [selectedOrders, address, isMaker]
  );

  const buyButtonActive = isMaker ? isBuy : hasAsksInQueue || (selectedOrders.length === 0 && isBuy);
  const sellButtonActive = isMaker ? !isBuy : hasBidsInQueue || (selectedOrders.length === 0 && !isBuy);

  const formatDynamicUsdc = (raw: bigint) => {
    const v = Number(formatUnits(raw, 6));
    if (v === 0 && raw > 0n) return '< 0.000001';
    const d = v > 0 && v < 1 ? 6 : 2;
    return v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
  };

  const maxAskQueueFim = useMemo(() =>
    !isMaker ? selectedAsks.reduce((acc, o) => acc + o.rawAmount, 0n) : 0n,
    [isMaker, selectedAsks]
  );
  const maxBidQueueFim = useMemo(() =>
    !isMaker ? selectedBids.reduce((acc, o) => acc + o.rawAmount, 0n) : 0n,
    [isMaker, selectedBids]
  );

  // For the single active input (non-mixed taker or maker)
  const activeTarget = directionIsBuy ? buyTargetAmount : sellTargetAmount;
  const activeMaxForSlider = isMaker
    ? (isBuy ? (usdcBalance || 0n) : (fimBalance || 0n))
    : (directionIsBuy ? maxAskQueueFim : maxBidQueueFim);
  const activeMaxDecimals = isMaker ? (isBuy ? 6 : 18) : 18;

  const sliderPct = useMemo(() => {
    if (!activeTarget || activeMaxForSlider === 0n) return 0;
    try {
      const raw = parseUnits(activeTarget, activeMaxDecimals);
      return Math.min(100, Number((raw * 10000n) / activeMaxForSlider) / 100);
    } catch { return 0; }
  }, [activeTarget, activeMaxForSlider, activeMaxDecimals]);

  const handleSliderChange = (pct: number) => {
    const val = sliderPctToAmount(pct, Number(formatUnits(activeMaxForSlider, activeMaxDecimals)));
    if (directionIsBuy) setBuyTargetAmount(val); else setSellTargetAmount(val);
  };

  const buySliderPct = useMemo(() => {
    if (!buyTargetAmount || maxAskQueueFim === 0n) return 0;
    try {
      const raw = parseUnits(buyTargetAmount, 18);
      return Math.min(100, Number((raw * 10000n) / maxAskQueueFim) / 100);
    } catch { return 0; }
  }, [buyTargetAmount, maxAskQueueFim]);

  const sellSliderPct = useMemo(() => {
    if (!sellTargetAmount || maxBidQueueFim === 0n) return 0;
    try {
      const raw = parseUnits(sellTargetAmount, 18);
      return Math.min(100, Number((raw * 10000n) / maxBidQueueFim) / 100);
    } catch { return 0; }
  }, [sellTargetAmount, maxBidQueueFim]);

  const handleBuySliderChange = (pct: number) =>
    setBuyTargetAmount(sliderPctToAmount(pct, Number(formatUnits(maxAskQueueFim, 18))));
  const handleSellSliderChange = (pct: number) =>
    setSellTargetAmount(sliderPctToAmount(pct, Number(formatUnits(maxBidQueueFim, 18))));

  const handleBuyTargetChange = (val: string) => {
    if (val !== '' && Number(val) < 0) return;
    if (!isMaker && maxAskQueueFim > 0n && val !== '') {
      try {
        if (parseUnits(val, 18) > maxAskQueueFim) {
          setBuyTargetAmount(formatUnits(maxAskQueueFim, 18));
          return;
        }
      } catch { /* invalid parse, fall through */ }
    }
    setBuyTargetAmount(val);
  };

  const handleSellTargetChange = (val: string) => {
    if (val !== '' && Number(val) < 0) return;
    if (!isMaker && maxBidQueueFim > 0n && val !== '') {
      try {
        if (parseUnits(val, 18) > maxBidQueueFim) {
          setSellTargetAmount(formatUnits(maxBidQueueFim, 18));
          return;
        }
      } catch { /* invalid parse, fall through */ }
    }
    setSellTargetAmount(val);
  };

  const handleActiveTargetChange = directionIsBuy ? handleBuyTargetChange : handleSellTargetChange;

  const handlePriceChange = (val: string) => {
    if (val !== '' && Number(val) < 0) return;
    setPrice(val);
  };

  const handleSideSwitch = (newIsBuy: boolean) => {
    setIsBuy(newIsBuy);
    if (!isMaker) return;
    const target = newIsBuy ? buyTargetAmount : sellTargetAmount;
    const setTarget = newIsBuy ? setBuyTargetAmount : setSellTargetAmount;
    if (!target) return;
    const newMax = newIsBuy ? (usdcBalance || 0n) : (fimBalance || 0n);
    const newDecimals = newIsBuy ? 6 : 18;
    try {
      if (parseUnits(target, newDecimals) > newMax) setTarget(formatUnits(newMax, newDecimals));
    } catch {
      setTarget('');
    }
  };

  const walletBalanceDisplay = directionIsBuy
    ? `${Number(formatUnits(usdcBalance || 0n, 6)).toLocaleString()} USDC`
    : `${Number(formatUnits(fimBalance || 0n, 18)).toLocaleString()} FIM`;

  const handleRemoveGroup = (group: GroupedOrder) => group.ids.forEach(id => onRemoveOrder(id));

  const handleMoveAskGroupButton = (groupIdx: number, direction: -1 | 1) => {
    const newGroups = [...groupedAskQueue];
    const [moved] = newGroups.splice(groupIdx, 1);
    newGroups.splice(groupIdx + direction, 0, moved);
    onReorderAsks(newGroups.flatMap(g => g.orders));
  };
  const handleAskGroupDragOver = (e: React.DragEvent, overGroupIdx: number) => {
    e.preventDefault();
    if (draggedAskGroupIdx === null || draggedAskGroupIdx === overGroupIdx) return;
    const newGroups = [...groupedAskQueue];
    const [moved] = newGroups.splice(draggedAskGroupIdx, 1);
    newGroups.splice(overGroupIdx, 0, moved);
    setDraggedAskGroupIdx(overGroupIdx);
    onReorderAsks(newGroups.flatMap(g => g.orders));
  };

  const handleMoveBidGroupButton = (groupIdx: number, direction: -1 | 1) => {
    const newGroups = [...groupedBidQueue];
    const [moved] = newGroups.splice(groupIdx, 1);
    newGroups.splice(groupIdx + direction, 0, moved);
    onReorderBids(newGroups.flatMap(g => g.orders));
  };
  const handleBidGroupDragOver = (e: React.DragEvent, overGroupIdx: number) => {
    e.preventDefault();
    if (draggedBidGroupIdx === null || draggedBidGroupIdx === overGroupIdx) return;
    const newGroups = [...groupedBidQueue];
    const [moved] = newGroups.splice(draggedBidGroupIdx, 1);
    newGroups.splice(overGroupIdx, 0, moved);
    setDraggedBidGroupIdx(overGroupIdx);
    onReorderBids(newGroups.flatMap(g => g.orders));
  };

  const clearTargets = (v: string) => { setBuyTargetAmount(v); setSellTargetAmount(v); };

  const { workflowStatus, txHashes, handleStartFlow, isBusy, errorReason, resetWorkflow } = useTradeExecution({
    isMaker, isBuy: directionIsBuy, targetAmount: makerTargetAmount, makerTotalUsdcRaw, executionPayload,
    spendingToken: spendingToken as `0x${string}`, spendingSymbol,
    exchangeAddress: exchangeAddress as `0x${string}`,
    amountNeeded, selectedOrders, onRemoveOrder, setTargetAmount: clearTargets, setPrice,
    isMixed: isMixedQueue,
    fimToken: fimAddress as `0x${string}`,
    sellFimAmountNeeded: legsFim.sellFimRaw,
  });

  // ── Collateral pre-check ──
  // Any action that commits the wallet to acquiring FIM needs staked-RGD
  // headroom: a maker placing a bid (reserves collateral now), or a taker
  // receiving FIM. For a mixed taker fill the requirement is NET (buy − sell),
  // because the executionPayload places sell legs first (releases land before
  // the buy-leg check). Asks and pure sells commit no FIM → no check.
  const collateral = useCollateral(seasonAddress, exchangeAddress);
  const fimToCommit = useMemo(() => {
    if (isMaker) return isBuy ? parseUnits(makerTargetAmount || '0', 18) : 0n;
    return netFimToReceive(legsFim.buyFimRaw, legsFim.sellFimRaw);
  }, [isMaker, isBuy, makerTargetAmount, legsFim.buyFimRaw, legsFim.sellFimRaw]);
  const collateralGate = useMemo(
    () => collateral.checkBuy(fimToCommit),
    [collateral, fimToCommit],
  );
  // Only gate once reads have resolved and there's actually FIM to commit;
  // otherwise the revert remains the fallback (handled in useTradeExecution).
  const isUnderCollateralized =
    fimToCommit > 0n && collateral.isReady && !collateralGate.ok;

  const isButtonDisabled = isBusy || workflowStatus === 'success'
    || (isMaker ? makerTotalUsdcRaw === 0n : (selectedOrders.length === 0 || executionPayload.totalCostRaw === 0n))
    || isSelfFill
    || isUnderCollateralized;

  const userMakers = useMemo(() => (address ? [address.toLowerCase()] : []), [address]);
  const { data: userStatsMap } = useBatchPlayerPercentiles(seasonAddress, userMakers, exchangeAddress);
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

  const fimColor = belowThreshold
    ? 'var(--color-red)'
    : userStats?.isCapitalist ? 'var(--color-gold)' : 'var(--color-purple)';
  const fimGlow = belowThreshold
    ? 'var(--color-red-35)'
    : userStats?.isCapitalist ? 'var(--color-gold-35)' : 'var(--color-purple-35)';

  if (isOnHold) {
    return (
      <div className="flex flex-col gap-4 h-full">
        {totalFim > 0 && (
          <div className="terminal-pane">
            <div className="flex flex-col">
              <div
                className="font-mono font-extrabold leading-none text-display-trading tabular-nums"
                style={{ color: fimColor, textShadow: `0 0 40px ${fimGlow}` }}
              >
                {totalFim.toLocaleString()}
                <span className="font-mono font-medium text-text2 ml-2 text-currency-label">FIM</span>
              </div>
              {lockedFim > 0 && (
                <span className="font-mono text-text2 text-xs mt-1.5 tabular-nums">
                  ({availableFim.toLocaleString()} available)
                </span>
              )}
              {belowThreshold && (
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest mt-1.5 leading-snug" style={{ color: 'var(--color-red)' }}>
                  Below existential threshold
                </span>
              )}
            </div>
          </div>
        )}
        <div className="terminal-pane h-full text-center">
          <p className="section-label">Trading is halted during Settlement</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 h-full relative">

      {/* ── Wallet balances card ── */}
      {(totalFim > 0 || userStats) && (
        <div className="terminal-pane">
          <div className="terminal-pane-header">
            <span className="terminal-pane-title">Balance</span>
          </div>
          <div className="flex items-center justify-between">
            {totalFim > 0 && (
              <div className="flex flex-col min-w-0">
                <div
                  className="font-mono font-bold leading-none text-display-trading tabular-nums"
                  style={{ color: fimColor, textShadow: `0 0 40px ${fimGlow}` }}
                >
                  {totalFim.toLocaleString()}
                  <span className="font-mono font-medium text-text2 ml-2 text-currency-label">FIM</span>
                </div>
                {lockedFim > 0 && (
                  <span className="font-mono text-text2 text-xs mt-1.5 tabular-nums">
                    ({availableFim.toLocaleString()} available)
                  </span>
                )}
                {belowThreshold && (
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest mt-1.5 leading-snug" style={{ color: 'var(--color-red)' }}>
                    Below existential threshold
                  </span>
                )}
              </div>
            )}
            {userStats && (
              <div className="flex flex-col items-end min-w-0 ml-auto shrink-0">
                <PercentileCircle percentage={userStats.factionPercentile} isCapitalist={userStats.isCapitalist} size="lg" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Trading panel card ── */}
      <div className="rounded-md bg-card border border-border flex flex-col flex-1 min-h-0">
        
        {/* ── Maker/Taker Selector Bar ── */}
        <div className="terminal-view-selector-bar--full">
          <button
            disabled={isQueueLocked}
            onClick={() => setIsMaker(false)}
            className={`terminal-view-btn${!isMaker ? ' active' : ''}`}
          >
            Taker
          </button>
          <button
            disabled={isQueueLocked}
            onClick={() => setIsMaker(true)}
            className={`terminal-view-btn${isMaker ? ' active' : ''}`}
          >
            Maker
          </button>
        </div>
        <div className="flex flex-col gap-4 p-4 h-full">
        {/* ── Buy / Sell toggle ── */}
        <div className="flex rounded-lg overflow-hidden border border-border bg-card2 gap-1">
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

        {/* ── Amount input (single side: maker or non-mixed taker) ── */}
        {(!isMixedQueue || isMaker) && (
          <div>
            <div className={isMaker ? '' : 'flex flex-col min-h-0 gap-5'}>
              <div className="pt-5 flex flex-col gap-1 shrink-0">
                <div className="flex justify-between items-center w-full">
                  <span className="mask-label text-left pl-2">
                    {!isMaker && activeMaxForSlider > 0n
                      ? <>QUEUE&nbsp;<span className="text-text font-semibold">{Number(formatUnits(activeMaxForSlider, 18)).toLocaleString()} FIM</span></>
                      : <>WALLET&nbsp;<span className="text-text font-semibold">{walletBalanceDisplay}</span></>
                    }
                  </span>
                  <span className="mask-label text-right pr-9">SIZE</span>
                </div>
                <div className="group flex items-center gap-2 bg-card3 border border-border2 rounded p-2">
                  <span className="text-lg font-mono font-bold text-text2 shrink-0">{isMaker && isBuy ? 'USDC' : 'FIM'}</span>
                  <input
                    type="number"
                    min="0"
                    max={activeMaxForSlider > 0n ? formatUnits(activeMaxForSlider, activeMaxDecimals) : undefined}
                    value={activeTarget}
                    onChange={(e) => handleActiveTargetChange(e.target.value)}
                    className="flex-1 min-w-0 bg-transparent text-input font-mono text-text outline-none placeholder:text-text2/40 tabular-nums no-spinners text-right"
                    placeholder={isMaker ? '0.00' : 'MAX'}
                  />
                  <div className="flex flex-col gap-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="btn-stepper" onClick={() => handleActiveTargetChange(String(Math.max(0, (parseFloat(activeTarget || '0') + 1))))}>▲</button>
                    <button className="btn-stepper" onClick={() => handleActiveTargetChange(String(Math.max(0, (parseFloat(activeTarget || '0') - 1))))}>▼</button>
                  </div>
                </div>
                <PercentSlider value={sliderPct} onChange={handleSliderChange} disabled={isBusy} />
              </div>
              {!isMaker && (
                
                <div data-chrome-scroll-guard className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar rounded-md p-2  border border-border bg-card2 max-h-51 xl:max-h-none">
                  {(hasAsksInQueue ? groupedAskQueue : groupedBidQueue).length === 0 ? (
                    <button
                      onClick={onOpenOrderBook}
                      disabled={!onOpenOrderBook}
                      className="h-full w-full flex items-center text-text2 justify-center py-4 rounded-lg transition-colors hover:bg-card3 hover:text-text disabled:pointer-events-none"
                    >
                      <p className="font-mono text-[11px] uppercase">Select orders</p>
                    </button>
                  ) : (
                    (hasAsksInQueue ? groupedAskQueue : groupedBidQueue).map((group, groupIdx) => {
                      const activeQueue = hasAsksInQueue ? groupedAskQueue : groupedBidQueue;
                      const filledBefore = activeQueue.slice(0, groupIdx).reduce((acc, g) => acc + g.amount, 0);
                      return (
                        <OrderQueueItem
                          key={group.ids[0]}
                          group={group} groupIdx={groupIdx} groupCount={activeQueue.length}
                          draggedGroupIdx={hasAsksInQueue ? draggedAskGroupIdx : draggedBidGroupIdx}
                          targetAmount={activeTarget}
                          filledBefore={filledBefore} stats={percentileMap?.[group.maker?.toLowerCase()]}
                          onMoveGroup={hasAsksInQueue ? handleMoveAskGroupButton : handleMoveBidGroupButton}
                          onRemoveGroup={handleRemoveGroup}
                          onDragStart={hasAsksInQueue ? setDraggedAskGroupIdx : setDraggedBidGroupIdx}
                          onDragOver={hasAsksInQueue ? handleAskGroupDragOver : handleBidGroupDragOver}
                          onDragEnd={() => hasAsksInQueue ? setDraggedAskGroupIdx(null) : setDraggedBidGroupIdx(null)}
                        />
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Maker price input ── */}
        {isMaker && (
          <div className="bg-card flex flex-col gap-1">
            <div className="flex justify-end w-full">
              <span className="mask-label pr-8">PRICE</span>
            </div>
            <div className="group flex items-center gap-1 bg-card3 border border-border2 rounded p-2">
              <span className="text-lg font-mono font-bold text-text2 shrink-0">USDC</span>
              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => handlePriceChange(e.target.value)}
                className="flex-1 min-w-0  text-input font-mono text-text outline-none placeholder:text-text2/40 tabular-nums no-spinners text-right"
                placeholder="0.00"
              />
              <div className="flex flex-col shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="btn-stepper" onClick={() => handlePriceChange(String(Math.max(0, parseFloat((parseFloat(price || '0') + 0.01).toFixed(6)))))}>▲</button>
                <button className="btn-stepper" onClick={() => handlePriceChange(String(Math.max(0, parseFloat((parseFloat(price || '0') - 0.01).toFixed(6)))))}>▼</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Taker: order queue(s) ── */}
        {!isMaker && isMixedQueue && (
            /* Mixed: buy and sell legs side by side — input+queue fused as one component per leg. */
            <div className="grid grid-cols-2 grid-rows-[minmax(0,1fr)] flex-1 min-h-0 gap-3">
              {/* Buy leg */}
              <div className="flex flex-col min-h-0 gap-5">
                <div className="pt-5 flex flex-col gap-1 shrink-0">
                  <div className="flex justify-between items-center w-full">
                    <span className="mask-label text-left pl-2">QUEUE&nbsp;<span className="text-text font-semibold">{Number(formatUnits(maxAskQueueFim, 18)).toLocaleString()} FIM</span></span>
                    <span className="mask-label text-right pr-9">SIZE</span>
                  </div>
                  <div className="group flex items-center gap-2 bg-card3 border border-border2 rounded p-2">
                    <span className="text-lg font-mono font-bold text-text2 shrink-0">FIM</span>
                    <input
                      type="number" min="0"
                      max={maxAskQueueFim > 0n ? formatUnits(maxAskQueueFim, 18) : undefined}
                      value={buyTargetAmount}
                      onChange={(e) => handleBuyTargetChange(e.target.value)}
                      className="flex-1 min-w-0 bg-transparent text-input font-mono text-text outline-none placeholder:text-text2/40 tabular-nums no-spinners text-right"
                      placeholder="MAX"
                    />
                    <div className="flex flex-col gap-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="btn-stepper" onClick={() => handleBuyTargetChange(String(Math.max(0, parseFloat(buyTargetAmount || '0') + 1)))}>▲</button>
                      <button className="btn-stepper" onClick={() => handleBuyTargetChange(String(Math.max(0, parseFloat(buyTargetAmount || '0') - 1)))}>▼</button>
                    </div>
                  </div>
                  <PercentSlider value={buySliderPct} onChange={handleBuySliderChange} disabled={isBusy} />
                </div>
                <div data-chrome-scroll-guard className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar rounded-md p-2 border border-border bg-card2 max-h-51 xl:max-h-none">
                  {groupedAskQueue.map((group, groupIdx) => {
                    const filledBefore = groupedAskQueue.slice(0, groupIdx).reduce((acc, g) => acc + g.amount, 0);
                    return (
                      <OrderQueueItem
                        key={group.ids[0]}
                        group={group} groupIdx={groupIdx} groupCount={groupedAskQueue.length}
                        draggedGroupIdx={draggedAskGroupIdx} targetAmount={buyTargetAmount}
                        filledBefore={filledBefore} stats={percentileMap?.[group.maker?.toLowerCase()]}
                        onMoveGroup={handleMoveAskGroupButton} onRemoveGroup={handleRemoveGroup}
                        onDragStart={setDraggedAskGroupIdx} onDragOver={handleAskGroupDragOver}
                        onDragEnd={() => setDraggedAskGroupIdx(null)}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Sell leg */}
              <div className="flex flex-col min-h-0 gap-5">
                <div className="pt-5 flex flex-col gap-1 shrink-0">
                  <div className="flex justify-between items-center w-full">
                    <span className="mask-label text-left pl-2">QUEUE&nbsp;<span className="text-text font-semibold">{Number(formatUnits(maxBidQueueFim, 18)).toLocaleString()} FIM</span></span>
                    <span className="mask-label text-right pr-9">SIZE</span>
                  </div>
                  <div className="group flex items-center gap-2 bg-card3 border border-border2 rounded p-2">
                    <span className="text-lg font-mono font-bold text-text2 shrink-0">FIM</span>
                    <input
                      type="number" min="0"
                      max={maxBidQueueFim > 0n ? formatUnits(maxBidQueueFim, 18) : undefined}
                      value={sellTargetAmount}
                      onChange={(e) => handleSellTargetChange(e.target.value)}
                      className="flex-1 min-w-0 bg-transparent text-input font-mono text-text outline-none placeholder:text-text2/40 tabular-nums no-spinners text-right"
                      placeholder="MAX"
                    />
                    <div className="flex flex-col gap-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="btn-stepper" onClick={() => handleSellTargetChange(String(Math.max(0, parseFloat(sellTargetAmount || '0') + 1)))}>▲</button>
                      <button className="btn-stepper" onClick={() => handleSellTargetChange(String(Math.max(0, parseFloat(sellTargetAmount || '0') - 1)))}>▼</button>
                    </div>
                  </div>
                  <PercentSlider value={sellSliderPct} onChange={handleSellSliderChange} disabled={isBusy} />
                </div>
                <div data-chrome-scroll-guard className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar rounded-md p-2 border border-border bg-card2 max-h-51 xl:max-h-none">
                  {groupedBidQueue.map((group, groupIdx) => {
                    const filledBefore = groupedBidQueue.slice(0, groupIdx).reduce((acc, g) => acc + g.amount, 0);
                    return (
                      <OrderQueueItem
                        key={group.ids[0]}
                        group={group} groupIdx={groupIdx} groupCount={groupedBidQueue.length}
                        draggedGroupIdx={draggedBidGroupIdx} targetAmount={sellTargetAmount}
                        filledBefore={filledBefore} stats={percentileMap?.[group.maker?.toLowerCase()]}
                        onMoveGroup={handleMoveBidGroupButton} onRemoveGroup={handleRemoveGroup}
                        onDragStart={setDraggedBidGroupIdx} onDragOver={handleBidGroupDragOver}
                        onDragEnd={() => setDraggedBidGroupIdx(null)}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
        )}

        {/* ── Summary + CTA ── */}
        <div className={`flex flex-col gap-4 ${isMixedQueue ? 'lg:mt-0 lg:pt-4 lg:overflow-y-auto lg:overscroll-contain lg:custom-scrollbar' : 'mt-auto pt-4'}`}>
          {showTakerFee && (
            <div className="flex flex-col gap-2">
              {/* Mixed: buy/sell breakdown cards side by side; otherwise stacked. */}
              <div className={isMixedQueue ? 'grid grid-cols-2 gap-2' : 'contents'}>
              {legs.buyCostRaw > 0n && (
                <div className={`rounded-lg px-3 py-2.5 flex flex-col gap-1 bg-card border border-border ${isMixedQueue ? 'col-start-1' : ''}`}>
                  <div className="flex justify-between font-mono text-xs font-bold tabular-nums pb-1 border-b border-border" style={{ color: 'var(--color-green)' }}>
                    <span>Buy</span>
                    <span>{Number(formatUnits(legsFim.buyFimRaw, 18)).toLocaleString()} FIM</span>
                  </div>
                  <div className="flex justify-between font-mono text-[11px] text-text2">
                    <span>Base</span>
                    <span className="tabular-nums">${formatDynamicUsdc(legs.buyCostRaw)}</span>
                  </div>
                  {tradeFeeBps > 0n && (
                    <div className="flex justify-between font-mono text-[11px] text-text2">
                      <span>Fee ({feePct}%)</span>
                      <span className="tabular-nums">+${formatDynamicUsdc(takerBuyFeeRaw)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-mono text-xs font-bold text-text pt-1 border-t border-border">
                    <span>You pay</span>
                    <span className="tabular-nums">${formatDynamicUsdc(legs.buyCostRaw + takerBuyFeeRaw)}</span>
                  </div>
                </div>
              )}
              {legs.sellProceedsRaw > 0n && (
                <div className={`rounded-lg px-3 py-2.5 flex flex-col gap-1 bg-card border border-border ${isMixedQueue ? 'col-start-2' : ''}`}>
                  <div className="flex justify-between font-mono text-xs font-bold tabular-nums pb-1 border-b border-border" style={{ color: 'var(--color-red)' }}>
                    <span>Sell</span>
                    <span>{Number(formatUnits(legsFim.sellFimRaw, 18)).toLocaleString()} FIM</span>
                  </div>
                  <div className="flex justify-between font-mono text-[11px] text-text2">
                    <span>Base</span>
                    <span className="tabular-nums">${formatDynamicUsdc(legs.sellProceedsRaw)}</span>
                  </div>
                  {tradeFeeBps > 0n && (
                    <div className="flex justify-between font-mono text-[11px] text-text2">
                      <span>Fee ({feePct}%)</span>
                      <span className="tabular-nums">-${formatDynamicUsdc(takerSellFeeRaw)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-mono text-xs font-bold text-text pt-1 border-t border-border">
                    <span>You receive</span>
                    <span className="tabular-nums">${formatDynamicUsdc(legs.sellProceedsRaw - takerSellFeeRaw)}</span>
                  </div>
                </div>
              )}
              </div>
              <div className="rounded-lg px-3 py-2.5 bg-card border border-border flex flex-col gap-1.5">
                {isMixedQueue && (() => {
                  const netFimRaw = legsFim.buyFimRaw - legsFim.sellFimRaw;
                  const netFim = Number(formatUnits(netFimRaw >= 0n ? netFimRaw : -netFimRaw, 18));
                  return (
                    <>
                      <div className="flex justify-between font-mono text-xs font-black">
                        <span style={{ color: 'var(--color-text)' }}>Net USDC</span>
                        <span className="tabular-nums" style={{ color: takerNetRaw > 0n ? 'var(--color-green)' : takerNetRaw < 0n ? 'var(--color-red)' : 'var(--color-text2)' }}>
                          {takerNetRaw > 0n ? '+' : takerNetRaw < 0n ? '-' : ''}{takerNetRaw !== 0n && '$'}{formatDynamicUsdc(takerNetRaw >= 0n ? takerNetRaw : -takerNetRaw)}
                        </span>
                      </div>
                      <div className="flex justify-between font-mono text-xs font-black">
                        <span style={{ color: 'var(--color-text)' }}>Net FIM</span>
                        <span className="tabular-nums" style={{ color: netFimRaw > 0n ? 'var(--color-green)' : netFimRaw < 0n ? 'var(--color-red)' : 'var(--color-text2)' }}>
                          {netFimRaw > 0n ? '+' : netFimRaw < 0n ? '-' : ''}{netFim.toLocaleString(undefined, { maximumFractionDigits: 4 })} FIM
                        </span>
                      </div>
                      <div className="border-t border-border mt-0.5 pt-1.5" />
                    </>
                  );
                })()}
                <div className="flex justify-between font-mono text-[11px]">
                  <span style={{ color: 'var(--color-text2)' }}>Contribution</span>
                  <span className="tabular-nums font-bold" style={{ color: contributionDeltaRaw > 0n ? 'var(--color-green)' : contributionDeltaRaw < 0n ? 'var(--color-red)' : 'var(--color-text2)' }}>
                    {contributionDeltaRaw > 0n ? '+' : contributionDeltaRaw < 0n ? '-' : ''}${formatDynamicUsdc(contributionDeltaRaw >= 0n ? contributionDeltaRaw : -contributionDeltaRaw)}
                  </span>
                </div>
                {/* Gini impact in BPS, colored by faction direction: a fill that
                    widens inequality (+) leans Bourgeoisie → gold; one that
                    narrows it (−) leans Proletariat → purple. */}
                {giniImpact && (
                  <div className="flex justify-between font-mono text-[11px]">
                    <span style={{ color: 'var(--color-text2)' }}>Gini Impact</span>
                    <span className="tabular-nums font-bold" style={{ color: giniImpact.deltaBps > 0 ? 'var(--color-gold)' : giniImpact.deltaBps < 0 ? 'var(--color-purple)' : 'var(--color-text2)' }}>
                      {giniImpact.deltaBps > 0 ? '+' : giniImpact.deltaBps < 0 ? '−' : ''}{Math.abs(giniImpact.deltaBps)} bps
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {isSelfFill && (
            <div className="rounded-lg px-4 py-2.5 flex items-center gap-2 surface-pink-warn">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-red">
                Cannot fill own order
              </span>
            </div>
          )}

          {isUnderCollateralized && !isSelfFill && (
            <Link
              href="/stake"
              className="rounded-lg px-4 py-3 flex flex-col gap-1 surface-pink-warn transition-colors hover:brightness-110"
            >
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-red">
                Stake more RGD to unlock
              </span>
              <span className="font-mono text-[11px] text-text2 tabular-nums">
                {isMaker ? 'Placing' : 'Buying'} {Number(formatUnits(fimToCommit, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 })} FIM needs{' '}
                {Number(formatUnits(collateralGate.needed, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 })} RGD.
                You have {Number(formatUnits(collateralGate.headroom, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 })} free —
                stake {Number(formatUnits(collateralGate.shortfall, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 })} more.
              </span>
            </Link>
          )}

          <button
            disabled={isButtonDisabled}
            onClick={handleStartFlow}
            className={isMixedQueue
              ? 'relative w-full inline-flex items-center justify-center py-4 px-6 rounded-md font-display text-xs font-black uppercase tracking-[0.06em] text-bg bg-linear-to-r from-green to-red cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.25)] transition-all duration-150 ease-in-out hover:-translate-y-px hover:brightness-112 hover:shadow-[0_6px_16px_rgba(0,0,0,0.35)] active:translate-y-px active:scale-[0.98] disabled:bg-card2 disabled:text-text2 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none gap-2'
              : `btn-terminal-action ${directionIsBuy ? 'action-buy' : 'action-sell'} gap-2`}
          >
            {isBusy && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
            <span>{isMixedQueue ? 'Shuffle' : directionIsBuy ? 'Buy FIM' : 'Sell FIM'}</span>
          </button>
        </div>

      </div>

      {/* ── Transaction Journey Modal ── */}
      <TxModal
        status={workflowStatus}
        txHashes={txHashes}
        title="Execute Transaction"
        successTitle="Trade Confirmed"
        errorReason={errorReason}
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
        onClose={() => { clearTargets(''); resetWorkflow(); }}
      />

    </div>
    </div>
  );
}