'use client';

import React from 'react';

const truncateAddress = (addr: string) =>
  addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '—';

interface ProtocolCardProps {
  seasonAddress: string;
  fimAddress?: string;
  auctionAddress?: string;
  exchangeAddress?: string;
  isAuction?: boolean;
}

export function ProtocolCard({ seasonAddress, fimAddress, auctionAddress, exchangeAddress, isAuction }: ProtocolCardProps) {
  if (!fimAddress && !auctionAddress && !exchangeAddress) return null;

  return (
    <div className="card-app flex flex-col gap-3 h-full border-border2">
      <p className="section-label pb-2" >Protocol</p>
      {[
        { label: 'Season',                                   addr: seasonAddress },
        { label: 'FIM Token',                                addr: fimAddress },
        { label: isAuction ? 'Auction' : 'Exchange',        addr: isAuction ? auctionAddress : exchangeAddress },
      ].filter(r => r.addr).map(({ label, addr }) => (
        <div key={label} className="kv-row">
          <span className="font-mono text-[11px] text-text2">{label}</span>
          <code
            className="font-mono text-[11px] bg-surface px-2 py-0.5 rounded text-text2 border border-border select-all"
            title={addr}
          >
            {truncateAddress(addr!)}
          </code>
        </div>
      ))}
    </div>
  );
}
