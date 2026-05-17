'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount } from 'wagmi';

interface DiscourseMessage {
  id: number;
  message: string;
  created_at: string;
  user: { username: string; name: string };
}

interface FactionChatProps {
  seasonSlug: string;
  isCapitalist: boolean;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function shortAddr(addr: string) {
  if (addr.startsWith('0x') && addr.length > 10) return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  return addr;
}

export function FactionChat({ seasonSlug, isCapitalist }: FactionChatProps) {
  const { address } = useAccount();
  const [channelId, setChannelId] = useState<number | null>(null);
  const [messages, setMessages] = useState<DiscourseMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [discovering, setDiscovering] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const factionColor = isCapitalist ? 'var(--color-blue)' : 'var(--color-pink)';
  const factionLabel = isCapitalist ? 'THE BOURGEOISIE' : 'THE PROLETARIAT';

  // Discover channel once
  useEffect(() => {
    async function discover() {
      setDiscovering(true);
      try {
        const res = await fetch('/api/discourse/discover-channel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seasonSlug, isCapitalist }),
        });
        const data = await res.json();
        if (data.channelId) setChannelId(data.channelId);
      } catch (e) {
        console.error('Channel discovery failed', e);
      } finally {
        setDiscovering(false);
      }
    }
    discover();
  }, [seasonSlug, isCapitalist]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!channelId) return;
    try {
      const res = await fetch(`/api/discourse/chat-messages?channelId=${channelId}`);
      const data = await res.json();
      if (Array.isArray(data.messages)) setMessages(data.messages);
    } catch (e) {
      console.error('Message fetch failed', e);
    }
  }, [channelId]);

  // Poll every 4 seconds
  useEffect(() => {
    if (!channelId) return;
    fetchMessages();
    const id = setInterval(fetchMessages, 4000);
    return () => clearInterval(id);
  }, [channelId, fetchMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || !channelId || !address || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch('/api/discourse/chat-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, message: input.trim(), walletAddress: address }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendError(data.error?.slice(0, 120) ?? `Error ${res.status}`);
      } else {
        setInput('');
        await fetchMessages();
      }
    } catch (e: any) {
      setSendError(e.message);
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

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
          className="font-display font-extrabold uppercase tracking-tight text-faction-header"
          style={{ color: factionColor }}
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

      {/* Message list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 flex flex-col gap-3">
        {discovering ? (
          <p className="section-label animate-pulse text-center mt-8">Establishing Secure Connection…</p>
        ) : !channelId ? (
          <p className="font-mono text-[11px] text-center mt-8" style={{ color: 'var(--color-red)' }}>
            Comms Offline · Channel not found
          </p>
        ) : messages.length === 0 ? (
          <p className="section-label text-center mt-8">No transmissions yet. Be the first.</p>
        ) : (
          messages.map((msg) => {
            const isOwn = address && msg.user.username.toLowerCase() === address.toLowerCase();
            return (
              <div key={msg.id} className={`flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[10px]" style={{ color: factionColor }}>
                    {isOwn ? 'YOU' : shortAddr(msg.user.username)}
                  </span>
                  <span className="font-mono text-[9px] text-text2">{formatTime(msg.created_at)}</span>
                </div>
                <div
                  className="px-3 py-1.5 text-sm max-w-[85%] wrap-break-word"
                  style={{
                    background: isOwn ? factionColor : 'var(--color-card2)',
                    color: isOwn ? '#fff' : 'var(--color-text)',
                    borderRadius: isOwn ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  }}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {sendError && (
        <p className="shrink-0 font-mono text-[10px] px-4 py-1" style={{ color: 'var(--color-red)' }}>
          {sendError}
        </p>
      )}
      {channelId && (
        <div
          className="shrink-0 flex items-center gap-2 px-4 py-3"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <input
            className="flex-1 bg-transparent font-mono text-sm outline-none placeholder:text-text2"
            style={{ color: 'var(--color-text)' }}
            placeholder={address ? 'Send transmission…' : 'Connect wallet to chat'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={!address || sending}
          />
          <button
            className="btn-primary px-3 py-1 text-xs uppercase tracking-widest font-mono shrink-0"
            onClick={sendMessage}
            disabled={!input.trim() || !address || sending}
          >
            {sending ? '…' : 'Send'}
          </button>
        </div>
      )}
    </div>
  );
}
