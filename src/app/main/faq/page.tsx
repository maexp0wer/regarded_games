import fs from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import { DOCS_ORIGIN, faqJsonLd } from '@/config/seo';
import { parseFaqMarkdown } from '@/utils/faq';

/* SEO/GEO-canonical FAQ on the primary origin (regarded.games/faq). The Q&A
   content is single-sourced from content/docs/faq.mdx — the same file the
   Docusaurus docs render as the user-facing FAQ page; that docs copy carries
   a cross-domain canonical pointing HERE, so search signals consolidate on
   this URL. Parsed at build time (static page); the same strings feed the DOM
   and the FAQPage JSON-LD so the two can never drift. YMYL policy: address
   money questions head-on, disclose risk plainly (see CONTEXT.md "GEO"). */

const FAQ_SOURCE = path.join(process.cwd(), 'content', 'docs', 'faq.mdx');

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Answers about Regarded Games: what it is, how seasons and payouts work, ' +
    'whether it is gambling, and what players can win or lose.',
  alternates: {
    canonical: '/faq',
  },
};

export default function FaqPage() {
  const items = parseFaqMarkdown(fs.readFileSync(FAQ_SOURCE, 'utf8'));
  if (items.length === 0) {
    // Fail the build loudly rather than shipping an empty canonical page —
    // an edit to faq.mdx must have broken the H2-question convention.
    throw new Error('content/docs/faq.mdx yielded no Q&A pairs — check the ## heading convention.');
  }

  return (
    <main className="min-h-screen bg-bg text-text px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(items)) }}
      />

      <div className="max-w-3xl mx-auto flex flex-col gap-10">
        <header className="flex flex-col gap-4">
          <span className="section-label">Regarded Games</span>
          <h1 className="h2-app">Frequently Asked Questions</h1>
          <p className="font-sans text-text2 text-base leading-relaxed">
            Straight answers about the game, the money, and the rules. The full
            specification lives in the{' '}
            <a
              href={`${DOCS_ORIGIN}/whitepaper`}
              className="underline text-purple hover:text-purple-hover"
            >
              whitepaper
            </a>
            .
          </p>
        </header>

        <div className="flex flex-col gap-6">
          {items.map(({ question, answer }) => (
            <section key={question} className="card-app">
              <h2 className="h3-app mb-3">{question}</h2>
              <p className="font-sans text-text2 text-base leading-relaxed">{answer}</p>
            </section>
          ))}
        </div>

        <footer className="flex flex-wrap items-center gap-4 pt-2">
          {/* Plain <a>: "/" is the landing on the same origin; docs cross the
              subdomain boundary, so client-side routing must not intercept. */}
          <a href="/" className="btn-game-secondary">
            Back to Home
          </a>
          <a href={`${DOCS_ORIGIN}/faq`} className="btn-game-secondary">
            Read in the Docs
          </a>
        </footer>
      </div>
    </main>
  );
}
