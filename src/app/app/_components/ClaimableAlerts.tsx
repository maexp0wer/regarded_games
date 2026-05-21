'use client';

import React from 'react';
import { useChainId, usePublicClient, useAccount } from 'wagmi';
import { Address } from 'viem';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import coreDeployment from '@/deployments/local/core.json';
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';
import { usePayout } from '@/hooks/usePayout';

const CONTROLLER_ABI = [{
  type: 'function', name: 'seasons',
  inputs: [{ name: '', type: 'uint256' }],
  outputs: [
    { name: 'season', type: 'address' }, { name: 'a', type: 'address' },
    { name: 'e', type: 'address' },      { name: 'f', type: 'address' },
  ],
  stateMutability: 'view',
}] as const;

export function ClaimableAlerts({ playerAddress }: { playerAddress: string }) {
  const { address: connectedAddress } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const isOwner = connectedAddress?.toLowerCase() === playerAddress.toLowerCase();
  const controllerAddress = (coreDeployment as any).Controller as Address;

  const { data: concludedSeasons } = useQuery({
    queryKey: ['claimable-scan', playerAddress, chainId],
    queryFn: async () => {
      if (!publicClient || !controllerAddress) return [];
      const list = [];
      for (let i = 0; i < 30; i++) {
        try {
          const data = await publicClient.readContract({ address: controllerAddress, abi: CONTROLLER_ABI, functionName: 'seasons', args: [BigInt(i)] });
          const phase = await publicClient.readContract({ address: data[0], abi: GameSeasonAbi as any, functionName: 'getPhase' });
          if (phase === 'PAYOUT' || phase === 'ENDED') list.push({ id: i + 1, season: data[0], phase: phase as string });
        } catch { break; }
      }
      return list;
    },
    enabled: !!playerAddress && isOwner,
  });

  if (!isOwner || !concludedSeasons || concludedSeasons.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 mb-8">
      {concludedSeasons.map((s) => (
        <ClaimableCard key={s.season} season={s} playerAddress={playerAddress} />
      ))}
    </div>
  );
}

function ClaimableCard({ season, playerAddress }: { season: any; playerAddress: string }) {
  const { payout, pnl, loading } = usePayout(season.season, playerAddress as Address);

  if (loading || payout <= 0) return null;

  const pnlPositive = pnl >= 0;

  return (
    <Link href={`/season_${season.id}`} className="block group">
      <div
        className="flex items-center gap-5 px-5 py-4 rounded-xl transition-all"
        style={{
          background: 'linear-gradient(135deg, var(--color-gold-15), var(--color-gold-15))',
          border: '1px solid var(--color-gold-35)',
          boxShadow: '0 4px 20px -8px var(--color-gold-35)',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, var(--color-gold-35), var(--color-gold-15))'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, var(--color-gold-15), var(--color-gold-15))'; }}
      >
        {/* Bell icon */}
        <div
          className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl"
          style={{ background: 'var(--color-gold-15)' }}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" style={{ color: 'var(--color-gold)' }}>
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
          </svg>
        </div>

        {/* Season info */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-[13px] uppercase" style={{ color: 'var(--color-gold)' }}>
              Season {season.id}
            </span>
            <span
              className="font-mono text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest"
              style={{ background: 'var(--color-gold-15)', color: 'var(--color-gold)' }}
            >
              {season.phase}
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-gold-70)' }}>
            Claimable Payout
          </span>
        </div>

        {/* PnL */}
        <div className="hidden sm:flex flex-col mr-auto">
          <span className="section-label mb-1">Season PnL</span>
          <span
            className="font-mono text-[12px] font-semibold"
            style={{ color: pnlPositive ? 'var(--color-green)' : 'var(--color-red)', fontVariantNumeric: 'tabular-nums' }}
          >
            {pnlPositive ? '+' : '-'}${Math.abs(pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Amount */}
        <div className="flex flex-col items-end shrink-0">
          <span
            className="font-display font-extrabold leading-none text-summary-value"
            style={{ color: 'var(--color-gold)', fontVariantNumeric: 'tabular-nums' }}
          >
            ${payout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--color-gold-70)' }}>
            USDC Ready
          </span>
        </div>

        {/* Arrow */}
        <svg
          className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-1"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
          style={{ color: 'var(--color-gold-70)' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}
