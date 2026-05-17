'use client';

import { useState, useEffect } from 'react';

interface FactionDiscussionBoardProps {
  seasonSlug: string;
  isCapitalist: boolean;
}

export function FactionDiscussionBoard({ seasonSlug, isCapitalist }: FactionDiscussionBoardProps) {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDirectives = async () => {
    setLoading(true);
    setError(null);
    const seasonNum = seasonSlug.match(/\d+/)?.[0] || '1';
    const categorySlug = isCapitalist
      ? `season-${seasonNum}/s${seasonNum}-bourgeoisie-strategy`
      : `season-${seasonNum}/s${seasonNum}-proletariat-strategy`;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_DISCOURSE_URL}/c/${categorySlug}.json`, {
        method: 'GET', headers: { Accept: 'application/json' }, credentials: 'include',
      });
      if (!res.ok) {
        if (res.status === 403 || res.status === 404) throw new Error('AUTH_PENDING');
        throw new Error('Failed to decrypt directives.');
      }
      const data = await res.json();
      setTopics(data.topic_list?.topics || []);
    } catch (e: any) {
      setError(e.message === 'AUTH_PENDING' ? 'Authentication pending. Establishing clearance…' : e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDirectives(); }, [seasonSlug, isCapitalist]);

  const factionColor = isCapitalist ? 'var(--color-blue)' : 'var(--color-pink)';
  const factionLabel = isCapitalist ? 'THE BOURGEOISIE' : 'THE PROLETARIAT';
  const pillClass    = isCapitalist ? 'pill-faction-cap' : 'pill-faction-soc';

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
        <span
          className={`font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${pillClass}`}
          style={{ color: factionColor }}
        >
          {isCapitalist ? 'Bourgeois Access' : 'Proletariat Access'}
        </span>
      </div>

      {/* Topics */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-2">
        {loading ? (
          [1, 2, 3].map(i => (
            <div
              key={i}
              className="h-20 rounded-xl animate-pulse"
              style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)' }}
            />
          ))
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <p className="font-mono text-[11px] text-center" style={{ color: 'var(--color-red)' }}>{error}</p>
            {error.includes('Authentication') && (
              <button
                onClick={fetchDirectives}
                className="btn-primary px-4 py-2 text-[10px]"
              >
                Retry Connection
              </button>
            )}
          </div>
        ) : topics.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <p className="section-label opacity-30">No active directives found</p>
          </div>
        ) : (
          topics.map((topic: any) => (
            <a
              key={topic.id}
              href={`${process.env.NEXT_PUBLIC_DISCOURSE_URL}/t/${topic.slug}/${topic.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 rounded-xl transition-all group"
              style={{
                background: 'var(--color-card2)',
                border: '1px solid var(--color-border)',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = isCapitalist ? 'var(--color-blue-a40)' : 'var(--color-pink-a40)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; }}
            >
              <p className="font-mono text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: factionColor, opacity: 0.7 }}>
                Op-ID: {topic.id}
              </p>
              <p className="font-sans font-semibold text-[13px] text-text leading-snug mb-3">
                {topic.title}
              </p>
              <div className="flex justify-between items-center">
                <span className="font-mono text-[10px] text-text2 uppercase tracking-wide">Cmdr: {topic.last_poster_username}</span>
                <span
                  className="font-mono text-[9px] font-bold px-2 py-0.5 rounded"
                  style={{ background: 'var(--color-card)', color: 'var(--color-text2)' }}
                >
                  {topic.posts_count - 1} replies
                </span>
              </div>
            </a>
          ))
        )}
      </div>

      {/* Footer */}
      <div
        className="px-4 py-3 shrink-0"
        style={{ background: 'var(--color-card2)', borderTop: '1px solid var(--color-border)' }}
      >
        <a
          href={`${process.env.NEXT_PUBLIC_DISCOURSE_URL}/new-topic`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center py-2.5 rounded-xl font-mono font-bold text-[10px] uppercase tracking-widest transition-all"
          style={{ background: 'var(--color-card)', color: 'var(--color-text2)', border: '1px solid var(--color-border)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = factionColor; (e.currentTarget as HTMLElement).style.borderColor = isCapitalist ? 'var(--color-blue-a40)' : 'var(--color-pink-a40)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text2)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; }}
        >
          + Draft New Directive
        </a>
      </div>
    </div>
  );
}
