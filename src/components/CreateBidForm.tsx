// src/components/CreateBidForm.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAccount, useReadContract, useSimulateContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { contractAddresses, erc20ABI, exchangeABI } from '@/lib/contracts';
import { useUserHoldingsContext } from '@/context/UserHoldingsContext';
import { parseUnits, formatUnits } from 'viem';
import { useExchangeContext } from '@/context/ExchangeContext';

export function CreateBidForm() {
  const { address, chain } = useAccount();
  const { usdcBalance, usdcBalanceBigInt, refetch: refetchHoldings } = useUserHoldingsContext();
  const { refetchOrders } = useExchangeContext();
  const addresses = chain ? contractAddresses[chain.id as keyof typeof contractAddresses] : undefined;
  
  const [usdcAmount, setUsdcAmount] = useState('');
  const [price, setPrice] = useState('');

  // --- DEFINITIVE INPUT HANDLERS ---
  const handleUsdcAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const regex = /^(\d*)(\.?)(\d{0,6})/; // Max 6 decimals
    const match = value.match(regex);
    if (match) setUsdcAmount(match[1] + match[2] + match[3]); else if (value === '') setUsdcAmount('');
  };
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const regex = /^(\d*)(\.?)(\d{0,4})/; // Max 4 decimals
    const match = value.match(regex);
    if (match) setPrice(match[1] + match[2] + match[3]); else if (value === '') setPrice('');
  };

  // --- DERIVED VALUES & VALIDATION ---
  const usdcToSpend = usdcAmount ? parseUnits(usdcAmount, 6) : 0n;
  
  const isPriceValid = useMemo(() => {
    if (!price) return true;
    try {
      // Rule: Price must be > 1. With 4 decimal precision, the smallest valid price is 1.0001
      const priceFloat = parseFloat(price);
      return priceFloat > 1;
    } catch { return false; }
  }, [price]);

  const fimToBuy = useMemo(() => {
    if (!usdcAmount || !price || !isPriceValid || parseFloat(price) === 0) return 0n;
    try {
      const fimAmountFloat = parseFloat(usdcAmount) / parseFloat(price);
      return parseUnits(fimAmountFloat.toFixed(18), 18);
    } catch { return 0n; }
  }, [usdcAmount, price, isPriceValid]);
  
  const hasSufficientUsdc = usdcBalanceBigInt >= usdcToSpend;

  // --- WAGMI HOOKS ---
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: addresses?.USDC, abi: erc20ABI, functionName: 'allowance', args: [address!, addresses?.Exchange!], query: { enabled: !!address && !!addresses }
  });
  const allowance = allowanceData ?? 0n;
  const needsApproval = allowance < usdcToSpend;

  const { data: approveRequest } = useSimulateContract({
    address: addresses?.USDC, abi: erc20ABI, functionName: 'approve', args: [addresses?.Exchange!, usdcToSpend], query: { enabled: needsApproval && usdcToSpend > 0n }
  });
  const { writeContract: approve, data: approveHash, isPending: isApproving } = useWriteContract();
  const { isLoading: isWaitingForApproval, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

  const { data: createBidRequest, error } = useSimulateContract({
    address: addresses?.Exchange, abi: exchangeABI, functionName: 'createBid', args: [usdcToSpend, fimToBuy], 
    query: { enabled: !needsApproval && hasSufficientUsdc && usdcToSpend > 0n && fimToBuy > 0n && isPriceValid }
  });
  const { writeContract: createBid, data: createData, isPending: isCreating } = useWriteContract();
  const { isLoading: isWaitingForCreate, isSuccess: isCreateSuccess } = useWaitForTransactionReceipt({ hash: createData });

  useEffect(() => { if (isApprovalSuccess) refetchAllowance(); }, [isApprovalSuccess, refetchAllowance]);
  useEffect(() => { if (isCreateSuccess) { setUsdcAmount(''); setPrice(''); refetchOrders(); refetchHoldings(); } }, [isCreateSuccess, refetchOrders, refetchHoldings]);

  const isLoading = isApproving || isWaitingForApproval || isCreating || isWaitingForCreate;
  const actionText = isLoading ? 'Processing...' : needsApproval ? `Approve ${usdcAmount} USDC` : 'Create Bid';
  const isButtonDisabled = isLoading || (!approveRequest && !createBidRequest) || (!!usdcAmount && !hasSufficientUsdc) || (!!price && !isPriceValid);

  return (
    <div className="p-6 rounded-lg bg-card shadow-sm text-left text-text">
      <h3 className="text-2xl font-semibold mb-4 text-success">Create Buy Order (Bid)</h3>
      <p className="text-xs text-text/70 mb-4">You are buying FIM. Price must be greater than 1.0000 USDC per FIM.</p>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center text-xs text-text/70"><span>You Spend (USDC)</span><span>Balance: {usdcBalance}</span></div>
          <input type="number" value={usdcAmount} onChange={handleUsdcAmountChange} placeholder="e.g., 100" step="0.000001" className="mt-1 block w-full px-3 py-2 border border-card2 bg-input rounded-md"/>
        </div>
        <div>
          <label className="text-xs text-text/70">Price per FIM (in USDC)</label>
          <input type="number" value={price} onChange={handlePriceChange} placeholder="e.g., 1.0001" step="0.0001" className="mt-1 block w-full px-3 py-2 border border-card2 bg-input rounded-md"/>
        </div>
        {usdcAmount && price ? (
          <div className="text-center bg-card2 p-2 rounded-md">
            {isPriceValid ? (
              <><span className="text-xs text-text/70">You will receive approx.</span><p className="text-lg font-bold text-primary">{formatUnits(fimToBuy, 18)} FIM</p></>
            ) : (
              <p className="text-sm font-semibold text-danger">Price must be greater than 1.0000</p>
            )}
          </div>
        ) : null}
        {!hasSufficientUsdc && usdcAmount && <div className="p-2 rounded-md bg-danger/10 text-danger text-sm text-center">Insufficient USDC balance.</div>}
        <button onClick={() => needsApproval && approveRequest ? approve(approveRequest!.request) : createBid(createBidRequest!.request)} disabled={isButtonDisabled} className="w-full px-4 py-2 font-bold bg-success text-bg rounded-lg disabled:bg-card3 disabled:text-text/70 disabled:cursor-not-allowed">
          {actionText}
        </button>
        <div className="text-xs text-center text-text/70 pt-2 space-y-1">
          <p>USDC Allowance: {allowance !== undefined ? formatUnits(allowance, 6) : '...'}</p>
          {error && <p className="text-danger font-semibold break-all">{error.message}</p>}
        </div>
      </div>
    </div>
  );
}