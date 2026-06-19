'use client';

import React from 'react';
import { useTenantChainId } from '@/context/TenantContext';

interface ProtocolCardProps {
  seasonAddress: string;
  fimAddress?: string;
  auctionAddress?: string;
  exchangeAddress?: string;
  isAuction?: boolean;
}

function scannerUrl(chainId: number, addr: string): string {
  if (chainId === 84532) return `https://sepolia.basescan.org/address/${addr}`;
  return `https://basescan.org/address/${addr}`;
}

export function ProtocolCard({ seasonAddress, fimAddress, auctionAddress, exchangeAddress, isAuction }: ProtocolCardProps) {
  const chainId = useTenantChainId();

  if (!fimAddress && !auctionAddress && !exchangeAddress) return null;

  return (
    <div className="terminal-pane h-full">
      <div className="terminal-pane-header">
        <span className="terminal-pane-title">Protocol</span>
      </div>
      <div className="flex flex-col gap-3">
        {[
          { label: 'Season',                                   addr: seasonAddress },
          { label: '$FIM',                                addr: fimAddress },
          { label: isAuction ? 'Auction' : 'Exchange',        addr: isAuction ? auctionAddress : exchangeAddress },
        ].filter(r => r.addr).map(({ label, addr }) => (
          <div key={label} className="kv-row">
            <span className="font-mono text-[11px] text-text2">{label}</span>
            <a
              href={scannerUrl(chainId, addr!)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] px-2 py-0.5 rounded text-text2 select-all hover:text-text transition-colors"
            >
              {addr}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
