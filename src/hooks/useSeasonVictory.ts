'use client';

import { useMemo } from 'react';
import { useReadContract } from 'wagmi';
import { Address } from 'viem';

import GameSeasonAbi from '@/deployments/abis/GameSeason.json';
import { useSeasonGini } from '@/hooks/useSeasonGini';
import { useSeasonPhase } from '@/hooks/useSeasonPhase';
import { useTenantChainId } from '@/context/TenantContext';

export interface SeasonVictoryState {
  gCurrent: number;
  gInitial: number;

  capTargetBps: number;
  socTargetBps: number;
  M_dynamic: number;

  winningSide: 'cap' | 'soc' | 'none';
  progressPercent: number;

  isVictoryPending: boolean;
  effectiveVictoryPending: boolean;

  finalProgressBps?: number;
  isOligarchyWin?: boolean;

  isLoading: boolean;
}

export function useSeasonVictory(seasonAddress: Address | string | undefined): SeasonVictoryState {
  const enabled = !!seasonAddress;

  const chainId = useTenantChainId();
  const phase = useSeasonPhase(seasonAddress);
  const { data: giniData, isLoading: isGiniLoading } = useSeasonGini(seasonAddress);

  const { isAuctionOrBootstrap, isTrading, isPayout, isTradingTimeExpired, config } = phase;

  const { data: gInitialRaw } = useReadContract({
    address: seasonAddress as Address,
    abi: GameSeasonAbi as any,
    functionName: 'g_initial',
    chainId,
    query: {
      enabled,
      refetchInterval: isAuctionOrBootstrap ? 3000 : undefined,
      staleTime: isAuctionOrBootstrap ? 0 : Infinity,
    },
  });

  const { data: finalProgressBpsRaw } = useReadContract({
    address: seasonAddress as Address,
    abi: GameSeasonAbi as any,
    functionName: 'finalProgressBps',
    chainId,
    query: { enabled: enabled && isPayout, staleTime: Infinity },
  });

  const { data: isOligarchyWinRaw } = useReadContract({
    address: seasonAddress as Address,
    abi: GameSeasonAbi as any,
    functionName: 'isOligarchyWin',
    chainId,
    query: { enabled: enabled && isPayout, staleTime: Infinity },
  });

  return useMemo<SeasonVictoryState>(() => {
    const safeDefaults: SeasonVictoryState = {
      gCurrent: 5000,
      gInitial: 5000,
      capTargetBps: 0,
      socTargetBps: 0,
      M_dynamic: 0,
      winningSide: 'none',
      progressPercent: 0,
      isVictoryPending: false,
      effectiveVictoryPending: isTradingTimeExpired,
      finalProgressBps: finalProgressBpsRaw !== undefined ? Number(finalProgressBpsRaw) : undefined,
      isOligarchyWin: isOligarchyWinRaw as boolean | undefined,
      isLoading: isGiniLoading || phase.isLoading,
    };
    if (!config) return safeDefaults;

    const rawGini = giniData?.gini || 0;
    const rawGInit = gInitialRaw ? Number(gInitialRaw) : 0;
    const playerCount = giniData?.playerCount || 0;

    let gCurrVal = 0;
    let gInitVal = 0;

    if (isAuctionOrBootstrap) {
      gCurrVal = playerCount === 0 ? 5000 : rawGini;
      gInitVal = gCurrVal;
    } else if (isPayout && finalProgressBpsRaw !== undefined && isOligarchyWinRaw !== undefined) {
      gInitVal = rawGInit;
      const gI = gInitVal / 10000;
      const V2 = config.victoryThresholdBps / 10000;
      const rawBeta2 = config.baseMultiplierBps / 10000;
      const M2 = rawBeta2 + Math.pow(1 - gI, 2);
      const capT = (gI + V2 * (1 - gI)) * 10000;
      const socT = (gI * (1 - (M2 > 0 ? V2 / M2 : 0))) * 10000;
      const finalProg = Number(finalProgressBpsRaw) / 10000;
      gCurrVal = isOligarchyWinRaw
        ? Math.round(gInitVal + (capT - gInitVal) * finalProg)
        : Math.round(gInitVal - (gInitVal - socT) * finalProg);
    } else {
      gInitVal = rawGInit;
      gCurrVal = rawGini;
    }

    const gI_Norm = gInitVal / 10000;
    const V = config.victoryThresholdBps / 10000;
    const rawBeta = config.baseMultiplierBps / 10000;
    const M = rawBeta + Math.pow(1 - gI_Norm, 2);

    const capTargetNorm = gI_Norm + V * (1 - gI_Norm);
    const socTerm = M > 0 ? V / M : 0;
    const socTargetNorm = gI_Norm * (1 - socTerm);
    const capTarget = capTargetNorm * 10000;
    const socTarget = socTargetNorm * 10000;

    let prog = 0;
    let side: 'cap' | 'soc' | 'none' = 'none';
    if (!isAuctionOrBootstrap) {
      if (gCurrVal > gInitVal) {
        side = 'cap';
        const dist = capTarget - gInitVal;
        const covered = gCurrVal - gInitVal;
        prog = dist > 0 ? (covered / dist) * 100 : 0;
      } else if (gCurrVal < gInitVal) {
        side = 'soc';
        const dist = gInitVal - socTarget;
        const covered = gInitVal - gCurrVal;
        prog = dist > 0 ? (covered / dist) * 100 : 0;
      }
    }

    const isVictoryPending = isTrading && (gCurrVal >= capTarget || gCurrVal <= socTarget);

    return {
      gCurrent: gCurrVal,
      gInitial: gInitVal,
      capTargetBps: capTarget,
      socTargetBps: socTarget,
      M_dynamic: M,
      winningSide: side,
      progressPercent: Math.min(Math.max(prog, 0), 100),
      isVictoryPending,
      effectiveVictoryPending: isVictoryPending || isTradingTimeExpired,
      finalProgressBps: finalProgressBpsRaw !== undefined ? Number(finalProgressBpsRaw) : undefined,
      isOligarchyWin: isOligarchyWinRaw as boolean | undefined,
      isLoading: isGiniLoading || phase.isLoading,
    };
  }, [
    config,
    giniData,
    gInitialRaw,
    finalProgressBpsRaw,
    isOligarchyWinRaw,
    isAuctionOrBootstrap,
    isTrading,
    isPayout,
    isTradingTimeExpired,
    isGiniLoading,
    phase.isLoading,
  ]);
}
