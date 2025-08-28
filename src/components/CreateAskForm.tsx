// src/components/CreateAskForm.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAccount, useReadContract, useSimulateContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { contractAddresses, erc20ABI, exchangeABI } from '@/lib/contracts';
import { useUserHoldingsContext } from '@/context/UserHoldingsContext';
import { parseUnits, formatUnits } from 'viem';
import { useExchangeContext } from '@/context/ExchangeContext';

export function CreateAskForm() {
  const { address, chain } = useAccount();
  const { fimBalance, fimBalanceBigInt, refetch: refetchHoldings } = useUserHoldingsContext();
  const { refetchOrders } = useExchangeContext();
  const addresses = chain ? contractAddresses[chain.id as keyof typeof contractAddresses] : undefined;
  
  const [fimAmount, setFimAmount] = useState('');
  const [price, setPrice] = useState('');

  // --- DEFINITIVE INPUT HANDLERS ---
  const handleFimAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const regex = /^(\d*)(\.?)(\d{0,18})/; // Max 18 decimals
    if (value.match(regex)) setFimAmount(value);
  };
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Regex for 0 followed by a dot and up to 4 decimals
    const regex = /^(0?)(\.?)(\d{0,4})/;
    const match = value.match(regex);
    if (match) {
      let sanitized = match[1] + match[2] + match[3];
      // Prevent typing "1" or more
      if (parseFloat(sanitized) >= 1) return;
      setPrice(sanitized);
    } else if (value === '') {
      setPrice('');
    }
  };

  const fimToSell = fimAmount ? parseUnits(fimAmount, 18) : 0n;
  
  // --- CORRECTED PRICE VALIDATION ---
  const isPriceValid = useMemo(() => {
    if (!price) return true;
    try {
      const priceFloat = parseFloat(price);
      // Rule: Price must be <= 0.9999 and > 0
      return priceFloat <= 0.9999 && priceFloat > 0;
    } catch { return false; }
  }, [price]);

  const usdcToReceive = useMemo(() => {
    if (!fimAmount || !price || !isPriceValid) return 0n;
    try {
      const usdcAmountFloat = parseFloat(fimAmount) * parseFloat(price);
      return parseUnits(usdcAmountFloat.toFixed(6), 6);
    } catch { return 0n; }
  }, [fimAmount, price, isPriceValid]);
  
  const hasSufficientFim = fimBalanceBigInt >= fimToSell;

  // WAGMI Hooks
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: addresses?.FIMToken, abi: erc20ABI, functionName: 'allowance', args: [address!, addresses?.Exchange!], query: { enabled: !!address && !!addresses }
  });
  const allowance = allowanceData ?? 0n;
  const needsApproval = allowance < fimToSell;

  const { data: approveRequest } = useSimulateContract({
    address: addresses?.FIMToken, abi: erc20ABI, functionName: 'approve', args: [addresses?.Exchange!, fimToSell], query: { enabled: needsApproval && fimToSell > 0n }
  });
  const { writeContract: approve, data: approveHash, isPending: isApproving } = useWriteContract();
  const { isLoading: isWaitingForApproval, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

  const { data: createAskRequest, error } = useSimulateContract({
    address: addresses?.Exchange, abi: exchangeABI, functionName: 'createAsk', args: [fimToSell, usdcToReceive], 
    query: { enabled: !needsApproval && hasSufficientFim && fimToSell > 0n && usdcToReceive > 0n && isPriceValid }
  });
  const { writeContract: createAsk, data: createData, isPending: isCreating } = useWriteContract();
  const { isLoading: isWaitingForCreate, isSuccess: isCreateSuccess } = useWaitForTransactionReceipt({ hash: createData });
      
  useEffect(() => { if (isApprovalSuccess) refetchAllowance(); }, [isApprovalSuccess, refetchAllowance]);
  useEffect(() => { if (isCreateSuccess) { setFimAmount(''); setPrice(''); refetchOrders(); refetchHoldings(); } }, [isCreateSuccess, refetchOrders, refetchHoldings]);

  const isLoading = isApproving || isWaitingForApproval || isCreating || isWaitingForCreate;
  const actionText = isLoading ? 'Processing...' : needsApproval ? `Approve ${fimAmount} FIM` : 'Create Ask';
  const isButtonDisabled = isLoading || (!approveRequest && !createAskRequest) || (!!fimAmount && !hasSufficientFim) || (!!price && !isPriceValid);

  return (
    <div className="p-6 rounded-lg bg-card shadow-sm text-left text-text">
      <h3 className="text-2xl font-semibold mb-4 text-danger">Create Sell Order (Ask)</h3>
      <p className="text-xs text-text/70 mb-4">Place an order to sell FIM. Price must be 0.9999 or lower.</p>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center text-xs text-text/70"><span>You Sell (FIM)</span><span>Balance: {fimBalance}</span></div>
          <input type="number" value={fimAmount} onChange={handleFimAmountChange} placeholder="e.g., 550" className="mt-1 block w-full px-3 py-2 border border-card2 bg-input rounded-md"/>
        </div>
        <div>
          <label className="text-xs text-text/70">Price per FIM (in USDC)</label>
          <input type="number" value={price} onChange={handlePriceChange} placeholder="e.g., 0.9999" step="0.0001" className="mt-1 block w-full px-3 py-2 border border-card2 bg-input rounded-md"/>
        </div>
        {fimAmount && price ? (
          <div className="text-center bg-card2 p-2 rounded-md">
            {isPriceValid ? (
              <><span className="text-xs text-text/70">You will receive approx.</span><p className="text-lg font-bold text-success">${formatUnits(usdcToReceive, 6)} USDC</p></>
            ) : (
              <p className="text-sm font-semibold text-danger">Price must be 0.9999 or less</p>
            )}
          </div>
        ) : null}
        {!hasSufficientFim && fimAmount && <div className="p-2 rounded-md bg-danger/10 text-danger text-sm text-center">Insufficient FIM balance.</div>}
        <button onClick={() => needsApproval && approveRequest ? approve(approveRequest!.request) : createAsk(createAskRequest!.request)} disabled={isButtonDisabled} className="w-full px-4 py-2 font-bold bg-danger text-bg rounded-lg disabled:bg-card3 disabled:text-text/70 disabled:cursor-not-allowed">
          {actionText}
        </button>
        {error && <p className="text-danger text-xs break-all text-center">{error.message}</p>}
      </div>
    </div>
  );
}