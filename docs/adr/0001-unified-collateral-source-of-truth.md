# 1. Unified collateral source of truth (`rgdLockedPerFim`) across Auction and Exchange

Date: 2026-06-11

## Status

Accepted

## Context

Collateral (RGD locked per FIM held) became required on the **Exchange** during
the Trading Phase — previously only the **Auction** enforced it. The frontend
must pre-check collateral before any FIM-acquiring action (auction buy, taker
filling an ask, maker placing a bid) and display "locked RGD" that reacts to
trades.

The existing Auction frontend (`AuctionMask`) did **not** read the on-chain
collateral rate. It hardcoded a `stakedBalances × 10` ratio (implying
`rgdLockedPerFim = 0.1e18`) and computed headroom against `stakedBalances`
directly — ignoring `requiredRegStake`, and therefore ignoring collateral locked
by other concurrent seasons or by trades.

The backend handoff states the Auction and Exchange share **one** collateral
rate (`rgdLockedPerFim`) and **one** lock bucket per season. Building the new
Exchange pre-check against the contract value while leaving the Auction on its
hardcoded constant would let the two flows disagree the moment the real constant
≠ 0.1, and would leave the Auction blind to cross-season/trade locks.

## Decision

Make `rgdLockedPerFim` (read live from the contract) the **single source of
truth** for collateral math everywhere, and refactor the Auction to use it.

Collateral logic is split into two layers, per the repo's `utils`-is-pure /
`hooks`-fetch convention (mirroring the existing `gini.ts` pattern):

- **`src/utils/collateral.ts`** — pure functions operating on already-fetched
  bigints: `regForFim(fim, rate)`, `headroomFor(staked, required)`,
  `maxBuyableFim(...)`, and a `canBuyFim`-style check returning
  `{ ok, needed, headroom, shortfall }`. Rounding mirrors the contract exactly
  (multiply then divide by 1e18, floor).
- **`src/hooks/useCollateral.ts`** — fetches `stakedBalances`,
  `requiredRegStake`, `seasonLocks`, and `rgdLockedPerFim` via wagmi
  (`useReadContract`) and feeds the pure layer.

Both `AuctionMask` and `TradingMask` consume the hook. The Auction's `×10`
constant is retired.

## Consequences

- **Positive:** One rate, one math implementation; Auction and Exchange can never
  disagree on collateral. The contract-matching floor rounding lives in one pure,
  unit-testable place. Headroom now correctly accounts for cross-season locks
  (`requiredRegStake`) everywhere. The pure layer is reusable by non-React code
  (e.g. the indexer) later.
- **Negative / cost:** Touches the previously-working Auction buy flow — a
  regression-risk surface that was out of strict scope for "add Exchange
  collateral." Reverting to per-flow collateral logic is now non-trivial.
- **Note for future readers:** If you find the Auction reading `rgdLockedPerFim()`
  and wonder why it isn't the old `×10` — this is intentional; see above.
- **Depends on:** the new `Exchange.rgdLockedPerFim()` / `staking()` getters —
  **now present** in `src/deployments/abis/Exchange.json` (ABIs landed), so the
  hook can be wired immediately.
