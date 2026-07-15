import type { Metadata } from 'next';
import { DOCS_ORIGIN, faqJsonLd, type FaqItem } from '@/config/seo';

/* Public FAQ — the canonical, citable answers to the entity + trust queries
   ("what is Regarded Games", "is it gambling", "what can I lose"). Server-
   rendered on the primary origin at regarded.games/faq; the same strings feed
   the DOM and the FAQPage JSON-LD so the two can never drift. YMYL policy:
   address money questions head-on, disclose risk plainly (see the SEO/GEO
   decisions of 2026-07-13 in CONTEXT.md). */

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Answers about Regarded Games: what it is, how seasons and payouts work, ' +
    'whether it is gambling, and what players can win or lose.',
  alternates: {
    canonical: '/faq',
  },
};

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'What is Regarded Games?',
    answer:
      'Regarded Games is a perfect-information strategy game with real-money ' +
      'stakes, played on the Base blockchain. Each season, players stake $RGD ' +
      '(the Regarded Token), acquire FIM — the seasonal game token — in an ' +
      'on-chain auction, and trade it on an open exchange. How wealth ends up ' +
      'distributed across players decides which side wins the season.',
  },
  {
    question: 'How does a season work?',
    answer:
      'A season moves through phases: an opening auction where players acquire ' +
      'FIM, an open trading phase on the exchange, and settlement. At ' +
      'settlement the final distribution of FIM is measured against the ' +
      'starting distribution. After a review window, payouts open and players ' +
      'claim their share of the prize pool in USDC.',
  },
  {
    question: 'What are the two classes?',
    answer:
      'Every player belongs to one of two classes based on their FIM balance. ' +
      'Sort all holders from poorest to richest: the largest group of poorest ' +
      'holders whose balances together stay at or below 50% of the total FIM ' +
      'supply are the Proletarians (the Masses); everyone above that cut is a ' +
      'Capitalist (the Oligarchy). The boundary is a share-of-supply cut, not ' +
      'a headcount split — typically far more than half of all players are ' +
      'Proletarians. Your class can change live as balances move.',
  },
  {
    question: 'How are winners decided and payouts calculated?',
    answer:
      'Settlement compares wealth concentration (the Gini coefficient of FIM ' +
      'holdings) at the end of the season against the start. If concentration ' +
      'increased, the Capitalist class wins; if it decreased, the Proletariat ' +
      'wins; if it is unchanged, the season is a draw and every eligible ' +
      'player gets a holdings-proportional share back. The winning side ' +
      'splits the winner share of the pool, weighted by how far the ' +
      'distribution actually moved.',
  },
  {
    question: 'Is Regarded Games gambling?',
    answer:
      'No element of the game is random. It is a perfect-information game: ' +
      'every balance, every order, and the live class boundary are public ' +
      'on-chain, and the outcome is determined entirely by the trades players ' +
      'choose to make. There is no house taking the other side of your bets. ' +
      'That said, the stakes are real money — you should only ever play with ' +
      'funds you can afford to lose.',
  },
  {
    question: 'What can I lose — and what happens to my staked $RGD?',
    answer:
      'You can lose some or all of the USDC you spend acquiring FIM, ' +
      'depending on how the season settles. Staked $RGD is different: a ' +
      'portion is locked as collateral while you hold FIM, but it is never ' +
      'burned or slashed — it is released back to you when you claim after ' +
      'the season. FIM itself is a seasonal token with no value once the ' +
      'season ends. Claim your payout within a year of distribution opening; ' +
      'after that, unclaimed prize funds may be swept.',
  },
  {
    question: 'What chain does it run on, and can I verify the rules?',
    answer:
      'The game runs on Base, an Ethereum layer-2. All game contracts live ' +
      'on-chain where anyone can verify them, and the complete mechanics — ' +
      'auction, exchange, class boundary, settlement math, and the review ' +
      'process — are specified in the public whitepaper.',
  },
  {
    question: 'What are $RGD and FIM?',
    answer:
      '$RGD, the Regarded Token, is the persistent token of the project: you ' +
      'stake it to take part, and staked $RGD acts as collateral while you ' +
      'hold FIM. FIM is the in-game token of a single season — it is what you ' +
      'auction for, trade, and measure class membership by, and it carries no ' +
      'value after the season settles.',
  },
  {
    question: 'When can I play?',
    answer:
      'Seasons are announced on regarded.games and in the community. If the ' +
      'app is gated, the next season has not opened yet — read the whitepaper ' +
      'and join the community to be ready when the auction starts.',
  },
];

export default function FaqPage() {
  return (
    <main className="min-h-screen bg-bg text-text px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(FAQ_ITEMS)) }}
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
          {FAQ_ITEMS.map(({ question, answer }) => (
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
          <a href={`${DOCS_ORIGIN}/`} className="btn-game-secondary">
            Read the Docs
          </a>
        </footer>
      </div>
    </main>
  );
}
