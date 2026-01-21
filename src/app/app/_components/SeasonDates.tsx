'use client';

import { useEffect, useState } from 'react';

export function SeasonDates({ config, currentPhase }: { config: any, currentPhase: string }) {
  const auctionStart = config.createdAt;
  const tradingStart = config.createdAt + config.auctionDuration;
  const seasonEnd = config.createdAt + config.auctionDuration + config.gameDuration;

  const formatDate = (ts: number) => new Date(ts * 1000).toLocaleDateString(undefined, { 
    month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  // Calculate "remaining" for current phase
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      let target = 0;
      if (currentPhase === "AUCTION") target = tradingStart;
      else if (currentPhase === "TRADING") target = seasonEnd;

      if (target <= now) {
        setRemaining("Phase Complete");
        return;
      }

      const diff = target - now;
      const d = Math.floor(diff / 86400);
      const h = Math.floor((diff % 86400) / 3600);
      const m = Math.floor((diff % 3600) / 60);
      setRemaining(`${d}d ${h}h ${m}m left`);
    };

    tick();
    const id = setInterval(tick, 60000); // Update every minute
    return () => clearInterval(id);
  }, [currentPhase, tradingStart, seasonEnd]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="p-4 rounded-lg bg-card2 border border-border">
        <p className="text-[10px] uppercase font-bold text-text2">Auction Start</p>
        <p className="text-sm font-medium">{formatDate(auctionStart)}</p>
      </div>
      <div className="p-4 rounded-lg bg-card2 border border-border relative">
        <p className="text-[10px] uppercase font-bold text-text2">Trading Start</p>
        <p className="text-sm font-medium">{formatDate(tradingStart)}</p>
        {currentPhase === "AUCTION" && <span className="absolute top-2 right-2 text-[9px] bg-primary text-bg px-2 py-0.5 rounded-full">{remaining}</span>}
      </div>
      <div className="p-4 rounded-lg bg-card2 border border-border relative">
        <p className="text-[10px] uppercase font-bold text-text2">Season End</p>
        <p className="text-sm font-medium">{formatDate(seasonEnd)}</p>
        {currentPhase === "TRADING" && <span className="absolute top-2 right-2 text-[9px] bg-success text-bg px-2 py-0.5 rounded-full">{remaining}</span>}
      </div>
    </div>
  );
}