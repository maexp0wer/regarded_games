'use client';

import React, { useMemo } from 'react';
import { useReadContract } from 'wagmi';
import { Address } from 'viem';

import GameSeasonAbi from '@/deployments/abis/GameSeason.json';
import { useSeasonGini } from '@/hooks/useSeasonGini';
import { SeasonPhasePills } from './SeasonPhasePills'; 

interface SeasonHeaderProps {
  seasonAddress: string;
  seasonName: string;
  playerCount: number;
  currentPhase: string | null;
  isBootstrap?: boolean; 
  isPayout?: boolean;
  isVictoryPending?: boolean; 
}

export function SeasonHeader({
  seasonAddress,
  seasonName,
  playerCount,
  currentPhase,
  isBootstrap,
  isPayout,
  isVictoryPending = false,
}: SeasonHeaderProps) {

  const { data: giniData } = useSeasonGini(seasonAddress as Address);
  
  const { data: gInitialRaw } = useReadContract({
    address: seasonAddress as Address,
    abi: GameSeasonAbi as any,
    functionName: 'g_initial',
    query: { enabled: !!seasonAddress && (currentPhase === 'TRADING' || currentPhase === 'PAYOUT' || currentPhase === 'ENDED') }
  });

  const { data: config } = useReadContract({
    address: seasonAddress as Address,
    abi: GameSeasonAbi as any,
    functionName: 'getConfig',
    query: { enabled: !!seasonAddress }
  });

  const calculatedVictoryPending = useMemo(() => {
    if (!seasonAddress || !config) return isVictoryPending;
    const rawGini = giniData?.gini || 0;
    const pCount = giniData?.playerCount || 0;
    const isAuctionPhase = currentPhase === 'AUCTION' || currentPhase === 'BOOTSTRAP';
    const gCurrVal = (isAuctionPhase && pCount === 0) ? 5000 : rawGini;
    const rawGInit = gInitialRaw ? Number(gInitialRaw) : 0;
    const gInitVal = isAuctionPhase ? gCurrVal : rawGInit;
    const gI_Norm = gInitVal / 10000;
    const getVal = (key: string, idx: number) => (config as any)[key] !== undefined ? (config as any)[key] : (config as any)[idx];
    const V = (Number(getVal('victoryThresholdBps', 3)) || 2500) / 10000;
    const rawBeta = (Number(getVal('beta', 4) || getVal('baseBeta', 4)) || 14000) / 10000;
    const M = rawBeta + Math.pow(1 - gI_Norm, 2);
    const capTargetNorm = gI_Norm + (V * (1 - gI_Norm));
    const socTargetNorm = gI_Norm * (1 - (M > 0 ? (V / M) : 0));
    return isVictoryPending || ((currentPhase === 'TRADING') && (gCurrVal >= capTargetNorm * 10000 || gCurrVal <= socTargetNorm * 10000));
  },[seasonAddress, config, giniData, gInitialRaw, currentPhase, isVictoryPending]);

  const num = seasonName.match(/\d+/)?.[0] ?? '–';

 return (
    <div
      className="card-app p-6 w-full grid gap-y-3 gap-x-4 grid-cols-[auto_1fr] md:grid-cols-2 lg:grid-cols-[auto_1fr]"
      style={{
        background: 'linear-gradient(180deg, var(--color-card2) 0%, var(--color-card) 100%)',
        borderColor: 'var(--color-border-bright)',
      }}
    >
      {/* 
        1. Season Number 
        Default/lg: Left side, spanning two rows (top to bottom)
        md: Top left, spanning entire width of the top row
      */}
      <p 
        className="col-start-1 row-start-1 row-span-2 md:col-span-2 md:row-span-1 lg:col-span-1 lg:row-span-2 font-display font-extrabold leading-[0.85] tracking-[-0.04em] text-text text-display-hero self-center"
      >
        S
        <em className="not-italic font-medium" style={{ color: 'var(--color-muted2)' }}>
          {num.padStart(2, '0')}
        </em>
      </p>

      {/* 
        2. Pill 
        Default/lg: Top Right
        md: Bottom Left
      */}
      <div className="col-start-2 row-start-1 justify-self-end md:col-start-1 md:row-start-2 md:justify-self-start lg:col-start-2 lg:row-start-1 lg:justify-self-end self-center md:mt-2 lg:mt-0">
        <SeasonPhasePills 
          phase={currentPhase ?? 'UNKNOWN'} 
          isVictoryPending={calculatedVictoryPending} 
          className="flex items-center" 
        />
      </div>

      {/* 
        3. Participants 
        Default/lg: Bottom Right
        md: Bottom Right
      */}
      <div className="col-start-2 row-start-2 justify-self-end self-end md:self-center lg:self-end md:mt-2 lg:mt-0 font-mono text-[12px] uppercase tracking-[0.04em] text-text2">
        <b className="font-mono text-[16px] font-semibold normal-case tracking-normal text-text mr-1">
          {playerCount.toLocaleString()}
        </b>
        participants
      </div>
    </div>
  );
}