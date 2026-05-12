'use client';

import { useState, useEffect } from 'react';

interface FactionChatProps {
  seasonSlug: string;
  isCapitalist: boolean;
}

export function FactionChat({ seasonSlug, isCapitalist }: FactionChatProps) {
  const [channelId, setChannelId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function discoverChannel() {
      setLoading(true);
      try {
        const res = await fetch('/api/discourse/discover-channel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seasonSlug, isCapitalist }),
        });
        const data = await res.json();
        if (data.channelId) setChannelId(data.channelId);
      } catch (e) {
        console.error('Chat discovery failed', e);
      } finally {
        setLoading(false);
      }
    }
    discoverChannel();
  }, [seasonSlug, isCapitalist]);

  const factionColor = isCapitalist ? 'var(--color-blue)' : 'var(--color-pink)';
  const factionLabel = isCapitalist ? 'THE BOURGEOISIE' : 'THE PROLETARIAT';

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border-bright)',
        borderRadius: 20,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{ background: 'var(--color-card2)', borderBottom: '1px solid var(--color-border)' }}
      >
        <span
          className="font-display font-extrabold uppercase tracking-tight"
          style={{ fontSize: 14, color: factionColor }}
        >
          {factionLabel}
        </span>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--color-green)' }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--color-green)' }} />
          </span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-text2">Tactical Comms · Live</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1" style={{ background: 'var(--color-card)' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="section-label animate-pulse">Establishing Secure Connection…</p>
          </div>
        ) : channelId ? (
          <iframe
            key={channelId}
            src={`${process.env.NEXT_PUBLIC_DISCOURSE_URL}/chat/channel/${channelId}?embedded=true`}
            className="w-full h-full border-none"
            title="Faction Chat"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="font-mono text-[11px]" style={{ color: 'var(--color-red)' }}>Comms Offline. Channel not found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
