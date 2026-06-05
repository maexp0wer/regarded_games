# Regarded Games — CLAUDE.md

## Project Overview

Perfect-information strategy game with real-money stakes on Base. Players trade FIM tokens in a seasonal on-chain exchange/auction. Two factions based on each player's FIM balance vs. the live 50th-percentile threshold: **Proletariat/Socialists** (below) and **Bourgeoisie/Capitalists** (above).

Three layers: **Frontend** (Next.js 15, `src/`), **Indexer** (Ponder, `indexer/`), **Community** (self-hosted Discourse via SSO).

Local dev launched via `start.bat`: Next.js on :3000, Anvil on :8545, Ponder GraphQL on :42069.

---

## Key Rules

**Folder split:**
- `src/app/app/_components/` — named exports, scoped to `/app` routes only
- `src/components/` — default exports, shared across all routes
- `src/lib/` — side effects / framework coupling (DB, auth, cache, tenant config, security, quests)
- `src/utils/` — pure functions only (gini, validation, formOptions, discourseNames, toc, etc.)

**Naming:** PascalCase components, `use` prefix hooks, `route.ts` API files, UPPER_SNAKE_CASE constants, camelCase utils, PascalCase ABI JSONs.

**State:** No Redux/Zustand. React Query for server state, `useState` for UI. Two approved contexts:
- `ThemeContext` — UI theming, app-wide (`src/app/layout.tsx`).
- `TenantContext` — read-only blockchain config (chain ID, contract addresses, Ponder URL), scoped to the `/app` subtree (`src/app/app/layout.tsx`). Resolved server-side once per request; never mutated client-side.

A new context requires the same bar: (a) ambient config that cannot reasonably be prop-drilled (50+ call sites), (b) read-only / session-immutable, (c) single owner that sets it once. Everything else is lifted to the nearest route component and prop-drilled.

**Loading:** `animate-pulse` skeleton + text `"Reading Ledger..."`. **Errors:** inline `text-[--color-red]` / `color-[--color-red]`. **Tx workflow:** `idle → approving → executing → success | failed`.

**Drag-and-drop:** Native HTML5 drag API. See `TradingMask.tsx`.

---

## Ponder Pagination

**Always** use `fetchAllPonderItems` from `src/lib/ponder.ts` — never a single fetch with a hardcoded limit. Query must declare `$after: String` and `$limit: Int!` and select `pageInfo { endCursor hasNextPage }`.

```ts
const items = await fetchAllPonderItems<T>(PONDER_URL, query, vars, (d) => d.collectionName);
```

Ponder GraphQL endpoint: `http://127.0.0.1:42069/graphql`

---

## Hooks Pattern

All data-fetching hooks use `useQuery` from `@tanstack/react-query` with a stable `queryKey`, `enabled: !!param` guard, and `refetchInterval` (3–5 s fast data, 15 s slow, none for static).

---

## Web3 Patterns

- **Client-side:** wagmi hooks (`useReadContract`, `useWriteContract`, `useAccount`, `usePublicClient`)
- **Server-side (API routes):** instantiate viem `publicClient` directly via `NEXT_PUBLIC_CHAIN_ID`
- Chains: dev 31337 (Anvil), testnet 84532 (Base Sepolia), prod 8453 (Base mainnet)
- Contract addresses from `src/deployments/local/core.json` via `src/lib/contracts.ts`
- ABIs in `src/deployments/abis/` (source of truth)
- Wallet addresses always normalized to lowercase
- Faction threshold calculated live client-side from raw balances — **not** read from the contract (contract value is stale)

---

## API Route Conventions

- Success: `NextResponse.json({ success: true, data: ... })`
- Error: `NextResponse.json({ error: 'message' }, { status: 400 })` — never `return null`
- Validate required env vars at the top of each handler; return 500 if missing
- Discourse routes use `DISCOURSE_URL + endpoint` with `Api-Key` / `Api-Username` headers

---

## Styling

Tailwind utilities only — no CSS Modules. Dark mode uses `.dark` on `<html>` — use `in-[.dark]:` to override unlayered component classes (not the `dark:` variant). SVGs imported as React components via `@svgr/webpack`.

### CSS Variables (`globals.css`)

**Surface layers** (light → dark: `#F8F9FC` → `#0D0B14`):
- `--color-bg` — page canvas
- `--color-card` — primary containers
- `--color-card2` — raised modules / active panels
- `--color-card3` — elevated modals / dropdowns / inner wells

**Typography:**
- `--color-text` — headings / high priority
- `--color-text2` — muted labels / subtitles

**Borders:**
- `--color-border` — Tier 1: soft separation
- `--color-border2` — Tier 2: high-contrast divider / interactive

**Faction accents:**
- `--color-purple` — Proletariat/Socialist (light: `#6A1B9A`, dark: `#9D4EDD`)
- `--color-purple-hover`
- `--color-gold` — Bourgeoisie/Capitalist (light: `#D4AF37`, dark: `#FFC300`)
- `--color-gold-hover`

