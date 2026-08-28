/* Entity + SEO source of truth. Every crawlable surface — metadata exports,
   JSON-LD scripts, robots.txt, sitemap, llms.txt — reads from this module so
   the entity presents ONE consistent identity to search and generative
   engines. See CONTEXT.md: "Entity (the brand, for search)" and "GEO". */

import { SOCIAL_CHANNELS } from './socials';

export const SITE_NAME = 'Regarded Games';

export const SITE_TAGLINE = 'Economic Warfare — Fought on Chain';

/* The canonical one-paragraph answer to "what is Regarded Games?". Written to
   be quoted verbatim by answer engines: entity name first, category second,
   mechanics third. Faction naming follows CONTEXT.md canon. */
export const SITE_DESCRIPTION =
  'Regarded Games runs Class War: The Game — class war fought as a ' +
  'perfect-information strategy game with real-money stakes on Base. Players ' +
  'stake $RGD, acquire FIM in a seasonal on-chain auction, and trade it on an ' +
  'open exchange — the final wealth distribution decides whether the ' +
  'Capitalist or the Proletarian side takes the prize pool.';

/* NEXT_PUBLIC_MAIN_DOMAIN is authored as a full URL (see middleware.ts).
   Normalize to an origin; fall back to the production domain so metadata is
   never relative-only in a misconfigured build. */
const rawDomain = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'https://regarded.games';
export const SITE_ORIGIN = (/^https?:\/\//.test(rawDomain) ? rawDomain : `https://${rawDomain}`)
  .replace(/\/+$/, '');
export const DOCS_ORIGIN = SITE_ORIGIN.replace('://', '://docs.');

/* Entity corroboration: the JSON-LD sameAs array derives from the official
   channel list in src/config/socials.ts (single source shared with the
   landing Rulebook's Links pages). Empty hrefs (pre-launch) are
   omitted. */
const sameAs = SOCIAL_CHANNELS.map((c) => c.href).filter(Boolean);

const ORG_ID = `${SITE_ORIGIN}/#organization`;

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE_NAME,
    url: `${SITE_ORIGIN}/`,
    logo: `${SITE_ORIGIN}/Regardo_Head.svg`,
    description: SITE_DESCRIPTION,
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function webSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_ORIGIN}/#website`,
    name: SITE_NAME,
    url: `${SITE_ORIGIN}/`,
    publisher: { '@id': ORG_ID },
  };
}

export function videoGameJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    '@id': `${SITE_ORIGIN}/#game`,
    name: SITE_NAME,
    alternateName: 'Class War: The Game',
    url: `${SITE_ORIGIN}/`,
    description: SITE_DESCRIPTION,
    genre: ['Strategy', 'Economic simulation'],
    playMode: 'MultiPlayer',
    gamePlatform: 'Web browser',
    applicationCategory: 'Game',
    operatingSystem: 'Any',
    publisher: { '@id': ORG_ID },
  };
}

export interface FaqItem {
  question: string;
  /* Plain-text answer — rendered in the DOM AND serialized into the FAQPage
     schema, so the two can never drift (Google requires visible parity). */
  answer: string;
}

export function faqJsonLd(items: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };
}
