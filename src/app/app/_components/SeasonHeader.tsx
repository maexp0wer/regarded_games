'use client';

import React, { useMemo } from 'react';
import { useReadContract } from 'wagmi';
import { Address } from 'viem';

// Adjust these imports to match your actual structure
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
  isVictoryPending = false, // Fallback if seasonAddress is not provided
}: SeasonHeaderProps) {

  // 1. Fetch on-chain data required for Victory Math
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

  // 2. Calculate actual pending status (mirrors SeasonCard and Player Dashboard)
  const calculatedVictoryPending = useMemo(() => {
    // If no address or config is available yet, fallback to the passed prop
    if (!seasonAddress || !config) return isVictoryPending;

    const rawGini = giniData?.gini || 0;
    const pCount = giniData?.playerCount || 0;
    
    const isAuctionPhase = currentPhase === 'AUCTION' || currentPhase === 'BOOTSTRAP';
    const gCurrVal = (isAuctionPhase && pCount === 0) ? 5000 : rawGini;
    
    const rawGInit = gInitialRaw ? Number(gInitialRaw) : 0;
    const gInitVal = isAuctionPhase ? gCurrVal : rawGInit;

    const gI_Norm = gInitVal / 10000;

    // Parse tuple/struct from Wagmi safely
    const getVal = (key: string, idx: number) => (config as any)[key] !== undefined ? (config as any)[key] : (config as any)[idx];
    const V = (Number(getVal('victoryThresholdBps', 3)) || 2500) / 10000;
    const rawBeta = (Number(getVal('beta', 4) || getVal('baseBeta', 4)) || 14000) / 10000;
    
    const M = rawBeta + Math.pow(1 - gI_Norm, 2);

    const capTargetNorm = gI_Norm + (V * (1 - gI_Norm));
    const socTerm = M > 0 ? (V / M) : 0;
    const socTargetNorm = gI_Norm * (1 - socTerm);

    const capTarget = capTargetNorm * 10000;
    const socTarget = socTargetNorm * 10000;

    return (currentPhase === 'TRADING') && (gCurrVal >= capTarget || gCurrVal <= socTarget);
  }, [seasonAddress, config, giniData, gInitialRaw, currentPhase, isVictoryPending]);

  /* Season slug → display number: "season_1" → "1", fallback "–" */
  const num = seasonName.match(/\d+/)?.[0] ?? '–';

  return (
    <div
      className="card-app flex flex-col justify-between gap-3"
      style={{
        background: 'linear-gradient(180deg, var(--color-card2) 0%, var(--color-card) 100%)',
        borderColor: 'var(--color-border-bright)',
      }}
    >
      {/* Big season number */}
      <p
        className="font-display font-extrabold leading-[0.85] tracking-[-0.04em] text-text text-display-hero"
      >
        S
        <em className="not-italic font-medium" style={{ color: 'var(--color-muted2)' }}>
          {num.padStart(2, '0')}
        </em>
      </p>

      {/* Bottom meta strip */}
      <div
        className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[12px] uppercase tracking-[0.04em] -mb-2 text-text2"
      >
        <div>
          Participants
          <b className="block font-mono text-[16px] font-semibold normal-case tracking-normal mt-1 text-text">
            {playerCount.toLocaleString()}
          </b>
        </div>
        
        <div>
          Phase
          <SeasonPhasePills 
            phase={currentPhase ?? 'UNKNOWN'} 
            isVictoryPending={calculatedVictoryPending} 
            className="flex items-center flex-wrap gap-2 mt-1" 
          />
        </div>
      </div>
    </div>
  );
}