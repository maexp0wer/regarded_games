# Regarded Games — CLAUDE.md

## Project Overview

Regarded Games is a perfect-information strategy game with real-money stakes on the Base blockchain. Players compete in seasonal game rounds, trading FIM tokens in an on-chain exchange and auction. The codebase has three major layers:

1. **Frontend** — Next.js 15 app (this repo, `src/`)
2. **Indexer** — Ponder blockchain event indexer (`indexer/`)
3. **Community** — Self-hosted Discourse forum integrated via SSO

The game has two factions determined by each player's FIM balance relative to the live 50th-percentile threshold: **Capitalists** (above threshold) and **Socialists** (below).

---

## Tech Stack

| Layer | Library | Version |
|-------|---------|---------|
| Framework | Next.js (App Router) | 15.2.4 |
| React | React + React DOM | 19.0.0 |
| Web3 hooks | wagmi | 2.19.5 |
| Ethereum client | viem | 2.46.2 |
| Wallet UI | @reown/appkit + wagmi adapter | 1.8.16 |
| Data fetching | @tanstack/react-query | 5.90.18 |
| Blockchain indexer | Ponder | 0.16.1 |
| Styling | Tailwind CSS | 4.1.12 |
| Database | PostgreSQL via `pg` | 8.18.0 |
| GraphQL client | graphql-request | 7.4.0 |
| Charts | Recharts | 3.8.1 |
| TypeScript | TypeScript | 5.x strict |

**Local dev stack** (launched via `start.bat`):
- Next.js dev server on port 3000
- Anvil local blockchain on port 8545
- Ponder indexer serving GraphQL on port 42069

---

## Folder Conventions

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (Next.js Route Handlers)
│   ├── app/               # Protected app pages (requires wallet)
│   │   ├── [seasonSlug]/  # Main game interface
│   │   ├── dashboard/     # Player dashboard
│   │   ├── stake/         # Staking UI
│   │   ├── swap/          # Token swap UI
│   │   └── _components/   # Components scoped to /app routes only
│   ├── docs/              # Documentation pages
│   ├── main/              # Marketing/landing page
│   ├── globals.css        # Global styles + Tailwind theme + utility classes
│   └── layout.tsx         # Root layout (Providers wrapper)
├── components/            # Shared components across all routes
├── config/                # Library configuration (wagmi.ts)
├── context/               # React context (ThemeContext only)
├── deployments/           # Contract ABIs and addresses
│   ├── abis/             # ABI JSON files (source of truth)
│   ├── core.json         # Production contract addresses
│   ├── mocks.json        # Mock contract addresses
│   └── seasons.json      # Per-season contract addresses
├── hooks/                 # Custom React hooks (data fetching + UI)
├── lib/                   # Shared utilities and helpers
├── sql/                   # Database schema files
└── utils/                 # Pure calculation utilities (no React)
```

**Rule: `_components/` vs `components/`**
- `src/app/app/_components/` — components used only within `/app` routes. Named exports.
- `src/components/` — shared across all routes (landing, docs, app). Default exports.

**Rule: `lib/` vs `utils/`**
- `lib/` — modules with side effects or framework coupling (db connections, wagmi helpers, contract address loading)
- `utils/` — pure functions only (e.g., `calc_gini.ts`)

---

## Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Components | PascalCase, filename matches | `TradingMask.tsx` |
| Hooks | camelCase with `use` prefix | `useBatchPlayerPercentiles.ts` |
| Types/Interfaces | PascalCase, `Props` suffix for component props | `TradingMaskProps`, `PercentileData` |
| API route files | `route.ts` inside named folder | `src/app/api/yield/route.ts` |
| Constants | UPPER_SNAKE_CASE | `NEXT_PUBLIC_CHAIN_ID` |
| Utility functions | camelCase | `calcGiniCoefficient` |
| Contract ABIs | PascalCase JSON, matches contract name | `GameSeason.json` |

---

## Component Patterns

**Export style:**
- `src/components/` — default export: `export default function Card()`
- `src/app/app/_components/` — named export: `export function TradingMask()`

**State management:**
- No Redux or Zustand. React Query handles server state; local `useState` handles UI state.
- Theme is the only app-wide context (`src/context/ThemeContext.tsx`).
- Page-level state is lifted to the route component (`[seasonSlug]/page.tsx`) and prop-drilled to children.

**Loading states:** Use Tailwind `animate-pulse` on skeleton placeholders. Loading text pattern: `"Reading Ledger..."`.

**Error states:** Show an inline error message styled with `text-red-500` or the `--color-danger` CSS variable.

**Workflow status:** Multi-step blockchain transactions use a 5-state enum: `idle → approving → executing → success | failed`.

**Drag-and-drop:** Use the native HTML5 drag API (no library). See `TradingMask.tsx` for the pattern.

---

## Ponder Pagination

All Ponder GraphQL queries **must** use `fetchAllPonderItems` from `src/lib/ponder.ts` instead of a single `fetch` with a hardcoded limit. The helper automatically pages through all results using cursor-based pagination (`after` / `pageInfo`).

```ts
import { fetchAllPonderItems } from '@/lib/ponder';

