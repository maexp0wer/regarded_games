import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import {generateWhitepaperPages, GENERATED_DIR, WHITEPAPER_SOURCE} from './whitepaperSplit';

// Split the single-source Whitepaper.md into per-Part pages before the docs
// plugin reads them. The inline plugin below re-runs this when the source
// changes so `docusaurus start` hot-reloads.
generateWhitepaperPages();

// Navbar external targets. "App" links to the running game app (the `app.`
// subdomain locally, the deployed app in production); "Project" links to the
// project/landing site (the bare Next.js root). Override via env in prod.
// NEXT_PUBLIC_MAIN_DOMAIN is authored as a full URL (see ../.env.example), so
// normalize to a bare host before deriving subdomain URLs — without this the
// prod canonical would read "https://docs.https://regarded.games".
const MAIN_DOMAIN =
  (process.env.NEXT_PUBLIC_MAIN_DOMAIN ?? '')
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '') || undefined;
const APP_URL = MAIN_DOMAIN ? `https://app.${MAIN_DOMAIN}` : 'http://app.localhost:3000';
const PROJECT_URL = MAIN_DOMAIN ? `https://${MAIN_DOMAIN}` : 'http://localhost:3000';

const config: Config = {
  title: 'Regarded Games',
  tagline: 'Perfect-information strategy game with real-money stakes on Base',
  favicon: 'img/Regardo_Head.svg',

  future: {
    v4: true,
  },

  url: MAIN_DOMAIN ? `https://docs.${MAIN_DOMAIN}` : 'http://localhost:3000',
  baseUrl: '/',

  onBrokenLinks: 'warn',

  // Re-applies the URL fragment scroll after each route renders, fixing the
  // initial-load anchor race when a docs page is opened directly at a #hash
  // (e.g. the landing-page HeroCard info buttons). See the module for detail.
  clientModules: ['./src/clientModules/hashScroll.ts'],

  stylesheets: [
    {
      href: 'https://fonts.googleapis.com/css2?family=Exo+2:wght@400;600;700;800;900&family=Orbitron:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap',
      type: 'text/css',
    },
  ],
  markdown: {
    format: 'detect',
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          path: '../content/docs',
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    () => ({
      name: 'whitepaper-source-watch',
      getPathsToWatch() {
        return [WHITEPAPER_SOURCE];
      },
      async loadContent() {
        generateWhitepaperPages();
      },
    }),
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'whitepaper',
        path: GENERATED_DIR,
        routeBasePath: 'whitepaper',
        sidebarPath: './sidebarsWhitepaper.ts',
      },
    ],
  ],

  // Entity identity for the docs origin. Kept in sync by hand with
  // src/config/seo.ts (the Next app's SEO source of truth) — the two projects
  // don't share a module graph. sameAs profiles: fill alongside seo.ts.
  headTags: [
    {
      tagName: 'script',
      attributes: {type: 'application/ld+json'},
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': `${PROJECT_URL}/#organization`,
        name: 'Regarded Games',
        url: `${PROJECT_URL}/`,
        logo: `${PROJECT_URL}/Regardo_Head.svg`,
      }),
    },
  ],

  themeConfig: {
    metadata: [
      {
        name: 'description',
        content:
          'Player documentation and the complete whitepaper for Regarded Games — ' +
          'the perfect-information strategy game with real-money stakes on Base.',
      },
      {property: 'og:site_name', content: 'Regarded Games'},
    ],
    colorMode: {
      respectPrefersColorScheme: true,
    },
    docs: {
      sidebar: {
        autoCollapseCategories: true,
      },
    },
    navbar: {
      title: 'Regarded Docs',
      logo: {
        alt: 'Regarded Games',
        src: 'img/Regardo_Head.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          type: 'docSidebar',
          docsPluginId: 'whitepaper',
          sidebarId: 'whitepaperSidebar',
          position: 'left',
          label: 'Whitepaper',
        },
        {
          href: PROJECT_URL,
          label: 'Project',
          position: 'right',
        },
        {
          href: APP_URL,
          label: 'App',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'light',
      copyright: `Copyright © ${new Date().getFullYear()} Regarded Games.`,
    },
    prism: {
      theme: prismThemes.oneLight,
      darkTheme: prismThemes.vsDark,
      additionalLanguages: ['bash', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
