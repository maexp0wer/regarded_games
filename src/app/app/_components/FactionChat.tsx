'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { FactionDiscussionBoard } from './FactionDiscussionBoard';

interface DiscourseMessage {
  id: number;
  message: string;
  created_at: string;
  user: { username: string; name: string };
}

interface FactionChatProps {
  seasonSlug: string;
  isCapitalist?: boolean;
  auctionMode?: boolean;
  showBoard?: boolean;
  onToggleBoard?: () => void;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function shortAddr(addr: string) {
  if (addr.startsWith('0x') && addr.length > 10) return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  return addr;
}

export function FactionChat({ seasonSlug, isCapitalist = false, auctionMode = false, showBoard = false, onToggleBoard }: FactionChatProps) {
  const { address } = useAccount();
  const [tab, setTab] = useState<'faction' | 'general'>(auctionMode ? 'general' : 'faction');
  const [channelId, setChannelId] = useState<number | null>(null);
  const [messages, setMessages] = useState<DiscourseMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [discovering, setDiscovering] = useState(true);
  const messageListRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isAtBottom = useRef(true);
  const tabCache = useRef<Partial<Record<'faction' | 'general', { channelId: number | null; messages: DiscourseMessage[] }>>>({});
  const activeAddressRef = useRef<string | undefined>(undefined);

  const factionLabel = isCapitalist ? 'BOURGEOISIE' : 'PROLETARIAT';

  // Discover channel + fetch initial messages in one shot to avoid intermediate empty states.
  // When the wallet address changes (switch or disconnect), flush the tab cache so the new
  // wallet always gets a fresh channel lookup rather than inheriting the old wallet's session.
  useEffect(() => {
    if (activeAddressRef.current !== address) {
      activeAddressRef.current = address;
      tabCache.current = {};
      setChannelId(null);
      setMessages([]);
    }

    if (!address) {
      setDiscovering(false);
      return;
    }

    const cached = tabCache.current[tab];
    if (cached) {
      setChannelId(cached.channelId);
      setMessages(cached.messages);
      setDiscovering(false);
      return;
    }

    async function discover() {
      setDiscovering(true);
      try {
        const chanRes = await fetch('/api/discourse/discover-channel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seasonSlug, isCapitalist, isGeneral: tab === 'general' }),
        });
        const chanData = await chanRes.json();
        const newChannelId: number | null = chanData.channelId ?? null;

        let newMessages: DiscourseMessage[] = [];
        if (newChannelId) {
          const msgRes = await fetch(`/api/discourse/chat-messages?channelId=${newChannelId}`);
          const msgData = await msgRes.json();
          if (Array.isArray(msgData.messages)) {
            newMessages = msgData.messages;
          }
        }

        // Update both at once so the render sees a consistent state
        tabCache.current[tab] = { channelId: newChannelId, messages: newMessages };
        setChannelId(newChannelId);
        setMessages(newMessages);
      } catch (e) {
        console.error('Channel discovery failed', e);
        setChannelId(null);
        setMessages([]);
      } finally {
        setDiscovering(false);
      }
    }
    discover();
  }, [seasonSlug, isCapitalist, tab, address]);

  // Fetch messages (used by the polling interval and after sending)
  const fetchMessages = useCallback(async () => {
    if (!channelId) return;
    try {
      const res = await fetch(`/api/discourse/chat-messages?channelId=${channelId}`);
      const data = await res.json();
      if (Array.isArray(data.messages)) {
        setMessages(data.messages);
        tabCache.current[tab] = { channelId, messages: data.messages };
      }
    } catch (e) {
      console.error('Message fetch failed', e);
    }
  }, [channelId, tab]);

  // Poll every 4 seconds (skip the immediate call — discover already fetched initial messages)
  useEffect(() => {
    if (!channelId) return;
    const id = setInterval(fetchMessages, 4000);
    return () => clearInterval(id);
  }, [channelId, fetchMessages]);

  function onMessageScroll() {
    const el = messageListRef.current;
    if (!el) return;
    isAtBottom.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 60;
  }

