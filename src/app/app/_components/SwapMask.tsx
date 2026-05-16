'use client';

import React, { useState, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits, erc20Abi } from 'viem';

import { WalletButton } from './WalletButton';
import PercentSlider from '@/components/PercentSlider';

import UniswapV2RouterAbi from '@/deployments/abis/UniswapV2Router.json';
import Core from '@/deployments/local/core.json';

type WorkflowStep = 'idle' | 'approving' | 'mining_approval' | 'swapping' | 'mining_swap' | 'success' | 'canceled' | 'failed' | 'no_gas';

const SLIPPAGE_BPS = 50n; // 0.5%
const MAX_UINT256 = 115792089237316195423570985008687907853269984665640564039457584007913129639935n;

function extractRevertReason(err: any): string {
  const raw: string = err?.shortMessage ?? err?.cause?.reason ?? err?.message ?? String(err);
  const match = raw.match(/reason:\s*(.+?)(?:\n|$)/i) ?? raw.match(/reverted with reason string '(.+?)'/i);
  return match ? match[1].trim() : raw.slice(0, 120);
}

export function SwapMask() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [amountIn, setAmountIn] = useState('');
  const [isBuying, setIsBuying] = useState(true); // true = USDC→RGD, false = RGD→USDC
  const [status, setStatus] = useState<WorkflowStep>('idle');
  const [errorReason, setErrorReason] = useState<string | null>(null);

  const routerAddr = Core.Router as `0x${string}`;
  const usdcAddr = Core.USDC as `0x${string}`;
  const rgdAddr = Core.RGD as `0x${string}`;

  const tokenIn  = isBuying ? usdcAddr : rgdAddr;
  const tokenOut = isBuying ? rgdAddr  : usdcAddr;
  const decimalsIn  = isBuying ? 6  : 18;
  const decimalsOut = isBuying ? 18 : 6;
  const symbolIn  = isBuying ? 'USDC' : 'RGD';
  const symbolOut = isBuying ? 'RGD'  : 'USDC';

  const amountInBigInt = useMemo(() => {
    try { return amountIn ? parseUnits(amountIn, decimalsIn) : 0n; }
    catch { return 0n; }
  }, [amountIn, decimalsIn]);

  // ── Balances ──────────────────────────────────────────────────────
  const { data: usdcBalance, refetch: refetchUsdc } = useReadContract({
    address: usdcAddr, abi: erc20Abi, functionName: 'balanceOf',
    args: [address!],
    query: { enabled: !!address, refetchInterval: 5000 },
  });
  const { data: rgdBalance, refetch: refetchRgd } = useReadContract({
    address: rgdAddr, abi: erc20Abi, functionName: 'balanceOf',
    args: [address!],
    query: { enabled: !!address, refetchInterval: 5000 },
  });
  const { refetch: refetchAllowance } = useReadContract({
    address: tokenIn, abi: erc20Abi, functionName: 'allowance',
    args: [address!, routerAddr],
    query: { enabled: !!address },
  });

  const walletBalanceIn  = ((isBuying ? usdcBalance : rgdBalance) ?? 0n) as bigint;
  const walletBalanceOut = ((isBuying ? rgdBalance  : usdcBalance) ?? 0n) as bigint;

  // ── Live quote from V2 router ─────────────────────────────────────
  const path = [tokenIn, tokenOut] as readonly [`0x${string}`, `0x${string}`];
  const { data: amountsOut, isLoading: quoteLoading } = useReadContract({
    address: routerAddr,
    abi: UniswapV2RouterAbi,
    functionName: 'getAmountsOut',
    args: [amountInBigInt, path],
    query: { enabled: amountInBigInt > 0n, refetchInterval: 5000 },
  });

  const estimatedOutput = (amountsOut as bigint[] | undefined)?.[1] ?? 0n;
  const amountOutMin = estimatedOutput > 0n
    ? (estimatedOutput * (10000n - SLIPPAGE_BPS)) / 10000n
    : 0n;

  const exchangeRate = useMemo(() => {
    if (!amountsOut || amountInBigInt === 0n) return null;
    const outBig = (amountsOut as bigint[])[1];
    const inNorm  = Number(formatUnits(amountInBigInt, decimalsIn));
    const outNorm = Number(formatUnits(outBig, decimalsOut));
    return inNorm > 0 ? outNorm / inNorm : null;
  }, [amountsOut, amountInBigInt, decimalsIn, decimalsOut]);

  // ── Slider ────────────────────────────────────────────────────────
  const sliderPct = useMemo(() => {
    if (!amountIn || walletBalanceIn === 0n) return 0;
    try {
      const raw = parseUnits(amountIn, decimalsIn);
      return Math.min(100, Math.max(0, Math.round(Number((raw * 100n) / walletBalanceIn))));
    } catch { return 0; }
  }, [amountIn, walletBalanceIn, decimalsIn]);

  const handleSliderChange = (pct: number) => {
    if (walletBalanceIn === 0n) return;
    setAmountIn(formatUnits((walletBalanceIn * BigInt(pct)) / 100n, decimalsIn));
  };

  const handleMax = () => setAmountIn(formatUnits(walletBalanceIn, decimalsIn));

  const handleFlip = () => { setIsBuying(p => !p); setAmountIn(''); };

  // ── Swap orchestrator ─────────────────────────────────────────────
  const handleStartFlow = async () => {
    if (!publicClient || !address || !amountInBigInt) return;
    setErrorReason(null);
    try {
      const liveAllowance = await publicClient.readContract({
        address: tokenIn, abi: erc20Abi, functionName: 'allowance', args: [address, routerAddr],
      }) as bigint;

      if (liveAllowance < amountInBigInt) {
        setStatus('approving');
        const approveHash = await writeContractAsync({
          address: tokenIn, abi: erc20Abi, functionName: 'approve', args: [routerAddr, MAX_UINT256],
        });
        setStatus('mining_approval');
        const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
        if (approveReceipt.status === 'reverted') throw new Error('Approval transaction reverted');
        refetchAllowance();
      }

      setStatus('swapping');
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const swapHash = await writeContractAsync({
        address: routerAddr,
        abi: UniswapV2RouterAbi,
        functionName: 'swapExactTokensForTokens',
        args: [amountInBigInt, amountOutMin, path, address, deadline],
      });

      setStatus('mining_swap');
      const swapReceipt = await publicClient.waitForTransactionReceipt({ hash: swapHash });
      if (swapReceipt.status === 'reverted') throw new Error('Swap transaction reverted on-chain');

      setStatus('success');
      refetchUsdc(); refetchRgd(); refetchAllowance();
      setTimeout(() => { setAmountIn(''); setStatus('idle'); }, 2500);

    } catch (err: any) {
      console.error('Swap error:', err);
      const reason = extractRevertReason(err);
      if (err.shortMessage?.includes('rejected') || err.message?.includes('User rejected')) {
        setStatus('canceled');
      } else if (err.message?.includes('insufficient funds') || err.name === 'InsufficientFundsError') {
        setStatus('no_gas');
      } else {
        setErrorReason(reason);
        setStatus('failed');
      }
      setTimeout(() => { setStatus('idle'); setErrorReason(null); }, 6000);
    }
  };

  // ── UI state ──────────────────────────────────────────────────────
  const isBusy = ['approving', 'mining_approval', 'swapping', 'mining_swap'].includes(status);
  const isSuccess = status === 'success';
  const isError = ['canceled', 'failed', 'no_gas'].includes(status);
  const insufficientBalance = amountInBigInt > 0n && walletBalanceIn < amountInBigInt;
  const isButtonDisabled = isBusy || isSuccess || isError || !amountIn || amountInBigInt === 0n || insufficientBalance;

  const getProgressWidth = () => {
    switch (status) {
      case 'approving':       return '15%';
      case 'mining_approval': return '40%';
      case 'swapping':        return '60%';
      case 'mining_swap':     return '85%';
      case 'success':         return '100%';
      default:                return '0%';
    }
  };

  const getButtonText = () => {
    if (status === 'approving')        return `Step 1/2: Approve ${symbolIn}…`;
    if (status === 'mining_approval')  return 'Step 1/2: Confirming…';
    if (status === 'swapping')         return 'Step 2/2: Confirm Swap…';
    if (status === 'mining_swap')      return 'Finalizing…';
    if (status === 'success')          return 'Swap Successful!';
    if (status === 'canceled')         return 'Canceled';
    if (status === 'no_gas')           return 'Insufficient Gas';
    if (status === 'failed')           return errorReason ? 'Transaction Failed — See Below' : 'Transaction Failed';
    if (!amountIn || amountInBigInt === 0n) return 'Enter an Amount';
    if (insufficientBalance)           return `Insufficient ${symbolIn}`;
    return `Swap ${symbolIn} for ${symbolOut}`;
  };

  const inputBase = 'bg-transparent border-none p-0 w-full font-mono font-bold text-text outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

  const btnStyle = isSuccess
    ? { background: 'var(--color-green)', color: 'var(--color-bg)', cursor: 'not-allowed' }
    : isError
    ? { background: 'var(--color-pink)', color: 'var(--color-bg)', cursor: 'not-allowed' }
    : isButtonDisabled
    ? { background: 'var(--color-card2)', color: 'var(--color-text2)', cursor: 'not-allowed' }
    : isBuying
    ? { background: 'linear-gradient(135deg, #6bcb6e, #4daa50)', color: 'var(--color-bg)', boxShadow: '0 4px 20px -6px var(--color-green-a50)' }
    : { background: 'linear-gradient(135deg, #ff7ab0, #ff3d8a)', color: 'var(--color-bg)', boxShadow: '0 4px 20px -6px var(--color-pink-a50)' };

  // ── Disconnected state ────────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="card-app flex flex-col items-center justify-center gap-4 w-full max-w-lg py-12"
        style={{ borderColor: 'var(--color-border-bright)' }}>
        <p className="font-mono text-sm" style={{ color: 'var(--color-text2)' }}>Connect your wallet to swap</p>
        <WalletButton />
      </div>
    );
  }

  return (
    <div className="card-app flex flex-col gap-3 w-full max-w-lg"
      style={{ borderColor: 'var(--color-border-bright)' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between pb-1">
        <span className="font-display font-bold text-base" style={{ color: 'var(--color-text)' }}>Swap</span>
        <span className="section-label">0.5% slippage</span>
      </div>

      {/* ── You Pay ── */}
      <div className="rounded-xl p-4 flex flex-col gap-3"
        style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between">
          <span className="section-label">You Pay</span>
          <button
            onClick={handleMax}
            disabled={isBusy || isSuccess || isError}
            className="font-mono text-[11px] font-semibold transition-colors hover:opacity-80 disabled:opacity-40"
            style={{ color: 'var(--color-gold)' }}>
            Bal: {Number(formatUnits(walletBalanceIn, decimalsIn)).toLocaleString(undefined, { maximumFractionDigits: 4 })} {symbolIn} · MAX
          </button>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={amountIn}
            onChange={e => setAmountIn(e.target.value)}
            className={`${inputBase} text-2xl`}
            placeholder="0.00"
            disabled={isBusy || isSuccess || isError}
          />
          <div className="shrink-0 font-mono font-bold text-sm px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--color-card2)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>
            {symbolIn}
          </div>
        </div>
        <PercentSlider value={sliderPct} onChange={handleSliderChange} disabled={isBusy || isSuccess || isError} />
      </div>

      {/* ── Flip button ── */}
      <div className="flex justify-center -my-1 z-10">
        <button
          onClick={handleFlip}
          disabled={isBusy || isSuccess || isError}
          className="w-9 h-9 rounded-full flex items-center justify-center font-mono text-base font-bold transition-all hover:brightness-110 disabled:opacity-40"
          style={{
            background: 'var(--color-card2)',
            border: '2px solid var(--color-border-bright)',
            color: 'var(--color-text2)',
          }}>
          ↕
        </button>
      </div>

      {/* ── You Receive ── */}
      <div className="rounded-xl p-4 flex flex-col gap-3"
        style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between">
          <span className="section-label">You Receive</span>
          <span className="font-mono text-[11px]" style={{ color: 'var(--color-text2)' }}>
            Bal: {Number(formatUnits(walletBalanceOut, decimalsOut)).toLocaleString(undefined, { maximumFractionDigits: 4 })} {symbolOut}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex-1 font-mono font-bold text-2xl ${quoteLoading && amountInBigInt > 0n ? 'animate-pulse' : ''}`}
            style={{
              color: estimatedOutput > 0n
                ? (isBuying ? 'var(--color-green)' : 'var(--color-pink)')
                : 'var(--color-text2)',
              fontVariantNumeric: 'tabular-nums',
            }}>
            {quoteLoading && amountInBigInt > 0n
              ? '…'
              : estimatedOutput > 0n
              ? `~${Number(formatUnits(estimatedOutput, decimalsOut)).toLocaleString(undefined, { maximumFractionDigits: 4 })}`
              : '0.00'}
          </div>
          <div className="shrink-0 font-mono font-bold text-sm px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--color-card2)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>
            {symbolOut}
          </div>
        </div>
      </div>

      {/* ── Rate info ── */}
      {exchangeRate !== null && (
        <div className="flex items-center justify-between px-1 pt-1"
          style={{ borderTop: '1px solid var(--color-border)' }}>
          <span className="font-mono text-[11px]" style={{ color: 'var(--color-text2)' }}>
            1 {symbolIn} ≈ <span style={{ color: 'var(--color-text)' }}>
              {exchangeRate!.toLocaleString(undefined, { maximumFractionDigits: 4 })}
            </span> {symbolOut}
          </span>
          <span className="font-mono text-[11px]" style={{ color: 'var(--color-text2)' }}>
            Min received: <span style={{ color: 'var(--color-text)' }}>
              {Number(formatUnits(amountOutMin, decimalsOut)).toLocaleString(undefined, { maximumFractionDigits: 4 })}
            </span> {symbolOut}
          </span>
        </div>
      )}

      {/* ── Error reason ── */}
      {errorReason && (
        <div className="rounded-lg px-3 py-2 font-mono text-[11px] break-all"
          style={{ background: 'var(--color-pink-a10)', color: 'var(--color-pink)', border: '1px solid var(--color-pink-a25)' }}>
          {errorReason}
        </div>
      )}

      {/* ── CTA Button ── */}
      <div className="relative rounded-xl overflow-hidden mt-1">
        {status !== 'idle' && !isError && (
          <div className="absolute inset-y-0 left-0 transition-all duration-500"
            style={{
              width: getProgressWidth(),
              background: status === 'success'
                ? 'var(--color-green)'
                : isBuying ? 'rgba(107,203,110,0.3)' : 'rgba(255,122,176,0.3)',
            }} />
        )}
        <button
          disabled={isButtonDisabled}
          onClick={handleStartFlow}
          className="relative z-10 w-full py-4 font-display font-bold text-[15px] uppercase tracking-wide flex items-center justify-center gap-2 transition-all rounded-xl"
          style={btnStyle}>
          {isBusy && <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />}
          {getButtonText()}
        </button>
      </div>
    </div>
  );
}
