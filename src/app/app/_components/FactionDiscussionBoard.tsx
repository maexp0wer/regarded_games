// components/FactionDiscussionBoard.tsx
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
    
    // Your URL: /c/season-1/s1-socialist-strategy/7
    // So the category slug must be: "season-1/s1-socialist-strategy"
    const seasonNum = seasonSlug.match(/\d+/)?.[0] || "1";
    
    const categorySlug = isCapitalist 
      ? `season-${seasonNum}/s${seasonNum}-capitalist-strategy` 
      : `season-${seasonNum}/s${seasonNum}-socialist-strategy`;

    try {
      // Fetching from the corrected path
      const res = await fetch(`${process.env.NEXT_PUBLIC_DISCOURSE_URL}/c/${categorySlug}.json`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        credentials: 'include'
      });
      
      if (!res.ok) {
        if (res.status === 403 || res.status === 404) throw new Error("AUTH_PENDING");
        throw new Error("Failed to decrypt directives.");
      }
      
      const data = await res.json();
      setTopics(data.topic_list?.topics ||[]);
    } catch (e: any) {
      setError(e.message === "AUTH_PENDING" ? "Authentication pending. Establishing clearance..." : e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectives();
  },[seasonSlug, isCapitalist]);

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border border-border/10 overflow-hidden">
      <div className="p-4 border-b border-border/10 bg-card2 flex justify-between items-center">
        <h3 className="font-black uppercase text-xs tracking-widest text-text">Strategic Directives</h3>
        <span className={`text-[9px] px-2 py-0.5 rounded uppercase font-bold tracking-wider ${isCapitalist ? 'bg-danger/20 text-danger' : 'bg-success/20 text-success'}`}>
          {isCapitalist ? 'Oligarch Access' : 'Proletariat Access'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-card2 animate-pulse rounded-xl border border-border/5" />)}
          </div>
        ) : error ? (
          <div className="text-center py-10 flex flex-col items-center justify-center">
            <span className="text-danger text-xs mb-3">{error}</span>
            {error.includes("Authentication") && (
                <button onClick={fetchDirectives} className="px-4 py-1.5 bg-primary text-bg text-[10px] uppercase font-bold rounded hover:brightness-110">
                    Retry Connection
                </button>
            )}
          </div>
        ) : topics.length === 0 ? (
          <div className="text-center py-10 text-text2 text-sm">No active directives found.</div>
        ) : (
          topics.map((topic: any) => (
            <a 
              key={topic.id} 
              href={`${process.env.NEXT_PUBLIC_DISCOURSE_URL}/t/${topic.slug}/${topic.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 bg-card2 hover:bg-card2/80 rounded-xl border border-border/5 transition-all group hover:border-primary/30"
            >
              <div className="text-[9px] text-primary mb-1.5 font-bold uppercase tracking-widest opacity-80">
                Op-ID: {topic.id}
              </div>
              <div className="font-bold text-text text-sm group-hover:text-primary transition-colors leading-snug">
                {topic.title}
              </div>
              <div className="flex justify-between items-center mt-3 text-[10px] text-text2 font-bold uppercase">
                <span>Cmdr: {topic.last_poster_username}</span>
                <span className="bg-card px-2 py-0.5 rounded">{topic.posts_count - 1} Replies</span>
              </div>
            </a>
          ))
        )}
      </div>
      
      {/* Post New Directive Button */}
      <div className="p-4 border-t border-border/10 bg-card2">
        <a 
            href={`${process.env.NEXT_PUBLIC_DISCOURSE_URL}/new-topic`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center py-3 bg-text/5 hover:bg-text/10 text-text text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
        >
            + Draft New Directive
        </a>
      </div>
    </div>
  );
}