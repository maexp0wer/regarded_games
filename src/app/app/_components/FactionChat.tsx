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
  user: { username: string; name: string; avatar_template?: string };
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

const DISCOURSE_URL = process.env.NEXT_PUBLIC_DISCOURSE_URL ?? '';

function avatarUrl(template: string | undefined, username: string, size = 40): string {
  if (template) {
    const resolved = template.startsWith('/')
      ? `${DISCOURSE_URL}${template}`
      : template;
    return resolved.replace('{size}', String(size));
  }
  return `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(username)}`;
}

function ChatMessage({ msg, isOwn, address, isCapitalist }: { msg: DiscourseMessage; isOwn: boolean; address: string; isCapitalist: boolean }) {
  const factionColor = isCapitalist ? 'gold' : 'purple';
  const [errored, setErrored] = useState(false);
  const src = errored
    ? `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(msg.user.username)}`
    : avatarUrl(msg.user.avatar_template, msg.user.username, 40);

  return (
    <div className={`flex w-full ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex min-w-0 items-stretch max-w-[85%] rounded border ${isOwn ? 'flex-row-reverse border-border bg-card3' : 'flex-row border-border bg-card2'}`}>
        <img
          src={src}
          alt={msg.user.username}
          onError={() => setErrored(true)}
          className="shrink-0 w-8 h-8 object-cover m-1 rounded-sm self-center"
        />
        <div className="flex flex-col gap-0.5 px-2 pt-1.5 pb-1 min-w-0">
          <div className={`flex items-center justify-between gap-3 text-[10px] font-mono font-bold uppercase tracking-widest ${isOwn ? `text-${factionColor}` : 'text-text2'}`}>
            <span>{isOwn ? 'YOU' : shortAddr(msg.user.username)}</span>
            <span className="opacity-50 text-[9px] font-normal">{formatTime(msg.created_at)}</span>
          </div>
          <div className="text-[0.75rem] leading-relaxed text-text wrap-anywhere">{msg.message}</div>
        </div>
      </div>
    </div>
  );
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
  const [isOverflowing, setIsOverflowing] = useState(false);
  const isAtBottom = useRef(true);
  const tabCache = useRef<Partial<Record<'faction' | 'general', { channelId: number | null; messages: DiscourseMessage[] }>>>({});
  const activeAddressRef = useRef<string | undefined>(undefined);

  const factionLabel = isCapitalist ? 'CAPITALISTS' : 'PROLETARIANS';
  const factionColor = isCapitalist ? 'gold' : 'purple';

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

        // Register the user FIRST, then discover the channel. create-player adds the
        // wallet to the faction group; the channel is only visible (and joinable) once
        // that membership exists. Running them concurrently raced the group-add and, on
        // a fresh or just-switched wallet, discover-channel saw no channel — or saw it
        // but couldn't join — yielding "Failed to send message" after a wallet switch.
        await fetch('/api/discourse/create-player', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress: address, seasonId }),
        });

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

  // Track overflow so the scrollbar only appears when content exceeds the pane
  useEffect(() => {
    const el = messageListRef.current;
    if (!el) return;
    const update = () => setIsOverflowing(el.scrollHeight > el.clientHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  });

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
    <div ref={panelRef} className="flex flex-col h-full w-full overflow-hidden rounded-lg bg-card">
      {/* Header (auction) or tab selector (trading) */}
      {auctionMode ? (
        <div className="shrink-0 flex items-center justify-between px-5 pt-5 pb-2 border-b border-border">
          <span className="terminal-pane-title">Chat</span>
        </div>
      ) : (
        <div className="terminal-view-selector-bar terminal-view-selector-bar--full shrink-0">
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
            ALL PLAYERS
          </button>
        </div>
      )}

      {/* Board slot — small screens only */}
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

      {/* Message stream — flex-1 to push footer down */}
      <div
        ref={messageListRef}
        onScroll={onMessageScroll}
        data-chrome-scroll-guard
        className={`flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain p-4 flex flex-col gap-3 ${!auctionMode && showBoard ? 'hidden lg:flex' : ''} ${isOverflowing ? '[scrollbar-width:thin] [scrollbar-color:transparent_transparent] hover:[scrollbar-color:var(--color-text2)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-[10px] [&::-webkit-scrollbar-thumb]:transition-colors [&::-webkit-scrollbar-thumb]:duration-200 [&:hover::-webkit-scrollbar-thumb]:bg-text2' : ''}`}
      >
        {!address ? (
          <div className="m-auto flex flex-col items-center gap-3 text-center">
            <span className="text-text2 text-sm">Connect your wallet to participate</span>
          </div>
        ) : !signedIn ? (
          <div className="m-auto">
            <CommunitySignInGate feature="faction chat" />
          </div>
        ) : discovering && messages.length === 0 ? (
          <div className="m-auto flex flex-col items-center gap-2">
            <span className="text-text2 text-sm animate-pulse">Reading Ledger…</span>
          </div>
        ) : !channelId && !discovering ? (
          <div className="m-auto flex flex-col items-center gap-3">
            <span className="text-red text-sm">Channel offline</span>
            <button className="btn-game-secondary" onClick={refresh}>Refresh</button>
          </div>
        ) : messages.length === 0 ? (
          <div className="m-auto">
            <span className="text-text2 text-sm">No messages yet</span>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = address && msg.user.username.toLowerCase() === address.toLowerCase();
            return (
              <ChatMessage
                key={msg.id}
                msg={msg}
                isOwn={isOwn}
                address={address}
                isCapitalist={isCapitalist}
              />
            );
          })
        )}
      </div>

      {/* Error and input footer */}
      {channelId && address && signedIn && (
        <div className="flex flex-col gap-1.5 shrink-0 px-5 pt-5 pb-2 border-b border-border">
          {sendError && (
            <p className="font-mono text-[10px] text-red">
              {sendError}
            </p>
          )}
          <div className="flex w-full items-end gap-2">
            <textarea
              ref={textareaRef}
              rows={1}
              className="flex-1 min-w-0 resize-none overflow-y-hidden custom-scrollbar px-3 py-2 font-mono text-xs border border-border rounded outline-none transition-all duration-150 text-text placeholder:text-text2 placeholder:opacity-50 hover:border-border2 focus:border-border2"
              style={{ maxHeight: '8rem', backgroundColor: 'var(--color-card3)' }}
              placeholder={!discourseReady ? 'Connecting…' : 'Chat…'}
              value={input}
              onChange={onInputChange}
              onKeyDown={onKeyDown}
              disabled={!discourseReady || sending}
            />
            <button
              className="shrink-0 inline-flex items-center justify-center px-3 py-2 font-mono text-xs font-bold bg-card3 border border-border rounded text-text transition-all duration-200 hover:border-border2 disabled:opacity-50"
              onClick={sendMessageAndReset}
              disabled={!input.trim() || !discourseReady || sending}
              style={{ backgroundColor: 'var(--color-card3)' }}
            >
              {sending ? '…' : '↵'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}