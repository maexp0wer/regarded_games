import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';

import styles from './index.module.css';

const STATS = [
  {value: 'BASE',    label: 'Network'},
  {value: 'USDC',    label: 'Collateral'},
  {value: 'Q3',      label: 'Cadence'},
  {value: '2',       label: 'Factions'},
];

function HomepageHero() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <>
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.factionBadges}>
            <span className={`${styles.badge} ${styles.badgeGold}`}>Capitalists</span>
            <span className={styles.badgeSep}>VS</span>
            <span className={`${styles.badge} ${styles.badgePurple}`}>Socialists</span>
          </div>

          <h1 className={styles.heroTitle}>{siteConfig.title}</h1>

          <p className={styles.heroSubtitle}>
            Perfect-information economic warfare with real-money stakes on Base.
            Trade FIM, shift the Gini Coefficient, and claim the prize pool.
          </p>

          <div className={styles.buttons}>
            <Link className={styles.btnPrimary} to="/intro">
              Read the Docs
            </Link>
            <Link className={styles.btnSecondary} href="http://localhost:3000">
              Open App
            </Link>
          </div>

          <div className={styles.statsStrip}>
            {STATS.map(({value, label}) => (
              <div key={label} className={styles.statCell}>
                <span className={styles.statValue}>{value}</span>
                <span className={styles.statLabel}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <hr className={styles.heroLine} />
    </>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="Perfect-information strategy game with real-money stakes on Base. Trade FIM tokens, shift the Gini Coefficient, and claim the prize pool.">
      <HomepageHero />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
