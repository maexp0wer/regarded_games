import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type Feature = {
  title:       string;
  body:        string;
  chips:       string[];
  accentClass: string;
  cardClass:   string;
};

const FEATURES: Feature[] = [
  {
    title:       'Trading Terminal',
    body:        'Peer-to-peer FIM exchange with a fully transparent order book. Every bid, ask, and counterparty is visible on-chain — no hidden liquidity, no dark pools.',
    chips:       ['P2P Exchange', 'Order Book', 'Gini-Aware'],
    accentClass: styles.accentGold,
    cardClass:   styles.gold,
  },
  {
    title:       'The Faction War',
    body:        'Your faction is determined by your FIM balance vs. the live 50th-percentile threshold. Capitalists concentrate wealth. Socialists redistribute it. Every trade is a political act.',
    chips:       ['Capitalists', 'Socialists', 'Live Threshold'],
    accentClass: styles.accentPurple,
    cardClass:   styles.purple,
  },
  {
    title:       'Real-Money Stakes',
    body:        'Seasonal USDC prize pools deployed into DeFi yield strategies. The winning faction dictates the payout rules — oligarchy takes all, or the Solidarity Fund redistributes.',
    chips:       ['USDC', 'Base', 'Seasonal'],
    accentClass: styles.accentGreen,
    cardClass:   styles.green,
  },
];

function FeatureCard({ title, body, chips, accentClass, cardClass}: Feature) {
  return (
    <div className={clsx(styles.card, cardClass)}>
      <div className={clsx(styles.accent, accentClass)} />
      <Heading as="h3" className={styles.cardTitle}>{title}</Heading>
      <p className={styles.cardBody}>{body}</p>
      <div className={styles.chips}>
        {chips.map((c) => (
          <span key={c} className={styles.chip}>{c}</span>
        ))}
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.section}>
      <div className="container">
        <span className={styles.sectionLabel}>How it works</span>
        <Heading as="h2" className={styles.sectionTitle}>
          Economic Warfare On-Chain
        </Heading>

        <div className={styles.grid}>
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>

        <div className={styles.ctaStrip}>
          <p className={styles.ctaText}>
            Ready to understand the full mechanics?
          </p>
          <Link className={styles.ctaLink} to="/intro">
            Read the complete docs →
          </Link>
        </div>
      </div>
    </section>
  );
}
