'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { FactionDiscussionBoard } from './FactionDiscussionBoard';
import { CommunitySignInGate } from './CommunitySignInGate';
import { useCommunitySession } from '@/hooks/useCommunitySession';

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
  const { signedIn } = useCommunitySession();
  const [tab, setTab] = useState<'faction' | 'general'>(auctionMode ? 'general' : 'faction');
  const [channelId, setChannelId] = useState<number | null>(null);
  const [messages, setMessages] = useState<DiscourseMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [discovering, setDiscovering] = useState(true);
  const [discourseReady, setDiscourseReady] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const messageListRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
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
      setDiscourseReady(false);
    }

    if (!address) {
      setDiscovering(false);
      return;
    }

    // Discovery — and every chat fetch — requires a verified community session.
    if (!signedIn) {
      setDiscovering(false);
      return;
    }

    const cached = tabCache.current[tab];
    if (cached) {
      setChannelId(cached.channelId);
      setMessages(cached.messages);
      setDiscovering(false);
      // discourseReady stays true once set for this address
      return;
    }

    async function discover() {
      setDiscovering(true);
      try {
        const seasonId = Number(seasonSlug.replace(/[^0-9]/g, '')) - 1;

        // Register the user in Discourse and discover the channel concurrently
        const [chanRes] = await Promise.all([
          fetch('/api/discourse/discover-channel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seasonSlug, isCapitalist, isGeneral: tab === 'general' }),
          }),
          fetch('/api/discourse/create-player', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletAddress: address, seasonId }),
          }),
        ]);

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
        setDiscourseReady(true);
      } catch (e) {
        console.error('Channel discovery failed', e);
        setChannelId(null);
        setMessages([]);
      } finally {
        setDiscovering(false);
      }
    }
    discover();
  }, [seasonSlug, isCapitalist, tab, address, refreshKey, signedIn]);

  function refresh() {
    tabCache.current = {};
    setChannelId(null);
    setMessages([]);
    setRefreshKey(k => k + 1);
  }

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
        body: JSON.stringify({ channelId, message: input.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendError(data.error?.slice(0, 120) ?? `Error ${res.status}`);
      } else {
        setInput('');
        await fetchMessages();
      }
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  function resizeTextarea() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
    const panelHeight = panelRef.current?.clientHeight ?? 0;
    el.style.overflowY = panelHeight > 0 && el.scrollHeight > panelHeight / 3 ? 'auto' : 'hidden';
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
    <div className={`flex flex-col h-full w-full terminal-pane overflow-hidden ${auctionMode ? 'bg-card border border-border' : 'bg-card'}`} ref={panelRef}>
      {/* Header — only shown in auction mode; trading phase uses the selector bar instead */}
      {auctionMode && (
        <div className="terminal-pane-header mx-5">
          <span className="terminal-pane-title">Chat</span>
        </div>
      )}

      {/* Tab selector — doubles as the header in trading phase */}
      {!auctionMode && (
        <div className="terminal-view-selector-bar terminal-view-selector-bar--chat">
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
        className={`flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar ${!auctionMode && showBoard ? 'hidden lg:flex' : ''}`}
      >
        {!address ? (
          <div className="flex flex-col items-center gap-3 mt-8">
            <span className="terminal-pane-title text-center" style={{ color: 'var(--color-text2)' }}>Connect your wallet to participate</span>
          </div>
        ) : !signedIn ? (
          <CommunitySignInGate feature="the faction chat" />
        ) : discovering && messages.length === 0 ? (
          <div className="flex flex-col items-center gap-3 mt-8">
            <span className="terminal-pane-title animate-pulse">Connecting…</span>
          </div>
        ) : !channelId && !discovering ? (
          <div className="flex flex-col items-center gap-3 mt-8">
            <span className="terminal-pane-title" style={{ color: 'var(--color-red)' }}>Offline</span>
            <button className="btn-game-secondary" onClick={refresh}>Refresh</button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center gap-3 mt-8">
            <span className="terminal-pane-title">No Chat messages yet</span>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = address && msg.user.username.toLowerCase() === address.toLowerCase();
            return (
              <div key={msg.id} className={`flex flex-col max-w-[85%] py-[0.6rem] px-[0.85rem] rounded-md font-display text-[0.85rem] leading-[1.4] ${isOwn ? 'self-end bg-[color-mix(in_srgb,var(--color-purple)_10%,transparent)] border border-[color-mix(in_srgb,var(--color-purple)_40%,transparent)] text-text shadow-[inset_3px_0_0_0_var(--color-gold)]' : 'self-start bg-card2 border border-border text-text'}`}>
                <div className={`flex items-center justify-between gap-4 font-mono text-[0.7rem] font-bold uppercase tracking-[0.03em] mb-1 ${isOwn ? 'text-gold' : 'text-text2'}`}>
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
      {channelId && address && signedIn && (
        <div className={`comms-input-deck p-3 ${!auctionMode && showBoard ? 'hidden lg:block' : ''}`}>
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              rows={1}
              className="inline-flex w-full py-[0.35rem] px-3 font-mono text-xs font-bold text-text bg-transparent border border-border rounded-sm outline-none transition-all duration-150 ease-in-out hover:not-focus:border-border2 hover:not-focus:bg-card2 focus:border-[color-mix(in_srgb,var(--color-purple)_40%,transparent)] focus:bg-[color-mix(in_srgb,var(--color-purple)_4%,transparent)] focus:shadow-[inset_2px_0_0_0_var(--color-purple)] placeholder:text-text2 placeholder:opacity-50 placeholder:uppercase placeholder:tracking-[0.02em] flex-1 min-w-0 resize-none overflow-y-hidden custom-scrollbar leading-relaxed"
              style={{ maxHeight: '8rem' }}
              placeholder={!discourseReady ? 'Connecting…' : 'Chat…'}
              value={input}
              onChange={onInputChange}
              onKeyDown={onKeyDown}
              disabled={!address || !discourseReady || sending}
            />
            <button
              className="shrink-0 inline-flex items-center justify-center py-[0.35rem] px-3 text-xs leading-relaxed font-bold text-text bg-card2 border border-border2 rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.05)] transition-all duration-200 ease-in-out hover:bg-card3 hover:border-purple hover:shadow-[0_0_12px_var(--color-purple-15)] disabled:opacity-30"
              onClick={sendMessageAndReset}
              disabled={!input.trim() || !address || !discourseReady || sending}
            >
              {sending ? '…' : '↵'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
