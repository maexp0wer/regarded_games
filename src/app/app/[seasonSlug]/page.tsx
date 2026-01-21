'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSeasonById, useSeasonGini } from '@/hooks/useSeasonGini';
import { useReadContract } from 'wagmi';
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';
import { AuctionGiniDisplay } from '../_components/AuctionGiniDisplay';
import { TradingGiniDisplay } from '../_components/TradingGiniDisplay';

// --- Sub-Component: Dates & Live Countdown ---
function SeasonDates({ config, currentPhase }: { config: any, currentPhase: string }) {
  const auctionStart = config.createdAt;
  const tradingStart = config.createdAt + config.auctionDuration;
  const seasonEnd = config.createdAt + config.auctionDuration + config.gameDuration;

  const [countdown, setCountdown] = useState("");

  const formatDate = (ts: number) => {
    if (!ts) return "N/A";
    return new Date(ts * 1000).toLocaleDateString(undefined, { 
      month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  useEffect(() => {
    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      let target = 0;

      if (currentPhase === "AUCTION" || currentPhase === "BOOTSTRAP") target = tradingStart;
      else if (currentPhase === "TRADING") target = seasonEnd;

      if (target === 0 || target <= now) {
        setCountdown("Phase Transitioning...");
        return;
      }

      const diff = target - now;
      const d = Math.floor(diff / 86400);
      const h = Math.floor((diff % 86400) / 3600);
      const m = Math.floor((diff % 3600) / 60);
      setCountdown(`${d}d ${h}h ${m}m`);
    };

    updateCountdown();
    const id = setInterval(updateCountdown, 60000);
    return () => clearInterval(id);
  }, [currentPhase, tradingStart, seasonEnd]);

  return (
    <div className="space-y-6">
      <div className="bg-card p-4 rounded-xl text-center shadow-lg">
        <p className="text-[10px] uppercase font-black text-text/70 tracking-widest">Time Remaining in {currentPhase}</p>
        <p className="text-2xl font-bold text-text font-display">{countdown}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Auction Start", date: auctionStart },
          { label: "Trading Start", date: tradingStart },
          { label: "Season End", date: seasonEnd }
        ].map((item) => (
          <div key={item.label} className="p-4 rounded-lg bg-card ">
            <p className="text-[10px] uppercase font-bold text-text2 mb-1">{item.label}</p>
            <p className="text-sm font-bold text-text">{formatDate(item.date)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Sub-Component: Season Manifest ---
function SeasonManifest({ config }: { config: any }) {
  // Compensation Multiplier logic: beta / 10,000

  //const multiplier = (config.baseBeta / 10000) + (1 - data?.gini / 10000) ** 2;
  const multiplier = (config.baseBeta / 10000).toLocaleString(undefined, { 
    minimumFractionDigits: 1, maximumFractionDigits: 1 
  });

  const policyItems = [
    { label: "Buyback", value: config.buybackBps },
    { label: "Reinvest", value: config.reinvestBps },
    { label: "Liquidity", value: config.liquidityBps },
    { label: "DAO Treasury", value: config.daoBps },
  ].filter(item => item.value > 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="p-6 rounded-xl  bg-card">
        <h3 className="text-xs font-bold uppercase text-text2 mb-4 border-b border-border/50 pb-2">Economic Policy</h3>
        <div className="space-y-3">
          {policyItems.map(item => (
            <div key={item.label} className="flex justify-between items-center">
              <span className="text-sm text-text2">{item.label} Percentage</span>
              <span className="text-lg font-bold text-text">{(item.value / 100)}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 rounded-xl  bg-card">
        <h3 className="text-xs font-bold uppercase text-text2 mb-4 border-b border-border/50 pb-2">Game Mechanics</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-text2">Compensation Multiplier</span>
            <span className="text-xl font-bold text-primary">{multiplier.replace(".", ",")}x</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-text2">Victory Threshold</span>
            <span className="text-xl font-bold text-text">{config.victoryThresholdBps} BPS</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main Page Component ---
export default function SeasonDetailPage() {
  const { seasonSlug } = useParams() as { seasonSlug: string };
  const router = useRouter();

  const { data: metadata, isLoading: isMetaLoading } = useSeasonById(seasonSlug);
  const { data: ponderStats } = useSeasonGini(metadata?.address);

  const { data: rawConfig, isLoading: isConfigLoading } = useReadContract({
    address: metadata?.address as `0x${string}`,
    abi: GameSeasonAbi as any,
    functionName: 'getConfig',
    query: { enabled: !!metadata?.address, staleTime: Infinity }
  });

  const { data: phase } = useReadContract({
    address: metadata?.address as `0x${string}`,
    abi: GameSeasonAbi as any,
    functionName: 'getPhase',
    query: { enabled: !!metadata?.address }
  });

  const config = useMemo(() => {
    if (!rawConfig) return null;
    const r = rawConfig as any;
    
    // Safely extract from either named keys or array indices
    const getVal = (key: string, index: number) => {
        const val = r[key] !== undefined ? r[key] : r[index];
        return val ? Number(val.toString()) : 0;
    };

    return {
      createdAt: getVal('createdAt', 0),
      auctionDuration: getVal('auctionDuration', 1),
      gameDuration: getVal('gameDuration', 2),
      victoryThresholdBps: getVal('victoryThresholdBps', 3),
      baseBeta: getVal('beta', 4), 
      buybackBps: getVal('buybackBps', 5),
      liquidityBps: getVal('liquidityBps', 6),
      reinvestBps: getVal('reinvestBps', 7),
      daoBps: getVal('daoBps', 8),
    };
  }, [rawConfig]);

  if (isMetaLoading || isConfigLoading) {
    return <div className="min-h-screen flex items-center justify-center text-primary animate-pulse font-display text-xl uppercase tracking-widest">Reading Ledger...</div>;
  }

  if (!metadata || !config) return <div className="p-24 text-center">Season Data Unavailable</div>;

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex justify-between items-center text-text p-4 rounded-xl shadow-sm">
        <h1 className="text-2xl font-bold font-display uppercase tracking-tight">
            {seasonSlug.replace("_", " ")}
        </h1>
      </div>

      {/* Prize Pool & Gini Row */}
      
       
        <div>
          {phase === "AUCTION" || phase === "BOOTSTRAP" ? (
            <AuctionGiniDisplay seasonAddress={metadata.address} />
          ) : (
            <TradingGiniDisplay seasonAddress={metadata.address} />
          )}
        </div>
        
      

      <SeasonDates config={config} currentPhase={phase as string} />
      <SeasonManifest config={config} />
      
      <div className="pt-8 flex flex-col items-center gap-2">
        <p className="text-[9px] font-mono text-text2 uppercase tracking-widest">Protocol Reference</p>
        <code className="text-[10px] bg-card2 px-3 py-1 rounded-full  text-text2 font-mono">
          {metadata.address}
        </code>
      </div>
    </main>
  );
}