const items = await fetchAllPonderItems<{ playerAddress: string; fimBalance: string }>(
  PONDER_URL,
  `query Q($season: String!, $after: String, $limit: Int!) {
    playerSeasonStatss(where: { seasonAddress: $season }, limit: $limit, after: $after) {
      items { playerAddress, fimBalance }
      pageInfo { endCursor, hasNextPage }
    }
  }`,
  { season: addr },
  (d) => d.playerSeasonStatss
);
```

The query **must** declare `$after: String` and `$limit: Int!` variables, and the selected field **must** include `pageInfo { endCursor hasNextPage }`.

---

## Hooks Pattern

All data-fetching hooks use React Query. Follow this structure:

```ts
import { useQuery } from '@tanstack/react-query'

export function useSomething(param: string) {
  return useQuery({
    queryKey: ['somethingKey', param],   // stable, serializable array
    queryFn: async () => { /* fetch */ },
    enabled: !!param,                    // guard against undefined params
    refetchInterval: 5000,               // ms; omit for static data
  })
}
```

**refetchInterval guidelines:**
- Fast-changing game data (order book, percentiles): 3000–5000 ms
- Slower stats: 15000 ms
- Static on-chain config: no interval

**Ponder GraphQL queries** go through `graphql-request`. Query the local endpoint:
```ts
const PONDER_GRAPHQL_URL = 'http://127.0.0.1:42069/graphql'
```

All queries currently use `limit: 1000` — this is a known limitation. Do not lower it without adding pagination.

---

## Web3 Patterns

**In React components (client-side, wallet interactions):**
Use wagmi hooks: `useReadContract`, `useWriteContract`, `useAccount`, `usePublicClient`.

**In API routes (server-side, read-only blockchain queries):**
Instantiate a viem `publicClient` directly from `NEXT_PUBLIC_CHAIN_ID`:

```ts
import { createPublicClient, http } from 'viem'
import { hardhat } from 'viem/chains'

const client = createPublicClient({ chain: hardhat, transport: http(process.env.RPC_URL) })
const result = await client.readContract({ address, abi, functionName, args })
```

**Chain configuration:**
- Dev: Anvil/Foundry (chain ID 31337, `http://127.0.0.1:8545`)
- Testnet: Base Sepolia (chain ID 84532)
- Production: Base mainnet (chain ID 8453)
- Active chain selected via `NEXT_PUBLIC_CHAIN_ID` env var

**Contract addresses:**
- Load from `src/deployments/core.json` and `src/deployments/seasons.json`
- Helper functions in `src/lib/contracts.ts`
- ABIs in `src/deployments/abis/` (JSON files, imported directly)

