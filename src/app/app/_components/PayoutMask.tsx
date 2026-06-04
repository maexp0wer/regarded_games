'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';
import { usePayout } from '@/hooks/usePayout';
import { useOpenOrders } from '@/hooks/useOpenOrders';
import { useTenantChainId } from '@/context/TenantContext';
import { TxModal } from './TxModal';
import { WalletButton } from './WalletButton';

type TxStatus = 'idle' | 'executing' | 'mining' | 'success' | 'canceled' | 'failed' | 'no_gas';

interface PayoutMaskProps {
  seasonAddress: string;
  className?: string;
}

export function PayoutMask({ seasonAddress, className }: PayoutMaskProps) {
  const { address, isConnected } = useAccount();
  const chainId = useTenantChainId();
  const publicClient = usePublicClient({ chainId });

  const [status, setStatus] = useState<TxStatus>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [snapshotPnL, setSnapshotPnL] = useState<number | null>(null);

  const { writeContractAsync } = useWriteContract();

  const { payout, pnl: livePnL, userFim, contribution, fimBurned, realizedPayout, hasClaimed: hasClaimedChain, hasBalance, loading: calcLoading, error: payoutError, refetch: refetchPayout } =
    usePayout(seasonAddress, address);

  // Open sell orders escrow FIM; claimPayout() reverts (insufficient FIM to burn)
  // until they're cancelled or settled. Block the claim and tell the user why.
  const { data: openOrders = [] } = useOpenOrders(seasonAddress, address, 'open');
  const hasSellOrders = openOrders.some(o => !o.isBuy);

  // hasClaimed from the contract; optimistically true the instant a claim tx confirms.
  const hasClaimed = hasClaimedChain || status === 'success';

  // Every participant can claim to release their RGD collateral & burn FIM —
  // even with a $0 USDC payout. Gate only on having a stake and no escrow lock.
  const canClaim = !hasClaimed && !hasSellOrders && (payout > 0 || hasBalance);

  const displayPnL = useMemo(() => {
    if (snapshotPnL !== null && livePnL < snapshotPnL) return snapshotPnL;
    return livePnL;
  }, [snapshotPnL, livePnL]);

  useEffect(() => {
    if (status === 'success') refetchPayout();
  }, [status, refetchPayout]);

  const handleClaim = async () => {
    if (!canClaim || !publicClient || status !== 'idle') return;
    setSnapshotPnL(livePnL);
    setTxHash(null);

    try {
      setStatus('executing');
      const hash = await writeContractAsync({
        address: seasonAddress as `0x${string}`,
        abi: GameSeasonAbi as any,
        functionName: 'claimPayout',
        args: [],
      });
      setTxHash(hash);
      setStatus('mining');
      await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
      setStatus('success');
    } catch (err: any) {
      const isRejection = err.shortMessage?.includes('rejected') || err.message?.includes('User rejected');
      const isInsufficientGas = err.message?.includes('insufficient funds') || err.name === 'InsufficientFundsError';
      if (isRejection) {
        setStatus('canceled');
        setTimeout(() => setStatus('idle'), 2000);
      } else if (isInsufficientGas) {
        setStatus('no_gas');
      } else {
        setStatus('failed');
      }
    }
  };

  const handleClose = () => {
    setStatus('idle');
    setTxHash(null);
    setSnapshotPnL(null);
  };

  if (!isConnected) {
    return (
      <div className={`terminal-pane connect-gate mx-auto${className ? ` ${className}` : ''}`}>
        <div className="terminal-pane-header">
          <span className="terminal-pane-title">Payout</span>
        </div>
        <div className="connect-gate-body">
          <span className="terminal-pane-title" style={{ color: 'var(--color-text2)' }}>Connect your wallet to participate</span>
          <WalletButton />
        </div>
      </div>
    );
  }

  const isBusy = status === 'executing' || status === 'mining';
  const isButtonDisabled = isBusy || !canClaim;
  const pnlPositive = displayPnL >= 0;
  const contribPositive = contribution >= 0;
  const displayFim = hasClaimed ? fimBurned : userFim;
  const displayPayout = hasClaimed ? realizedPayout : payout;

  return (
    <>
    <div className={`flex flex-col gap-5 w-full bg-card border border-border rounded-lg p-5 mx-auto${className ? ` ${className}` : ''}`}>

      {/* Header */}
      <div className="terminal-pane-header">
        <span className="terminal-pane-title">Payout Settlement</span>
        <span className="font-mono text-[10px] bg-[var(--color-card2)] border border-[var(--color-border)] px-2 py-0.5 rounded text-text2 uppercase tracking-wider flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${hasClaimed ? 'bg-[var(--color-text2)]' : 'bg-[var(--color-green)] animate-pulse'}`} />
          {hasClaimed ? 'Settled' : 'Active'}
        </span>
      </div>

      {/* Audit Matrix */}
      <div className="grid grid-cols-2 gap-3">
        <div className="terminal-pane p-2.5">
          <span className="terminal-pane-title block mb-0.5">{hasClaimed ? 'FIM Burned' : 'Your Holdings'}</span>
          <span className="font-mono text-sm font-bold text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {displayFim.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            <span className="ml-1 text-[10px] text-text2">FIM</span>
          </span>
        </div>

        <div className="terminal-pane p-2.5">
          <span className="terminal-pane-title block mb-0.5">Contribution</span>
          <span
            className="font-mono text-sm font-bold"
            style={{ color: contribPositive ? 'var(--color-green)' : 'var(--color-red)', fontVariantNumeric: 'tabular-nums' }}
          >
            {contribution > 0 ? '+' : ''}{contribution.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            <span className="ml-1 text-[10px] text-text2">USDC</span>
          </span>
        </div>

        <div className="terminal-pane p-2.5 col-span-2">
          <div className="flex justify-between items-center">
            <span className="terminal-pane-title">Season P / L</span>
            {!calcLoading && (
              <span
                className="font-mono text-[10px] font-bold"
                style={{ color: pnlPositive ? 'var(--color-green)' : 'var(--color-red)' }}
              >
                {pnlPositive ? '▲ SURPLUS' : '▼ DEFICIT'}
              </span>
            )}
          </div>
          {calcLoading ? (
            <div className="h-5 w-28 rounded animate-pulse mt-1" style={{ background: 'var(--color-border)' }} />
          ) : (
            <span
              className="font-mono text-base font-black block mt-0.5"
              style={{ color: pnlPositive ? 'var(--color-green)' : 'var(--color-red)', fontVariantNumeric: 'tabular-nums' }}
            >
              {pnlPositive ? '+' : '-'}${Math.abs(displayPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="ml-1 text-[10px] text-text2">USDC</span>
            </span>
          )}
        </div>
      </div>

      {/* Checkout Vault */}
      <div className="bg-card2 border border-border2 rounded-md p-4 flex flex-col items-center justify-center text-center relative overflow-hidden before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.75 before:bg-green">
        <span className="font-mono text-[10px] font-bold text-text2 uppercase tracking-widest mb-1">
          {hasClaimed ? 'Total Claimed' : payout > 0 ? 'Net Disbursable Balance' : 'No Payout Due'}
        </span>
        {calcLoading ? (
          <div className="h-9 w-36 rounded animate-pulse" style={{ background: 'var(--color-border)' }} />
        ) : (
          <div
            className="font-mono text-3xl font-black tracking-tighter"
            style={{ color: displayPayout > 0 ? 'var(--color-green)' : 'var(--color-text2)', fontVariantNumeric: 'tabular-nums' }}
          >
            ${displayPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-xs font-bold text-text2 ml-1">USDC</span>
          </div>
        )}
      </div>

      {payoutError && (
        <p className="text-red-500 font-mono text-[11px] text-center">{payoutError}</p>
      )}

      {/* CTA */}
      {hasClaimed ? null : hasSellOrders ? (
        <div
          className="px-5 py-4 rounded-lg text-center"
          style={{ background: 'var(--color-card2)', border: '1px dashed var(--color-red-35)' }}
        >
          <p className="font-mono text-[11px] uppercase font-bold tracking-widest text-red">Open Sell Orders</p>
          <p className="font-mono text-[10px] text-text2 mt-1">
            Cancel your open sell orders in the Open Orders tab before claiming — escrowed FIM blocks settlement.
          </p>
        </div>
      ) : payout > 0 || hasBalance ? (
        <div className="flex flex-col gap-2">
          <button
            onClick={handleClaim}
            disabled={isButtonDisabled}
            className={`btn-terminal-action action-buy py-3 text-sm font-black tracking-widest ${isButtonDisabled ? 'opacity-60 cursor-not-allowed!' : ''}`}
          >
            {isBusy ? 'Confirming on Chain…' : payout > 0 ? 'Claim' : 'Claim & Unlock Collateral'}
          </button>
          {payout === 0 && (
            <p className="font-mono text-[10px] text-text2 text-center opacity-70">
              No USDC payout due, but claiming releases your staked RGD.
            </p>
          )}
        </div>
      ) : (
        <div
          className="px-5 py-4 rounded-lg text-center"
          style={{ background: 'var(--color-card2)', border: '1px dashed var(--color-border2)' }}
        >
          <p className="font-mono text-[11px] uppercase font-bold tracking-widest text-text2">Ineligible</p>
          <p className="font-mono text-[10px] text-text2 mt-1 opacity-60">You did not participate in this season</p>
        </div>
      )}

    </div>

    <TxModal
      status={status}
      txHashes={[txHash]}
      title="Claiming Payout"
      successTitle="Payout Claimed"
      successMessage="Your USDC has been sent to your wallet."
      steps={[
        {
          label: 'Claim Payout',
          description: 'Sign the payout withdrawal transaction',
          activeStatuses: ['executing', 'mining'],
          completeStatuses: ['success'],
        },
      ]}
      onClose={handleClose}
    />
    </>
  );
}