  // Scroll to bottom on new messages only when user hasn't scrolled up
  useEffect(() => {
    const el = messageListRef.current;
    if (!el || !isAtBottom.current) return;
    el.scrollTop = el.scrollHeight;
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

  function resizeTextarea() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  function onInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    resizeTextarea();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessageAndReset();
    }
  }

  async function sendMessageAndReset() {
    await sendMessage();
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  function switchTab(next: 'faction' | 'general') {
    if (next === tab) return;
    setTab(next);
    setSendError(null);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }

  return (
    <div className="comms-panel">
      {/* Tab selector */}
      {!auctionMode && (
        <div className="terminal-view-selector-bar">
          <button
            onClick={() => switchTab('faction')}
            className={`terminal-view-btn${tab === 'faction' ? ' active' : ''}`}
          >
            {factionLabel}
          </button>
          <button
            onClick={() => switchTab('general')}
            className={`terminal-view-btn${tab === 'general' ? ' active' : ''}`}
          >
            All Players
          </button>
        </div>
      )}

      {/* Auction mode top banner */}
      {auctionMode && (
        <div className="flex items-center justify-between p-3 border-b border-[var(--color-border)] bg-card">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-text2">
            Season Chat
          </span>
        </div>
      )}

      {/* Board slot — small screens only, replaces chat when showBoard */}
      {!auctionMode && showBoard && (
        <div className="flex-1 min-h-0 overflow-hidden lg:hidden">
          <FactionDiscussionBoard
            seasonSlug={seasonSlug}
            isCapitalist={isCapitalist}
            embedded
            onClose={onToggleBoard}
          />
        </div>
      )}

      {/* Message stream */}
      <div
        ref={messageListRef}
        onScroll={onMessageScroll}
        className={`comms-stream custom-scrollbar ${!auctionMode && showBoard ? 'hidden lg:flex' : ''}`}
      >
        {discovering && messages.length === 0 ? (
          <p className="section-label animate-pulse text-center mt-8">Connecting…</p>
        ) : !channelId && !discovering ? (
          <p className="font-mono text-[9px] text-center mt-8" style={{ color: 'var(--color-red)' }}>
            Comms Offline · Channel not found
          </p>
        ) : messages.length === 0 ? (
          <p className="section-label text-center mt-8">No transmissions yet. Be the first.</p>
        ) : (
          messages.map((msg) => {
            const isOwn = address && msg.user.username.toLowerCase() === address.toLowerCase();
            return (
              <div key={msg.id} className={`comms-msg-row ${isOwn ? 'comms-msg-internal' : 'comms-msg-external'}`}>
                <div className="flex items-center justify-between gap-4 msg-meta">
                  <span>{isOwn ? 'YOU' : shortAddr(msg.user.username)}</span>
                  <span className="opacity-60 font-normal">{formatTime(msg.created_at)}</span>
                </div>
                <div>{msg.message}</div>
              </div>
            );
          })
        )}
      </div>

      {/* Send error */}
      {sendError && (
        <p
          className={`shrink-0 font-mono text-[10px] px-3 py-1 ${!auctionMode && showBoard ? 'hidden lg:block' : ''}`}
          style={{ color: 'var(--color-red)' }}
        >
          {sendError}
        </p>
      )}

      {/* Input deck */}
      {channelId && (
        <div className={`comms-input-deck ${!auctionMode && showBoard ? 'hidden lg:block' : ''}`}>
          <div className="relative flex items-center">
            <textarea
              ref={textareaRef}
              rows={1}
              className="terminal-input pr-16 resize-none overflow-y-auto custom-scrollbar leading-relaxed"
              style={{ maxHeight: '8rem' }}
              placeholder={address ? 'Transmit message…' : 'Connect wallet to chat'}
              value={input}
              onChange={onInputChange}
              onKeyDown={onKeyDown}
              disabled={!address || sending}
            />
            <button
              className="absolute right-2 px-3 py-1 font-mono text-[10px] font-bold text-text bg-card hover:bg-[var(--color-card2)] border border-[var(--color-border)] rounded transition-colors uppercase disabled:opacity-30"
              onClick={sendMessageAndReset}
              disabled={!input.trim() || !address || sending}
            >
              {sending ? '…' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
