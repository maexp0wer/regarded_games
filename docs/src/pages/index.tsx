import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import CyclingSubheading from '@site/src/components/CyclingSubheading';
import styles from './index.module.css';

type DocCard = {
  title: string;
  body:  string;
  to:    string;
};

const CARDS: DocCard[] = [
  {
    title: 'Intro',
    body:  'What Regarded Games is, the two classes, and how a season of class war plays out on-chain.',
    to:    '/intro',
  },
  {
    title: 'Getting Started',
    body:  'Connect your wallet, complete testnet quests, take part in the capital auction. Acquire FIM, and place your first trade on the exchange.',
    to:    '/getting-started',
  },
  {
    title: 'FAQ',
    body:  'Straight answers about the game, the money, and the rules — is it gambling, what can you lose, and how payouts work.',
    to:    '/faq',
  },
  {
    title: 'Whitepaper',
    body:  'The full philosophical, economic, and technical specification behind the project.',
    to:    '/whitepaper',
  },
];

function HomepageHero() {
  return (
    <header className={styles.hero}>
      {/* Sunset glow — the same soft blurred radial backdrop the app's main
          landing hero uses (see src/app/main/page.tsx "Background Light").
          Centered on the hero's middle and stretched tall so its lower half
          reaches down behind the cards rather than being clipped. */}
      <div className={styles.heroGlow} aria-hidden />
      <div className={styles.heroInner}>
        {/* Soft-launch marker above the headline, mirroring the app's landing
            hero (the !APP_LIVE "Coming Soon" badge in src/app/main/page.tsx). */}
        <span className={styles.heroBadge}>Coming Soon</span>
        {/* Headline lockup mirrors the app's landing hero: "Class War" in
            neutral text, "The Game" in the sunset gradient. */}
        <h1 className={styles.heroTitle}>
          Class War<br />
          <span className={styles.heroTitleGradient}>The Game</span>
        </h1>
        <div className={styles.heroSubtitle}>
          <CyclingSubheading />
        </div>
      </div>
    </header>
  );
}

function DocCardLink({title, body, to}: DocCard) {
  return (
    <Link to={to} className={styles.card}>
      <h3 className={styles.cardTitle}>{title}</h3>
      <p className={styles.cardBody}>{body}</p>
      <span className={styles.cardCta}>Read</span>
    </Link>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="A real-money market where privileged information and deep pockets buy no edge — owned by its players, scored by the Gini Coefficient.">
      <div className={styles.page}>
        <HomepageHero />
        <main className={styles.cardsSection}>
          <div className={styles.cardsGrid}>
            {CARDS.map((c) => (
              <DocCardLink key={c.title} {...c} />
            ))}
          </div>
        </main>
      </div>
    </Layout>
  );
}
