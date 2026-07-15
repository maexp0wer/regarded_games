import type { Metadata } from 'next';

/* Season archive stub — the future public SEO surface for gameplay data
   (per-season recaps server-rendered from the indexer: outcome, Gini
   movement, class victory, pool size). Kept noindex until real season data
   ships; when the first season settles, build /seasons/{n} pages here, drop
   the robots block, and add the routes to src/app/sitemap.ts. */

export const metadata: Metadata = {
  title: 'Season Archive',
  description:
    'Every settled season of Regarded Games: outcomes, class victories, and ' +
    'final wealth distributions.',
  alternates: {
    canonical: '/seasons',
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function SeasonArchivePage() {
  return (
    <main className="min-h-screen bg-bg text-text px-6 py-16">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <span className="section-label">Regarded Games</span>
        <h1 className="h2-app">Season Archive</h1>
        <p className="font-sans text-text2 text-base leading-relaxed">
          Settled seasons will be recorded here — who won the class war, how
          far the distribution moved, and what the pool paid out. The first
          entry arrives when Season 1 settles.
        </p>
        <div>
          <a href="/" className="btn-game-secondary">
            Back to Home
          </a>
        </div>
      </div>
    </main>
  );
}
