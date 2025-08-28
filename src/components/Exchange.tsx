// src/components/Exchange.tsx
'use client';

import { useState, useEffect, useMemo, useCallback, createContext, useContext } from 'react';
import { useAccount, useReadContract, useReadContracts, useSimulateContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { contractAddresses, exchangeABI, erc20ABI } from '@/lib/contracts';
import { Address, formatUnits, parseUnits, zeroAddress } from 'viem';
import { useUserHoldingsContext } from '@/context/UserHoldingsContext';
import { useSeasonDataContext } from '@/context/SeasonDataContext';
import { useConnectionContext } from '@/context/ConnectionContext';

// --- Type Definitions (local to this file) ---
enum OrderType { BID, ASK }
interface Order {
  id: bigint; creator: Address; orderType: OrderType; price: number;
  fimRemaining: bigint; usdcRemaining: bigint;
  amountToSell: bigint; amountToBuy: bigint; amountFilled: bigint;
}
type OrderResult = readonly [bigint, Address, number, bigint, bigint, bigint, number];
type TradeSide = 'buy' | 'sell';

// --- Helper Components (Self-Contained and defined BEFORE the main component) ---
const ExchangeActionsContext = createContext<{ refetchOrders: () => void } | undefined>(undefined);
const useExchangeActions = () => {
    const context = useContext(ExchangeActionsContext);
    if (!context) throw new Error("useExchangeActions must be used within the Exchange component");
    return context;
};

function FillOrderButton({ order }: { order: Order }) {
  const { address, chain } = useAccount();
  const { usdcBalanceBigInt, fimBalanceBigInt, refetch: refetchHoldings } = useUserHoldingsContext();
  const { refetchOrders } = useExchangeActions();
  const addresses = chain ? contractAddresses[chain.id as keyof typeof contractAddresses] : undefined;
  const [fillAmount, setFillAmount] = useState('');
  const isBid = order.orderType === OrderType.BID;
  const tokenToProvide = isBid ? addresses?.FIMToken : addresses?.USDC;
  const balanceToCheck = isBid ? fimBalanceBigInt : usdcBalanceBigInt;
  const decimals = isBid ? 18 : 6;
  const amountToProvide = fillAmount ? parseUnits(fillAmount, decimals) : 0n;
  const maxAmountUserCanProvide = useMemo(() => {
    const maxFromOrder = isBid ? order.fimRemaining : order.usdcRemaining;
    return balanceToCheck < maxFromOrder ? balanceToCheck : maxFromOrder;
  }, [order, balanceToCheck, isBid]);
  const hasSufficientBalance = balanceToCheck >= amountToProvide;

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenToProvide, abi: erc20ABI, functionName: 'allowance', args: [address!, addresses?.Exchange!],
    query: { enabled: !!address && !!addresses && !!tokenToProvide }
  });
  const needsApproval = allowance !== undefined && allowance < amountToProvide;

  const { data: approveRequest } = useSimulateContract({
    address: tokenToProvide, abi: erc20ABI, functionName: 'approve', args: [addresses?.Exchange!, amountToProvide],
    query: { enabled: needsApproval && amountToProvide > 0n }
  });
  const { writeContract: approve, data: approveHash, isPending: isApproving } = useWriteContract();
  const { isLoading: isWaitingForApproval, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

  const { data: fillOrderRequest } = useSimulateContract({
    address: addresses?.Exchange, abi: exchangeABI, functionName: 'fillOrder', args: [order.id, amountToProvide],
    query: { enabled: !needsApproval && hasSufficientBalance && amountToProvide > 0n && amountToProvide <= maxAmountUserCanProvide }
  });
  const { writeContract: fillOrder, data: fillOrderHash, isPending: isFilling } = useWriteContract();
  const { isLoading: isWaitingForFill, isSuccess: isFillSuccess } = useWaitForTransactionReceipt({ hash: fillOrderHash });

  useEffect(() => { if (isApprovalSuccess) refetchAllowance(); }, [isApprovalSuccess, refetchAllowance]);
  useEffect(() => { if (isFillSuccess) { refetchHoldings(); refetchOrders(); setFillAmount(''); } }, [isFillSuccess, refetchHoldings, refetchOrders]);

  const isLoading = isApproving || isWaitingForApproval || isFilling || isWaitingForFill;
  const buttonText = isLoading ? '...' : needsApproval ? 'Approve' : 'Fill';

  return (
    <div className="flex items-center gap-1 justify-end">
      <input type="number" value={fillAmount} onChange={e => setFillAmount(e.target.value)} placeholder={`Max: ${parseFloat(formatUnits(maxAmountUserCanProvide, decimals)).toFixed(4)}`} className="w-20 bg-input rounded text-xs p-1 border border-card2"/>
      <button onClick={() => needsApproval ? approve(approveRequest!.request) : fillOrder(fillOrderRequest!.request)} disabled={isLoading || (!approveRequest && !fillOrderRequest)} className="px-2 py-1 bg-success text-bg rounded-md text-xs disabled:bg-gray-400">{buttonText}</button>
    </div>
  );
}

