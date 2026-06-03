'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAccount, useReadContract, useWriteContract, usePublicClient, useBlock } from 'wagmi';
import { parseUnits, formatUnits, erc20Abi } from 'viem';

import { WalletButton } from './WalletButton';
import AmountInput from '@/components/AmountInput';
import { sliderPctToAmount } from '@/utils/sliderAmount';

import CapitalAuctionAbi from '@/deployments/abis/CapitalAuction.json';
import { useTenantDeployment, useTenantChainId, useTenantPonderUrl } from '@/context/TenantContext';
import { TxModal } from './TxModal';
import { extractRevertReason } from '@/utils/txErrors';

type DepositStatus = 'idle' | 'approving' | 'mining_approval' | 'depositing' | 'mining_deposit' | 'success' | 'canceled' | 'failed' | 'no_gas';
type ClaimStatus   = 'idle' | 'claiming' | 'mining_claim' | 'success' | 'canceled' | 'failed';
type AuctionPhase  = 'loading' | 'pending' | 'live' | 'awaiting_finalization' | 'claimable' | 'no_deposit' | 'already_claimed';

const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

export function IcoMask() {
  const { address, isConnected } = useAccount();
  const chainId = useTenantChainId();
  const ponderUrl = useTenantPonderUrl();
  const publicClient = usePublicClient({ chainId });
  const { writeContractAsync } = useWriteContract();
  const core = useTenantDeployment();
  const capitalAuctionAddr = core.CapitalAuction as `0x${string}`;
  const usdcAddr = core.USDC as `0x${string}`;

  const [depositAmount, setDepositAmount] = useState('');
  const [depositStatus, setDepositStatus] = useState<DepositStatus>('idle');
  const [claimStatus,   setClaimStatus]   = useState<ClaimStatus>('idle');
  const [errorReason,   setErrorReason]   = useState<string | null>(null);
  const [depositTxHashes, setDepositTxHashes] = useState<(string | null)[]>([null, null]);
  const [claimTxHashes,   setClaimTxHashes]   = useState<(string | null)[]>([null]);

  // ── Chain time (block-anchored, advanced by real elapsed time) ──
  const { data: blockData } = useBlock({ chainId, query: { refetchInterval: 10000 } });
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

  // ── Contract reads ──────────────────────────────────────────────────────────
  const { data: rgdRaw } = useReadContract({
    address: capitalAuctionAddr, abi: CapitalAuctionAbi, functionName: 'rgd',
    chainId,
    query: { refetchInterval: 5000 },
  });
  const { data: auctionEndRaw } = useReadContract({
    address: capitalAuctionAddr, abi: CapitalAuctionAbi, functionName: 'auctionEnd',
    chainId,
    query: { refetchInterval: 15000 },
  });
  const { data: finalizedRaw } = useReadContract({
    address: capitalAuctionAddr, abi: CapitalAuctionAbi, functionName: 'finalized',
    chainId,
    query: { refetchInterval: 5000 },
  });
  const { data: vestingContractRaw } = useReadContract({
    address: capitalAuctionAddr, abi: CapitalAuctionAbi, functionName: 'vestingContract',
    chainId,
    query: { refetchInterval: 30000 },
  });
  const { data: saleBpsRaw } = useReadContract({
    address: capitalAuctionAddr, abi: CapitalAuctionAbi, functionName: 'SALE_BPS',
    chainId,
  });
  const { data: lpBpsRaw } = useReadContract({
    address: capitalAuctionAddr, abi: CapitalAuctionAbi, functionName: 'LP_BPS',
    chainId,
  });
  const { data: totalUsdcRaw, refetch: refetchTotalUsdc } = useReadContract({
    address: capitalAuctionAddr, abi: CapitalAuctionAbi, functionName: 'totalUsdcRaised',
    chainId,
    query: { refetchInterval: 5000 },
  });
  const { data: totalRgdRaw } = useReadContract({
    address: capitalAuctionAddr, abi: CapitalAuctionAbi, functionName: 'totalRgd',
    chainId,
    query: { refetchInterval: 5000 },
  });
  const { data: userDepositRaw, refetch: refetchUserDeposit } = useReadContract({
    address: capitalAuctionAddr, abi: CapitalAuctionAbi, functionName: 'usdcDeposited',
    args: [address!],
    chainId,
    query: { enabled: !!address, refetchInterval: 5000 },
  });
  const { data: usdcBalanceRaw, refetch: refetchUsdcBalance } = useReadContract({
    address: usdcAddr, abi: erc20Abi, functionName: 'balanceOf',
    args: [address!],
    chainId,
    query: { enabled: !!address, refetchInterval: 5000 },
  });

  // ── Derived values ──────────────────────────────────────────────────────────
  const rgdAddress      = ((rgdRaw as string | undefined) ?? ZERO_ADDR).toLowerCase();
  const isRgdSet        = rgdAddress !== ZERO_ADDR;
  const auctionEnd      = (auctionEndRaw      as bigint  | undefined) ?? 0n;
  const finalized       = (finalizedRaw       as boolean | undefined) ?? false;
  const vestingContract = (vestingContractRaw as string  | undefined) ?? '';
  const saleBps         = (saleBpsRaw         as bigint  | undefined) ?? 0n;
  const lpBps           = (lpBpsRaw           as bigint  | undefined) ?? 0n;
  const totalUsdc       = (totalUsdcRaw       as bigint  | undefined) ?? 0n;
  const totalRgd        = (totalRgdRaw        as bigint  | undefined) ?? 0n;
  const userDeposit     = (userDepositRaw     as bigint  | undefined) ?? 0n;
  const usdcBalance     = (usdcBalanceRaw     as bigint  | undefined) ?? 0n;

  // ── Ponder: post-claim display data ────────────────────────────────────────
  const { data: participantData, refetch: refetchParticipant } = useQuery({
    queryKey: ['capitalAuctionParticipant', address?.toLowerCase(), ponderUrl],
    enabled: !!address && finalized,
    queryFn: async () => {
      const res = await fetch(ponderUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query GetParticipant($id: String!) {
            capitalAuctionParticipant(id: $id) { totalDeposited rgdClaimed }
          }`,
          variables: { id: address!.toLowerCase() },
        }),
      });
      const json = await res.json();
      return json.data?.capitalAuctionParticipant ?? null;
    },
    refetchInterval: 5000,
  });

  const hasClaimed      = !!participantData?.rgdClaimed;
  const claimedDeposit  = participantData?.totalDeposited ? BigInt(participantData.totalDeposited) : 0n;
  const claimedRgdShare = participantData?.rgdClaimed     ? BigInt(participantData.rgdClaimed)     : 0n;

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
    if (userDeposit === 0n && hasClaimed) return 'already_claimed';
    if (userDeposit === 0n) return 'no_deposit';
    return 'claimable';
  }, [chainTs, auctionEnd, isRgdSet, finalized, userDeposit, hasClaimed]);

  const secondsToEnd = Math.max(0, Number(auctionEnd) - chainTs);

  // ── Display numbers ────────────────────────────────────────────────────────
  const auctionPoolSupply = saleBps > 0n ? (totalRgd * saleBps) / 10000n : 0n;

  const totalUsdcNum        = Number(formatUnits(totalUsdc, 6));
  const totalRgdNum         = Number(formatUnits(totalRgd, 18));
  const auctionPoolSupplyNum = Number(formatUnits(auctionPoolSupply, 18));
  const userDepositNum      = Number(formatUnits(userDeposit, 6));
  const usdcBalNum          = Number(formatUnits(usdcBalance, 6));
  const userRgdNum          = Number(formatUnits(userRgdShare, 18));

  const displayUserDeposit  = hasClaimed ? claimedDeposit  : userDeposit;
  const displayUserRgdShare = hasClaimed ? claimedRgdShare : userRgdShare;
  const displayUserDepositNum = Number(formatUnits(displayUserDeposit, 6));
  const displayUserRgdNum     = Number(formatUnits(displayUserRgdShare, 18));

  const currentPrice  = auctionPoolSupplyNum > 0 ? totalUsdcNum / auctionPoolSupplyNum : 0;
  const userPoolShare = totalUsdcNum > 0 ? (displayUserDepositNum / totalUsdcNum) * 100 : 0;

  const countdown = useMemo(() => {
    const d = Math.floor(secondsToEnd / 86400);
    const h = Math.floor((secondsToEnd % 86400) / 3600);
    const m = Math.floor((secondsToEnd % 3600) / 60);
    return {
      d: String(d).padStart(2, '0'),
      h: String(h).padStart(2, '0'),
      m: String(m).padStart(2, '0'),
    };
  }, [secondsToEnd]);

  // ── Slider ─────────────────────────────────────────────────────────────────
  const sliderPct = useMemo(() => {
    if (!depositAmount || usdcBalance === 0n) return 0;
    try { return Math.min(100, Number((depositAmountBigInt * 10000n) / usdcBalance) / 100); }
    catch { return 0; }
  }, [depositAmount, depositAmountBigInt, usdcBalance]);

  const handleSliderChange = (pct: number) => {
    if (usdcBalance === 0n) return;
    setDepositAmount(sliderPctToAmount(pct, usdcBalNum));
  };

  // ── Deposit flow ───────────────────────────────────────────────────────────
  const handleDeposit = async () => {
    if (!publicClient || !address || !depositAmountBigInt) return;
    setErrorReason(null);
    setDepositTxHashes([null, null]);
    try {
      const liveAllowance = await publicClient.readContract({
        address: usdcAddr, abi: erc20Abi, functionName: 'allowance', args: [address, capitalAuctionAddr],
      }) as bigint;

      let approveHash: string | null = null;
      if (liveAllowance < depositAmountBigInt) {
        setDepositStatus('approving');
        approveHash = await writeContractAsync({
          address: usdcAddr, abi: erc20Abi, functionName: 'approve', args: [capitalAuctionAddr, depositAmountBigInt],
        });
        setDepositStatus('mining_approval');
        const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash as `0x${string}` });
        if (approveReceipt.status === 'reverted') throw new Error('Approval reverted');
        setDepositTxHashes([approveHash, null]);
      }

      setDepositStatus('depositing');
      const depositHash = await writeContractAsync({
        address: capitalAuctionAddr, abi: CapitalAuctionAbi, functionName: 'deposit', args: [depositAmountBigInt],
      });
      setDepositStatus('mining_deposit');
      const depositReceipt = await publicClient.waitForTransactionReceipt({ hash: depositHash });
      if (depositReceipt.status === 'reverted') throw new Error('Deposit reverted');
      setDepositTxHashes([approveHash, depositHash]);

      setDepositStatus('success');
      refetchTotalUsdc(); refetchUserDeposit(); refetchUsdcBalance();

    } catch (err: any) {
      console.error('Deposit error:', err);
      if (err.shortMessage?.includes('rejected') || err.message?.includes('User rejected')) {
        setDepositStatus('canceled');
        setTimeout(() => setDepositStatus('idle'), 2000);
      } else if (err.message?.includes('insufficient funds') || err.name === 'InsufficientFundsError') {
        setDepositStatus('no_gas');
      } else {
        setErrorReason(extractRevertReason(err));
        setDepositStatus('failed');
      }
    }
  };

  // ── Claim flow ─────────────────────────────────────────────────────────────
  const handleClaim = async () => {
    if (!publicClient || !address) return;
    setErrorReason(null);
    setClaimTxHashes([null]);
    try {
      setClaimStatus('claiming');
      const claimHash = await writeContractAsync({
        address: capitalAuctionAddr, abi: CapitalAuctionAbi, functionName: 'claim',
      });
      setClaimStatus('mining_claim');
      const receipt = await publicClient.waitForTransactionReceipt({ hash: claimHash });
      if (receipt.status === 'reverted') throw new Error('Claim reverted');
      setClaimTxHashes([claimHash]);
      setClaimStatus('success');
      refetchUserDeposit();
      refetchParticipant();
    } catch (err: any) {
      console.error('Claim error:', err);
      if (err.shortMessage?.includes('rejected') || err.message?.includes('User rejected')) {
        setClaimStatus('canceled');
        setTimeout(() => setClaimStatus('idle'), 2000);
      } else {
        setErrorReason(extractRevertReason(err));
        setClaimStatus('failed');
      }
    }
  };

  // ── Button state helpers ───────────────────────────────────────────────────
  const depositIsBusy    = ['approving', 'mining_approval', 'depositing', 'mining_deposit'].includes(depositStatus);
  const depositIsSuccess = depositStatus === 'success';
  const depositIsError   = ['canceled', 'failed', 'no_gas'].includes(depositStatus);
  const insufficientBal  = depositAmountBigInt > 0n && usdcBalance < depositAmountBigInt;
  const depositDisabled  = depositIsBusy || depositIsSuccess || depositIsError || !depositAmount || depositAmountBigInt === 0n || insufficientBal;

  const claimIsBusy    = ['claiming', 'mining_claim'].includes(claimStatus);
  const claimIsSuccess = claimStatus === 'success';
  const claimIsError   = ['canceled', 'failed'].includes(claimStatus);
  const claimDisabled  = claimIsBusy || claimIsSuccess || claimIsError;

  const phasePill = {
    loading:               { label: 'LOADING',   color: 'var(--color-text2)', bg: 'var(--color-card2)' },
    pending:               { label: 'PENDING',   color: 'var(--color-text2)', bg: 'var(--color-card2)' },
    live:                  { label: 'LIVE',      color: 'var(--color-green)', bg: 'var(--color-green-15)' },
    awaiting_finalization: { label: 'ENDED',     color: 'var(--color-text2)', bg: 'var(--color-card2)' },
    claimable:             { label: 'CLAIMABLE', color: 'var(--color-gold)',  bg: 'var(--color-gold-35)' },
    no_deposit:            { label: 'ENDED',     color: 'var(--color-text2)', bg: 'var(--color-card2)' },
    already_claimed:       { label: 'CLAIMED',   color: 'var(--color-green)', bg: 'var(--color-green-15)' },
  }[phase];

  // ── Disconnected ───────────────────────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="terminal-pane connect-gate">
        <div className="terminal-pane-header">
          <span className="terminal-pane-title">Capital Auction</span>
        </div>
        <div className="connect-gate-body">
          <span className="terminal-pane-title" style={{ color: 'var(--color-text2)' }}>Connect your wallet to participate</span>
          <WalletButton />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Section Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b pb-4 mb-6 gap-4"
        style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-display text-2xl font-black uppercase tracking-tight text-text">
              Capital Auction
            </h2>
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
              style={{ color: phasePill.color, background: phasePill.bg }}>
              {phasePill.label}
            </span>
          </div>
        </div>

        {phase === 'live' && secondsToEnd > 0 && (
          <div className="flex flex-col items-start md:items-end gap-1.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--color-text2)' }}>
              Auction Window Closing In:
            </span>
            <div className="flex gap-2 font-mono">
              <div className="countdown-chip">
                <span className="countdown-val">{countdown.d}</span>
                <span className="countdown-lbl">Days</span>
              </div>
              <div className="countdown-chip">
                <span className="countdown-val">{countdown.h}</span>
                <span className="countdown-lbl">Hrs</span>
              </div>
              <div className="countdown-chip">
                <span className="countdown-val">{countdown.m}</span>
                <span className="countdown-lbl">Min</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 gap-6 w-full md:grid-cols-[3fr_2fr]">

        {/* LEFT COLUMN: Live Valuation Matrices */}
        <div className="flex flex-col gap-4">

          {/* 4-cell stats grid */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="terminal-pane">
              <div className="terminal-pane-title mb-1">Total Capital Raised</div>
              <div className="font-mono text-xl font-bold" style={{ color: 'var(--color-green)' }}>
                {totalUsdcNum.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                <span className="text-[11px] font-normal ml-1" style={{ color: 'var(--color-text2)' }}>USDC</span>
              </div>
            </div>
            <div className="terminal-pane">
              <div className="terminal-pane-title mb-1">Your Total Deposit</div>
              <div className="font-mono text-xl font-bold text-text">
                {displayUserDepositNum.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                <span className="text-[11px] font-normal ml-1" style={{ color: 'var(--color-text2)' }}>USDC</span>
              </div>
            </div>
            <div className="terminal-pane">
              <div className="terminal-pane-title mb-1">Auction Pool Supply</div>
              <div className="font-mono text-sm font-bold" style={{ color: 'var(--color-gold)' }}>
                {auctionPoolSupply > 0n
                  ? auctionPoolSupplyNum.toLocaleString(undefined, { maximumFractionDigits: 0 })
                  : '—'}
                <span className="text-[11px] font-normal ml-1" style={{ color: 'var(--color-text2)' }}>RGD</span>
              </div>
              <div className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--color-text2)' }}>
                of {totalRgd > 0n ? totalRgdNum.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—'} total supply
              </div>
            </div>
            <div className="terminal-pane">
              <div className="terminal-pane-title mb-1">Your RGD Share</div>
              <div className="font-mono text-sm font-bold" style={{ color: 'var(--color-gold)' }}>
                {displayUserRgdShare > 0n
                  ? displayUserRgdNum.toLocaleString(undefined, { maximumFractionDigits: 4 })
                  : '—'}
                <span className="text-[11px] font-normal ml-1" style={{ color: 'var(--color-text2)' }}>RGD</span>
              </div>
              <div className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--color-text2)' }}>
                {userPoolShare > 0 ? `${userPoolShare.toFixed(2)}% of pool` : '0% of pool'}
              </div>
            </div>
          </div>

          {/* Dynamic price discovery panel */}
          <div className="terminal-pane">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="terminal-pane-title mb-1">Final Price</div>
                <div className="font-mono text-2xl font-black" style={{ color: 'var(--color-purple)' }}>
                  ${currentPrice.toFixed(6)}
                  <span className="text-xs font-normal ml-1" style={{ color: 'var(--color-text2)' }}>USDC / RGD</span>
                </div>
                <p className="text-[11px] mt-1" style={{ color: 'var(--color-text2)' }}>
                  Total Raised ÷ Auction Supply
                </p>
              </div>
              {saleBps > 0n && lpBps > 0n && (
                <div>
                  <div className="terminal-pane-title mb-1">Capital Allocation Split</div>
                  <div className="font-mono text-2xl font-black text-text">
                    {Number(saleBps) / 100}%
                    <span className="text-xs font-normal ml-1" style={{ color: 'var(--color-text2)' }}>Sale</span>
                  </div>
                  <p className="text-[11px] mt-1" style={{ color: 'var(--color-text2)' }}>
                    + {Number(lpBps) / 100}% allocated to LP seeding
                  </p>
                </div>
              )}
            </div>
          </div>

          {phase === 'pending' && (
            <div className="terminal-pane text-center">
              <div className="terminal-pane-title mb-1">Auction Not Yet Open</div>
              <p className="font-mono text-xs" style={{ color: 'var(--color-text2)' }}>
                The RGD token has not been linked to this auction contract yet. Check back soon.
              </p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Interactive Action Panel */}
        <div className="terminal-pane p-0 overflow-hidden flex flex-col">
          <div className="p-4 flex flex-col flex-1">

            {/* COMMIT PANEL */}
            {!['awaiting_finalization', 'claimable', 'no_deposit', 'already_claimed'].includes(phase) && (
              <div className="flex flex-col gap-4 flex-1">
                {phase !== 'live' ? (
                  <div className="text-center py-6">
                    <p className="terminal-pane-title mb-1">
                      {phase === 'loading' ? 'Syncing Auction Data...' : 'Commit Window Closed'}
                    </p>
                    <p className="font-mono text-xs" style={{ color: 'var(--color-text2)' }}>
                      {phase === 'loading'
                        ? 'Reading the on-chain ledger...'
                        : 'The auction is not yet open.'}
                    </p>
                  </div>
                ) : (
                  <>
                    <AmountInput
                      label="USDC"
                      value={depositAmount}
                      onChange={setDepositAmount}
                      sliderValue={sliderPct}
                      onSliderChange={handleSliderChange}
                      disabled={depositIsBusy || depositIsSuccess || depositIsError}
                      balance={`${usdcBalNum.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`}
                    />

                    <div className="flex justify-between items-center p-3 rounded font-mono text-xs"
                      style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)' }}>
                      <span style={{ color: 'var(--color-text2)' }}>New Estimated Share:</span>
                      <span className="font-bold" style={{ color: 'var(--color-green)' }}>
                        {(() => {
                          if (!depositAmount || Number(depositAmount) <= 0) return '—';
                          const newTotal       = totalUsdcNum + Number(depositAmount);
                          const newUserDeposit = userDepositNum + Number(depositAmount);
                          const share = newTotal > 0 ? newUserDeposit / newTotal : 0;
                          return (share * auctionPoolSupplyNum).toLocaleString(undefined, { maximumFractionDigits: 4 }) + ' RGD';
                        })()}
                      </span>
                    </div>

                    <button
                      disabled={depositDisabled}
                      onClick={handleDeposit}
                      className="btn-game-primary mt-auto"
                    >
                      {!depositAmount || depositAmountBigInt === 0n
                        ? 'Enter Amount'
                        : insufficientBal
                        ? 'Insufficient USDC'
                        : 'Deposit'}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* REDEEM PANEL */}
            {['awaiting_finalization', 'claimable', 'no_deposit', 'already_claimed'].includes(phase) && (
              <div className="flex flex-col gap-4 flex-1">
                <div>
                  <span className="terminal-pane-title block mb-1">Clearing Phase Status</span>
                  {phase === 'awaiting_finalization' && (
                    <div className="font-mono text-xs font-bold uppercase flex items-center gap-2"
                      style={{ color: 'var(--color-gold)' }}>
                      <span className="h-2 w-2 rounded-full animate-pulse"
                        style={{ background: 'var(--color-gold)' }} />
                      Awaiting Auction Close
                    </div>
                  )}
                  {phase === 'claimable' && (
                    <div className="font-mono text-xs font-bold uppercase flex items-center gap-2"
                      style={{ color: 'var(--color-green)' }}>
                      <span className="h-2 w-2 rounded-full animate-pulse"
                        style={{ background: 'var(--color-green)' }} />
                      Finalized — Claims Unlocked
                    </div>
                  )}
                  {phase === 'no_deposit' && (
                    <div className="font-mono text-xs font-bold uppercase"
                      style={{ color: 'var(--color-text2)' }}>
                      No deposit found for this wallet
                    </div>
                  )}
                  {phase === 'already_claimed' && (
                    <div className="font-mono text-xs font-bold uppercase flex items-center gap-2"
                      style={{ color: 'var(--color-green)' }}>
                      <span className="h-2 w-2 rounded-full"
                        style={{ background: 'var(--color-green)' }} />
                      Claimed
                    </div>
                  )}
                  {(phase === 'live' || phase === 'pending' || phase === 'loading') && (
                    <div className="font-mono text-xs font-bold uppercase"
                      style={{ color: 'var(--color-text2)' }}>
                      Auction still active — commit capital first
                    </div>
                  )}
                </div>

                <div className="rounded overflow-hidden font-mono text-xs"
                  style={{ border: '1px solid var(--color-border)' }}>
                  <div className="flex justify-between p-2.5"
                    style={{ background: 'var(--color-card2)', borderBottom: '1px solid var(--color-border)' }}>
                    <span style={{ color: 'var(--color-text2)' }}>{hasClaimed ? 'RGD Claimed:' : 'RGD to Claim:'}</span>
                    <span className="font-bold text-text">
                      {displayUserRgdShare > 0n
                        ? displayUserRgdNum.toLocaleString(undefined, { maximumFractionDigits: 4 }) + ' RGD'
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between p-2.5"
                    style={{ background: 'var(--color-card2)' }}>
                    <span style={{ color: 'var(--color-text2)' }}>% of Auction Pool:</span>
                    <span className="font-bold" style={{ color: 'var(--color-gold)' }}>
                      {userPoolShare > 0 ? `${userPoolShare.toFixed(2)}%` : '—'}
                    </span>
                  </div>
                </div>

                

                <button
                  disabled={phase !== 'claimable' || claimDisabled}
                  onClick={handleClaim}
                  className="btn-game-primary mt-auto"
                >
                  {phase === 'already_claimed' || claimIsSuccess
                    ? 'Claimed'
                    : phase === 'no_deposit'
                    ? 'Nothing to Claim'
                    : 'Claim Tokens'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Deposit Modal ── */}
      <TxModal
        status={depositStatus}
        txHashes={depositTxHashes}
        title="Depositing USDC"
        successTitle="Deposit Confirmed"
        successMessage="Your deposit has been confirmed on-chain."
        errorReason={errorReason}
        steps={[
          {
            label: 'Approve Spending Allowance',
            description: 'Allow contract to use your USDC',
            activeStatuses: ['approving', 'mining_approval'],
            completeStatuses: ['depositing', 'mining_deposit', 'success'],
          },
          {
            label: 'Confirm Deposit',
            description: 'Sign the deposit transaction',
            activeStatuses: ['depositing', 'mining_deposit'],
            completeStatuses: ['success'],
          },
        ]}
        onClose={() => { setDepositAmount(''); setDepositStatus('idle'); setErrorReason(null); setDepositTxHashes([null, null]); }}
      />

      {/* ── Claim Modal ── */}
      <TxModal
        status={claimStatus}
        txHashes={claimTxHashes}
        title="Claiming RGD"
        successTitle="Claim Confirmed"
        successMessage="Your RGD has been confirmed on-chain."
        errorReason={errorReason}
        steps={[
          {
            label: 'Confirm Claim',
            description: 'Sign the claim transaction',
            activeStatuses: ['claiming', 'mining_claim'],
            completeStatuses: ['success'],
          },
        ]}
        onClose={() => { setClaimStatus('idle'); setErrorReason(null); setClaimTxHashes([null]); }}
      />
    </>
  );
}
