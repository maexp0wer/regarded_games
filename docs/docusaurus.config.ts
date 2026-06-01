import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import {generateWhitepaperPages, GENERATED_DIR, WHITEPAPER_SOURCE} from './whitepaperSplit';

// Split the single-source Whitepaper.md into per-Part pages before the docs
// plugin reads them. The inline plugin below re-runs this when the source
// changes so `docusaurus start` hot-reloads.
generateWhitepaperPages();

const config: Config = {
  title: 'Regarded Games',
  tagline: 'Perfect-information strategy game with real-money stakes on Base',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'http://localhost:3000',
  baseUrl: '/',

  onBrokenLinks: 'warn',

  stylesheets: [
    {
      href: 'https://fonts.googleapis.com/css2?family=Exo+2:wght@400;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap',
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

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    docs: {
      sidebar: {
        autoCollapseCategories: true,
      },
    },
    navbar: {
      title: 'Regarded Games',
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
          href: 'http://localhost:3000',
          label: 'App',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
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
