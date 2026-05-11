// components/FactionChat.tsx
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
          body: JSON.stringify({ seasonSlug, isCapitalist })
        });
        const data = await res.json();
        if (data.channelId) setChannelId(data.channelId);
      } catch (e) {
        console.error("Chat discovery failed", e);
      } finally {
        setLoading(false);
      }
    }
    discoverChannel();
  }, [seasonSlug, isCapitalist]);

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border border-border/10 overflow-hidden">
      <div className="p-4 border-b border-border/10 bg-card2 flex justify-between items-center">
        <h3 className="font-black uppercase text-xs tracking-widest text-text">Tactical Comms (Live)</h3>
        <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            <span className="text-[9px] text-text2 uppercase tracking-widest">Encrypted</span>
        </div>
      </div>
      
      <div className="flex-1 bg-card">
        {loading ? (
          <div className="flex items-center justify-center h-full text-text2 text-xs animate-pulse">
            Establishing Secure Connection...
          </div>
        ) : channelId ? (
          <iframe 
            key={channelId}
            src={`${process.env.NEXT_PUBLIC_DISCOURSE_URL}/chat/channel/${channelId}?embedded=true`}
            className="w-full h-full border-none"
            title="Faction Chat"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-danger text-xs p-4 text-center">
            Comms Offline. Channel not found.
          </div>
        )}
      </div>
    </div>
  );
}