function CancelOrderButton({ orderId }: { orderId: bigint }) {
  const { chain } = useAccount();
  const { refetchOrders } = useExchangeActions();
  const { refetch: refetchHoldings } = useUserHoldingsContext();
  const addresses = chain ? contractAddresses[chain.id as keyof typeof contractAddresses] : undefined;

  const { data: cancelRequest } = useSimulateContract({
    address: addresses?.Exchange, abi: exchangeABI, functionName: 'cancelOrder', args: [orderId],
  });
  const { writeContract: cancelOrder, data: cancelHash, isPending: isCanceling } = useWriteContract();
  const { isLoading: isWaitingForCancel, isSuccess: isCancelSuccess } = useWaitForTransactionReceipt({ hash: cancelHash });

  useEffect(() => { if (isCancelSuccess) { refetchOrders(); refetchHoldings(); } }, [isCancelSuccess, refetchOrders, refetchHoldings]);

  const isLoading = isCanceling || isWaitingForCancel;
  if (isCancelSuccess) return <span className="text-xs text-gray-500 font-mono">Canceled</span>;
  return <button onClick={() => cancelOrder(cancelRequest!.request)} disabled={!cancelRequest || isLoading} className="px-2 py-1 bg-danger text-bg rounded-md text-xs font-semibold disabled:bg-gray-400">{isLoading ? '...' : 'Cancel'}</button>;
}


