'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';
import { usePayout } from '@/hooks/usePayout';

interface PayoutMaskProps {
  seasonAddress: string;
}

export function PayoutMask({ seasonAddress }: PayoutMaskProps) {
  const { address, isConnected } = useAccount();

  const [snapshotPnL, setSnapshotPnL] = useState<number | null>(null);
  const [transactionSent, setTransactionSent] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const { writeContract, data: hash, isPending: isWritePending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { data: isOligarchyWin } = useReadContract({
    address: seasonAddress as `0x${string}`, abi: GameSeasonAbi as any,
    functionName: 'isOligarchyWin', query: { enabled: !!seasonAddress },
  });
  const { data: finalProgressBps } = useReadContract({
    address: seasonAddress as `0x${string}`, abi: GameSeasonAbi as any,
    functionName: 'finalProgressBps', query: { enabled: !!seasonAddress },
  });

  const { payout, pnl: livePnL, userFim, userNetContrib, realizedPayout, loading: calcLoading, refetch: refetchPayout } =
    usePayout(seasonAddress, address);

  const canClaim = payout > 0;

  useEffect(() => {
    if (isSuccess) {
      setShowSuccessToast(true);
      const t = setTimeout(() => setShowSuccessToast(false), 3000);
      return () => clearTimeout(t);
    }
  }, [isSuccess]);

  useEffect(() => {
    if (isWritePending) { setTransactionSent(true); setSnapshotPnL(livePnL); }
    if (isSuccess) {
      refetchPayout();
      const t = setTimeout(() => { setSnapshotPnL(null); setTransactionSent(false); reset(); }, 10000);
      return () => clearTimeout(t);
    }
    if (userFim > 0 && transactionSent) refetchPayout();
  }, [isWritePending, isSuccess, refetchPayout, reset, transactionSent, livePnL, userFim]);

  const displayPnL = useMemo(() => {
    if (snapshotPnL !== null && livePnL < snapshotPnL) return snapshotPnL;
    return livePnL;
  }, [snapshotPnL, livePnL]);

  const hasClaimed = useMemo(() =>
    realizedPayout > 0 || (transactionSent && payout === 0),
    [realizedPayout, transactionSent, payout]
  );

  const handleClaim = () => {
    if (!canClaim || isWritePending || isConfirming) return;
    setTransactionSent(true);
    writeContract({ address: seasonAddress as `0x${string}`, abi: GameSeasonAbi as any, functionName: 'claimPayout', args: [] });
  };

  if (!isConnected) {
    return (
      <div className="card-app flex items-center justify-center h-full text-center">
        <p className="font-mono text-[13px] text-text2">Connect wallet to check payout eligibility.</p>
      </div>
    );
  }

  const isButtonDisabled = isWritePending || isConfirming || !canClaim || hasClaimed;

  const pnlPositive = displayPnL > 0;
  const pnlColor    = pnlPositive ? 'var(--color-green)' : displayPnL < 0 ? 'var(--color-red)' : 'var(--color-text2)';
  const netPositive = userNetContrib > 0;
  const netColor    = netPositive ? 'var(--color-green)' : userNetContrib < 0 ? 'var(--color-red)' : 'var(--color-text2)';

  return (
    <div
      className="card-app flex flex-col gap-5 h-full"
      style={{ borderColor: 'var(--color-border-bright)' }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between pb-3"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <p className="section-label">Payout</p>
        
      </div>

      {/* ── Stats 2×2 grid ── */}
      <div
        className="grid grid-cols-2 rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--color-border)' }}
      >
        {/* Your Holdings */}
        <div className="flex flex-col gap-1 p-4" style={{ background: 'var(--color-card2)', borderRight: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
          <span className="section-label">{hasClaimed ? 'FIM Burned' : 'Your Holdings'}</span>
          {hasClaimed ? (
            <span className="font-mono text-[13px] text-text2 italic">Settled</span>
          ) : (
            <span className="font-mono font-semibold text-[15px] text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {userFim.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              <span className="ml-1 text-[10px] text-text2">FIM</span>
            </span>
          )}
        </div>

        {/* Net Contribution */}
        <div className="flex flex-col gap-1 p-4" style={{ background: 'var(--color-card2)', borderBottom: '1px solid var(--color-border)' }}>
          <span className="section-label">Net Contribution</span>
          <span className="font-mono font-semibold text-[15px]" style={{ color: netColor, fontVariantNumeric: 'tabular-nums' }}>
            {userNetContrib > 0 ? '+' : ''}{userNetContrib.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            <span className="ml-1 text-[10px] text-text2">USDC</span>
          </span>
        </div>

        {/* Claimable / Claimed */}
        <div className="flex flex-col gap-1 p-4" style={{ background: 'var(--color-card2)', borderRight: '1px solid var(--color-border)' }}>
          <span className="section-label" style={{ color: canClaim && !hasClaimed ? 'var(--color-gold)' : undefined }}>
            {canClaim && !hasClaimed ? 'Claimable Now' : 'Total Claimed'}
          </span>
          {calcLoading ? (
            <div className="h-5 w-20 rounded animate-pulse" style={{ background: 'var(--color-border)' }} />
          ) : (
            <span className="font-mono font-semibold text-[15px]" style={{ color: canClaim && !hasClaimed ? 'var(--color-gold)' : 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>
              ${(canClaim && !hasClaimed ? payout : realizedPayout).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="ml-1 text-[10px] text-text2">USDC</span>
            </span>
          )}
        </div>

        {/* Season PnL */}
        <div className="flex flex-col gap-1 p-4" style={{ background: 'var(--color-card2)' }}>
          <span className="section-label">Season PnL</span>
          {calcLoading ? (
            <div className="h-5 w-20 rounded animate-pulse" style={{ background: 'var(--color-border)' }} />
          ) : (
            <span className="font-mono font-semibold text-[15px]" style={{ color: pnlColor, fontVariantNumeric: 'tabular-nums' }}>
              {pnlPositive ? '+' : '-'}{Math.abs(displayPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="ml-1 text-[10px] text-text2">USDC</span>
            </span>
          )}
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="mt-auto">
        {showSuccessToast ? (
          <div className="btn-success w-full text-center py-4 animate-pulse rounded-xl font-mono font-bold text-[11px] uppercase tracking-widest">
            Payout Claimed Successfully ✓
          </div>
        ) : canClaim ? (
          <button
            onClick={handleClaim}
            disabled={isButtonDisabled}
            className={`w-full btn-primary py-4 ${isButtonDisabled ? 'opacity-60 cursor-not-allowed!' : ''}`}
          >
            {isWritePending || isConfirming ? 'Confirming on Chain…' : 'Claim Payout'}
          </button>
        ) : !hasClaimed ? (
          <div
            className="px-5 py-4 rounded-xl text-center"
            style={{ background: 'var(--color-card2)', border: '1px dashed var(--color-border-bright)' }}
          >
            <p className="font-mono text-[11px] uppercase font-bold tracking-widest text-text2">Ineligible</p>
            <p className="font-mono text-[10px] text-text2 mt-1 opacity-60">You did not participate in this season</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
