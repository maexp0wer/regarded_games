'use client';

import React, { useState, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits, erc20Abi, isAddress } from 'viem';
import { useQuery } from '@tanstack/react-query';

import { WalletButton } from './WalletButton';
import PercentSlider from '@/components/PercentSlider';
import { sliderPctToAmount } from '@/utils/sliderAmount';

import UniswapV2RouterAbi from '@/deployments/abis/UniswapV2Router.json';
import MockUniswapV2RouterAbi from '@/deployments/abis/MockUniswapV2Router.json';
import { useTenantDeployment, useTenantChainId, useTenantKey } from '@/context/TenantContext';
import { TxModal } from './TxModal';
import { extractRevertReason } from '@/utils/txErrors';

type WorkflowStep = 'idle' | 'approving' | 'mining_approval' | 'swapping' | 'mining_swap' | 'success' | 'canceled' | 'failed' | 'no_gas';
type TokenInfo = { address: `0x${string}`; symbol: string; decimals: number };

const MAX_UINT256 = 115792089237316195423570985008687907853269984665640564039457584007913129639935n;

const SLIPPAGE_PRESETS: { label: string; bps: bigint }[] = [
  { label: '0.1%', bps: 10n },
  { label: '0.5%', bps: 50n },
  { label: '1%',   bps: 100n },
  { label: '3%',   bps: 300n },
];

// ── Token dropdown ────────────────────────────────────────────────────────────
interface TokenDropdownProps {
  knownTokens: TokenInfo[];
  selected: TokenInfo;
  onSelect: (t: TokenInfo) => void;
  onClose: () => void;
  customAddr: string;
  onCustomAddrChange: (v: string) => void;
  onCustomAdd: () => void;
  customLoading: boolean;
  customError: string | null;
}

