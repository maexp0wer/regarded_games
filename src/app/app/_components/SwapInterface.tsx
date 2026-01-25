'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits, erc20Abi } from 'viem';
import MockRouterAbi from '@/deployments/abis/MockUniswapRouter.json';
import Core from '@/deployments/core.json';
import Mocks from '@/deployments/mocks.json';

export function SwapInterface() {
  const { address } = useAccount();
  const [amount, setAmount] = useState('');
  const [isBuying, setIsBuying] = useState(true);
  const [txType, setTxType] = useState<'approve' | 'swap' | null>(null);

  const { writeContract, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const ROUTER_ADDRESS = Mocks.Router as `0x${string}`;
  const tokenIn = isBuying ? Core.USDC : Core.RTD;
  const tokenOut = isBuying ? Core.RTD : Core.USDC;
  const decimalsIn = isBuying ? 6 : 18;
  const decimalsOut = isBuying ? 18 : 6;
  const symbolIn = isBuying ? 'USDC' : 'RTD';
  const symbolOut = isBuying ? 'RTD' : 'USDC';

  // --- Contract Reads ---
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: tokenIn as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    query: { enabled: !!address }
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenIn as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [address as `0x${string}`, ROUTER_ADDRESS],
    query: { enabled: !!address }
  });

  // --- Manual Quote Calculation ---
  // Replicating the logic from your Mock Router's exactInputSingle:
  // USDC -> RTD: amount * 1e12
  // RTD -> USDC: amount / 1e12
  const getEstimatedOutput = () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return '0.00';
    try {
      const amountInBI = parseUnits(amount, decimalsIn);
      let amountOutBI: bigint;
      
      if (isBuying) {
        // USDC (6) to RTD (18)
        amountOutBI = amountInBI * 1000000000000n; // 1e12
      } else {
        // RTD (18) to USDC (6)
        amountOutBI = amountInBI / 1000000000000n; // 1e12
      }
      return formatUnits(amountOutBI, decimalsOut);
    } catch (e) {
      return '0.00';
    }
  };

  const estimatedOutput = getEstimatedOutput();

  useEffect(() => {
    if (isSuccess) {
      refetchBalance();
      refetchAllowance();
      if (txType === 'swap') setAmount('');
      setTimeout(() => {
        reset();
        setTxType(null);
      }, 3000); 
    }
  }, [isSuccess, txType, refetchAllowance, refetchBalance, reset]);

  const handleAction = () => {
    if (!amount || !address) return;
    const amountBig = parseUnits(amount, decimalsIn);

    if (!allowance || allowance < amountBig) {
      setTxType('approve');
      writeContract({
        address: tokenIn as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [ROUTER_ADDRESS, 115792089237316195423570985008687907853269984665640564039457584007913129639935n],
      });
      return;
    }

    setTxType('swap');
    writeContract({
      address: ROUTER_ADDRESS,
      abi: MockRouterAbi,
      functionName: 'exactInputSingle',
      args: [{
        tokenIn,
        tokenOut,
        fee: 3000,
        recipient: address,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 600),
        amountIn: amountBig,
        amountOutMinimum: 0n,
        sqrtPriceLimitX96: 0n
      }],
    });
  };

  const needsApproval = allowance ? allowance < parseUnits(amount || '0', decimalsIn) : true;
  
  let buttonLabel = `Swap for ${symbolOut}`;
  if (isPending || isConfirming) {
    buttonLabel = txType === 'approve' ? "Approving..." : "Swapping...";
  } else if (!amount) {
    buttonLabel = "Enter Amount";
  } else if (needsApproval) {
    buttonLabel = `Approve ${symbolIn}`;
  }

  return (
    <div className="w-full max-w-sm mx-auto bg-card rounded-2xl p-6 shadow-sm border border-border/10">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[10px] font-bold text-text2 uppercase tracking-widest">
            {isBuying ? "Buy RTD Governance Token" : "Sell RTD Governance Token"}
        </h2>
        <button 
          onClick={() => { setIsBuying(!isBuying); reset(); setAmount(''); }}
          className="text-[10px] bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1 rounded-full font-bold uppercase"
        >
          ⇅ Switch
        </button>
      </div>

      <div className="space-y-2">
        {/* Input: You Pay */}
        <div className="bg-background rounded-xl p-4 border border-border/10">
          <div className="flex justify-between mb-2">
            <label className="text-[10px] uppercase font-bold text-text2 tracking-widest">You Pay</label>
            <span className="text-[10px] font-mono text-text2">
              Bal: {balance ? Number(formatUnits(balance, decimalsIn)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0.00'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); reset(); }}
              placeholder="0.00"
              className="w-full bg-transparent text-2xl font-black text-text outline-none placeholder:text-text2/30"
            />
            <span className="text-xs font-black text-text2 bg-card2 px-2 py-1 rounded">{symbolIn}</span>
          </div>
        </div>

        {/* Output: You Receive */}
        <div className="bg-background/50 rounded-xl p-4 border border-border/10">
          <div className="flex justify-between mb-2">
            <label className="text-[10px] uppercase font-bold text-text2 tracking-widest">You Receive</label>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-full text-2xl font-black text-text/60">
              {Number(estimatedOutput).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </div>
            <span className="text-xs font-black text-text2 bg-card2 px-2 py-1 rounded">{symbolOut}</span>
          </div>
        </div>

        <button
          onClick={handleAction}
          disabled={isPending || isConfirming || !amount || Number(amount) <= 0}
          className="w-full mt-2 py-4 bg-primary hover:opacity-90 disabled:opacity-50 text-white font-black uppercase tracking-widest rounded-xl transition-all"
        >
          {buttonLabel}
        </button>

        {isSuccess && (
          <div className="mt-2 text-center text-[10px] font-bold text-green-500 uppercase tracking-widest animate-pulse">
            {txType === 'approve' ? 'Approval Confirmed' : 'Swap Successful'}
          </div>
        )}
      </div>
    </div>
  );
}