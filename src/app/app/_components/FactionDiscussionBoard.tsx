'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useTenantKey } from '@/context/TenantContext';
import { discourseNames } from '@/lib/discourseNames';

interface Topic {
  id: number;
  title: string;
  slug: string;
  posts_count: number;
  last_poster_username: string;
}

interface Post {
  id: number;
  post_number: number;
  username: string;
  created_at: string;
  cooked: string;
}

interface FactionDiscussionBoardProps {
  seasonSlug: string;
  isCapitalist: boolean;
  embedded?: boolean;
  onClose?: () => void; // shown as ← in embedded list view to collapse back to chat
}

function shortAddr(addr: string) {
  if (addr.startsWith('0x') && addr.length > 10) return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  return addr;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function FactionDiscussionBoard({ seasonSlug, isCapitalist, embedded = false, onClose }: FactionDiscussionBoardProps) {
  const { address } = useAccount();

  // — Topic list state
  const [topics, setTopics] = useState<Topic[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // — Drill-down state
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);

  // — Reply state
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // — New post state
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const newBodyRef = useRef<HTMLTextAreaElement>(null);

  const postListRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isAtBottom = useRef(true);

  const factionColor = isCapitalist ? 'var(--color-gold)' : 'var(--color-purple)';
  const factionLabel = isCapitalist ? 'THE BOURGEOISIE' : 'THE PROLETARIAT';
  const pillClass = isCapitalist ? 'pill-faction-cap' : 'pill-faction-soc';
  const hoverBorderColor = isCapitalist ? 'var(--color-gold-35)' : 'var(--color-purple-35)';
  const seasonNum = seasonSlug.match(/\d+/)?.[0] || '1';
  const tenantKey = useTenantKey();
  const names = discourseNames(tenantKey, Number(seasonNum));
  const childCat = isCapitalist ? names.categories.bourgeoisie : names.categories.proletariat;
  const discourseNewTopicUrl = `${process.env.NEXT_PUBLIC_DISCOURSE_URL}/c/${names.categories.parent.slug}/${childCat.slug}`;

  // ── Fetch topic list ──────────────────────────────────────────────────────
  const fetchTopics = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await fetch(
        `/api/discourse/topics?seasonSlug=${encodeURIComponent(seasonSlug)}&isCapitalist=${isCapitalist}`,
      );
      if (!res.ok) throw new Error('Failed to decrypt directives.');
      const data = await res.json();
      setTopics(data.topics ?? []);
    } catch (e: any) {
      setListError(e.message);
    } finally {
      setListLoading(false);
    }
  }, [seasonSlug, isCapitalist]);

  useEffect(() => { fetchTopics(); }, [fetchTopics]);

  // ── Fetch posts for selected topic ───────────────────────────────────────
  const fetchPosts = useCallback(async (topicId: number) => {
    try {
      const res = await fetch(`/api/discourse/topic-posts?topicId=${topicId}`);
      if (!res.ok) throw new Error('Failed to load posts.');
      const data = await res.json();
      setPosts(data.posts ?? []);
      setPostsError(null);
    } catch (e: any) {
      setPostsError(e.message);
    }
  }, []);

  // Initial load + 4-second poll while a topic is open
  useEffect(() => {
    if (!selectedTopic) return;
    setPostsLoading(true);
    setPostsError(null);
    setPosts([]);
    fetchPosts(selectedTopic.id).finally(() => setPostsLoading(false));

    const id = setInterval(() => fetchPosts(selectedTopic.id), 4000);
    return () => clearInterval(id);
  }, [selectedTopic, fetchPosts]);

  // Auto-scroll to bottom on new posts only when user is already at bottom
  function onPostScroll() {
    const el = postListRef.current;
    if (!el) return;
    isAtBottom.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 60;
  }

  useEffect(() => {
    const el = postListRef.current;
    if (!el || !isAtBottom.current) return;
    el.scrollTop = el.scrollHeight;
  }, [posts]);

  // ── Open / close topic ───────────────────────────────────────────────────
  function openTopic(topic: Topic) {
    setSelectedTopic(topic);
    setReply('');
    setSendError(null);
    isAtBottom.current = true;
  }

  function closeTopic() {
    setSelectedTopic(null);
    setPosts([]);
    setPostsError(null);
    setSendError(null);
    setReply('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }

  function openNewPost() {
    setIsCreating(true);
    setNewTitle('');
    setNewBody('');
    setCreateError(null);
  }

  function closeNewPost() {
    setIsCreating(false);
    setNewTitle('');
    setNewBody('');
    setCreateError(null);
    if (newBodyRef.current) newBodyRef.current.style.height = 'auto';
  }

  async function submitNewPost() {
    if (!newTitle.trim() || !newBody.trim() || !address || creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/discourse/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonSlug,
          isCapitalist,
          title: newTitle.trim(),
          raw: newBody.trim(),
          walletAddress: address,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error?.slice(0, 120) ?? `Error ${res.status}`);
      } else {
        closeNewPost();
        await fetchTopics();
      }
    } catch (e: any) {
      setCreateError(e.message);
    } finally {
      setCreating(false);
    }
  }

  function resizeNewBody() {
    const el = newBodyRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  // ── Send reply ────────────────────────────────────────────────────────────
  async function sendReply() {
    if (!reply.trim() || !selectedTopic || !address || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch('/api/discourse/topic-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId: selectedTopic.id, raw: reply.trim(), walletAddress: address }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendError(data.error?.slice(0, 120) ?? `Error ${res.status}`);
      } else {
        setReply('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        isAtBottom.current = true;
        await fetchPosts(selectedTopic.id);
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

  function onReplyChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setReply(e.target.value);
    resizeTextarea();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className={embedded ? 'flex flex-col h-full overflow-hidden' : 'flex flex-col max-h-screen overflow-hidden'}
      style={embedded ? {} : {
        background: 'var(--color-card)',
        border: '1px solid var(--color-border2)',
        borderRadius: 20,
      }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 shrink-0 bg-card2 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          {embedded && onClose && !selectedTopic && !isCreating && (
            <button
              onClick={onClose}
              className="shrink-0 flex items-center justify-center w-6 h-6 rounded-lg"
              style={{ background: 'var(--color-card)', color: 'var(--color-text2)', border: '1px solid transparent' }}
              aria-label="Back to chat"
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = hoverBorderColor; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
          {(selectedTopic || isCreating) && (
            <button
              onClick={isCreating ? closeNewPost : closeTopic}
              className="shrink-0 flex items-center justify-center w-6 h-6 rounded-lg"
              style={{ background: 'var(--color-card)', color: 'var(--color-text2)', border: '1px solid transparent' }}
              aria-label={isCreating ? 'Cancel new post' : 'Back to topics'}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = hoverBorderColor; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
          <span
            className="font-display font-extrabold uppercase tracking-tight text-faction-header truncate"
            style={{ color: (selectedTopic || isCreating) ? 'var(--color-text)' : factionColor }}
            title={selectedTopic?.title}
          >
            {isCreating ? 'New Directive' : selectedTopic ? selectedTopic.title : factionLabel}
          </span>
          {selectedTopic && !isCreating && (
            <a
              href={`${process.env.NEXT_PUBLIC_DISCOURSE_URL}/t/${selectedTopic.slug}/${selectedTopic.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 flex items-center justify-center w-6 h-6 rounded-lg"
              style={{ background: 'var(--color-card)', color: 'var(--color-text2)', border: '1px solid transparent' }}
              title="Open in Discourse"
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = hoverBorderColor; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          )}
        </div>
        <span
          className={`shrink-0 font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${pillClass}`}
          style={{ color: factionColor }}
        >
          {isCapitalist ? 'Bourgeois Access' : 'Proletariat Access'}
        </span>
      </div>

      {/* ── Body ── */}
      {isCreating ? (
        // ── New post form ──
        <>
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 flex flex-col gap-3">
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[9px] font-bold uppercase tracking-widest" style={{ color: factionColor, opacity: 0.8 }}>
                Directive Title
              </label>
              <input
                type="text"
                className="w-full font-mono text-sm outline-none placeholder:text-text2 rounded-lg px-3 py-2"
                style={{ background: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                placeholder="State your directive…"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                disabled={creating}
                maxLength={255}
                onFocus={(e) => { e.currentTarget.style.borderColor = hoverBorderColor; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
              />
              <span className="font-mono text-[9px] text-right" style={{ color: 'var(--color-text2)' }}>
                {newTitle.length}/255
              </span>
            </div>
            {/* Body */}
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="font-mono text-[9px] font-bold uppercase tracking-widest" style={{ color: factionColor, opacity: 0.8 }}>
                Body
              </label>
              <textarea
                ref={newBodyRef}
                rows={6}
                className="w-full font-mono text-sm outline-none placeholder:text-text2 resize-none rounded-lg px-3 py-2 leading-relaxed custom-scrollbar"
                style={{
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                  minHeight: '8rem',
                  maxHeight: '20rem',
                }}
                placeholder={address ? 'Write your strategy…' : 'Connect wallet to post'}
                value={newBody}
                onChange={(e) => { setNewBody(e.target.value); resizeNewBody(); }}
                disabled={!address || creating}
                onFocus={(e) => { e.currentTarget.style.borderColor = hoverBorderColor; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); submitNewPost(); } }}
              />
            </div>
            {createError && (
              <p className="font-mono text-[10px]" style={{ color: 'var(--color-red)' }}>{createError}</p>
            )}
          </div>
          {/* Submit footer */}
          <div
            className="shrink-0 flex items-center gap-2 px-4 py-3"
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            <p className="flex-1 font-mono text-[9px]" style={{ color: 'var(--color-text2)' }}>
              Ctrl+Enter to submit
            </p>
            <button
              className="shrink-0 flex items-center justify-center gap-2 rounded-lg px-4 h-8 font-mono text-[10px] font-bold uppercase tracking-widest transition-opacity disabled:opacity-30"
              style={{ background: factionColor, color: 'white' }}
              onClick={submitNewPost}
              disabled={!newTitle.trim() || !newBody.trim() || !address || creating}
            >
              {creating ? (
                <span>…</span>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 10 4 15 9 20" />
                    <path d="M20 4v7a4 4 0 0 1-4 4H4" />
                  </svg>
                  Post
                </>
              )}
            </button>
          </div>
        </>
      ) : !selectedTopic ? (
        // ── Topic list ──
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-2">
          {listLoading ? (
            [1, 2, 3].map(i => (
              <div
                key={i}
                className="h-20 rounded-lg animate-pulse"
                style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)' }}
              />
            ))
          ) : listError ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <p className="font-mono text-[11px] text-center" style={{ color: 'var(--color-red)' }}>{listError}</p>
              <button onClick={fetchTopics} className="btn-primary px-4 py-2 text-[10px]">
                Retry Connection
              </button>
            </div>
          ) : topics.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <p className="section-label opacity-30">No active directives found</p>
            </div>
          ) : (
            topics.map((topic) => (
              <div
                key={topic.id}
                className="relative rounded-lg transition-all overflow-hidden"
                style={{
                  background: 'var(--color-card2)',
                  border: '1px solid var(--color-border)',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = hoverBorderColor; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; }}
              >
                {/* Drill-in area — no link inside, so clicks are unambiguous */}
                <div onClick={() => openTopic(topic)} className="p-4 pr-10 cursor-pointer">
                  <p className="font-mono text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: factionColor, opacity: 0.7 }}>
                    Op-ID: {topic.id}
                  </p>
                  <p className="font-sans font-semibold text-[13px] text-text leading-snug mb-3">
                    {topic.title}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[10px] text-text2 uppercase tracking-wide">
                      Cmdr: {shortAddr(topic.last_poster_username)}
                    </span>
                    <span
                      className="font-mono text-[9px] font-bold px-2 py-0.5 rounded"
                      style={{ background: 'var(--color-card)', color: 'var(--color-text2)' }}
                    >
                      {topic.posts_count - 1} replies
                    </span>
                  </div>
                </div>
                {/* Discourse link — outside the onClick div, no bubbling issues */}
                <a
                  href={`${process.env.NEXT_PUBLIC_DISCOURSE_URL}/t/${topic.slug}/${topic.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-3 right-3 flex items-center justify-center w-6 h-6 rounded-md"
                  style={{ background: 'var(--color-card)', color: 'var(--color-text2)', border: '1px solid transparent' }}
                  title="Open in Discourse"
                  onMouseEnter={(e) => {
                    (e.currentTarget.parentElement as HTMLElement).style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.borderColor = hoverBorderColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'transparent';
                    (e.currentTarget.parentElement as HTMLElement).style.borderColor = hoverBorderColor;
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              </div>
            ))
          )}
        </div>
      ) : (
        // ── Post detail ──
        <>
          <div
            ref={postListRef}
            onScroll={onPostScroll}
            className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 flex flex-col gap-4"
          >
            {postsLoading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="h-4 w-32 rounded animate-pulse" style={{ background: 'var(--color-card2)' }} />
                  <div className="h-16 rounded-lg animate-pulse" style={{ background: 'var(--color-card2)' }} />
                </div>
              ))
            ) : postsError ? (
              <p className="font-mono text-[11px] text-center mt-8" style={{ color: 'var(--color-red)' }}>{postsError}</p>
            ) : (
              posts.map((post) => {
                const isOwn = address && post.username.toLowerCase() === address.toLowerCase();
                return (
                  <div key={post.id} className="flex flex-col gap-1.5">
                    {/* Post meta */}
                    <div className="flex items-baseline gap-2">
                      <span
                        className="font-mono text-[10px] font-bold"
                        style={{ color: post.post_number === 1 ? factionColor : isOwn ? factionColor : 'var(--color-text2)' }}
                      >
                        {isOwn ? 'YOU' : shortAddr(post.username)}
                        {post.post_number === 1 && (
                          <span className="ml-1.5 font-mono text-[8px] uppercase tracking-widest opacity-60">OP</span>
                        )}
                      </span>
                      <span className="font-mono text-[9px]" style={{ color: 'var(--color-text2)' }}>
                        #{post.post_number} · {formatTime(post.created_at)}
                      </span>
                    </div>
                    {/* Post body */}
                    <div
                      className="px-4 py-3 rounded-lg text-[13px] leading-relaxed discourse-post"
                      style={{
                        background: isOwn ? (isCapitalist ? 'var(--color-gold-15)' : 'var(--color-purple-15)') : 'var(--color-card2)',
                        border: `1px solid ${isOwn ? hoverBorderColor : 'var(--color-border)'}`,
                        color: 'var(--color-text)',
                      }}
                      dangerouslySetInnerHTML={{ __html: post.cooked }}
                    />
                  </div>
                );
              })
            )}
          </div>

          {/* ── Reply input ── */}
          {sendError && (
            <p className="shrink-0 font-mono text-[10px] px-4 py-1" style={{ color: 'var(--color-red)' }}>
              {sendError}
            </p>
          )}
          <div
            className="shrink-0 flex items-end gap-2 px-3 py-3"
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            <textarea
              ref={textareaRef}
              rows={1}
              className="flex-1 font-mono text-sm outline-none placeholder:text-text2 resize-none overflow-y-auto custom-scrollbar rounded-lg px-3 py-2 leading-relaxed"
              style={{ background: 'var(--color-bg)', color: 'var(--color-text)', maxHeight: '8rem' }}
              placeholder={address ? 'Write a reply…' : 'Connect wallet to reply'}
              value={reply}
              onChange={onReplyChange}
              onKeyDown={onKeyDown}
              disabled={!address || sending}
            />
            <button
              className="shrink-0 flex items-center justify-center rounded-lg w-8 h-8 mb-0.5 transition-opacity disabled:opacity-30"
              style={{ background: factionColor }}
              onClick={sendReply}
              disabled={!reply.trim() || !address || sending}
              aria-label="Send"
            >
              {sending ? (
                <span className="font-mono text-[10px] text-white">…</span>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 10 4 15 9 20" />
                  <path d="M20 4v7a4 4 0 0 1-4 4H4" />
                </svg>
              )}
            </button>
          </div>
        </>
      )}

      {/* ── Footer (topic list only) ── */}
      {!selectedTopic && !isCreating && (
        <div
          className="px-4 py-3 shrink-0"
          style={{ background: 'var(--color-card2)', borderTop: '1px solid var(--color-border)' }}
        >
          {/* Split button: left = in-app form, right = open Discourse category */}
          <div
            className="relative flex rounded-lg overflow-hidden"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = hoverBorderColor; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; }}
          >
            <button
              onClick={openNewPost}
              disabled={!address}
              className="flex-1 flex items-center justify-center py-2.5 pr-9 font-mono font-bold text-[10px] uppercase tracking-widest transition-colors disabled:opacity-30"
              style={{ color: 'var(--color-text2)', background: 'transparent' }}
              onMouseEnter={(e) => { if (address) (e.currentTarget as HTMLElement).style.color = factionColor; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text2)'; }}
            >
              + New Post
            </button>
            <a
              href={discourseNewTopicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute right-0 top-0 bottom-0 flex items-center justify-center w-9 rounded-r-xl"
              style={{ color: 'var(--color-text2)', borderLeft: '1px solid var(--color-border)', background: 'transparent' }}
              title="Open category in Discourse"
              onMouseEnter={(e) => {
                (e.currentTarget.parentElement as HTMLElement).style.borderColor = 'var(--color-border)';
                e.currentTarget.style.color = factionColor;
                e.currentTarget.style.borderLeftColor = hoverBorderColor;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget.parentElement as HTMLElement).style.borderColor = hoverBorderColor;
                e.currentTarget.style.color = 'var(--color-text2)';
                e.currentTarget.style.borderLeftColor = 'var(--color-border)';
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
