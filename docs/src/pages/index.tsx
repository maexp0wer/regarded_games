import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import styles from './index.module.css';

type DocCard = {
  index:       string;
  eyebrow:     string;
  title:       string;
  body:        string;
  to:          string;
  accentClass: string;
};

const CARDS: DocCard[] = [
  {
    index:       '01',
    eyebrow:     'Overview',
    title:       'Intro',
    body:        'What Regarded Games is, the two factions, and how a season of economic warfare plays out on-chain.',
    to:          '/intro',
    accentClass: styles.accentPurple,
  },
  {
    index:       '02',
    eyebrow:     'Onboarding',
    title:       'Getting Started',
    body:        'Connect a wallet, acquire FIM, and place your first trade on the seasonal exchange.',
    to:          '/getting-started',
    accentClass: styles.accentGreen,
  },
  {
    index:       '03',
    eyebrow:     'Specification',
    title:       'Whitepaper',
    body:        'The full philosophical, economic, and technical specification behind the game.',
    to:          '/whitepaper',
    accentClass: styles.accentGold,
  },
];

function HomepageHero() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={styles.hero}>
      <div className={styles.heroInner}>
        <span className={styles.heroEyebrow}>Documentation</span>
        <h1 className={styles.heroTitle}>{siteConfig.title}</h1>
        <p className={styles.heroSubtitle}>
          Perfect-information economic warfare with real-money stakes on Base.
          Trade FIM, shift the Gini Coefficient, and claim the prize pool.
        </p>
      </div>
    </header>
  );
}

function DocCardLink({index, eyebrow, title, body, to, accentClass}: DocCard) {
  return (
    <Link to={to} className={styles.card}>
      <span className={`${styles.cardAccent} ${accentClass}`} />
      <div className={styles.cardHead}>
        <span className={styles.cardEyebrow}>{eyebrow}</span>
        <span className={styles.cardIndex}>{index}</span>
      </div>
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
      description="Perfect-information strategy game with real-money stakes on Base. Trade FIM tokens, shift the Gini Coefficient, and claim the prize pool.">
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
