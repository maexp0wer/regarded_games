'use client';

import React, { useState, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits, erc20Abi } from 'viem';
import { useQuery } from '@tanstack/react-query';

import { WalletButton } from './WalletButton';
import PercentSlider from '@/app/app/_components/PercentSlider';
import { sliderPctToAmount } from '@/utils/sliderAmount';
import { clampDecimals } from '@/utils/clampDecimals';
import { useButtonHold } from '@/hooks/useButtonHold';

import UniswapV2RouterAbi from '@/deployments/abis/UniswapV2Router.json';
import MockUniswapV2RouterAbi from '@/deployments/abis/MockUniswapV2Router.json';
import { useTenantDeployment, useTenantChainId, useTenantKey } from '@/context/TenantContext';
import { TxModal } from './TxModal';
import { extractRevertReason } from '@/utils/txErrors';
import { isUserRejection, isInsufficientGas } from '@/utils/revertReason';
import type { Abi } from 'abitype';

type WorkflowStep = 'idle' | 'approving' | 'mining_approval' | 'swapping' | 'mining_swap' | 'success' | 'canceled' | 'failed' | 'no_gas';
type TokenInfo = { address: `0x${string}`; symbol: string; decimals: number };

const MAX_UINT256 = 115792089237316195423570985008687907853269984665640564039457584007913129639935n;

const SLIPPAGE_PRESETS: { label: string; bps: bigint }[] = [
  { label: '0.1%', bps: 10n },
  { label: '0.5%', bps: 50n },
  { label: '1%',   bps: 100n },
  { label: '3%',   bps: 300n },
];

const MockUniswapV2RouterAbiTyped = MockUniswapV2RouterAbi as Abi;