function TokenDropdown({
  knownTokens, selected, onSelect, onClose,
  customAddr, onCustomAddrChange, onCustomAdd, customLoading, customError,
}: TokenDropdownProps) {
  return (
    <>
      {/* backdrop */}
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-10 z-20 rounded-lg p-3 flex flex-col gap-2 min-w-52.5"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border2)', boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}>
        <span className="section-label">Select Token</span>
        {knownTokens.map(t => (
          <button key={t.address}
            onClick={() => { onSelect(t); onClose(); }}
            className="font-mono text-sm font-bold px-3 py-2 rounded-lg text-left transition-all hover:opacity-80"
            style={{
              background: selected.address === t.address ? 'var(--color-gold-15)' : 'var(--color-card2)',
              color: 'var(--color-text)',
              border: '1px solid ' + (selected.address === t.address ? 'var(--color-gold-35)' : 'var(--color-border)'),
            }}>
            {t.symbol}
            <span className="font-normal text-[10px] ml-2" style={{ color: 'var(--color-text2)' }}>
              {t.address.slice(0, 6)}…{t.address.slice(-4)}
            </span>
          </button>
        ))}
        <div className="flex flex-col gap-1.5 pt-1" style={{ borderTop: '1px solid var(--color-border)' }}>
          <span className="section-label pt-1">Custom address</span>
          <div className="flex gap-1.5">
            <input
              value={customAddr}
              onChange={e => onCustomAddrChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onCustomAdd()}
              placeholder="0x…"
              className="flex-1 font-mono text-[11px] outline-none min-w-0 px-2 py-1.5 rounded"
              style={{ background: 'var(--color-card2)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
            />
            <button onClick={onCustomAdd} disabled={customLoading}
              className="font-mono text-[11px] font-bold px-2 py-1 rounded transition-all hover:opacity-80 disabled:opacity-40"
              style={{ background: 'var(--color-primary)', color: 'var(--color-bg)' }}>
              {customLoading ? '…' : 'Add'}
            </button>
          </div>
          {customError && (
            <p className="font-mono text-[10px] text-red">{customError}</p>
          )}
        </div>
      </div>
    </>
  );
}

// ── SwapMask ──────────────────────────────────────────────────────────────────
export function SwapMask() {
  const { address, isConnected } = useAccount();
  const chainId = useTenantChainId();
  const publicClient = usePublicClient({ chainId });
  const { writeContractAsync } = useWriteContract();
  const core = useTenantDeployment();
  const tenantKey = useTenantKey();
  const isMock = tenantKey === 'sepolia';
  const routerAbi = isMock ? MockUniswapV2RouterAbi : UniswapV2RouterAbi;

  const RGD_TOKEN:  TokenInfo = useMemo(() => ({ address: core.RGD  as `0x${string}`, symbol: 'RGD',  decimals: 18 }), [core.RGD]);
  const USDC_TOKEN: TokenInfo = useMemo(() => ({ address: core.USDC as `0x${string}`, symbol: 'USDC', decimals: 6  }), [core.USDC]);

  const [amountIn, setAmountIn]   = useState('');
  const [isBuying, setIsBuying]   = useState(true); // true = otherToken→RGD, false = RGD→otherToken
  const [status, setStatus]       = useState<WorkflowStep>('idle');
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [txHashes, setTxHashes]   = useState<(string | null)[]>([null, null]);

  // ── Slippage ──────────────────────────────────────────────────────
  const [slippageBps, setSlippageBps]   = useState(50n);
  const [showSettings, setShowSettings] = useState(false);
  const [customSlippage, setCustomSlippage] = useState('');

  // ── Token selection ───────────────────────────────────────────────
  const [otherToken, setOtherToken]         = useState<TokenInfo>(USDC_TOKEN);
  const [showTokenSelect, setShowTokenSelect] = useState(false);
  const [customTokenAddr, setCustomTokenAddr] = useState('');
  const [customTokenError, setCustomTokenError] = useState<string | null>(null);
  const [customTokenLoading, setCustomTokenLoading] = useState(false);

  const routerAddr = core.Router as `0x${string}`;

  // Read WETH address from router (static — never changes).
  // Mock router has no WETH() — skip on sepolia.
  const { data: wethAddress } = useReadContract({
    address: routerAddr,
    abi: UniswapV2RouterAbi,
    functionName: 'WETH',
    chainId,
    query: { enabled: !isMock, staleTime: Infinity },
  });

  const wethToken: TokenInfo | null = useMemo(
    () => wethAddress ? { address: wethAddress as `0x${string}`, symbol: 'WETH', decimals: 18 } : null,
    [wethAddress],
  );

  const knownTokens: TokenInfo[] = useMemo(
    () => [USDC_TOKEN, ...(wethToken ? [wethToken] : [])],
    [wethToken],
  );

  // Derived token in/out
  const tokenIn  = isBuying ? otherToken : RGD_TOKEN;
  const tokenOut = isBuying ? RGD_TOKEN  : otherToken;

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
  const { data: otherBalance, refetch: refetchOther } = useReadContract({
    address: otherToken.address, abi: erc20Abi, functionName: 'balanceOf',
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

  const walletBalanceIn  = ((isBuying ? otherBalance : rgdBalance)  ?? 0n) as bigint;
  const walletBalanceOut = ((isBuying ? rgdBalance   : otherBalance) ?? 0n) as bigint;

  // ── Route discovery + quote ───────────────────────────────────────
  // Mainnet: try Uniswap V2 paths via getAmountsOut.
  // Sepolia (Mock router): read RGD/USDC balances of the router itself
  // (the Mock holds both tokens as its pool) and compute x*y=k locally.
  const { data: routeData, isLoading: quoteLoading } = useQuery({
    queryKey: ['swap-route', tenantKey, tokenIn.address, tokenOut.address, amountInBigInt.toString(), String(wethAddress)],
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
        const spotOut   = reserveOut / reserveIn; // marginal rate, may be 0 if reserveIn > reserveOut
        return { path, amounts: [amountInBigInt, amountOut], spotAmounts: [1n, spotOut] };
      }

      const candidates: `0x${string}`[][] = [
        [tokenIn.address, tokenOut.address],
        [tokenIn.address, USDC_TOKEN.address, tokenOut.address],
        ...(wethAddress ? [[tokenIn.address, wethAddress as `0x${string}`, tokenOut.address]] : []),
      ].filter(p => new Set(p).size === p.length); // drop paths with duplicate hops

      for (const path of candidates) {
        try {
          const amounts = await publicClient.readContract({
            address: routerAddr,
            abi: UniswapV2RouterAbi,
            functionName: 'getAmountsOut',
            args: [amountInBigInt, path],
          }) as bigint[];
          if (amounts[amounts.length - 1] > 0n) {
            // 1-wei quote on the same path gives the marginal (spot) price with no impact
            const spotAmounts = await publicClient.readContract({
              address: routerAddr,
              abi: UniswapV2RouterAbi,
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
    // Normalise to floats so decimal differences between tokens cancel out
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

  const isPresetActive = (bps: bigint) => slippageBps === bps && !customSlippage;

  // ── Custom token lookup ───────────────────────────────────────────
  const handleCustomToken = async () => {
    if (!publicClient || !isAddress(customTokenAddr)) {
      setCustomTokenError('Invalid address');
      return;
    }
    const addr = customTokenAddr.toLowerCase() as `0x${string}`;
    if (addr === RGD_TOKEN.address.toLowerCase()) {
      setCustomTokenError('Cannot pair RGD with RGD');
      return;
    }
    setCustomTokenLoading(true);
    setCustomTokenError(null);
    try {
      const [symbol, decimals] = await Promise.all([
        publicClient.readContract({ address: addr, abi: erc20Abi, functionName: 'symbol' }) as Promise<string>,
        publicClient.readContract({ address: addr, abi: erc20Abi, functionName: 'decimals' }) as Promise<number>,
      ]);
      setOtherToken({ address: addr, symbol, decimals });
      setShowTokenSelect(false);
      setCustomTokenAddr('');
      setAmountIn('');
    } catch {
      setCustomTokenError('Could not read token — check address');
    } finally {
      setCustomTokenLoading(false);
    }
  };

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
  const handleFlip = () => { setIsBuying(p => !p); setAmountIn(''); setShowTokenSelect(false); };

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
      refetchRgd(); refetchOther(); refetchAllowance();
      setTimeout(() => { setAmountIn(''); setStatus('idle'); setTxHashes([null, null]); }, 2500);

    } catch (err: any) {
      console.error('Swap error:', err);
      if (err.shortMessage?.includes('rejected') || err.message?.includes('User rejected')) {
        setStatus('canceled');
        setTimeout(() => setStatus('idle'), 2000);
      } else if (err.message?.includes('insufficient funds') || err.name === 'InsufficientFundsError') {
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

  const inputBase = 'bg-transparent border-none p-0 w-full font-mono font-bold text-text outline-none focus:ring-0 no-spinners';


  const TokenBadge = ({ token, onClick, disabled }: { token: TokenInfo; onClick?: () => void; disabled?: boolean }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="shrink-0 font-mono font-bold text-sm px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all hover:opacity-80 disabled:opacity-100 disabled:cursor-default"
      style={{ background: 'var(--color-card2)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>
      {token.symbol}
      {!disabled && <span style={{ color: 'var(--color-text2)', fontSize: '9px' }}>▼</span>}
    </button>
  );

  // Shared token selector dropdown props
  const dropdownProps = {
    knownTokens,
    selected: otherToken,
    onSelect: (t: TokenInfo) => { setOtherToken(t); setAmountIn(''); },
    onClose: () => { setShowTokenSelect(false); setCustomTokenError(null); },
    customAddr: customTokenAddr,
    onCustomAddrChange: (v: string) => { setCustomTokenAddr(v); setCustomTokenError(null); },
    onCustomAdd: handleCustomToken,
    customLoading: customTokenLoading,
    customError: customTokenError,
  };

  // ── Disconnected state ────────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="terminal-pane connect-gate w-full">
        <div className="terminal-pane-header">
          <span className="terminal-pane-title">Swap</span>
        </div>
        <div className="connect-gate-body">
          <span className="terminal-pane-title" style={{ color: 'var(--color-text2)' }}>Connect your wallet to participate</span>
          <WalletButton />
        </div>
      </div>
    );
  }

  return (
    <div className="terminal-pane flex flex-col gap-3 w-full max-w-lg border-border2">

      {/* ── Header ── */}
      <div className="flex items-center justify-between pb-1">
        <span className="font-display font-bold text-base" style={{ color: 'var(--color-text)' }}>Swap</span>
        <button
          onClick={() => setShowSettings(p => !p)}
          className="font-mono text-[11px] font-semibold flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all hover:opacity-80"
          style={{
            color: 'var(--color-text)',
            background: showSettings ? 'var(--color-card2)' : 'transparent',
            border: '1px solid ' + (showSettings ? 'var(--color-border)' : 'transparent'),
          }}>
          ⚙ {slippagePct}% slippage
        </button>
      </div>

      {/* ── Slippage settings panel ── */}
      {showSettings && (
        <div className="rounded-lg p-3 flex flex-col gap-2"
          style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
          <span className="section-label">Slippage Tolerance</span>
          <div className="flex items-center gap-2 flex-wrap">
            {SLIPPAGE_PRESETS.map(({ label, bps }) => (
              <button key={label}
                onClick={() => { setSlippageBps(bps); setCustomSlippage(''); }}
                className="font-mono text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: isPresetActive(bps) ? 'var(--color-text)' : 'var(--color-card2)',
                  color: isPresetActive(bps) ? 'var(--color-bg)' : 'var(--color-text2)',
                  border: '1px solid ' + (isPresetActive(bps) ? 'var(--color-text)' : 'var(--color-border)'),
                }}>
                {label}
              </button>
            ))}
            <div className="group flex items-center gap-1 rounded-lg px-2 py-1"
              style={{ border: '1px solid ' + (customSlippage ? 'var(--color-primary)' : 'var(--color-border)'), background: 'var(--color-card2)' }}>
              <input
                type="number"
                value={customSlippage}
                onChange={e => handleCustomSlippage(e.target.value)}
                placeholder="Custom"
                className="bg-transparent border-none font-mono text-xs w-16 outline-none no-spinners"
                style={{ color: 'var(--color-text)' }}
              />
              <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="btn-stepper" onClick={() => handleCustomSlippage(String(parseFloat((parseFloat(customSlippage || '0') + 0.1).toFixed(1))))}>▲</button>
                <button className="btn-stepper" onClick={() => handleCustomSlippage(String(Math.max(0, parseFloat((parseFloat(customSlippage || '0') - 0.1).toFixed(1)))))}>▼</button>
              </div>
              <span className="font-mono text-xs" style={{ color: 'var(--color-text2)' }}>%</span>
            </div>
          </div>
          {slippageBps > 100n && (
            <p className="font-mono text-[11px]" style={{ color: 'var(--color-gold)' }}>
              High slippage — your transaction may be frontrun
            </p>
          )}
        </div>
      )}

      {/* ── You Pay ── */}
      <div className="rounded-lg p-4 flex flex-col gap-3"
        style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between">
          <span className="section-label">You Pay</span>
          <button
            onClick={handleMax}
            disabled={isBusy || isSuccess || isError}
            className="font-mono text-[11px] font-semibold transition-colors hover:opacity-80 disabled:opacity-40"
            style={{ color: 'var(--color-gold)' }}>
            Bal: {Number(formatUnits(walletBalanceIn, tokenIn.decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 })} {tokenIn.symbol} · MAX
          </button>
        </div>
        <div className="group flex items-center gap-3">
          <input
            type="number"
            value={amountIn}
            onChange={e => setAmountIn(e.target.value)}
            className={`${inputBase} text-2xl`}
            placeholder="0.00"
            disabled={isBusy || isSuccess || isError}
          />
          <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="btn-stepper" disabled={isBusy || isSuccess || isError} onClick={() => setAmountIn(v => String(Math.max(0, parseFloat(v || '0') + 1)))}>▲</button>
            <button className="btn-stepper" disabled={isBusy || isSuccess || isError} onClick={() => setAmountIn(v => String(Math.max(0, parseFloat(v || '0') - 1)))}>▼</button>
          </div>
          {isBuying ? (
            isMock ? (
              <TokenBadge token={otherToken} disabled />
            ) : (
              <div className="relative">
                <TokenBadge token={otherToken} onClick={() => setShowTokenSelect(p => !p)} disabled={isBusy || isSuccess || isError} />
                {showTokenSelect && <TokenDropdown {...dropdownProps} />}
              </div>
            )
          ) : (
            <TokenBadge token={RGD_TOKEN} disabled />
          )}
        </div>
        <PercentSlider value={sliderPct} onChange={handleSliderChange} disabled={isBusy || isSuccess || isError} />
      </div>

      {/* ── Flip button ── */}
      <div className="flex justify-center -my-1 z-10">
        <button
          onClick={handleFlip}
          disabled={isBusy || isSuccess || isError}
          className="w-9 h-9 rounded-full flex items-center justify-center font-mono text-base font-bold transition-all hover:brightness-110 disabled:opacity-40 bg-card2 border-2 border-border2 text-text2">
          ↕
        </button>
      </div>

      {/* ── You Receive ── */}
      <div className="rounded-lg p-4 flex flex-col gap-3"
        style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between">
          <span className="section-label">You Receive</span>
          <span className="font-mono text-[11px]" style={{ color: 'var(--color-text2)' }}>
            Bal: {Number(formatUnits(walletBalanceOut, tokenOut.decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 })} {tokenOut.symbol}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex-1 font-mono font-bold text-2xl ${quoteLoading && amountInBigInt > 0n ? 'animate-pulse' : ''}`}
            style={{
              color: estimatedOutput > 0n
                ? (isBuying ? 'var(--color-green)' : 'var(--color-red)')
                : noRoute ? 'var(--color-red)' : 'var(--color-text2)',
              fontVariantNumeric: 'tabular-nums',
            }}>
            {quoteLoading && amountInBigInt > 0n
              ? '…'
              : estimatedOutput > 0n
              ? `~${Number(formatUnits(estimatedOutput, tokenOut.decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 })}`
              : noRoute ? 'No route' : '0.00'}
          </div>
          {!isBuying ? (
            isMock ? (
              <TokenBadge token={otherToken} disabled />
            ) : (
              <div className="relative">
                <TokenBadge token={otherToken} onClick={() => setShowTokenSelect(p => !p)} disabled={isBusy || isSuccess || isError} />
                {showTokenSelect && <TokenDropdown {...dropdownProps} />}
              </div>
            )
          ) : (
            <TokenBadge token={RGD_TOKEN} disabled />
          )}
        </div>
      </div>

      {/* ── Rate + route info ── */}
      {(exchangeRate !== null || (activePath && activePath.length > 2)) && (
        <div className="flex flex-col gap-1.5 px-1 pt-1"
          style={{ borderTop: '1px solid var(--color-border)' }}>
          {exchangeRate !== null && (
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px]" style={{ color: 'var(--color-text2)' }}>
                1 {tokenIn.symbol} ≈ <span style={{ color: 'var(--color-text)' }}>
                  {exchangeRate.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </span> {tokenOut.symbol}
              </span>
              <span className="font-mono text-[11px]" style={{ color: 'var(--color-text2)' }}>
                Min received: <span style={{ color: 'var(--color-text)' }}>
                  {Number(formatUnits(amountOutMin, tokenOut.decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </span> {tokenOut.symbol}
              </span>
            </div>
          )}
          {priceImpact !== null && (
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px]" style={{ color: 'var(--color-text2)' }}>Price Impact</span>
              <span className="font-mono text-[11px] font-semibold" style={{
                color: priceImpact < 1
                  ? 'var(--color-green)'
                  : priceImpact < 3
                  ? 'var(--color-gold)'
                  : 'var(--color-red)',
              }}>
                {priceImpact < 0.01 ? '< 0.01%' : `${priceImpact.toFixed(2)}%`}
              </span>
            </div>
          )}
          {priceImpact !== null && priceImpact >= 5 && (
            <p className="font-mono text-[11px] text-red">
              Very high price impact — you may receive significantly less than expected
            </p>
          )}
          {activePath && activePath.length > 2 && (
            <div className="flex items-center gap-1 font-mono text-[10px]" style={{ color: 'var(--color-text2)' }}>
              <span>Route:</span>
              {activePath.map((addr, i) => {
                const allTokens = [RGD_TOKEN, ...knownTokens];
                const known = allTokens.find(t => t.address.toLowerCase() === addr.toLowerCase());
                const label = known?.symbol ?? `${addr.slice(0, 6)}…${addr.slice(-4)}`;
                return (
                  <React.Fragment key={addr}>
                    {i > 0 && <span>→</span>}
                    <span style={{ color: 'var(--color-text)' }}>{label}</span>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── CTA Button ── */}
      <button
        disabled={isButtonDisabled}
        onClick={handleStartFlow}
        className={`btn-terminal-action ${isBuying ? 'action-buy' : 'action-sell'} mt-1 gap-2`}
      >
        {isBusy && <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />}
        {getButtonText()}
      </button>

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