**Signature verification:**
- Profile updates: `verifyMessage()` from viem
- Discourse SSO: HMAC-SHA256 with `DISCOURSE_SSO_SECRET`
- Wallet addresses are always normalized to lowercase before storage or comparison

---

## API Route Conventions

All routes live in `src/app/api/` as `route.ts` files using Next.js Route Handlers.

**Response shape — success:**
```ts
return NextResponse.json({ success: true, data: ... })
```

**Response shape — error:**
```ts
return NextResponse.json({ error: 'Human-readable message' }, { status: 400 })
```

**Do not** mix `return null` and `return { error: ... }` — use the `{ error }` shape consistently.

**Environment variables:**
- Always validate that required env vars are present at the top of the handler. Return a 500 with a descriptive message if missing.
- `NEXT_PUBLIC_*` vars are available client-side. Non-prefixed vars are server-only.

**Discourse API routes** (`src/app/api/discourse/`) call the Discourse REST API using:
```
DISCOURSE_URL + endpoint
Headers: { 'Api-Key': DISCOURSE_API_KEY, 'Api-Username': DISCOURSE_API_USERNAME }
```
These routes use in-memory caches (`groupIdCache`, `userFactionCache`) that reset on server restart — acceptable for single-instance dev, needs Redis/DB backing before multi-instance deployment.

---

## Styling Conventions

**Primary:** Tailwind CSS utility classes. No CSS Modules.

**CSS variables** (defined in `src/app/globals.css`):
```css
--color-primary   /* brand orange #CC4713 */
--color-success   /* green */
--color-danger    /* red */
--color-bg        /* page background */
--color-surface   /* card/panel background */
--color-text      /* primary text */
```

**Dark mode:** Toggled by adding/removing the `.dark` class on `<html>`. See `ThemeContext`.

**Global utility classes** (defined in `globals.css`, use these instead of repeating Tailwind):
- `.btn-primary`, `.btn-secondary`, `.btn-success` — button variants
- `.h3-app`, `.h4-app` — heading sizes for app UI
- `.custom-scrollbar` — styled scrollbar

**Responsive:** Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`). Grid layouts follow `grid-cols-1 lg:grid-cols-3` pattern.

**SVG imports:** SVGs are auto-converted to React components via `@svgr/webpack`. Import as a component: `import Logo from '@/public/assets/Logo.svg'`. For a URL string: `import logoUrl from '@/public/assets/Logo.svg?url'`.

---

## Blockchain / Deployment

**ABI source of truth:** `src/deployments/abis/` — import directly in code.

**Address loading:**
- Production: `src/deployments/core.json` and `seasons.json`
- Local dev: `deployment-config-localhost.json` at project root
- Chain-aware address selection happens in `src/lib/contracts.ts`

**Ponder schema** (6 tables): `seasons`, `playerSeasonStats`, `auctionMints`, `orders`, `trades`, `yieldEvents`. Schema defined in `indexer/ponder.schema.ts`.

**Faction threshold:** The 50th-percentile FIM balance that splits Capitalists from Socialists is calculated live client-side from raw player balances — not read from the contract. This is intentional: the contract value is stale; the live calculation reflects current economic state.

---

## Known Issues (Do Not Reintroduce)

1. **In-memory Discourse caches** — `groupIdCache` and `userFactionCache` in `src/app/api/discourse/` reset on server restart and will diverge across multiple instances. Acceptable for single-instance dev; needs Redis or DB backing before horizontal scaling.
2. **No caller auth on client-facing Discourse routes** — `create-player`, `sync-faction`, and `discover-channel` have no session or signature check (the privileged `init-season` route is gated by `DISCOURSE_INIT_SECRET`). The user-facing routes are low-risk but should get wallet-signature verification before production.
3. **Secrets in `.env` and `.env.local`** — never commit these files. Reference `.env.example` for required keys. Move to a secrets manager before production deployment.
