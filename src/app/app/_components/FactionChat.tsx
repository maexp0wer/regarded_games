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
  const [connected, setConnected] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isAtBottom = useRef(true);

  const factionColor = auctionMode ? 'var(--color-primary)' : isCapitalist ? 'var(--color-blue)' : 'var(--color-pink)';
  const factionLabel = isCapitalist ? 'THE BOURGEOISIE' : 'THE PROLETARIAT';

  // Discover channel + fetch initial messages in one shot to avoid intermediate empty states
  useEffect(() => {
    async function discover() {
      setDiscovering(true);
      setConnected(false);
      // Don't clear messages here — keep the previous tab's messages visible while loading
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
            setConnected(true);
          }
        }

        // Update both at once so the render sees a consistent state
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
  }, [seasonSlug, isCapitalist, tab]);

  // Fetch messages (used by the polling interval and after sending)
  const fetchMessages = useCallback(async () => {
    if (!channelId) return;
    try {
      const res = await fetch(`/api/discourse/chat-messages?channelId=${channelId}`);
      const data = await res.json();
      if (Array.isArray(data.messages)) {
        setMessages(data.messages);
        setConnected(true);
      }
    } catch (e) {
      console.error('Message fetch failed', e);
      setConnected(false);
    }
  }, [channelId]);

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

  const dotColor = connected ? 'var(--color-green)' : 'var(--color-red)';

  return (
    <div
      className="flex flex-col min-h-88 max-h-128 overflow-hidden"
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border-bright)',
        borderRadius: 20,
      }}
    >
      {/* Header — hidden on mobile when board is active (board's own header takes over) */}
      <div
        className={`items-center justify-between px-4 py-2.5 shrink-0 ${!auctionMode && showBoard ? 'hidden lg:flex' : 'flex'}`}
        style={{ background: 'var(--color-card2)', borderBottom: '1px solid var(--color-border)' }}
      >
        {/* Segmented toggle — hidden in auction mode */}
        {auctionMode ? (
          <span
            className="font-display font-extrabold uppercase tracking-tight text-[11px] section-label"
            style={{ color: 'var(--color-text2)' }}
          >
            Chat
          </span>
        ) : (
          <div
            className="flex items-center rounded-lg p-0.5 gap-0.5"
            style={{ background: 'var(--color-bg)' }}
          >
            {(['faction', 'general'] as const).map((t) => {
              const isActive = tab === t;
              const label = t === 'faction' ? factionLabel : 'ALL PLAYERS';
              return (
                <button
                  key={t}
                  onClick={() => switchTab(t)}
                  className="font-display font-extrabold uppercase tracking-tight text-[11px] px-3 py-1 rounded-md transition-all"
                  style={{
                    background: isActive ? (t === 'faction' ? factionColor : 'var(--color-text)') : 'transparent',
                    color: isActive ? '#fff' : 'var(--color-text2)',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* Right side: board toggle + live dot */}
        <div className="flex items-center gap-2">
          {!auctionMode && onToggleBoard && (
            <button
              onClick={onToggleBoard}
              aria-label="Toggle discussion board"
              className="flex items-center justify-center w-6 h-6 rounded-lg transition-all"
              style={{
                background: showBoard ? factionColor : 'var(--color-bg)',
                color: showBoard ? '#fff' : 'var(--color-text2)',
                border: `1px solid ${showBoard ? factionColor : 'transparent'}`,
              }}
              onMouseEnter={(e) => {
                if (!showBoard) {
                  e.currentTarget.style.borderColor = factionColor;
                  e.currentTarget.style.color = factionColor;
                }
              }}
              onMouseLeave={(e) => {
                if (!showBoard) {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.color = 'var(--color-text2)';
                }
              }}
            >
              {/* Forum/list icon */}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
          )}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: dotColor }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: dotColor }} />
          </span>
        </div>
      </div>

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

      {/* Message list — hidden on small screens when board is showing */}
      <div
        ref={messageListRef}
        onScroll={onMessageScroll}
        className={`flex-1 overflow-y-auto custom-scrollbar px-4 py-3 flex flex-col gap-3 ${!auctionMode && showBoard ? 'hidden lg:flex' : ''}`}
      >
        {discovering && messages.length === 0 ? (
          <p className="section-label animate-pulse text-center mt-8">Establishing Secure Connection…</p>
        ) : !channelId && !discovering ? (
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
                  <span className="font-mono text-[10px]" style={{ color: tab === 'general' ? 'var(--color-text2)' : factionColor }}>
                    {isOwn ? 'YOU' : shortAddr(msg.user.username)}
                  </span>
                  <span className="font-mono text-[9px] text-text2">{formatTime(msg.created_at)}</span>
                </div>
                <div
                  className="px-3 py-1.5 text-sm max-w-[85%] wrap-break-word"
                  style={{
                    background: isOwn ? (tab === 'general' ? 'var(--color-green)' : factionColor) : 'var(--color-card2)',
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
      </div>

      {/* Input — hidden on small screens when board is showing */}
      {sendError && (
        <p className={`shrink-0 font-mono text-[10px] px-4 py-1 ${!auctionMode && showBoard ? 'hidden lg:block' : ''}`} style={{ color: 'var(--color-red)' }}>
          {sendError}
        </p>
      )}
      {channelId && (
        <div
          className={`shrink-0 flex items-end gap-2 px-3 py-3 ${!auctionMode && showBoard ? 'hidden lg:flex' : ''}`}
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            className="flex-1 font-mono text-sm outline-none placeholder:text-text2 resize-none overflow-y-auto custom-scrollbar rounded-xl px-3 py-2 leading-relaxed"
            style={{ background: 'var(--color-bg)', color: 'var(--color-text)', maxHeight: '8rem' }}
            placeholder={address ? 'Chat…' : 'Connect wallet to chat'}
            value={input}
            onChange={onInputChange}
            onKeyDown={onKeyDown}
            disabled={!address || sending}
          />
          <button
            className="shrink-0 flex items-center justify-center rounded-full w-8 h-8 mb-0.5 transition-opacity disabled:opacity-30"
            style={{ background: tab === 'general' ? 'var(--color-green)' : factionColor }}
            onClick={sendMessageAndReset}
            disabled={!input.trim() || !address || sending}
            aria-label="Send"
          >
            {sending ? (
              <span className="font-mono text-[10px] text-white">…</span>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
