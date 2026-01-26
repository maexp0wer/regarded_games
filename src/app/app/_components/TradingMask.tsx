'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits, erc20Abi, maxUint256 } from 'viem';
import ExchangeAbi from '@/deployments/abis/Exchange.json';
import { Order } from '@/hooks/useOrderBook';
import Core from '@/deployments/core.json';

interface TradingMaskProps {
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
}

export function TradingMask({ 
  exchangeAddress, fimAddress, isBuy, setIsBuy, isMaker, setIsMaker, 
  targetAmount, setTargetAmount, selectedOrders, onRemoveOrder, onMoveOrder 
}: TradingMaskProps) {
  
  const { address, isConnected } = useAccount();
  const [price, setPrice] = useState(""); 
  const [txType, setTxType] = useState<'approve' | 'execute' | null>(null);

  const { writeContract, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const spendingToken = isBuy ? Core.USDC : fimAddress;
  const spendingSymbol = isBuy ? "USDC" : "FIM";

  // --- 1. EXECUTION PAYLOAD (Calculates the partial fill arrays) ---
  const executionPayload = useMemo(() => {
    if (isMaker) return { ids: [], amounts: [], totalCost: 0, totalFim: 0 };

    // Convert user input to BigInt (18 decimals)
    // If empty, we use a massive number to fill everything selected
    const targetAmountRaw = targetAmount ? parseUnits(targetAmount, 18) : maxUint256;
    
    let remainingToFill = targetAmountRaw;
    const ids: bigint[] = [];
    const amounts: bigint[] = [];
    
    let totalCostUsdcRaw = 0n;
    let totalFimFilledRaw = 0n;

    for (const order of selectedOrders) {
      if (remainingToFill <= 0n) break;

      const orderAmountRaw = order.rawAmount; // Use the BigInt from our hook
      
      // How much can we take from this order?
      const take = remainingToFill > orderAmountRaw ? orderAmountRaw : remainingToFill;
      
      ids.push(BigInt(order.id));
      amounts.push(take);

      // Calculate cost: (take * rawPrice) / rawAmount
      // Note: rawPrice is total USDC price in 6 decimals
      const cost = (take * order.rawPrice) / order.rawAmount;

      totalCostUsdcRaw += cost;
      totalFimFilledRaw += take;
      
      remainingToFill -= take;
    }

    return { 
      ids, 
      amounts, 
      totalCost: Number(formatUnits(totalCostUsdcRaw, 6)), 
      totalFim: Number(formatUnits(totalFimFilledRaw, 18)) 
    };
  }, [isMaker, targetAmount, selectedOrders]);

  // --- 2. ALLOWANCE LOGIC ---
  const amountNeeded = useMemo(() => {
    if (!isConnected) return 0n;
    try {
      if (isMaker) {
        if (!targetAmount) return 0n;
        if (isBuy) {
            if (!price) return 0n;
            return parseUnits((Number(targetAmount) * Number(price)).toFixed(6), 6);
        }
        return parseUnits(Number(targetAmount).toFixed(18), 18);
      } else {
        if (selectedOrders.length === 0) return 0n;
        if (isBuy) return parseUnits(executionPayload.totalCost.toFixed(6), 6);
        return parseUnits(executionPayload.totalFim.toFixed(18), 18);
      }
    } catch (e) { return 0n; }
  }, [isBuy, isMaker, targetAmount, price, executionPayload, isConnected, selectedOrders]);

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: spendingToken as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [address as `0x${string}`, exchangeAddress as `0x${string}`],
    query: { enabled: !!address && !!exchangeAddress }
  });

  const isApprovalNeeded = allowance !== undefined && allowance < amountNeeded;

  useEffect(() => {
    if (isSuccess) {
      if (txType === 'approve') {
        refetchAllowance().then(() => { reset(); setTxType(null); });
      } else if (txType === 'execute') {
        setTargetAmount("");
        setPrice("");
        reset();
        setTxType(null);
      }
    }
  }, [isSuccess, txType, refetchAllowance, reset, setTargetAmount]);

  const handleAction = () => {
    if (isApprovalNeeded) {
      setTxType('approve');
      writeContract({
        address: spendingToken as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [exchangeAddress as `0x${string}`, maxUint256]
      });
    } else {
      setTxType('execute');
      if (isMaker) {
        writeContract({
          address: exchangeAddress as `0x${string}`,
          abi: ExchangeAbi as any,
          functionName: 'createOrder',
          args: [isBuy, parseUnits(targetAmount, 18), parseUnits(price, 6)]
        });
      } else {
        writeContract({
            address: exchangeAddress as `0x${string}`,
            abi: ExchangeAbi as any,
            functionName: 'fillBatch',
            args: [executionPayload.ids, executionPayload.amounts]
        });
      }
    }
  };

  if (!isConnected) return <div className="p-6 bg-card rounded-xl border border-border text-center text-text2 text-sm">Please Connect Wallet</div>;

  const btnLabel = isPending || isConfirming 
    ? (txType === 'approve' ? "Approving..." : "Executing...")
    : isApprovalNeeded && amountNeeded > 0n 
        ? `Approve ${spendingSymbol}` 
        : isMaker ? (isBuy ? "Create Buy Order" : "Create Sell Order") : `Fill Selected Orders`;

  return (
    <div className="bg-card rounded-xl p-6 border border-border space-y-6 h-full flex flex-col shadow-sm">
      
      {/* Toggles */}
      <div className="flex gap-2">
        <div className="flex bg-card2 rounded-lg p-1 border border-border w-1/2">
          <button onClick={() => {setIsBuy(true); reset();}} className={`flex-1 py-1 text-[10px] font-black uppercase rounded transition-all ${isBuy ? 'bg-success text-white' : 'text-text2 hover:text-text'}`}>Buy</button>
          <button onClick={() => {setIsBuy(false); reset();}} className={`flex-1 py-1 text-[10px] font-black uppercase rounded transition-all ${!isBuy ? 'bg-danger text-white' : 'text-text2 hover:text-text'}`}>Sell</button>
        </div>
        <div className="flex bg-card2 rounded-lg p-1 border border-border w-1/2">
          <button onClick={() => {setIsMaker(true); reset();}} className={`flex-1 py-1 text-[10px] font-black uppercase rounded transition-all ${isMaker ? 'bg-primary text-white' : 'text-text2 hover:text-text'}`}>Maker</button>
          <button onClick={() => {setIsMaker(false); reset();}} className={`flex-1 py-1 text-[10px] font-black uppercase rounded transition-all ${!isMaker ? 'bg-primary text-white' : 'text-text2 hover:text-text'}`}>Taker</button>
        </div>
      </div>

      {/* INPUTS AREA */}
      <div className="space-y-4 flex-1">
        {/* targetAmount is used in BOTH modes now */}
        <div>
          <label className="text-[10px] uppercase font-bold text-text2 tracking-widest">
            {isMaker ? "Amount (FIM)" : "Fill Target (FIM)"}
          </label>
          <input 
            type="number" 
            value={targetAmount} 
            onChange={(e) => { setTargetAmount(e.target.value); reset(); }} 
            className="w-full bg-card2 border border-border rounded p-2 text-text font-mono focus:border-primary outline-none mt-1"
            placeholder={isMaker ? "0.00" : "Fill all selected (leave empty)"}
          />
          {!isMaker && <p className="text-[9px] text-text2 mt-1 italic">Leave empty to fully fill all selected orders</p>}
        </div>

        {isMaker ? (
          <div>
            <label className="text-[10px] uppercase font-bold text-text2 tracking-widest">Total Price (USDC)</label>
            <input 
              type="number" 
              value={price} 
              onChange={(e) => { setPrice(e.target.value); reset(); }} 
              className="w-full bg-card2 border border-border rounded p-2 text-text font-mono focus:border-primary outline-none mt-1"
              placeholder="0.00"
            />
          </div>
        ) : (
          <div className="flex flex-col h-full min-h-0 pt-2">
            <label className="text-[10px] uppercase font-bold text-text2 mb-2 tracking-widest">Order Execution Queue</label>
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-card2/30 rounded-lg border border-border p-2 space-y-2 max-h-[250px]">
                {selectedOrders.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-6 opacity-30">
                        <p className="text-[10px] uppercase font-bold text-center">Select from Book</p>
                    </div>
                ) : (
                    selectedOrders.map((order, idx) => {
                        const limit = Number(targetAmount) || Infinity;
                        const previouslyFilled = selectedOrders.slice(0, idx).reduce((acc, o) => acc + o.amount, 0);
                        const localFill = Math.max(0, Math.min(order.amount, limit - previouslyFilled));
                        return (
                            <div key={order.id} className={`bg-card p-2 rounded border border-border flex justify-between items-center ${localFill === 0 ? 'opacity-30' : ''}`}>
                                <div className="flex flex-col">
                                    <span className={`text-[10px] font-mono font-bold ${order.isBuy ? 'text-success' : 'text-danger'}`}>${order.price.toFixed(4)}</span>
                                    <span className="text-[9px] text-text2">Fill: {localFill.toFixed(0)} FIM</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => onMoveOrder(idx, -1)} disabled={idx === 0} className="bg-card2 p-1 rounded text-[8px]">▲</button>
                                    <button onClick={() => onMoveOrder(idx, 1)} disabled={idx === selectedOrders.length - 1} className="bg-card2 p-1 rounded text-[8px]">▼</button>
                                    <button onClick={() => onRemoveOrder(order.id)} className="text-text2 hover:text-danger ml-1">×</button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
          </div>
        )}
      </div>

      {/* SUMMARY & ACTION */}
      <div className="space-y-4 mt-auto pt-4 border-t border-border">
        <div className="p-3 bg-card2/50 rounded-xl border border-border flex justify-between items-center">
          <span className="text-[10px] uppercase font-black text-text2 tracking-widest">
            {isMaker ? "Est. Order Value" : "Total Cost"}
          </span>
          <div className="text-right">
            <span className="text-lg font-black text-text block leading-none">
              ${(isMaker ? (Number(price) || 0) : executionPayload.totalCost).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
            {!isMaker && <span className="text-[10px] font-bold text-text2 uppercase">{executionPayload.totalFim.toFixed(0)} FIM</span>}
          </div>
        </div>

        <button 
          onClick={handleAction} 
          disabled={(isMaker && (!targetAmount || !price)) || (!isMaker && selectedOrders.length === 0) || isPending || isConfirming}
          className="w-full btn-primary py-4 shadow-lg shadow-primary/20 disabled:shadow-none"
        >
          {btnLabel}
        </button>
      </div>
    </div>
  );
}