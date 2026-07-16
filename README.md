# Regarded Games

Regarded Games runs Class War: The Game — class war fought as a
perfect-information strategy game with real-money stakes on Base, where collective
action battles economic power. Players trade **FIM** tokens in a seasonal on-chain
exchange/auction and are split into two factions by the live **Masses / Oligarchy
boundary** — the supply-share (Lorenz) cut at 50% of total FIM *supply*:

- **Proletariat / Socialists** — the Masses, at or below the cut.
- **Bourgeoisie / Capitalists** — the Oligarchy, above the cut.

> The boundary is a supply-share cut, **not** a population percentile: the largest set
> of poorest holders whose balances sum to ≤50% of supply are the Masses. It is
> computed live client-side from raw balances — the on-chain value is stale.

## Architecture

Three layers in one repo:

| Layer | Stack | Location | Purpose |
| --- | --- | --- | --- |
| **Frontend** | Next.js 15 (App Router), React 19, wagmi/viem, Tailwind v4 | `src/` | Game UI, trading terminal, API routes |
| **Indexer** | Ponder 0.16, PostgreSQL | `indexer/` | Indexes on-chain events → GraphQL |
| **Community** | Self-hosted Discourse (via SSO) | `http://community.localhost` | Faction forum & chat |
| **Docs** | Docusaurus | `docs/` | Whitepaper & documentation site |

Contracts live in a sibling repo (`../regarded_contracts`); ABIs are vendored into
`src/deployments/abis/` and `indexer/abis/`.

## Prerequisites

- **Node.js** ≥ 18.14
- **PostgreSQL** 18 (local; superuser + a `ponder_user` role)
- **Foundry** (`anvil`) — run from the contracts repo
- **Docker + WSL2 (Ubuntu)** — for the local Discourse container (`app`)
- An **Alchemy** API key (Base + Base Sepolia RPC, used to fork)

## Local Development

The whole stack is launched from **`start.bat`** (Windows). It reads `.env`
(overridden by `.env.local`) and spins up the frontend, docs, and — in `fork` mode —
a dual Anvil + dual Ponder setup.

### 1. Configure environment

```sh
cp .env.example .env          # fill in your values
# put secrets (Discourse keys, etc.) in .env.local — never commit either file
```

Provide PostgreSQL passwords to `start.bat` via a local, gitignored `start.env.bat`:

```bat
set "PG_PASS=your_postgres_superuser_password"
set "PONDER_PASS=your_ponder_user_password"
```

### 2. Launch

```sh
./start.bat
```

This will:

- Free the managed ports (8545, 8546, 42069, 42070) and wipe the Ponder cache.
- Ensure the Discourse WSL2 container is up.
- Start the **frontend** (`npm run dev`) and **docs** (`npm start`).
- In **`fork` mode**, recreate the Ponder databases and launch:

| Tenant | Subdomain | Chain ID | Anvil | Ponder GraphQL |
| --- | --- | --- | --- | --- |
| Base mainnet fork | `app.localhost` | 31337 | `:8545` | `:42069` |
| Base Sepolia fork | `app.sepolia.localhost` | 31338 | `:8546` | `:42070` |

The frontend runs on **`:3000`**.

### Environment modes (`NEXT_PUBLIC_ENVIRONMENT`)

- **`fork`** — two local Anvils fork Base mainnet/Sepolia; two local Ponders index
  them. The frontend auto-points at the local Ponder GraphQL endpoints.
- **`mainnet`** — no local Anvil/Ponder. Both subdomains hit the real chains
  (Base 8453 / Base Sepolia 84532) and the hosted Ponder endpoints configured via
  `NEXT_PUBLIC_PONDER_URL_MAINNET` / `_SEPOLIA`.

### Running pieces manually

```sh
# Frontend
npm run dev

# Indexer (from indexer/)
npm run dev            # ponder dev
# add `-- --reset` to wipe and re-index from the start block
```

## Project Conventions

See [`CLAUDE.md`](CLAUDE.md) for the full set. Highlights:

- **`src/app/app/_components/`** — named exports, scoped to `/app` routes.
- **`src/components/`** — default exports, shared across routes.
- **`src/lib/`** — side effects / framework coupling (DB, auth, cache, security).
- **`src/utils/`** — pure functions only.
- **State:** React Query for server state, `useState` for UI. Only two app-wide
  contexts (`ThemeContext`, `TenantContext`); everything else is prop-drilled.
- **Ponder:** always paginate via `fetchAllPonderItems` (`src/lib/ponder.ts`).
- **Wallet addresses** are always normalized to lowercase.

Domain vocabulary (collateral, headroom, FIM, RGD/REGARDS, factions) is defined in
[`CONTEXT.md`](CONTEXT.md).

## Environment Variables

`.env.example` is the authoritative reference. Key groups:

- **App** — `NEXT_PUBLIC_ENVIRONMENT`, `NEXT_PUBLIC_MAIN_DOMAIN`, `NEXT_PUBLIC_APP_URL`
- **Database** — `POSTGRES_URL` (app DB, `regarded_games`)
- **RPC** — `ALCHEMY_API_KEY`, `NEXT_PUBLIC_ANVIL_RPC_URL_MAINNET/_SEPOLIA`
- **Ponder** — `NEXT_PUBLIC_PONDER_URL_MAINNET/_SEPOLIA` (mainnet mode only)
- **Wallet** — `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- **Discourse** — `NEXT_PUBLIC_DISCOURSE_URL`, `DISCOURSE_API_KEY`,
  `DISCOURSE_SSO_SECRET`, `DISCOURSE_INIT_SECRET`, `ADMIN_WALLET`
- **Sessions / anti-bot** — `COMMUNITY_SESSION_SECRET`, `*_TURNSTILE_*`

> **Never commit `.env` or `.env.local`** — both are gitignored.

## Notes & Operations

Operational snippets (PostgreSQL profile table/user setup, forcing Discourse SSO
overrides via SQL, wiping/clearing the Discourse database, and outstanding hardening
items) live in [`NOTES.md`](NOTES.md).

## License

See [`LICENSE`](LICENSE).