// ── SwapMask ──────────────────────────────────────────────────────────────────
export function SwapMask() {
  const { address, isConnected } = useAccount();
  const chainId = useTenantChainId();
  const publicClient = usePublicClient({ chainId });
  const { writeContractAsync } = useWriteContract();
  const core = useTenantDeployment();
  const tenantKey = useTenantKey();
  const isMock = tenantKey === 'sepolia';
  const routerAbi = isMock ? MockUniswapV2RouterAbiTyped : (UniswapV2RouterAbi as Abi);

  const RGD_TOKEN:  TokenInfo = useMemo(() => ({ address: core.RGD  as `0x${string}`, symbol: 'RGD',  decimals: 18 }), [core.RGD]);
  const USDC_TOKEN: TokenInfo = useMemo(() => ({ address: core.USDC as `0x${string}`, symbol: 'USDC', decimals: 6  }), [core.USDC]);

  const [amountIn, setAmountIn]   = useState('');
  const [isBuying, setIsBuying]   = useState(true); // true = USDC→RGD, false = RGD→USDC
  const [status, setStatus]       = useState<WorkflowStep>('idle');
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [txHashes, setTxHashes]   = useState<(string | null)[]>([null, null]);

  // ── Slippage ──────────────────────────────────────────────────────
  const [slippageBps, setSlippageBps]   = useState(50n);
  const [showSettings, setShowSettings] = useState(false);
  const [customSlippage, setCustomSlippage] = useState('');

  const routerAddr = core.Router as `0x${string}`;

  // Derived token in/out — always USDC ↔ RGD
  const tokenIn  = isBuying ? USDC_TOKEN : RGD_TOKEN;
  const tokenOut = isBuying ? RGD_TOKEN  : USDC_TOKEN;

  const amountInBigInt = useMemo(() => {
    try { return amountIn ? parseUnits(amountIn, tokenIn.decimals) : 0n; }
    catch { return 0n; }
  }, [amountIn, tokenIn.decimals]);

  // ── Balances ──────────────────────────────────────────────────────
  const { data: rgdBalance,   refetch: refetchRgd   } = useReadContract({
    address: RGD_TOKEN.address, abi: erc20Abi, functionName: 'balanceOf',
    args: [address!],
    chainId,
    query: { enabled: !!address, refetchInterval: 5000 },
  });
  const { data: usdcBalance, refetch: refetchUsdc } = useReadContract({
    address: USDC_TOKEN.address, abi: erc20Abi, functionName: 'balanceOf',
    args: [address!],
    chainId,
    query: { enabled: !!address, refetchInterval: 5000 },
  });
  const { refetch: refetchAllowance } = useReadContract({
    address: tokenIn.address, abi: erc20Abi, functionName: 'allowance',
    args: [address!, routerAddr],
    chainId,
    query: { enabled: !!address },
  });

  const walletBalanceIn  = ((isBuying ? usdcBalance : rgdBalance) ?? 0n) as bigint;
  const walletBalanceOut = ((isBuying ? rgdBalance  : usdcBalance) ?? 0n) as bigint;

  // ── Route discovery + quote ───────────────────────────────────────
  const { data: routeData, isLoading: quoteLoading } = useQuery({
    queryKey: ['swap-route', tenantKey, tokenIn.address, tokenOut.address, amountInBigInt.toString()],
    queryFn: async () => {
      if (!amountInBigInt || !publicClient) return null;

      if (isMock) {
        const path: `0x${string}`[] = [tokenIn.address, tokenOut.address];
        const [reserveIn, reserveOut] = await Promise.all([
          publicClient.readContract({
            address: tokenIn.address, abi: erc20Abi, functionName: 'balanceOf', args: [routerAddr],
          }) as Promise<bigint>,
          publicClient.readContract({
            address: tokenOut.address, abi: erc20Abi, functionName: 'balanceOf', args: [routerAddr],
          }) as Promise<bigint>,
        ]);
        if (reserveIn === 0n || reserveOut === 0n) return null;
        const amountOut = (amountInBigInt * reserveOut) / (reserveIn + amountInBigInt);
        const spotOut   = reserveOut / reserveIn;
        return { path, amounts: [amountInBigInt, amountOut], spotAmounts: [1n, spotOut] };
      }

      const candidates: `0x${string}`[][] = [
        [tokenIn.address, tokenOut.address],
      ].filter(p => new Set(p).size === p.length);

      for (const path of candidates) {
        try {
          const amounts = await publicClient.readContract({
            address: routerAddr,
            abi: UniswapV2RouterAbi as Abi,
            functionName: 'getAmountsOut',
            args: [amountInBigInt, path],
          }) as bigint[];
          if (amounts[amounts.length - 1] > 0n) {
            const spotAmounts = await publicClient.readContract({
              address: routerAddr,
              abi: UniswapV2RouterAbi as Abi,
              functionName: 'getAmountsOut',
              args: [1n, path],
            }) as bigint[];
            return { path, amounts, spotAmounts };
          }
        } catch {}
      }
      return null;
    },
    enabled: amountInBigInt > 0n && !!publicClient,
    refetchInterval: 5000,
  });

  const estimatedOutput = routeData?.amounts[routeData.amounts.length - 1] ?? 0n;
  const amountOutMin = estimatedOutput > 0n
    ? (estimatedOutput * (10000n - slippageBps)) / 10000n
    : 0n;
  const activePath = routeData?.path ?? null;

  const exchangeRate = useMemo(() => {
    if (!estimatedOutput || amountInBigInt === 0n) return null;
    const inNorm  = Number(formatUnits(amountInBigInt, tokenIn.decimals));
    const outNorm = Number(formatUnits(estimatedOutput, tokenOut.decimals));
    return inNorm > 0 ? outNorm / inNorm : null;
  }, [estimatedOutput, amountInBigInt, tokenIn.decimals, tokenOut.decimals]);

  const priceImpact = useMemo(() => {
    if (!routeData?.spotAmounts || !estimatedOutput || amountInBigInt === 0n) return null;
    const spotOut = routeData.spotAmounts[routeData.spotAmounts.length - 1];
    if (spotOut === 0n) return null;
    const spotRate   = Number(formatUnits(spotOut, tokenOut.decimals)) / Number(formatUnits(1n, tokenIn.decimals));
    const actualRate = Number(formatUnits(estimatedOutput, tokenOut.decimals)) / Number(formatUnits(amountInBigInt, tokenIn.decimals));
    return ((spotRate - actualRate) / spotRate) * 100;
  }, [routeData, estimatedOutput, amountInBigInt, tokenIn.decimals, tokenOut.decimals]);

  // ── Slippage helpers ──────────────────────────────────────────────
  const handleCustomSlippage = (val: string) => {
    setCustomSlippage(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0 && num <= 50) setSlippageBps(BigInt(Math.round(num * 100)));
  };

  // Press-and-hold stepping for the ▲/▼ steppers (matches OrderBook filter inputs).
  // `mult` accelerates a sustained hold (×10 after 20 increments). Amount steps by
  // 1 via the functional updater; custom slippage by 0.1.
  // Restrict typed/stepped precision to the input token's decimals (USDC 6, RGD 18).
  const setAmountInClamped = (v: string) => setAmountIn(clampDecimals(v, tokenIn.decimals));
  const amountInHold = useButtonHold((mult, dir: 1 | -1) =>
    setAmountIn(v => clampDecimals(String(Math.max(0, parseFloat(v || '0') + dir * mult)), tokenIn.decimals)),
  );
  const slippageHold = useButtonHold((mult, dir: 1 | -1) =>
    handleCustomSlippage(String(Math.max(0, parseFloat((parseFloat(customSlippage || '0') + dir * 0.1 * mult).toFixed(1))))),
  );

  const isPresetActive = (bps: bigint) => slippageBps === bps && !customSlippage;

  // ── Slider ────────────────────────────────────────────────────────
  const sliderPct = useMemo(() => {
    if (!amountIn || walletBalanceIn === 0n) return 0;
    try {
      const raw = parseUnits(amountIn, tokenIn.decimals);
      return Math.min(100, Math.max(0, Number((raw * 10000n) / walletBalanceIn) / 100));
    } catch { return 0; }
  }, [amountIn, walletBalanceIn, tokenIn.decimals]);

  const handleSliderChange = (pct: number) => {
    if (walletBalanceIn === 0n) return;
    setAmountIn(sliderPctToAmount(pct, Number(formatUnits(walletBalanceIn, tokenIn.decimals))));
  };

  const handleMax  = () => setAmountIn(formatUnits(walletBalanceIn, tokenIn.decimals));
  const handleFlip = () => { setIsBuying(p => !p); setAmountIn(''); };

  // ── Swap orchestrator ─────────────────────────────────────────────
  const handleStartFlow = async () => {
    if (!publicClient || !address || !amountInBigInt || !activePath) return;
    setErrorReason(null);
    setTxHashes([null, null]);
    try {
      const liveAllowance = await publicClient.readContract({
        address: tokenIn.address, abi: erc20Abi, functionName: 'allowance', args: [address, routerAddr],
      }) as bigint;

      let approveHash: string | null = null;
      if (liveAllowance < amountInBigInt) {
        setStatus('approving');
        approveHash = await writeContractAsync({
          address: tokenIn.address, abi: erc20Abi, functionName: 'approve', args: [routerAddr, MAX_UINT256],
        });
        setStatus('mining_approval');
        const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash as `0x${string}` });
        if (approveReceipt.status === 'reverted') throw new Error('Approval transaction reverted');
        setTxHashes([approveHash, null]);
        refetchAllowance();
      }

      setStatus('swapping');
      const latestBlock = await publicClient.getBlock({ blockTag: 'latest' });
      const deadline = latestBlock.timestamp + 3600n;
      const swapHash = await writeContractAsync({
        address: routerAddr,
        abi: routerAbi,
        functionName: 'swapExactTokensForTokens',
        args: [amountInBigInt, amountOutMin, activePath, address, deadline],
      });

      setStatus('mining_swap');
      const swapReceipt = await publicClient.waitForTransactionReceipt({ hash: swapHash });
      if (swapReceipt.status === 'reverted') throw new Error('Swap transaction reverted on-chain');
      setTxHashes([approveHash, swapHash]);

      setStatus('success');
      refetchRgd(); refetchUsdc(); refetchAllowance();
      setTimeout(() => { setAmountIn(''); setStatus('idle'); setTxHashes([null, null]); }, 2500);

    } catch (err: unknown) {
      console.error('Swap error:', err);
      if (isUserRejection(err)) {
        setStatus('canceled');
        setTimeout(() => setStatus('idle'), 2000);
      } else if (isInsufficientGas(err)) {
        setStatus('no_gas');
      } else {
        setErrorReason(extractRevertReason(err));
        setStatus('failed');
      }
    }
  };

  // ── UI state ──────────────────────────────────────────────────────
  const isBusy   = ['approving', 'mining_approval', 'swapping', 'mining_swap'].includes(status);
  const isSuccess = status === 'success';
  const isError   = ['canceled', 'failed', 'no_gas'].includes(status);
  const insufficientBalance = amountInBigInt > 0n && walletBalanceIn < amountInBigInt;
  const noRoute = amountInBigInt > 0n && !quoteLoading && !routeData;
  const isButtonDisabled = isBusy || isSuccess || isError || !amountIn || amountInBigInt === 0n || insufficientBalance || noRoute || !activePath;

  const slippagePct = (Number(slippageBps) / 100).toString().replace(/\.?0+$/, '');

  const getButtonText = () => {
    if (!amountIn || amountInBigInt === 0n) return 'Enter an Amount';
    if (insufficientBalance)           return `Insufficient ${tokenIn.symbol}`;
    if (noRoute)                       return 'No Route Found';
    return `Swap ${tokenIn.symbol} for ${tokenOut.symbol}`;
  };

  // ── Disconnected state ────────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="terminal-pane connect-gate w-96">
        <div className="terminal-pane-header">
          <span className="terminal-pane-title">Swap</span>
        </div>
        <div className="connect-gate-body">
          <span className="terminal-pane-title text-text2">Connect your wallet to participate</span>
          <WalletButton />
        </div>
      </div>
    );
  }

  return (
    <div className="terminal-pane bg-card! flex flex-col gap-0 min-h-0 p-0! w-96">

      {/* Header strip */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <span className="terminal-pane-title">Swap</span>
        <button
          onClick={() => setShowSettings(p => !p)}
          className="font-mono text-[11px] font-semibold px-2 py-1 rounded-lg transition-all bg-card2 border border-border text-text hover:bg-card3 hover:border-border2 active:scale-[0.98]">
          ⚙ {slippagePct}%
        </button>
      </div>

      <div className="flex flex-col gap-4 flex-1 min-h-0 p-4">

      {/* ── Slippage settings panel ── */}
      {showSettings && (
        <div className="rounded-lg p-3 flex flex-col gap-2 bg-card2 border border-border">
          <span className="section-label">Slippage Tolerance</span>
          <div className="flex items-center gap-2 flex-wrap">
            {SLIPPAGE_PRESETS.map(({ label, bps }) => (
              <button key={label}
                onClick={() => { setSlippageBps(bps); setCustomSlippage(''); }}
                className={`font-mono text-xs font-bold px-3 py-1.5 rounded-lg transition-all border ${
                  isPresetActive(bps)
                    ? 'bg-text text-bg border-text'
                    : 'bg-card3 text-text2 border-border'
                }`}>
                {label}
              </button>
            ))}
            <div className={`group flex items-center gap-1 rounded-lg px-2 py-1 border bg-card3 ${
              customSlippage ? 'border-border2' : 'border-border'
            }`}>
              <input
                type="number"
                value={customSlippage}
                onChange={e => handleCustomSlippage(e.target.value)}
                placeholder="Custom"
                className="bg-transparent border-none font-mono text-xs w-16 outline-none text-text no-spinners"
              />
              <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button type="button" tabIndex={-1} className="btn-stepper select-none" {...slippageHold.bind(1)}>▲</button>
                <button type="button" tabIndex={-1} className="btn-stepper select-none" {...slippageHold.bind(-1)}>▼</button>
              </div>
              <span className="font-mono text-xs text-text2">%</span>
            </div>
          </div>
          {slippageBps > 100n && (
            <p className="font-mono text-[11px] text-gold">
              High slippage — your transaction may be frontrun
            </p>
          )}
        </div>
      )}

      {/* ── You Pay ── */}
      <div className="pt-5 flex flex-col gap-1 shrink-0">
        <div className="flex justify-between items-center w-full">
          <span className="mask-label text-left pl-2">
            WALLET&nbsp;
            <span className="text-text font-semibold">
              {Number(formatUnits(walletBalanceIn, tokenIn.decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 })} {tokenIn.symbol}
            </span>
          </span>
          <button
            onClick={handleMax}
            disabled={isBusy || isSuccess || isError}
            className="mask-label text-right pr-2 hover:opacity-80 disabled:opacity-40 text-gold">
            MAX
          </button>
        </div>
        <div className="group flex items-center gap-2 bg-card3 border border-border2 rounded p-2">
          <span className="text-lg font-mono font-bold text-text2 shrink-0">{tokenIn.symbol}</span>
          <input
            type="number"
            value={amountIn}
            onChange={e => setAmountInClamped(e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-input font-mono text-text outline-none placeholder:text-text2/40 tabular-nums no-spinners text-right"
            placeholder="0.00"
            disabled={isBusy || isSuccess || isError}
          />
          <div className="flex flex-col gap-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button type="button" tabIndex={-1} className="btn-stepper select-none" disabled={isBusy || isSuccess || isError} {...amountInHold.bind(1)}>▲</button>
            <button type="button" tabIndex={-1} className="btn-stepper select-none" disabled={isBusy || isSuccess || isError} {...amountInHold.bind(-1)}>▼</button>
          </div>
        </div>
        <PercentSlider value={sliderPct} onChange={handleSliderChange} disabled={isBusy || isSuccess || isError} />
      </div>

      {/* ── Flip button ── */}
      <div className="flex justify-center z-10">
        <button
          onClick={handleFlip}
          disabled={isBusy || isSuccess || isError}
          className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-sm font-bold transition-all hover:brightness-110 disabled:opacity-40 bg-card2 border border-border2 text-text2">
          ↕
        </button>
      </div>

      {/* ── You Receive ── */}
      <div className="flex flex-col gap-1 shrink-0">
        <div className="flex justify-between items-center w-full">
          <span className="mask-label text-left pl-2">
            WALLET&nbsp;
            <span className="text-text font-semibold">
              {Number(formatUnits(walletBalanceOut, tokenOut.decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 })} {tokenOut.symbol}
            </span>
          </span>
          <span className="mask-label text-right pr-2">RECEIVE</span>
        </div>
        <div className="group flex items-center gap-2 bg-card3 border border-border2 rounded p-2">
          <span className="text-lg font-mono font-bold text-text2 shrink-0">{tokenOut.symbol}</span>
          <div className={`flex-1 font-mono font-bold text-input tabular-nums text-right ${quoteLoading && amountInBigInt > 0n ? 'animate-pulse' : ''} ${
            estimatedOutput > 0n
              ? (isBuying ? 'text-green' : 'text-red')
              : noRoute ? 'text-red' : 'text-text2'
          }`}>
            {quoteLoading && amountInBigInt > 0n
              ? '…'
              : estimatedOutput > 0n
              ? `~${Number(formatUnits(estimatedOutput, tokenOut.decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 })}`
              : noRoute ? 'No route' : '0.00'}
          </div>
        </div>
      </div>

      {/* ── Position breakdown (rate + price impact) ── */}
      {(exchangeRate !== null || priceImpact !== null) && (
        <div className="rounded-lg flex flex-col bg-card border border-border overflow-hidden">
          {exchangeRate !== null && (
            <div className="flex justify-between font-mono text-xs font-bold tabular-nums px-3 py-2.5 border-b border-border text-text2">
              <span>Rate</span>
              <span className="text-text">
                1 {tokenIn.symbol} ≈ {exchangeRate.toLocaleString(undefined, { maximumFractionDigits: 4 })} {tokenOut.symbol}
              </span>
            </div>
          )}
          {amountOutMin > 0n && (
            <div className="flex justify-between font-mono text-xs font-bold px-3 py-2.5 border-b border-border text-text2">
              <span>Min Received</span>
              <span className="text-text tabular-nums">
                {Number(formatUnits(amountOutMin, tokenOut.decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 })} {tokenOut.symbol}
              </span>
            </div>
          )}
          {priceImpact !== null && (
            <div className="flex justify-between font-mono text-xs font-bold px-3 py-2.5 text-text2">
              <span>Price Impact</span>
              <span className={`tabular-nums ${
                priceImpact < 1 ? 'text-green' : priceImpact < 3 ? 'text-gold' : 'text-red'
              }`}>
                {priceImpact < 0.01 ? '< 0.01%' : `${priceImpact.toFixed(2)}%`}
              </span>
            </div>
          )}
          {priceImpact !== null && priceImpact >= 5 && (
            <div className="px-3 py-2 border-t border-border">
              <p className="font-mono text-[11px] text-red">
                Very high price impact — you may receive significantly less than expected
              </p>
            </div>
          )}
        </div>
      )}

      </div>

      {/* ── CTA pinned to footer ── */}
      <div className="mt-auto pt-3 flex flex-col gap-3 border-t border-border p-4">
        <button
          disabled={isButtonDisabled}
          onClick={handleStartFlow}
          className={`btn-terminal-action ${isBuying ? 'action-buy' : 'action-sell'} gap-2`}>
          {isBusy && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
          {getButtonText()}
        </button>
      </div>

      {/* ── Transaction Modal ── */}
      <TxModal
        status={status}
        txHashes={txHashes}
        title={isBuying ? 'Buying RGD' : 'Selling RGD'}
        successTitle={isBuying ? 'RGD Purchased' : 'RGD Sold'}
        errorReason={errorReason}
        steps={[
          {
            label: 'Approve Spending',
            description: `Allow contract to use your ${tokenIn.symbol}`,
            activeStatuses: ['approving', 'mining_approval'],
            completeStatuses: ['swapping', 'mining_swap', 'success'],
          },
          {
            label: 'Confirm Swap',
            description: 'Sign the swap transaction',
            activeStatuses: ['swapping', 'mining_swap'],
            completeStatuses: ['success'],
          },
        ]}
        onClose={() => { setAmountIn(''); setStatus('idle'); setErrorReason(null); setTxHashes([null, null]); }}
      />
    </div>
  );
}