**Trading signals:**
- `--color-green` / `--color-green-hover` — bull / buy
- `--color-red` / `--color-red-hover` — bear / sell

**Gradient midpoints:**
- `--color-magenta`, `--color-orange`

**Transparency tokens** (`--color-{hue}-{15|35|70}`): pre-mixed via `color-mix()` for all of the above.

**Gradients:**
- `--sunset` — full purple→magenta→orange→gold gradient (hero accents, primary button fill)
- `--sunset-15` — 15% opacity version
- `--sunset-35` — 35% opacity version

### Fonts

- `--font-display` (`Exo 2`) — hero numbers, headings, buttons
- `--font-sans` (`Space Grotesk`) — all UI / body text
- `--font-mono` (`JetBrains Mono`) — every numeric value, label, mono field

### Global Classes

**Buttons:**
- `.btn-game-primary` — gradient sunset fill, glow shadow; use for primary CTAs
- `.btn-game-secondary` — card2 background, border2 border; use for secondary actions
- `.btn-stepper` — micro ▲/▼ stepper at minimum size
- `.btn-terminal-action.action-buy` / `.action-sell` — full-width colored execute buttons
- `.btn-input-switch` — micro toggle inside input rails; variants: `.filter-buy`, `.filter-sell`, `.filter-all`, `.filter-gold`

**Cards & Panes:**
- `.card-app` — rounded-[25px], 24px padding, border
- `.landing-card` — interactive hover with lift + faction glow + sunset backdrop
- `.terminal-pane` — flat info panel with `.terminal-pane-header` / `.terminal-pane-title`

**Navigation:**
- `.terminal-view-selector-bar` — full-width tab strip with bottom border track
- `.terminal-view-btn` — tab button; `.active` lights up purple bottom indicator
- `.nav-link-item` — landing nav text link; `.active` uses `--color-purple`

**Ledger / data rows:**
- `.ledger-header` / `.ledger-row` — grid rows for order/activity tables
- `.ledger-cell-secondary` — muted mono cell
- `.ledger-cell-metric` — right-aligned numeric cell
- `.ledger-row-passive` — disables hover accent

**Typography:**
- `.h2-app` — Exo 2 900 28px uppercase 0.08em
- `.h3-app` — Exo 2 900 18px uppercase 0.05em
- `.h4-app` — JetBrains Mono 9px 600 uppercase muted
- `.section-label` — mono 10–11px 900 uppercase muted with gold dot
- `.mask-label` — mono 8–9px 900 uppercase muted
- `.gini-label` — mono 10px semibold uppercase muted
- `.hero-title` / `.hero-gradient-text` / `.hero-subtitle` — landing page hero

**Status / misc:**
- `.pill` — rounded status tag (mono 11px uppercase)
- `.chip` — quick-amount selector; `.active` uses gold tint
- `.kv-row` — key/value pair row
- `.countdown-chip` / `.countdown-val` / `.countdown-lbl` — countdown cells
- `.terminal-countdown-wrapper` + `.terminal-countdown-box` + `.tcb-val` / `.tcb-unit` — inline countdown
- `.progress-rail-container` / `.progress-rail-fill` / `.progress-rail-overlay-text` — progress bars
- `.stat-rail-card` / `.rank-track-chassis` / `.metric-bar-chassis` / `.live-rail-container` — stat/rank rails
- `.dial-knob.purple` / `.gold` / `.current` — faction dial indicators on the live rail
- `.modal-overlay-blur` — frosted backdrop overlay
- `.surface-pink-warn` — red-15 warning surface
- `.custom-scrollbar` — thin scrollbar styling
- `.input-embedded-rail` — toggle rail attached to top of input
- `.season-ledger-row` — season archive card row
- `.quest-category-pane` / `.quest-task-row` / `.quest-completed` — quest board rows
- `.connect-gate` / `.connect-gate-body` — disconnected wallet placeholder

---

## Known Issues (Do Not Reintroduce)

1. **Discourse cache is in-memory.** `src/lib/serverCache.ts` backs the faction/group caches in `sync-faction` + `create-player` with a per-process `Map` (tenant-scoped keys, TTLs). Correct on a single instance; lost on restart and **not shared across instances**. Before a serverless/multi-replica deploy, implement the documented Redis driver in `serverCache.ts` (env-selected) — no call-site changes needed.
2. **Auth on client-facing Discourse routes is partial.** Chat/forum read+write (`chat-messages`, `topics`, `topic-posts`) and `discover-channel` now require the verified community session (`src/lib/communitySession.ts`); `sync-faction` is admin-token gated. Still unverified: `create-player` provisioning (takes `walletAddress` from the body — low impact, idempotent).
3. **Never commit `.env` / `.env.local`** — see `.env.example` for required keys.
