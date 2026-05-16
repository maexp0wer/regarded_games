'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient, useBlock } from 'wagmi';
import { parseUnits, formatUnits, erc20Abi } from 'viem';

import { WalletButton } from './WalletButton';
import PercentSlider from '@/components/PercentSlider';

import CapitalAuctionAbi from '@/deployments/abis/CapitalAuction.json';
import Core from '@/deployments/local/core.json';

type DepositStatus = 'idle' | 'approving' | 'mining_approval' | 'depositing' | 'mining_deposit' | 'success' | 'canceled' | 'failed' | 'no_gas';
type ClaimStatus   = 'idle' | 'claiming' | 'mining_claim' | 'success' | 'canceled' | 'failed';
type AuctionPhase  = 'loading' | 'pending' | 'live' | 'awaiting_finalization' | 'claimable' | 'no_deposit';

const ZERO_ADDR          = '0x0000000000000000000000000000000000000000';
const capitalAuctionAddr = (Core as any).CapitalAuction as `0x${string}`;
const usdcAddr           = Core.USDC as `0x${string}`;

function formatCountdown(secondsLeft: number): string {
  if (secondsLeft <= 0) return '00:00:00';
  const d = Math.floor(secondsLeft / 86400);
  const h = Math.floor((secondsLeft % 86400) / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  const s = secondsLeft % 60;
  const hms = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return d > 0 ? `${d}d ${hms}` : hms;
}

function extractRevertReason(err: any): string {
  const raw: string = err?.shortMessage ?? err?.cause?.reason ?? err?.message ?? String(err);
  const match = raw.match(/reason:\s*(.+?)(?:\n|$)/i) ?? raw.match(/reverted with reason string '(.+?)'/i);
  return match ? match[1].trim() : raw.slice(0, 120);
}

export function IcoMask() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [depositAmount, setDepositAmount] = useState('');
  const [depositStatus, setDepositStatus] = useState<DepositStatus>('idle');
  const [claimStatus,   setClaimStatus]   = useState<ClaimStatus>('idle');
  const [errorReason,   setErrorReason]   = useState<string | null>(null);

  // ── Chain time (anchored to block timestamp, advanced by real elapsed time) ──
  // Using block timestamp avoids clock skew between client and Anvil/chain.
  const { data: blockData } = useBlock({ query: { refetchInterval: 10000 } });
  const [chainTs, setChainTs] = useState(0);
  const blockAnchor = useRef<{ chain: number; real: number } | null>(null);

  useEffect(() => {
    if (blockData?.timestamp) {
      const chain = Number(blockData.timestamp);
      const real  = Math.floor(Date.now() / 1000);
      blockAnchor.current = { chain, real };
      setChainTs(chain);
    }
  }, [blockData?.timestamp]);

  useEffect(() => {
    const id = setInterval(() => {
      if (blockAnchor.current) {
        const elapsed = Math.floor(Date.now() / 1000) - blockAnchor.current.real;
        setChainTs(blockAnchor.current.chain + elapsed);
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Contract reads ─────────────────────────────────────────────────
  const { data: rgdRaw } = useReadContract({
    address: capitalAuctionAddr, abi: CapitalAuctionAbi, functionName: 'rgd',
    query: { refetchInterval: 5000 },
  });
  const { data: auctionEndRaw } = useReadContract({
    address: capitalAuctionAddr, abi: CapitalAuctionAbi, functionName: 'auctionEnd',
    query: { refetchInterval: 15000 },
  });
  const { data: finalizedRaw } = useReadContract({
    address: capitalAuctionAddr, abi: CapitalAuctionAbi, functionName: 'finalized',
    query: { refetchInterval: 5000 },
  });
  const { data: vestingContractRaw } = useReadContract({
    address: capitalAuctionAddr, abi: CapitalAuctionAbi, functionName: 'vestingContract',
    query: { refetchInterval: 30000 },
  });
  const { data: saleBpsRaw } = useReadContract({
    address: capitalAuctionAddr, abi: CapitalAuctionAbi, functionName: 'SALE_BPS',
  });
  const { data: lpBpsRaw } = useReadContract({
    address: capitalAuctionAddr, abi: CapitalAuctionAbi, functionName: 'LP_BPS',
  });
  const { data: totalUsdcRaw, refetch: refetchTotalUsdc } = useReadContract({
    address: capitalAuctionAddr, abi: CapitalAuctionAbi, functionName: 'totalUsdcRaised',
    query: { refetchInterval: 5000 },
  });
  const { data: totalRgdRaw } = useReadContract({
    address: capitalAuctionAddr, abi: CapitalAuctionAbi, functionName: 'totalRgd',
    query: { refetchInterval: 5000 },
  });
  const { data: userDepositRaw, refetch: refetchUserDeposit } = useReadContract({
    address: capitalAuctionAddr, abi: CapitalAuctionAbi, functionName: 'usdcDeposited',
    args: [address!],
    query: { enabled: !!address, refetchInterval: 5000 },
  });
  const { data: usdcBalanceRaw, refetch: refetchUsdcBalance } = useReadContract({
    address: usdcAddr, abi: erc20Abi, functionName: 'balanceOf',
    args: [address!],
    query: { enabled: !!address, refetchInterval: 5000 },
  });

  // ── Derived values ─────────────────────────────────────────────────
  const rgdAddress  = ((rgdRaw as string | undefined) ?? ZERO_ADDR).toLowerCase();
  const isRgdSet    = rgdAddress !== ZERO_ADDR;
  const auctionEnd  = (auctionEndRaw  as bigint  | undefined) ?? 0n;
  const finalized       = (finalizedRaw       as boolean | undefined) ?? false;
  const vestingContract = (vestingContractRaw as string  | undefined) ?? '';
  const saleBps         = (saleBpsRaw         as bigint  | undefined) ?? 0n;
  const lpBps       = (lpBpsRaw       as bigint  | undefined) ?? 0n;
  const totalUsdc   = (totalUsdcRaw   as bigint  | undefined) ?? 0n;
  const totalRgd    = (totalRgdRaw    as bigint  | undefined) ?? 0n;
  const userDeposit = (userDepositRaw as bigint  | undefined) ?? 0n;
  const usdcBalance = (usdcBalanceRaw as bigint  | undefined) ?? 0n;

  const depositAmountBigInt = useMemo(() => {
    try { return depositAmount ? parseUnits(depositAmount, 6) : 0n; }
    catch { return 0n; }
  }, [depositAmount]);

  const userRgdShare = useMemo(() => {
    if (totalUsdc === 0n || totalRgd === 0n || userDeposit === 0n || saleBps === 0n) return 0n;
    return (userDeposit * totalRgd * saleBps) / (totalUsdc * 10000n);
  }, [userDeposit, totalUsdc, totalRgd, saleBps]);

  const phase: AuctionPhase = useMemo(() => {
    if (chainTs === 0 || auctionEnd === 0n) return 'loading';
    if (!isRgdSet) return 'pending';
    if (chainTs < Number(auctionEnd) && !finalized) return 'live';
    if (!finalized) return 'awaiting_finalization';
    if (userDeposit === 0n) return 'no_deposit';
    return 'claimable';
  }, [chainTs, auctionEnd, isRgdSet, finalized, userDeposit]);

  const secondsToEnd = Math.max(0, Number(auctionEnd) - chainTs);

  const sliderPct = useMemo(() => {
    if (!depositAmount || usdcBalance === 0n) return 0;
    try { return Math.min(100, Math.round(Number((depositAmountBigInt * 100n) / usdcBalance))); }
    catch { return 0; }
  }, [depositAmount, depositAmountBigInt, usdcBalance]);

  const handleSliderChange = (pct: number) => {
    if (usdcBalance === 0n) return;
    setDepositAmount(formatUnits((usdcBalance * BigInt(pct)) / 100n, 6));
  };

  // ── Deposit flow ───────────────────────────────────────────────────
  const handleDeposit = async () => {
    if (!publicClient || !address || !depositAmountBigInt) return;
    setErrorReason(null);
    try {
      const liveAllowance = await publicClient.readContract({
        address: usdcAddr, abi: erc20Abi, functionName: 'allowance', args: [address, capitalAuctionAddr],
      }) as bigint;

      if (liveAllowance < depositAmountBigInt) {
        setDepositStatus('approving');
        const approveHash = await writeContractAsync({
          address: usdcAddr, abi: erc20Abi, functionName: 'approve', args: [capitalAuctionAddr, depositAmountBigInt],
        });
        setDepositStatus('mining_approval');
        const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
        if (approveReceipt.status === 'reverted') throw new Error('Approval reverted');
      }

      setDepositStatus('depositing');
      const depositHash = await writeContractAsync({
        address: capitalAuctionAddr, abi: CapitalAuctionAbi, functionName: 'deposit', args: [depositAmountBigInt],
      });
      setDepositStatus('mining_deposit');
      const depositReceipt = await publicClient.waitForTransactionReceipt({ hash: depositHash });
      if (depositReceipt.status === 'reverted') throw new Error('Deposit reverted');

      setDepositStatus('success');
      refetchTotalUsdc(); refetchUserDeposit(); refetchUsdcBalance();
      setTimeout(() => { setDepositAmount(''); setDepositStatus('idle'); }, 2500);

    } catch (err: any) {
      console.error('Deposit error:', err);
      if (err.shortMessage?.includes('rejected') || err.message?.includes('User rejected')) {
        setDepositStatus('canceled');
      } else if (err.message?.includes('insufficient funds') || err.name === 'InsufficientFundsError') {
        setDepositStatus('no_gas');
      } else {
        setErrorReason(extractRevertReason(err));
        setDepositStatus('failed');
      }
      setTimeout(() => { setDepositStatus('idle'); setErrorReason(null); }, 5000);
    }
  };

  // ── Claim flow ─────────────────────────────────────────────────────
  const handleClaim = async () => {
    if (!publicClient || !address) return;
    setErrorReason(null);
    try {
      setClaimStatus('claiming');
      const claimHash = await writeContractAsync({
        address: capitalAuctionAddr, abi: CapitalAuctionAbi, functionName: 'claim',
      });
      setClaimStatus('mining_claim');
      const receipt = await publicClient.waitForTransactionReceipt({ hash: claimHash });
      if (receipt.status === 'reverted') throw new Error('Claim reverted');
      setClaimStatus('success');
      refetchUserDeposit();
      setTimeout(() => setClaimStatus('idle'), 3000);
    } catch (err: any) {
      console.error('Claim error:', err);
      if (err.shortMessage?.includes('rejected') || err.message?.includes('User rejected')) {
        setClaimStatus('canceled');
      } else {
        setErrorReason(extractRevertReason(err));
        setClaimStatus('failed');
      }
      setTimeout(() => { setClaimStatus('idle'); setErrorReason(null); }, 5000);
    }
  };

  // ── Button state helpers ───────────────────────────────────────────
  const depositIsBusy    = ['approving', 'mining_approval', 'depositing', 'mining_deposit'].includes(depositStatus);
  const depositIsSuccess = depositStatus === 'success';
  const depositIsError   = ['canceled', 'failed', 'no_gas'].includes(depositStatus);
  const insufficientBal  = depositAmountBigInt > 0n && usdcBalance < depositAmountBigInt;
  const depositDisabled  = depositIsBusy || depositIsSuccess || depositIsError || !depositAmount || depositAmountBigInt === 0n || insufficientBal;

  const claimIsBusy    = ['claiming', 'mining_claim'].includes(claimStatus);
  const claimIsSuccess = claimStatus === 'success';
  const claimIsError   = ['canceled', 'failed'].includes(claimStatus);
  const claimDisabled  = claimIsBusy || claimIsSuccess || claimIsError;

  const getDepositProgress = () => ({
    idle: '0%', approving: '15%', mining_approval: '40%',
    depositing: '60%', mining_deposit: '85%', success: '100%',
    canceled: '0%', failed: '0%', no_gas: '0%',
  }[depositStatus]);

  const getDepositButtonText = () => {
    if (depositStatus === 'approving')        return 'Step 1/2: Approve USDC…';
    if (depositStatus === 'mining_approval')  return 'Step 1/2: Confirming…';
    if (depositStatus === 'depositing')       return 'Step 2/2: Confirm Deposit…';
    if (depositStatus === 'mining_deposit')   return 'Finalizing…';
    if (depositStatus === 'success')          return 'Deposited ✓';
    if (depositStatus === 'canceled')         return 'Canceled';
    if (depositStatus === 'no_gas')           return 'Insufficient Gas';
    if (depositStatus === 'failed')           return 'Transaction Failed';
    if (!depositAmount || depositAmountBigInt === 0n) return 'Enter Amount';
    if (insufficientBal)                      return 'Insufficient USDC';
    return 'Approve & Deposit';
  };

  const getClaimButtonText = () => {
    if (claimStatus === 'claiming')      return 'Sign Transaction…';
    if (claimStatus === 'mining_claim')  return 'Claiming…';
    if (claimStatus === 'success')       return 'Claimed ✓';
    if (claimStatus === 'canceled')      return 'Canceled';
    if (claimStatus === 'failed')        return 'Claim Failed';
    return 'Claim RGD';
  };

  const inputBase = 'bg-transparent border-none p-0 w-full font-mono font-bold text-text outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

  const phasePill = {
    loading:               { label: 'LOADING',   color: 'var(--color-text2)', bg: 'var(--color-card2)' },
    pending:               { label: 'PENDING',   color: 'var(--color-text2)', bg: 'var(--color-card2)' },
    live:                  { label: 'LIVE',      color: 'var(--color-green)', bg: 'rgba(107,203,110,0.1)' },
    awaiting_finalization: { label: 'ENDED',     color: 'var(--color-text2)', bg: 'var(--color-card2)' },
    claimable:             { label: 'CLAIMABLE', color: 'var(--color-gold)',  bg: 'var(--color-gold-a25)' },
    no_deposit:            { label: 'ENDED',     color: 'var(--color-text2)', bg: 'var(--color-card2)' },
  }[phase];

  // ── Disconnected ───────────────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="card-app flex flex-col items-center justify-center gap-4 w-full max-w-lg py-12"
        style={{ borderColor: 'var(--color-border-bright)' }}>
        <div className="text-center">
          <p className="section-label mb-2">Capital Auction</p>
          <p className="font-mono text-sm" style={{ color: 'var(--color-text2)' }}>
            Connect your wallet to participate
          </p>
        </div>
        <WalletButton />
      </div>
    );
  }

  return (
    <div className="card-app flex flex-col gap-4 w-full max-w-lg"
      style={{ borderColor: 'var(--color-border-bright)' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between pb-1">
        <div>
          <span className="font-display font-bold text-base" style={{ color: 'var(--color-text)' }}>
            Capital Auction
          </span>
          <p className="font-mono text-[11px] mt-0.5" style={{ color: 'var(--color-text2)' }}>
            Deposit USDC · Receive RGD
          </p>
        </div>
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
          style={{ color: phasePill.color, background: phasePill.bg }}>
          {phasePill.label}
        </span>
      </div>

      {/* ── Countdown ── */}
      {phase === 'live' && secondsToEnd > 0 && (
        <div className="rounded-xl px-4 py-3 flex items-center justify-between"
          style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
          <span className="section-label">Auction Ends In</span>
          <span className="font-mono font-bold text-sm"
            style={{ color: 'var(--color-gold)', fontVariantNumeric: 'tabular-nums' }}>
            {formatCountdown(secondsToEnd)}
          </span>
        </div>
      )}
      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 gap-0 rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--color-border)' }}>
        <div className="flex flex-col gap-1 p-3"
          style={{ background: 'var(--color-card2)', borderRight: '1px solid var(--color-border)' }}>
          <span className="section-label">Total Raised</span>
          <span className="font-mono font-semibold text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ color: 'var(--color-gold)' }}>
              {Number(formatUnits(totalUsdc, 6)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
            <span className="text-text2 font-normal text-xs ml-1">USDC</span>
          </span>
        </div>
        <div className="flex flex-col gap-1 p-3"
          style={{ background: 'var(--color-card2)' }}>
          <span className="section-label">Your Deposit</span>
          <span className="font-mono font-semibold text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ color: userDeposit > 0n ? 'var(--color-gold)' : 'var(--color-text2)' }}>
              {Number(formatUnits(userDeposit, 6)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
            <span className="text-text2 font-normal text-xs ml-1">USDC</span>
          </span>
        </div>
        <div className="flex flex-col gap-1 p-3"
          style={{ background: 'var(--color-card2)', borderRight: '1px solid var(--color-border)', borderTop: '1px solid var(--color-border)' }}>
          <span className="section-label">Total RGD</span>
          <span className="font-mono font-semibold text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {totalRgd > 0n ? (
              <>
                <span style={{ color: 'var(--color-text)' }}>
                  {Number(formatUnits(totalRgd, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
                <span className="text-text2 font-normal text-xs ml-1">RGD</span>
              </>
            ) : <span className="text-text2">—</span>}
          </span>
        </div>
        <div className="flex flex-col gap-1 p-3"
          style={{ background: 'var(--color-card2)', borderTop: '1px solid var(--color-border)' }}>
          <span className="section-label">Your Share</span>
          <span className="font-mono font-semibold text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {userRgdShare > 0n ? (
              <>
                <span style={{ color: 'var(--color-gold)' }}>
                  {Number(formatUnits(userRgdShare, 18)).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </span>
                <span className="text-text2 font-normal text-xs ml-1">RGD</span>
              </>
            ) : <span className="text-text2">—</span>}
          </span>
        </div>
      </div>

      {/* ── Split info ── */}
      {saleBps > 0n && lpBps > 0n && (
        <div className="flex items-center justify-center gap-4 px-1"
          style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
          <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text2)' }}>
            Sale <span style={{ color: 'var(--color-text)' }}>{Number(saleBps) / 100}%</span>
          </span>
          <span className="font-mono text-[10px]" style={{ color: 'var(--color-border)' }}>·</span>
          <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text2)' }}>
            LP Seed <span style={{ color: 'var(--color-text)' }}>{Number(lpBps) / 100}%</span>
          </span>
        </div>
      )}

      {/* ── PENDING: RGD not linked yet ── */}
      {phase === 'pending' && (
        <div className="rounded-xl px-4 py-5 text-center"
          style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)' }}>
          <p className="section-label mb-1">Auction Not Yet Open</p>
          <p className="font-mono text-[12px]" style={{ color: 'var(--color-text2)' }}>
            The RGD token has not been linked to this auction yet. Check back soon.
          </p>
        </div>
      )}

      {/* ── LIVE: deposit form ── */}
      {phase === 'live' && (
        <>
          <div className="rounded-xl p-4 flex flex-col gap-3"
            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between">
              <span className="section-label">Deposit USDC</span>
              <button
                onClick={() => setDepositAmount(formatUnits(usdcBalance, 6))}
                disabled={depositIsBusy || depositIsSuccess || depositIsError}
                className="font-mono text-[11px] font-semibold transition-colors hover:opacity-80 disabled:opacity-40"
                style={{ color: 'var(--color-gold)' }}>
                Bal: {Number(formatUnits(usdcBalance, 6)).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC · MAX
              </button>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                className={`${inputBase} text-2xl`}
                placeholder="0.00"
                disabled={depositIsBusy || depositIsSuccess || depositIsError}
              />
              <div className="shrink-0 font-mono font-bold text-sm px-3 py-1.5 rounded-lg"
                style={{ background: 'var(--color-card2)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>
                USDC
              </div>
            </div>
            <PercentSlider value={sliderPct} onChange={handleSliderChange} disabled={depositIsBusy || depositIsSuccess || depositIsError} />
          </div>

          {errorReason && (
            <div className="rounded-lg px-3 py-2 font-mono text-[11px] break-all"
              style={{ background: 'var(--color-pink-a10)', color: 'var(--color-pink)', border: '1px solid var(--color-pink-a25)' }}>
              {errorReason}
            </div>
          )}

          <div className="relative rounded-xl overflow-hidden">
            {depositStatus !== 'idle' && !depositIsError && (
              <div className="absolute inset-y-0 left-0 transition-all duration-500"
                style={{
                  width: getDepositProgress(),
                  background: depositIsSuccess ? 'var(--color-green)' : 'var(--color-gold-a30)',
                }} />
            )}
            <button
              disabled={depositDisabled}
              onClick={handleDeposit}
              className={`relative z-10 w-full py-4 font-mono font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all rounded-xl
                ${depositIsSuccess ? 'bg-green! text-card!' : ''}
                ${depositIsError   ? 'bg-red! text-white!' : ''}
                ${!depositDisabled && !depositIsSuccess && !depositIsError ? 'btn-primary' : ''}
                ${depositDisabled && !depositIsBusy && !depositIsSuccess && !depositIsError ? 'bg-card2! text-text2! cursor-not-allowed!' : ''}
              `}>
              {depositIsBusy && <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />}
              {getDepositButtonText()}
            </button>
          </div>
        </>
      )}

      {/* ── AWAITING FINALIZATION ── */}
      {phase === 'awaiting_finalization' && (
        <div className="rounded-xl px-4 py-5 text-center"
          style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)' }}>
          <p className="section-label mb-1">Auction Ended</p>
          <p className="font-mono text-[12px]" style={{ color: 'var(--color-text2)' }}>
            Awaiting finalization. Claims will unlock once the contract is finalized.
          </p>
        </div>
      )}

      {/* ── CLAIMABLE ── */}
      {phase === 'claimable' && (
        <>
          <div className="rounded-xl px-4 py-4 flex flex-col gap-2"
            style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between">
              <span className="section-label">Your RGD</span>
              <span className="font-display font-bold text-xl"
                style={{ color: 'var(--color-gold)', textShadow: '0 0 20px var(--color-gold-a25)', fontVariantNumeric: 'tabular-nums' }}>
                {Number(formatUnits(userRgdShare, 18)).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                <span className="font-mono font-medium text-text2 ml-1.5 text-sm">RGD</span>
              </span>
            </div>
            {vestingContract && vestingContract !== ZERO_ADDR && (
              <div className="flex items-center justify-between pt-2"
                style={{ borderTop: '1px solid var(--color-border)' }}>
                <span className="section-label">Vesting Contract</span>
                <span className="font-mono text-[10px]" style={{ color: 'var(--color-text2)' }}>
                  {vestingContract.slice(0, 6)}…{vestingContract.slice(-4)}
                </span>
              </div>
            )}
          </div>

          {errorReason && (
            <div className="rounded-lg px-3 py-2 font-mono text-[11px] break-all"
              style={{ background: 'var(--color-pink-a10)', color: 'var(--color-pink)', border: '1px solid var(--color-pink-a25)' }}>
              {errorReason}
            </div>
          )}

          <div className="relative rounded-xl overflow-hidden">
            {claimStatus !== 'idle' && !claimIsError && (
              <div className="absolute inset-y-0 left-0 transition-all duration-500"
                style={{
                  width: claimIsSuccess ? '100%' : claimIsBusy ? '60%' : '0%',
                  background: claimIsSuccess ? 'var(--color-green)' : 'var(--color-gold-a30)',
                }} />
            )}
            <button
              disabled={claimDisabled}
              onClick={handleClaim}
              className={`relative z-10 w-full py-4 font-mono font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all rounded-xl
                ${claimIsSuccess ? 'bg-green! text-card!' : ''}
                ${claimIsError   ? 'bg-red! text-white!' : ''}
                ${!claimDisabled && !claimIsSuccess && !claimIsError ? 'btn-primary' : ''}
                ${claimDisabled && !claimIsBusy && !claimIsSuccess && !claimIsError ? 'bg-card2! text-text2! cursor-not-allowed!' : ''}
              `}>
              {claimIsBusy && <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />}
              {getClaimButtonText()}
            </button>
          </div>
        </>
      )}

      {/* ── NO DEPOSIT ── */}
      {phase === 'no_deposit' && (
        <div className="rounded-xl px-4 py-5 text-center"
          style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)' }}>
          <p className="font-mono font-bold text-[12px] uppercase tracking-widest"
            style={{ color: 'var(--color-text2)' }}>
            Nothing to Claim
          </p>
          <p className="font-mono text-[11px] mt-1" style={{ color: 'var(--color-text2)' }}>
            You did not participate in this auction, or your RGD has already been claimed.
          </p>
        </div>
      )}
    </div>
  );
}
