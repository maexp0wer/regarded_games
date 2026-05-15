'use client';

import React, { useState, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits, erc20Abi } from 'viem';

import { WalletButton } from './WalletButton';
import PercentSlider from '@/components/PercentSlider';

// ABIs & Addresses
import MockRouterAbiRaw from '@/deployments/abis/MockUniswapRouter.json';
import Core from '@/deployments/local/core.json';

const MockRouterAbi = MockRouterAbiRaw as any;

type WorkflowStep = 'idle' | 'approving' | 'mining_approval' | 'swapping' | 'mining_swap' | 'success' | 'canceled' | 'failed' | 'no_gas';

export function SwapMask() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [amount, setAmount] = useState("");
  const [isBuying, setIsBuying] = useState(true); // true = USDC->RGD, false = RGD->USDC
  const [status, setStatus] = useState<WorkflowStep>('idle');

  // Configuration
  const routerAddr = Core.Router as `0x${string}`;
  const usdcAddr = Core.USDC as `0x${string}`;
  const rgdAddr = Core.RGD as `0x${string}`;

  const tokenIn = isBuying ? usdcAddr : rgdAddr;
  const tokenOut = isBuying ? rgdAddr : usdcAddr;
  const decimalsIn = isBuying ? 6 : 18;
  const decimalsOut = isBuying ? 18 : 6;
  const symbolIn = isBuying ? 'USDC' : 'RGD';
  const symbolOut = isBuying ? 'RGD' : 'USDC';

  // --- 1. Contract Reads ---
  // Read both balances always so switching is snappy
  const { data: usdcBalance, refetch: refetchUsdc } = useReadContract({
    address: usdcAddr, abi: erc20Abi, functionName: 'balanceOf', args: address ? [address] : undefined,
  });
  const { data: rgdBalance, refetch: refetchRgd } = useReadContract({
    address: rgdAddr, abi: erc20Abi, functionName: 'balanceOf', args: address ? [address] : undefined,
  });
  
  // Read allowance for the CURRENT input token
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenIn, abi: erc20Abi, functionName: 'allowance', args: address ? [address, routerAddr] : undefined,
  });

  // --- 2. Logic & Math ---
  const amountBigInt = amount ? parseUnits(amount, decimalsIn) : 0n;
  const currentUsdc = (usdcBalance as bigint) ?? 0n;
  const currentRgd = (rgdBalance as bigint) ?? 0n;
  const walletBalanceIn = isBuying ? currentUsdc : currentRgd;

  // Mock Quote Calculation (1 USDC = 1 RGD scaled)
  const estimatedOutputBigInt = useMemo(() => {
    if (amountBigInt === 0n) return 0n;
    if (isBuying) return amountBigInt * 1000000000000n; // 1e6 -> 1e18
    return amountBigInt / 1000000000000n; // 1e18 -> 1e6
  }, [amountBigInt, isBuying]);

  const handleMax = () => {
    setAmount(formatUnits(walletBalanceIn, decimalsIn));
  };

  // --- Slider Logic ---
  const sliderPct = useMemo(() => {
    if (!amount || walletBalanceIn === 0n) return 0;
    try {
      const raw = parseUnits(amount, decimalsIn);
      return Math.min(100, Math.max(0, Math.round(Number((raw * 100n) / walletBalanceIn))));
    } catch { return 0; }
  }, [amount, walletBalanceIn, decimalsIn]);

  const handleSliderChange = (pct: number) => {
    if (walletBalanceIn === 0n) return;
    setAmount(formatUnits((walletBalanceIn * BigInt(pct)) / 100n, decimalsIn));
  };

  const resetData = () => {
    refetchUsdc();
    refetchRgd();
    refetchAllowance();
  };

  // --- 3. THE ORCHESTRATOR ---
  const handleStartFlow = async () => {
    if (!publicClient || !address || !amountBigInt) return;

    try {
      // 1. Check Allowance
      const liveAllowance = await publicClient.readContract({
        address: tokenIn, abi: erc20Abi, functionName: 'allowance', args: [address, routerAddr]
      }) as bigint;

      if (liveAllowance < amountBigInt) {
        setStatus('approving');
        // Max approval for convenience
        const maxApproval = 115792089237316195423570985008687907853269984665640564039457584007913129639935n;
        const approveHash = await writeContractAsync({
          address: tokenIn, abi: erc20Abi, functionName: 'approve', args: [routerAddr, maxApproval],
        });
        setStatus('mining_approval');
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        refetchAllowance();
      }

      // 2. Execute Swap
      setStatus('swapping');
      
      const swapHash = await writeContractAsync({
        address: routerAddr,
        abi: MockRouterAbi,
        functionName: 'exactInputSingle',
        args: [{
          tokenIn,
          tokenOut,
          fee: 3000,
          recipient: address,
          deadline: BigInt(Math.floor(Date.now() / 1000) + 600), // 10 mins
          amountIn: amountBigInt,
          amountOutMinimum: 0n, // Slippage 0 for mock
          sqrtPriceLimitX96: 0n
        }],
      });

      setStatus('mining_swap');
      await publicClient.waitForTransactionReceipt({ hash: swapHash });

      // 3. Success
      setStatus('success');
      resetData();

      setTimeout(() => {
        setAmount("");
        setStatus('idle');
      }, 2500);

    } catch (err: any) {
      console.error("Workflow Error:", err);
      
      const isRejection = err.shortMessage?.includes("rejected") || err.message?.includes("User rejected");
      const isInsufficientGas = err.message?.includes("insufficient funds") || err.name === 'InsufficientFundsError';
      
      if (isRejection) setStatus('canceled');
      else if (isInsufficientGas) setStatus('no_gas');
      else setStatus('failed');
      
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  // --- 4. UI Helpers ---
  const getProgressWidth = () => {
    switch (status) {
      case 'idle': return '0%';
      case 'approving': return '15%';
      case 'mining_approval': return '40%';
      case 'swapping': return '60%';
      case 'mining_swap': return '85%';
      case 'success': return '100%';
      default: return '0%';
    }
  };

  const getButtonText = () => {
    if (status === 'approving') return `Step 1/2: Approve ${symbolIn}...`;
    if (status === 'mining_approval') return "Step 1/2: Confirming...";
    if (status === 'swapping') return `Step 2/2: Swap ${symbolIn}...`;
    if (status === 'mining_swap') return "Finalizing...";
    if (status === 'success') return "Swap Successful!";
    if (status === 'canceled') return "Canceled";
    if (status === 'no_gas') return "Insufficient Gas";
    if (status === 'failed') return "Transaction Failed";

    if (!amount || amountBigInt === 0n) return "Enter Amount";
    if (walletBalanceIn < amountBigInt) return `Insufficient ${symbolIn}`;
    
    return `Swap ${symbolIn} for ${symbolOut}`;
  };

  const isBusy = status !== 'idle' && status !== 'canceled' && status !== 'failed' && status !== 'success' && status !== 'no_gas';
  const isSuccess = status === 'success';
  const isError = status === 'canceled' || status === 'failed' || status === 'no_gas';
  const isButtonDisabled = isBusy || isSuccess || isError || !amount || walletBalanceIn < amountBigInt || amountBigInt === 0n;

  // Shared Design Constants
  const inputBase = 'bg-transparent border-none p-0 w-full font-mono font-bold text-text outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';
  
  const buyActive  = { background: 'var(--color-green-a15)', color: 'var(--color-green)', boxShadow: '0 1px 4px #00000033' };
  const sellActive = { background: 'var(--color-pink-a15)',  color: 'var(--color-pink)',  boxShadow: '0 1px 4px #00000033' };
  const segInactive = { color: 'var(--color-text2)', background: 'transparent' };

  const ctaBtnStyle = isBusy || (status !== 'idle' && !isError && !isSuccess)
    ? {}
    : isButtonDisabled && !isSuccess && !isError
    ? { background: 'var(--color-card2)', color: 'var(--color-text2)', cursor: 'not-allowed' }
    : isError
    ? { background: 'var(--color-pink)', color: 'var(--color-bg)', cursor: 'not-allowed' }
    : isSuccess
    ? { background: 'var(--color-green)', color: 'var(--color-bg)', cursor: 'not-allowed' }
    : isBuying
    ? { background: 'linear-gradient(135deg, #6bcb6e, #4daa50)', color: 'var(--color-bg)', boxShadow: '0 4px 20px -6px var(--color-green-a50)' }
    : { background: 'linear-gradient(135deg, #ff7ab0, #ff3d8a)', color: 'var(--color-bg)', boxShadow: '0 4px 20px -6px var(--color-pink-a50)' };


  if (!isConnected) {
    return (
      <div 
        className="card-app flex flex-col items-center justify-center gap-4 w-full max-w-lg py-12"
        style={{ borderColor: 'var(--color-border-bright)' }}
      >
        <p className="font-mono text-sm text-text2">Please connect wallet to trade tokens</p>
        <WalletButton />
      </div>
    );
  }

  return (
    <div 
      className="card-app flex flex-col gap-4 w-full max-w-lg"
      style={{ borderColor: 'var(--color-border-bright)' }}
    >
      {/* ── Balances Header ── */}
      <div className="flex flex-col pb-2">
        <div className="flex items-start justify-between">
          <div>
            <p className="section-label mb-1">USDC Balance</p>
            <div 
              className="font-display font-extrabold leading-none text-display-swap"
              style={{
                color: 'var(--color-gold)',
                textShadow: '0 0 40px var(--color-gold-a25)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {Number(formatUnits(currentUsdc, 6)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              <span className="font-mono font-medium text-text2 ml-2 text-currency-label">USDC</span>
            </div>
          </div>
          <div className="text-right">
            <p className="section-label mb-1">RGD Balance</p>
            <div 
              className="font-display font-extrabold leading-none text-display-swap"
              style={{
                color: 'var(--color-gold)',
                textShadow: '0 0 40px var(--color-gold-a25)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {Number(formatUnits(currentRgd, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              <span className="font-mono font-medium text-text2 ml-2 text-currency-label">RGD</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mode seg control ── */}
      <div className="seg" style={{ width: '100%' }}>
        <button
          disabled={isBusy}
          onClick={() => { setIsBuying(true); setAmount(""); }}
          className="seg-btn"
          style={{ ...(isBuying ? buyActive : segInactive), flex: 1, textAlign: 'center' }}
        >
          Buy RGD
        </button>
        <button
          disabled={isBusy}
          onClick={() => { setIsBuying(false); setAmount(""); }}
          className="seg-btn"
          style={{ ...(!isBuying ? sellActive : segInactive), flex: 1, textAlign: 'center' }}
        >
          Sell RGD
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
            <span className="section-label">Pay {symbolIn}</span>
            <span className="font-mono text-[11px] text-text2 ml-2">
              MAX · <span className="text-text font-semibold">
                {Number(formatUnits(walletBalanceIn, decimalsIn)).toLocaleString()}
              </span>
            </span>
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`${inputBase} text-input`}
            placeholder="0.00"
            disabled={isBusy || isSuccess || isError}
          />
          <PercentSlider 
            value={sliderPct} 
            onChange={handleSliderChange} 
            disabled={isBusy || isSuccess || isError} 
          />
        </div>
        {/* Vertical Max button — right side */}
        <div className="flex flex-col shrink-0" style={{ width: 64, borderLeft: '1px solid var(--color-border)' }}>
          <button
            onClick={handleMax}
            disabled={isBusy || isSuccess || isError}
            className="flex-1 font-mono font-semibold uppercase flex items-center justify-center transition-all text-toggle-label hover:brightness-110"
            style={{
              letterSpacing: '0.07em',
              background: 'transparent',
              color: 'var(--color-gold)',
            }}
          >
            MAX
          </button>
        </div>
      </div>

      {/* ── Sub-stats ── */}
      <div className="grid grid-cols-2 gap-2 pt-2 mt-1" style={{ borderTop: '1px solid var(--color-border)' }}>
        <div className="text-left">
          <p className="section-label mb-1">Exchange Rate</p>
          <span className="font-mono font-bold text-summary-value text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
            1 USDC = 1 RGD
          </span>
        </div>
        <div className="text-left">
          <p className="section-label mb-1">You Receive</p>
          <span 
            className="font-mono font-bold text-summary-value" 
            style={{ color: isBuying ? 'var(--color-green)' : 'var(--color-pink)', fontVariantNumeric: 'tabular-nums' }}
          >
            {amount ? Number(formatUnits(estimatedOutputBigInt, decimalsOut)).toLocaleString() : "0.00"} {symbolOut}
          </span>
        </div>
      </div>

      {/* ── CTA Button ── */}
      <div className="mt-2 relative rounded-xl overflow-hidden">
        {status !== 'idle' && !isError && (
          <div
            className="absolute inset-y-0 left-0 transition-all duration-500"
            style={{
              width: getProgressWidth(),
              background: status === 'success' 
                ? 'var(--color-green)' 
                : (isBuying ? 'rgba(107, 203, 110, 0.3)' : 'rgba(255, 122, 176, 0.3)'),
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
          {getButtonText()}
        </button>
      </div>
    </div>
  );
}