// =================================================================================
// THE MAIN EXCHANGE COMPONENT
// =================================================================================
export function Exchange() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const { isConnected, address: userAddress, chain } = useConnectionContext();
  const { phase } = useSeasonDataContext();
  const { usdcBalance, usdcBalanceBigInt, fimBalance, fimBalanceBigInt, refetch: refetchHoldings } = useUserHoldingsContext();
  
  const [tradeSide, setTradeSide] = useState<TradeSide>('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const addresses = chain ? contractAddresses[chain.id as keyof typeof contractAddresses] : undefined;
  const isMakerOrder = !!price;
  const isBuy = tradeSide === 'buy';
  const balance = isBuy ? usdcBalance : fimBalance;
  const tokenSymbol = isBuy ? 'USDC' : 'FIM';
  const decimals = isBuy ? 6 : 18;
  const amountAsBigInt = amount ? parseUnits(amount, decimals) : 0n;

  const { data: orderCounter, isLoading: isLoadingCounter, refetch: refetchCounter } = useReadContract({
    address: addresses?.Exchange, abi: exchangeABI, functionName: 'orderCounter', query: { enabled: !!addresses, refetchInterval: 10000 },
  });
  const totalOrders = orderCounter ? Number(orderCounter) : 0;
  const orderQueries = useMemo(() => Array.from({ length: totalOrders }, (_, i) => ({ address: addresses!.Exchange, abi: exchangeABI, functionName: 'orders', args: [BigInt(i + 1)] })), [addresses, totalOrders]);
  const { data: orderResults, isLoading: isLoadingOrders, refetch: refetchOrderDetails } = useReadContracts({
    contracts: orderQueries, query: { enabled: totalOrders > 0 && !!addresses },
  });
  const refetchOrders = useCallback(() => { refetchCounter(); refetchOrderDetails(); }, [refetchCounter, refetchOrderDetails]);

  const { bids, asks } = useMemo(() => {
    if (!orderResults) return { bids: [], asks: [] };
    const allOrders: Order[] = orderResults.filter(o => o.status === 'success' && (o.result as unknown as OrderResult)?.[6] === 0).map(o => {
      const [id, creator, orderType, amountToSell, amountToBuy, amountFilled] = o.result as unknown as OrderResult;
      let price: number, fimRemaining: bigint, usdcRemaining: bigint;
      if (orderType === OrderType.BID) { price = parseFloat(formatUnits(amountToSell, 6)) / parseFloat(formatUnits(amountToBuy, 18)); usdcRemaining = amountToSell - amountFilled; fimRemaining = amountToSell > 0n ? (usdcRemaining * amountToBuy) / amountToSell : 0n; } 
      else { price = parseFloat(formatUnits(amountToBuy, 6)) / parseFloat(formatUnits(amountToSell, 18)); fimRemaining = amountToSell - amountFilled; usdcRemaining = amountToSell > 0n ? (fimRemaining * amountToBuy) / amountToSell : 0n; }
      return { id, creator, orderType, price, fimRemaining, usdcRemaining, amountToSell, amountToBuy, amountFilled };
    });
    return { bids: allOrders.filter(o => o.orderType === OrderType.BID).sort((a, b) => b.price - a.price), asks: allOrders.filter(o => o.orderType === OrderType.ASK).sort((a, b) => a.price - b.price) };
  }, [orderResults]);

  const tokenToProvide = isBuy ? addresses?.USDC : addresses?.FIMToken;
  const { data: usdcAllowanceData, refetch: refetchUsdcAllowance } = useReadContract({
    address: addresses?.USDC, abi: erc20ABI, functionName: 'allowance', args: [userAddress!, addresses?.Exchange!], query: { enabled: !!userAddress && !!addresses }
  });
  const { data: fimAllowanceData, refetch: refetchFimAllowance } = useReadContract({
    address: addresses?.FIMToken, abi: erc20ABI, functionName: 'allowance', args: [userAddress!, addresses?.Exchange!], query: { enabled: !!userAddress && !!addresses }
  });
  const refetchAllAllowances = useCallback(() => { refetchUsdcAllowance(); refetchFimAllowance(); }, [refetchUsdcAllowance, refetchFimAllowance]);
  const activeAllowance = isBuy ? usdcAllowanceData : fimAllowanceData;
  const needsApproval = activeAllowance !== undefined && activeAllowance < amountAsBigInt;

  const { data: approveRequest } = useSimulateContract({
    address: tokenToProvide, abi: erc20ABI, functionName: 'approve', args: [addresses?.Exchange!, amountAsBigInt], query: { enabled: needsApproval && amountAsBigInt > 0n }
  });
  const { writeContract: approve, data: approveHash, isPending: isApproving } = useWriteContract();
  const { isLoading: isWaitingForApproval, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

  // 🔴 DEFINITIVE FIX #1: Corrected Price Validation and Calculation Logic 🔴
  const { fimToBuy, isBidPriceValid } = useMemo(() => {
    if (!isMakerOrder || !isBuy) return { fimToBuy: 0n, isBidPriceValid: true };
    try {
      const priceFloat = parseFloat(price);
      const isValid = priceFloat > 1; // BIDS: Price must be > 1 USDC per FIM
      if (!amount || !isValid) return { fimToBuy: 0n, isBidPriceValid: isValid };
      const fimAmountFloat = parseFloat(amount) / priceFloat;
      return { fimToBuy: parseUnits(fimAmountFloat.toFixed(18), 18), isBidPriceValid: isValid };
    } catch { return { fimToBuy: 0n, isBidPriceValid: false }; }
  }, [isMakerOrder, isBuy, price, amount]);

  const { usdcToReceive, isAskPriceValid } = useMemo(() => {
    if (!isMakerOrder || isBuy) return { usdcToReceive: 0n, isAskPriceValid: true };
    try {
      const priceFloat = parseFloat(price);
      const isValid = priceFloat < 1 && priceFloat > 0; // ASKS: Price must be < 1 USDC per FIM
      if (!amount || !isValid) return { usdcToReceive: 0n, isAskPriceValid: isValid };
      const usdcAmountFloat = parseFloat(amount) * priceFloat;
      return { usdcToReceive: parseUnits(usdcAmountFloat.toFixed(6), 6), isAskPriceValid: isValid };
    } catch { return { usdcToReceive: 0n, isAskPriceValid: false }; }
  }, [isMakerOrder, isBuy, price, amount]);

  const hasSufficientBalance = isBuy ? (usdcBalanceBigInt >= amountAsBigInt) : (fimBalanceBigInt >= amountAsBigInt);
  const isMakerPriceValid = isBuy ? isBidPriceValid : isAskPriceValid;
  
  const { data: createRequest, error: createError } = useSimulateContract({
    address: addresses?.Exchange, abi: exchangeABI, functionName: isBuy ? 'createBid' : 'createAsk',
    args: isBuy ? [amountAsBigInt, fimToBuy] : [amountAsBigInt, usdcToReceive],
    query: { enabled: isMakerOrder && !needsApproval && hasSufficientBalance && amountAsBigInt > 0n && isMakerPriceValid }
  });
  const { writeContract: createOrder, data: createHash, isPending: isCreating } = useWriteContract();
  const { isLoading: isWaitingForCreate, isSuccess: isCreateSuccess } = useWaitForTransactionReceipt({ hash: createHash });

  const bestOrderToFill = useMemo(() => isBuy ? asks[0] : bids[0], [isBuy, asks, bids]);
  const amountToProvideForFill = useMemo(() => {
    if (!bestOrderToFill) return 0n;
    const maxFromOrder = isBuy ? bestOrderToFill.usdcRemaining : bestOrderToFill.fimRemaining;
    return amountAsBigInt < maxFromOrder ? amountAsBigInt : maxFromOrder;
  }, [amountAsBigInt, bestOrderToFill, isBuy]);

  const { data: fillRequest, error: fillError } = useSimulateContract({
    address: addresses?.Exchange, abi: exchangeABI, functionName: 'fillOrder', args: [bestOrderToFill?.id!, amountToProvideForFill],
    query: { enabled: !isMakerOrder && !needsApproval && !!bestOrderToFill && amountToProvideForFill > 0n && hasSufficientBalance }
  });
  const { writeContract: fillOrder, data: fillHash, isPending: isFilling } = useWriteContract();
  const { isLoading: isWaitingForFill, isSuccess: isFillSuccess } = useWaitForTransactionReceipt({ hash: fillHash });

  useEffect(() => { if (isApprovalSuccess) refetchAllAllowances(); }, [isApprovalSuccess, refetchAllAllowances]);
  useEffect(() => { if (isCreateSuccess || isFillSuccess) { setAmount(''); setPrice(''); refetchOrders(); refetchHoldings(); refetchAllAllowances(); setSuccessMessage('Transaction Successful!'); } }, [isCreateSuccess, isFillSuccess, refetchOrders, refetchHoldings, refetchAllAllowances]);
  useEffect(() => { if (successMessage) { const t = setTimeout(() => setSuccessMessage(''), 3000); return () => clearTimeout(t); } }, [successMessage]);
  useEffect(() => { setAmount(''); setPrice(''); }, [tradeSide]);

  const isLoadingTx = isApproving || isWaitingForApproval || isCreating || isWaitingForCreate || isFilling || isWaitingForFill;
  const finalError = createError || fillError;

  let buttonText: string;
  let isButtonDisabled: boolean;
  let action: () => void = () => {};

  if (isLoadingTx) { buttonText = 'Processing...'; isButtonDisabled = true; } 
  else if (amountAsBigInt === 0n) { buttonText = 'Enter an Amount'; isButtonDisabled = true; }
  else if (!hasSufficientBalance) { buttonText = `Insufficient ${tokenSymbol}`; isButtonDisabled = true; }
  else if (needsApproval) { buttonText = `Approve ${amount} ${tokenSymbol}`; isButtonDisabled = isLoadingTx || !approveRequest; action = () => approve(approveRequest!.request); }
  else if (isMakerOrder) {
    if (isMakerPriceValid) { buttonText = 'Create Limit Order'; isButtonDisabled = isLoadingTx || !createRequest; action = () => createOrder(createRequest!.request); }
    else { buttonText = 'Invalid Price'; isButtonDisabled = true; }
  } else {
    buttonText = 'Submit Market Order'; isButtonDisabled = isLoadingTx || !fillRequest; action = () => fillOrder(fillRequest!.request);
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const regex = new RegExp(`^(\\d*)(\\.?)(\\d{0,${decimals}})`);
    if (value.match(regex)) setAmount(value); else if (value === '') setAmount('');
  };
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const regex = /^(\d*)(\.?)(\d{0,4})/;
    if (value.match(regex)) setPrice(value); else if (value === '') setPrice('');
  };
  const handleOrderClick = (order: Order) => {
    if (order.orderType === OrderType.BID) { setTradeSide('sell'); setAmount(formatUnits(order.fimRemaining, 18)); setPrice(''); } 
    else { setTradeSide('buy'); setAmount(formatUnits(order.usdcRemaining, 6)); setPrice(''); }
  };
  
  if (!isMounted) return <div className="p-6 rounded-lg bg-card shadow-sm w-full max-w-4xl mt-8 h-[500px] animate-pulse" />;
  if (!isConnected) return null;
  if (phase !== 'TRADING') return <div className="p-6 rounded-lg bg-card shadow-sm text-center w-full max-w-2xl mt-8 text-text"><h2 className="text-2xl font-semibold mb-2">Exchange Closed</h2><p>Trading is only available during the 'TRADING' phase. Current Phase: {phase}</p></div>;

  return (
    <ExchangeActionsContext.Provider value={{ refetchOrders }}>
      <div className="space-y-8 w-full max-w-4xl mt-8">
        <div className="p-6 rounded-lg bg-card shadow-sm text-left text-text">
          <div className="flex border-b border-card2 mb-4">
            <button onClick={() => setTradeSide('buy')} className={`flex-1 py-2 font-semibold ${isBuy ? 'text-primary border-b-2 border-primary' : 'text-text/70'}`}>Buy FIM</button>
            <button onClick={() => setTradeSide('sell')} className={`flex-1 py-2 font-semibold ${!isBuy ? 'text-primary border-b-2 border-primary' : 'text-text/70'}`}>Sell FIM</button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-text/70">Amount ({tokenSymbol})</label>
              <input type="number" value={amount} onChange={handleAmountChange} className="mt-1 w-full bg-input rounded-md p-2"/>
              <p className="text-xs text-right text-text/70">Balance: {balance}</p>
            </div>
            <div>
              <label className="text-xs text-text/70">Limit Price (USDC per FIM)</label>
              <input type="number" value={price} onChange={handlePriceChange} placeholder="(Optional for Market Order)" className="mt-1 w-full bg-input rounded-md p-2"/>
              <p className="text-xs text-right text-text/70">
                {isBuy ? 'e.g., 0.95 (< 1)' : 'e.g., 1.05 (> 1)'}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <button onClick={action} disabled={isButtonDisabled} className="w-full px-4 py-2 font-bold bg-primary text-bg rounded-lg disabled:bg-gray-400">{buttonText}</button>
          </div>
          <div className="text-xs text-center text-text/70 pt-2 space-y-1">
            {isBuy && usdcAllowanceData!== undefined && <p>USDC Allowance: {formatUnits(usdcAllowanceData, 6)}</p>}
            {!isBuy && fimAllowanceData!== undefined && <p>FIM Allowance: {formatUnits(fimAllowanceData, 18)}</p>}
            {finalError && <p className="text-danger font-semibold">{finalError.message}</p>}
            {successMessage && <p className="text-success font-semibold">{successMessage}</p>}
          </div>
        </div>
        
        <div className="p-6 rounded-lg bg-card shadow-sm text-left w-full text-text">
          <h2 className="text-2xl font-semibold mb-4 text-text">Live Order Book</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-center font-bold text-danger mb-2">ASKS (Sellers)</h3>
              <div className="border border-card2 rounded-lg">
                <div className="grid grid-cols-4 p-2 border-b border-card2 bg-card2/50 font-mono text-xs text-text/70">
                  <span className="text-left">Price (USDC)</span><span className="text-center">Amount (FIM)</span><span className="text-center">Total (USDC)</span><span className="text-right">Action</span>
                </div>
                {isLoadingOrders ? <p className="p-4 text-center text-xs">Loading...</p> : asks.length > 0 ? (
                  asks.map(order => {
                    const isMyOrder = userAddress?.toLowerCase() === order.creator.toLowerCase();
                    return (
                      <div key={`ask-${order.id.toString()}`} onClick={() => !isMyOrder && handleOrderClick(order)} className={`grid grid-cols-4 p-2 border-b border-card2/50 items-center text-sm ${isMyOrder ? 'bg-primary/5' : 'cursor-pointer hover:bg-primary/10'}`}>
                        <span className="font-mono text-danger font-semibold">{order.price.toFixed(4)}</span>
                        <span className="font-mono text-center">{parseFloat(formatUnits(order.fimRemaining, 18)).toFixed(4)}</span>
                        <span className="font-mono text-center text-text/70">${parseFloat(formatUnits(order.usdcRemaining, 6)).toFixed(2)}</span>
                        <div className="flex justify-end">{isMyOrder ? <CancelOrderButton orderId={order.id} /> : <span className="text-xs text-success">Click to Fill</span>}</div>
                      </div>
                    );
                  })
                ) : <p className="p-4 text-center text-xs text-text/70">No open asks.</p>}
              </div>
            </div>
            <div>
              <h3 className="text-center font-bold text-success mb-2">BIDS (Buyers)</h3>
              <div className="border border-card2 rounded-lg">
                <div className="grid grid-cols-4 p-2 border-b border-card2 bg-card2/50 font-mono text-xs text-text/70">
                  <span className="text-left">Price (USDC)</span><span className="text-center">Amount (FIM)</span><span className="text-center">Total (USDC)</span><span className="text-right">Action</span>
                </div>
                {isLoadingOrders ? <p className="p-4 text-center text-xs">Loading...</p> : bids.length > 0 ? (
                  bids.map(order => {
                    const isMyOrder = userAddress?.toLowerCase() === order.creator.toLowerCase();
                    return (
                      <div key={`bid-${order.id.toString()}`} onClick={() => !isMyOrder && handleOrderClick(order)} className={`grid grid-cols-4 p-2 border-b border-card2/50 items-center text-sm ${isMyOrder ? 'bg-primary/5' : 'cursor-pointer hover:bg-primary/10'}`}>
                        <span className="font-mono text-success font-semibold">{order.price.toFixed(4)}</span>
                        <span className="font-mono text-center">{parseFloat(formatUnits(order.fimRemaining, 18)).toFixed(4)}</span>
                        <span className="font-mono text-center text-text/70">${parseFloat(formatUnits(order.usdcRemaining, 6)).toFixed(2)}</span>
                        <div className="flex justify-end">{isMyOrder ? <CancelOrderButton orderId={order.id} /> : <span className="text-xs text-success">Click to Fill</span>}</div>
                      </div>
                    );
                  })
                ) : <p className="p-4 text-center text-xs text-text/70">No open bids.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ExchangeActionsContext.Provider>
  );
}