'use client';

import React from 'react';
import { useReadContract } from 'wagmi';
import { formatUnits, type Abi } from 'viem';
import { useTenantChainId } from '@/context/TenantContext';
import GameSeasonAbiJson from '@/deployments/abis/GameSeason.json';
import ExchangeAbiJson from '@/deployments/abis/Exchange.json';

const GameSeasonAbi = GameSeasonAbiJson as Abi;
const ExchangeAbi = ExchangeAbiJson as Abi;

interface PolicyCardProps {
  M_dynamic: number;
  seasonAddress: string;
  exchangeAddress: string;
  config: {
    baseMultiplierBps: number;
    victoryThresholdBps: number;
  } | null;
}

export function PolicyCard({ M_dynamic, seasonAddress, exchangeAddress, config }: PolicyCardProps) {
  const chainId = useTenantChainId();

  const { data: existentialThresholdRaw } = useReadContract({
    address: seasonAddress as `0x${string}`,
    abi: GameSeasonAbi,
    functionName: 'existentialThresholdFim',
    chainId,
    query: { enabled: !!seasonAddress, staleTime: Infinity },
  });

  const { data: tradeFeeBpsRaw } = useReadContract({
    address: exchangeAddress as `0x${string}`,
    abi: ExchangeAbi,
    functionName: 'tradeFeeBps',
    chainId,
    query: { enabled: !!exchangeAddress, staleTime: Infinity },
  });

  const existentialThreshold = existentialThresholdRaw ? Number(formatUnits(existentialThresholdRaw as bigint, 18)) : 0;
  const tradeFeeBps = (tradeFeeBpsRaw as bigint | undefined) ?? 0n;
  const feePct = Number(tradeFeeBps) / 100;

  return (
    <div className="terminal-pane h-full">
      <div className="terminal-pane-header">
        <span className="terminal-pane-title">Policy</span>
      </div>
      <div className="flex flex-col gap-3">
        <div className="kv-row">
          <span className="font-mono text-[11px] text-text2">Current Multiplier (M)</span>
          <span className="font-mono text-[13px] font-bold" style={{ color: 'var(--color-gold)', fontVariantNumeric: 'tabular-nums' }}>
            {M_dynamic.toFixed(3)}×
          </span>
        </div>
        <div className="kv-row">
          <span className="font-mono text-[11px] text-text2">Base Multiplier</span>
          <span className="font-mono text-[12px] font-semibold text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {((config?.baseMultiplierBps || 0) / 10000).toFixed(2)}×
          </span>
        </div>
        <div className="kv-row">
          <span className="font-mono text-[11px] text-text2">Victory Threshold</span>
          <span className="font-mono text-[12px] font-semibold text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {((config?.victoryThresholdBps || 0) / 100).toFixed(0)}%
          </span>
        </div>
        <div className="kv-row">
          <span className="font-mono text-[11px] text-text2">Trade Fees</span>
          <span className="font-mono text-[12px] font-semibold text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {feePct.toFixed(2)}%
          </span>
        </div>
        <div className="kv-row">
          <span className="font-mono text-[11px] text-text2">Existential Threshold</span>
          <span className="font-mono text-[12px] font-semibold text-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
            ${existentialThreshold.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
