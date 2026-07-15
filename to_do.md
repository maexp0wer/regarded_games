# To Do — SEO / GEO follow-ups

Open items from the SEO/GEO foundation shipped 2026-07-13. The decisions
behind them are recorded in `CONTEXT.md` ("GEO", "Entity"); the code source
of truth is `src/config/seo.ts`.

## Now (pre-launch)

- [ ] **Fill in `SOCIAL_PROFILES`** in `src/config/seo.ts` (X, public GitHub,
      Discord/Telegram URLs). Empty entries are omitted from the JSON-LD
      `sameAs` array, so the entity currently has no corroborating profiles.
- [ ] **Mirror the same profiles** into the hand-duplicated Organization
      JSON-LD in `docs/docusaurus.config.ts` (`headTags`) — the two projects
      don't share a module graph, sync is manual.
- [ ] **Register both origins in Google Search Console** (regarded.games +
      docs.regarded.games), submit both sitemaps.
- [ ] **Register in Bing Webmaster Tools** — Bing's index feeds ChatGPT
      search; for GEO this matters as much as Google.
- [ ] **Verify the sepolia `X-Robots-Tag: noindex` header end-to-end** on a
      page response next time the fork environment (`start.bat`) is running —
      the middleware logic mirrors the proven `x-tenant` pattern but couldn't
      be SSR-tested without the fork backends.
- [ ] **Write the Learn articles** (docs site, third docs instance at
      `/learn`): Gini coefficient explained, Lorenz curves / supply-share
      cuts, perfect-information games, wealth-concentration mechanics — each
      linking into the whitepaper section that implements the concept.
      Infrastructure pattern: copy how the whitepaper plugin is wired in
      `docs/docusaurus.config.ts`.
- [ ] **Art-directed OG card** to replace the generated one in
      `src/app/opengraph-image.tsx` (brand font + Regardo/Carlo artwork,
      1200×630). Also set `themeConfig.image` in the docs config (needs a
      static raster in `docs/static/img/`).

## At launch

- [ ] **Build the public season archive**: `regarded.games/seasons/{n}`
      server-rendered recaps from the Ponder indexer (outcome, Gini movement,
      class victory, pool size, anonymized leaderboard).
- [ ] **De-noindex `/seasons`** (`src/app/main/seasons/page.tsx` — drop the
      `robots` block) and **add the season routes to `src/app/sitemap.ts`**.
- [ ] **Confirm the Discourse forum's public categories are crawlable**
      (decision: index public categories; strategy rooms stay login-gated).
      Check Discourse's sitemap plugin is enabled and its robots.txt is sane.

## Ongoing (entity building)

- [ ] **Wikidata entry** for Regarded Games once there are 2–3 independent
      citable sources (launch coverage, Base ecosystem listing).
- [ ] **Base ecosystem listing** — get regarded.games onto base.org's
      ecosystem page (strong sameAs target + referring domain).
- [ ] **Monitor LLM answers** for "What is Regarded Games?" / "Is Regarded
      Games gambling?" (ChatGPT, Perplexity, Google AI Overviews) — the FAQ
      page at `/faq` is the canonical source they should be citing; adjust
      its copy if they misquote or hallucinate.
- [ ] **Season announcements as freshness signals** — each season start/
      settlement should produce at least one new indexable page or update
      (season page, forum announcement) on the primary origin.
