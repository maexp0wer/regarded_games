# Regarded Games — CLAUDE.md

## Project Overview

Perfect-information strategy game with real-money stakes on Base. Players trade FIM tokens in a seasonal on-chain exchange/auction. Two factions based on each player's FIM balance vs. the live 50th-percentile threshold: **Capitalists** (above) and **Socialists** (below).

Three layers: **Frontend** (Next.js 15, `src/`), **Indexer** (Ponder, `indexer/`), **Community** (self-hosted Discourse via SSO).

Local dev launched via `start.bat`: Next.js on :3000, Anvil on :8545, Ponder GraphQL on :42069.

---

## Key Rules

**Folder split:**
- `src/app/app/_components/` — named exports, scoped to `/app` routes only
- `src/components/` — default exports, shared across all routes
- `src/lib/` — side effects / framework coupling; `src/utils/` — pure functions only

**Naming:** PascalCase components, `use` prefix hooks, `route.ts` API files, UPPER_SNAKE_CASE constants, camelCase utils, PascalCase ABI JSONs.

**State:** No Redux/Zustand. React Query for server state, `useState` for UI. Only global context is `ThemeContext`. State lifted to route component and prop-drilled.

**Loading:** `animate-pulse` skeleton + text `"Reading Ledger..."`. **Errors:** inline `text-red-500` / `--color-danger`. **Tx workflow:** `idle → approving → executing → success | failed`.

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

Tailwind utilities only — no CSS Modules. CSS variables in `globals.css`: `--color-primary` (#CC4713), `--color-success`, `--color-danger`, `--color-bg`, `--color-surface`, `--color-text`. Global classes: `.btn-primary/secondary/success`, `.h3-app`, `.h4-app`, `.custom-scrollbar`. Dark mode via `.dark` on `<html>`. SVGs imported as React components via `@svgr/webpack`.

---

## Known Issues (Do Not Reintroduce)

1. **Discourse cache is in-memory.** `src/lib/serverCache.ts` backs the faction/group caches in `sync-faction` + `create-player` with a per-process `Map` (tenant-scoped keys, TTLs). Correct on a single instance; lost on restart and **not shared across instances**. Before a serverless/multi-replica deploy, implement the documented Redis driver in `serverCache.ts` (env-selected) — no call-site changes needed.
2. **Auth on client-facing Discourse routes is partial.** Chat/forum read+write (`chat-messages`, `topics`, `topic-posts`) and `discover-channel` now require the verified community session (`src/lib/communitySession.ts`); `sync-faction` is admin-token gated. Still unverified: `create-player` provisioning (takes `walletAddress` from the body — low impact, idempotent).
3. **Never commit `.env` / `.env.local`** — see `.env.example` for required keys.
