'use client';

import React, { useState } from 'react';
import { useChainId, usePublicClient } from 'wagmi'; 
import { Address, getAddress } from 'viem';
import { base, baseSepolia, foundry } from 'wagmi/chains';
import { useQuery } from '@tanstack/react-query';
import coreDeployment from '@/deployments/core.json';
import { SeasonGiniMicro } from '../_components/SeasonGiniMicro';
import { useSeasonGini } from '@/hooks/useSeasonGini';

import GameSeasonAbi from '@/deployments/abis/GameSeason.json';

const GAME_CONTROLLER_SEASONS_ABI = [
  {
    "type": "function",
    "name": "seasons",
    "inputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "outputs": [
      { "name": "season", "type": "address" },
      { "name": "auction", "type": "address" },
      { "name": "exchange", "type": "address" },
      { "name": "fim", "type": "address" }
    ],
    "stateMutability": "view"
  },
] as const;

const GAME_SEASON_FULL_ABI = GameSeasonAbi as any; 

type SeasonRegistry = {
  season: Address;
  auction: Address;
  exchange: Address;
  fim: Address;
  phase: string;
  auctionStartTime: number; 
  tradingStartTime: number;
  seasonEndTime: number;
  gameDuration: number;
};

const getControllerAddress = (chainId: number): Address | undefined => {
  const chainNameMap: { [key: number]: string } = {
    [foundry.id]: 'Controller',
    [baseSepolia.id]: 'Controller',
    [base.id]: 'Controller',
  };
  const chainName = chainNameMap[chainId];
  if (!chainName) return undefined;
  const controllerAddress = (coreDeployment as any)[chainName] as Address | undefined;
  return controllerAddress ? getAddress(controllerAddress) : undefined;
};

const formatTime = (timestamp: number) => {
    if (!timestamp || timestamp === 0) return 'N/A';
    return new Date(timestamp * 1000).toLocaleString();
};

// Sub-component for each card to handle its own live Ponder data
function SeasonCard({ season, totalCount, index }: { season: SeasonRegistry, totalCount: number, index: number }) {
    // This hook now fetches both Gini and PrizePool from Ponder
    const { data: ponderData } = useSeasonGini(season.season);
    
    const livePrizePool = ponderData?.prizePool ?? 0;

    return (
        <div className="p-4 rounded-lg"
             style={{ backgroundColor: 'var(--color-card2)' }}>
            
            <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-lg font-display" style={{ color: 'var(--color-primary)' }}>
                    Season {totalCount - index} 
                </span>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    season.phase === 'TRADING' ? 'bg-success text-bg' : 
                    (season.phase === 'BOOTSTRAP' || season.phase === 'AUCTION') ? 'bg-info text-bg' :
                    'bg-card3 text-text'
                }`}>
                    {season.phase}
                </span>
            </div>
            
            <div className="text-sm space-y-1 pt-2" style={{ color: 'var(--color-text2)', borderTop: '1px solid var(--color-border)' }}>
                <p>
                    Prize Pool: 
                    <span style={{ color: 'var(--color-text)' }} className="font-medium ml-1">
                        ${livePrizePool.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                    </span>
                </p>

                <SeasonGiniMicro seasonAddress={season.season} phase={season.phase} />
                
                <div className="mt-2 pt-2 border-t border-border/50">
                    <p>Auction Start: <span style={{ color: 'var(--color-text)' }}>{formatTime(season.auctionStartTime)}</span></p>
                    <p>Trading Start: <span style={{ color: 'var(--color-text)' }}>{formatTime(season.tradingStartTime)}</span></p>
                    <p>Season End: <span style={{ color: 'var(--color-text)' }}>{formatTime(season.seasonEndTime)}</span></p>
                </div>
                
                <p className="text-xs font-mono truncate mt-2">
                    Contract: <code style={{ backgroundColor: 'var(--color-card3)', color: 'var(--color-text)' }} className="px-1 rounded">{season.season}</code>
                </p>
            </div>
        </div>
    );
}

export function SeasonsList() {
  const chainId = useChainId();
  const controllerAddress = getControllerAddress(chainId);
  const [showAll, setShowAll] = useState(false);
  const publicClient = usePublicClient(); 

  const { data: seasonsData, isLoading } = useQuery({
    queryKey: ['allSeasons', chainId, controllerAddress],
    queryFn: async () => {
        if (!controllerAddress || !publicClient) return [];
        const allSeasons: SeasonRegistry[] = [];
        for (let i = 0; i < 50; i++) {
            try {
                const data = await publicClient.readContract({
                    address: controllerAddress,
                    abi: GAME_CONTROLLER_SEASONS_ABI,
                    functionName: 'seasons',
                    args: [BigInt(i)] as const,
                }) as [Address, Address, Address, Address];

                const cfg: any = await publicClient.readContract({ 
                    address: data[0], abi: GAME_SEASON_FULL_ABI, functionName: 'getConfig' 
                });

                const cAt = Number((cfg.createdAt ?? cfg[0]).toString());
                const aDu = Number((cfg.auctionDuration ?? cfg[1]).toString());
                const gDu = Number((cfg.gameDuration ?? cfg[2]).toString());
                const ph = await publicClient.readContract({ 
                    address: data[0], abi: GAME_SEASON_FULL_ABI, functionName: 'getPhase' 
                });

                allSeasons.push({
                    season: data[0], auction: data[1], exchange: data[2], fim: data[3],
                    phase: ph as string, auctionStartTime: cAt,
                    tradingStartTime: cAt + aDu, seasonEndTime: cAt + aDu + gDu, gameDuration: gDu
                });
            } catch { break; }
        }
        return allSeasons;
    },
    enabled: !!controllerAddress && !!publicClient,
  });

  if (isLoading) return <p style={{ color: 'var(--color-primary)' }}>Loading seasons data...</p>;

  const display = [...(seasonsData || [])].reverse();
  const filtered = display.filter(s => showAll ? true : s.phase !== 'ENDED');

  return (
    <div className="p-6 rounded-xl shadow-xl w-full max-w-3xl"
         style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)'}}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Seasons</h2>
        <button onClick={() => setShowAll(!showAll)} className="btn-three py-2 px-4 text-sm">
          {showAll ? 'Show Active' : 'Show All'}
        </button>
      </div>
      <div className="space-y-4">
        {filtered.map((s, i) => <SeasonCard key={s.season} season={s} totalCount={display.length} index={i} />)}
      </div>
    </div>
  );
}