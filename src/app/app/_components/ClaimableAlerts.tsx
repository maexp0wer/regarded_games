'use client';

import React, { useMemo } from 'react';
import { useChainId, usePublicClient, useAccount } from 'wagmi';
import { Address } from 'viem';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import coreDeployment from '@/deployments/core.json';
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';
import { usePayout } from '@/hooks/usePayout';

const CONTROLLER_ABI = [{
    "type": "function", "name": "seasons",
    "inputs": [{ "name": "", "type": "uint256" }],
    "outputs": [{ "name": "season", "type": "address" }, { "name": "a", "type": "address" }, { "name": "e", "type": "address" }, { "name": "f", "type": "address" }],
    "stateMutability": "view"
}] as const;

export function ClaimableAlerts({ playerAddress }: { playerAddress: string }) {
    const { address: connectedAddress } = useAccount();
    const chainId = useChainId();
    const publicClient = usePublicClient();
    
    const isOwner = connectedAddress?.toLowerCase() === playerAddress.toLowerCase();
    const controllerAddress = (coreDeployment as any)[chainId === 84532 ? 'Controller' : 'Controller'] as Address;

    const { data: concludedSeasons } = useQuery({
        queryKey: ['claimable-scan', playerAddress, chainId],
        queryFn: async () => {
            if (!publicClient || !controllerAddress) return [];
            const list = [];
            for (let i = 0; i < 30; i++) {
                try {
                    const data = await publicClient.readContract({
                        address: controllerAddress, abi: CONTROLLER_ABI, functionName: 'seasons', args: [BigInt(i)],
                    });
                    const phase = await publicClient.readContract({
                        address: data[0], abi: GameSeasonAbi as any, functionName: 'getPhase'
                    });
                    if (phase === 'PAYOUT' || phase === 'ENDED') {
                        list.push({ id: i + 1, season: data[0], phase: phase as string });
                    }
                } catch { break; }
            }
            return list;
        },
        enabled: !!playerAddress && isOwner 
    });

    if (!isOwner || !concludedSeasons || concludedSeasons.length === 0) return null;

    return (
        <div className="space-y-3 mb-8">
            {concludedSeasons.map((s) => (
                <ClaimableCard key={s.season} season={s} playerAddress={playerAddress} />
            ))}
        </div>
    );
}

function ClaimableCard({ season, playerAddress }: { season: any, playerAddress: string }) {
    // Destructured pnl from usePayout
    const { payout, pnl, loading } = usePayout(season.season, playerAddress as Address);

    if (loading || payout <= 0) return null;

    return (
        <Link href={`/season_${season.id}`} className="block group">
            <div className="bg-primary hover:brightness-110 transition-all rounded-xl p-4 shadow-lg shadow-primary/20 border border-white/10 flex items-center gap-6">
                
                {/* 1. ICON & SEASON INFO */}
                <div className="flex items-center gap-4 shrink-0">
                    <div className="bg-card/20 p-2 rounded-lg text-card">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                        </svg>
                    </div>

                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="text-card font-display font-black uppercase text-sm tracking-tight">
                                Season {season.id}
                            </span>
                            <span className="bg-card/20 text-card text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">
                                {season.phase}
                            </span>
                        </div>
                        <span className="text-card/70 text-[10px] font-bold uppercase tracking-widest">
                            Claimable Payout
                        </span>
                    </div>
                </div>

                {/* 2. SEASON PNL (Center Alignment) */}
                <div className="hidden sm:flex flex-col items-start mr-auto">
                    <span className="text-card/60 text-[9px] font-black uppercase tracking-widest mb-1">
                        Season PnL
                    </span>
                    <div className="px-2 py-0.5 rounded text-[11px] font-mono font-bold border border-card/20 bg-card/10 text-card">
    {pnl >= 0 ? '+' : '-'}${Math.abs(pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
</div>
                </div>

                {/* 3. CLAIMABLE AMOUNT (Right Alignment) */}
                <div className="flex flex-col items-end shrink-0">
                    <span className="text-card text-2xl font-black tracking-tighter leading-none">
                        ${payout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-card/60 text-[9px] font-black uppercase tracking-widest">
                        USDC Ready
                    </span>
                </div>

                {/* NAV ARROW */}
                <div className="text-card/40 group-hover:translate-x-1 transition-transform shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            </div>
        </Link>
    );
}