# Context — Regarded Games

A glossary of the domain language used in this project. Terms here are the
canonical vocabulary; code, comments, and docs should match these definitions.

> **Scope of the collateral-gating work (this pass):** collateral pre-checks +
> phase-correct enable/disable of *player* actions (buy/bid/fill/sell, stake/
> unstake). **Out of scope:** keeper/crank UI (`startBootstrap`, `processBatch`,
> `finalizeGame`, `settleOrders`, …) and indexing the `Collateral*` events.

## Glossary

### Faction progress is mutually exclusive (no positive-positive tie)
`capProgress > 0` requires `g_current > g_initial` (Gini rose); `socProgress > 0`
requires `g_current < g_initial` (Gini fell). A single `g_current` can't be both
above and below `g_initial`, so **at most one faction ever has positive progress**.
The only way `capProgress == socProgress` is when **both are 0** (Gini unchanged).
Consequence: an exact tie ⇒ `finalProgressBps == 0` ⇒ payout is the **pure draw
share** (`winShare×0 + drawShare×1`), i.e. every eligible player gets their
holdings-proportional money back. The `isOligarchyWin = (capProgress >= socProgress)`
flag is set `true` on that tie but is **inert** — it only weights `winShare`, which
is multiplied by zero progress. So a tie NEVER produces a Capitalist win.
(`GameSeason.sol` `_settleVictory` L341-347, `_calculateSinglePayout` L426.)

### Faction labels (canonical — Class names) — CLASS vs PLAYER nouns
The two factions are named by their **economic class**, everywhere (code, UI,
Whitepaper). **Distinguish the name of the *class* from the name of a *player* in
it:**

| | Capitalist side (`isCapitalist === true`, gold) | Proletariat side (`isCapitalist === false`, purple) |
|---|---|---|
| **The class** | **Capitalist** ("Class: Capitalist", "Capitalist victory") | **Proletariat** ("Class: Proletariat", "Proletariat victory") |
| **A player** | a **Capitalist** / the **Capitalists** | a **Proletarian** / the **Proletarians** |

So "Proletariat" is **only** the standalone class noun — a *member* is a
**Proletarian**, never "a Proletariat". "Capitalist" doubles as both the class
name and the player noun. ⚠️ Never call a person "a Proletariat".

**Adjective form = Capitalist / Proletarian** (not "Proletariat"). When the class
name modifies another noun, use the adjective:
- "**Proletarian** faction / victory / progress / premium / player" ✓
- "the **Proletariat**" / "Class: **Proletariat**" (standalone noun) ✓
- ✗ "Proletariat faction" / "Proletariat victory" — wrong, those are adjectival.

**Deprecated as faction labels — do not use to name a class or a player:**
"Socialist(s)", "Bourgeoisie / Bourgeois". (The archetypes **Regardo the
Capitalist** and **Carlo the Socialist** keep their proper names; "Socialist"
survives only as Carlo's archetype descriptor, not as a faction label.)

**"Oligarchy" and "Masses" are NOT faction labels** — they are the precise names
of the supply-share *coalitions* at settlement (the set of holders ≥50% / ≤50% of
supply; see below). Use them only when naming the cut or the payout coalition,
never as a player's displayed class identity.

**Discourse (full rename, incl. slugs — `discourseNames.ts` is source of truth):**
the `bourgeoisie` key is now `capitalist`; `proletariat` key stays. Generated
artifacts use the **player plural** (a strategy room is a room of players):
- groups: `S{n}_Capitalists` / `S{n}_Proletarians`
- category slugs: `s{n}-capitalists-strategy` / `s{n}-proletarians-strategy`
- category names: `S{n} Capitalists Strategy` / `S{n} Proletarians Strategy`
- intro keys in `content/discourse/discourse-category-intros.md`:
  `capitalists-strategy` / `proletarians-strategy`.
⚠️ Slug change breaks existing category URLs — needs a Discourse-side rename/
migration for any season already provisioned under the old slugs.
OrderBook/PercentRangeSlider faction-filter union value: `'bourgeoisie' →
'capitalist'`.

### Masses / Oligarchy boundary (the faction cut)
The single supply-share (Lorenz) cut that decides a player's faction **and** the
Socialist payout. Sort holders ascending; the **largest set of poorest holders
whose balances sum to ≤50% of total \$FIM *supply*** are the **Masses**
(Proletariat / Socialist); the remainder are the **Oligarchy** (Bourgeoisie /
Capitalist). This is a **supply-share cut, NOT a population percentile** — it is
typically far more than 50% of *people*. The boundary is one and the same live
during trading and at settlement (Whitepaper §9.4, §21.3). Computed live,
off-chain, in raw wei (`useBatchPlayerClass.ts`, `payoutProjection.ts`,
`player-class` API) — the on-chain `massThresholdBalance()` is stale, never read.
> **Canonical-source conflict (Whitepaper):** §9.4 and Appendix §21.3 define this
> correctly as a supply-share cut. §9.5 Scenario B mis-describes it as a
> population bisection ("Elite (Top 50%) / Masses (Bottom 50%)"). **§9.5 prose is
> the bug** (resolved 2026-06-20); code and the other two sections are canonical.

### Collateral
RGD that a player has **locked** by virtue of holding FIM — or *committing* to
acquire FIM via an open bid — in a season. Distinct from *staked* RGD: a player
stakes RGD freely, but a portion becomes collateral (locked) the moment they
acquire FIM **or place a buy order**. Locked RGD cannot be unstaked until the FIM
is sold, the bid is cancelled/settled, or the season ends.
Invariant: `locked = (fimHeld + fimCommittedInOpenBids) × rgdLockedPerFim / 1e18`.

### Bid (BUY order) collateral reservation
Placing a bid (`createOrder(isBuy=true)`) **reserves** collateral at placement —
the maker's lock rises immediately and the tx reverts `"Insufficient Collateral"`
if they're short. Cancelling/settling a bid frees the reservation; filling it
converts the reservation into a held-FIM lock with no net change (don't
double-count). Consequence: every open bid is honorable, so a taker selling into
a bid never reverts on the maker's collateral — no maker simulation needed.

### Staked RGD
RGD a player has deposited into the `Staking` contract (`stakedBalances`). The
total pool from which collateral is drawn. Staking is never phase-gated.

### Naming across surfaces (RGD / reg; collateral / locked)
One concept, multiple deliberate surface forms — do not "fix" these into one:
- **Token** — canonical name **"Regarded Token"**, abbreviated **"\$RGD"**.
  code/identifier: `rgd` (matches the `RGD` address key and `rgdLockedPerFim`).
  User-facing copy: **"\$RGD"** (or spell out "Regarded Token" on first use).
  Contract internals: `reg` (`requiredRegStake`, `regForFim`). Keep each as-is per
  layer. **"REGARDS" is deprecated** — do not reintroduce it in copy or code.
- **Locked collateral** — code/identifier: `collateral` / `lockedRgd` (matches
  the handoff and the `Collateral*` events). User-facing copy: **"Vault Locked"**
  / "Locked RGD" (brand, untouched). Contract: `requiredRegStake` /
  `seasonLocks`.
New code uses `rgd`, `collateral`/`locked`, `headroom`; the pure fn keeps the
handoff's `regForFim` name (mirrors contract `_regOf`). Brand copy is untouched.

### Withdrawable / Free RGD
`stakedBalances − requiredRegStake`. The portion of staked RGD not currently
acting as collateral, hence unstakeable right now. Also called *headroom* when
framed as "how much more FIM can I acquire."

### Headroom
The free collateral available for a new buy: `stakedBalances − requiredRegStake`
(RGD wei). Converted to FIM via `headroom × 1e18 / rgdLockedPerFim` to answer
"how much more FIM can this player acquire now." Computed by the pure
`src/utils/collateral.ts` layer; the live values are fetched by
`src/hooks/useCollateral.ts`.

### Which actions need a collateral pre-check
Anything that **commits the connected wallet to acquiring FIM**:
1. **Auction buy** (`buyFIM`)
2. **Taker filling an ask** (taking a SELL order → taker receives FIM)
3. **Maker placing a bid** (`createOrder(isBuy=true)` → reserves collateral now)
Sells never need it: creating/ filling a SELL, and **selling into a bid** (the
maker's leg is pre-reserved). Gating lives in the component (button state + Stake
CTA), mirroring AuctionMask's "Stake REGARDS to Unlock" swap; `useTradeExecution`
keeps the `"Insufficient Collateral"` revert only as a race-condition fallback.

When short, the UI **blocks and deep-links to `/stake`** (stake and buy are
separate txs on separate contracts and cannot be chained into one). No inline
stake-then-buy orchestrator — preserve queued-order context if cheap, but the
user stakes via the existing flow and returns. Copy: "Buying N FIM requires X RGD
staked. You have Y free. Stake Z more."
For a `fillBatch`, pre-check the taker's FIM-to-receive across all ask legs
**net of** FIM sold into bid legs (see "Mixed-batch collateral" below). The
frontend already computes `legsFim.buyFimRaw` and `legsFim.sellFimRaw` in
TradingMask.

### Mixed-batch collateral: GROSS vs NET (RESOLVED — NET via leg ordering)
Backend confirmed: the collateral check is **per-leg, array-order-sensitive, no
end-of-batch netting**. A bid leg (taker sells) releases the taker's lock
immediately; an ask leg (taker buys) adds the lock and checks sufficiency right
then. **Therefore the frontend controls GROSS vs NET via array order:**
- Put **all bid (sell) legs before all ask (buy) legs** in `ids`/`amounts`.
  Releases land first → effective requirement is **NET**
  (`regForFim(buyFimRaw − sellFimRaw)`).
- ✅ DONE: `executionPayload` in TradingMask now builds **sell (bid) legs first,
  then buy (ask) legs** (`TradingMask.tsx` ~L154-177) — the NET-realizing order.
  (The earlier asks-first version was the GROSS bug; it has been reversed.)
Pre-check uses `regForFim(max(0, buyFimRaw − sellFimRaw))`, matching the
guaranteed leg order. Keep GROSS only as a fallback if leg order can't be
guaranteed (it can — we build the array).

### rgdLockedPerFim
Per-season constant: RGD wei locked per whole FIM held. **Identical** value for
the Auction and the Exchange. New public getter on the Exchange as of the
collateral change. This is the single source of truth for collateral math
across both flows; the Auction's former hardcoded `×10` ratio is retired.

### requiredRegStake
Per-user **cross-season high-water mark**: the maximum collateral across all of
a user's active seasons. This — not the current season's lock — is what
`unstake` checks against.

### Collateral reads are live, not indexed
The collateral pre-check (`canBuyFim`) reads **live contract state** via wagmi —
`stakedBalances`, `requiredRegStake`, `seasonLocks`, `rgdLockedPerFim`. It does
**not** replay events. The `CollateralRegistered`/`CollateralReleased` events are
only needed for an *off-chain aggregated* view (flows over time / RPC-read
avoidance at scale); they are **not** required to gate order creation. Indexing
them is therefore out of scope for the collateral-gating work.

### seasonLocks(user, season)
The collateral locked for one specific season (== that season's FIM held ×
rgdLockedPerFim). Use for displaying *this season's* lock; use
`requiredRegStake` for the unstake/headroom check.

### Vault Locked  (StakeMask display)
The "Vault Locked" card on the global staking dashboard (StakeMask) shows
`requiredRegStake` — the cross-season high-water mark — because StakeMask is
**season-agnostic** (the global stake page, not scoped to one season). Per-season
`seasonLocks` breakdown, if shown at all, belongs in the trading view. StakeMask
must refresh live (poll + invalidate) so locked RGD reacts to trades/bids made
elsewhere, not just to its own stake/unstake.

### Phase
The lifecycle stage of a season, surfaced by `GameSeason.getPhase()` as a
string. Canonical phases: `AUCTION`, `BOOTSTRAP`, `TRADING`, `SETTLING`,
`PAYOUT`. Partly time-driven — see *isActive*. **`ENDED` no longer exists** —
`endSeason()` was removed; a season stays in `PAYOUT` indefinitely (until the
Council sweeps stale funds, which does *not* change the phase). `PAYOUT` is the
terminal player-facing phase.

### Contract revert reasons (player-facing)
Canonical revert strings the UI translates to friendly copy (via the pure
`src/utils/revertReason.ts`):
- `"Insufficient Collateral"` — buyer/maker lacks staked-RGD headroom (auction
  buy, Exchange ask fill, **or bid placement**). → "Stake more RGD or buy less."
- `"Game not active"` — trade attempted outside TRADING (or past the deadline).
- `"Funds Locked by Active Season"` — unstake exceeds free RGD.
- `"Self fill"` — buyer == seller; blocked.
- `"Not active"` — order already drained/closed (e.g. cancel after settle).

### isActive
Time-and-state guard read right before enabling a trade/buy button. Can be
`false` while the phase string still reads `AUCTION`/`TRADING` (deadline passed,
no crank yet). `Auction.isActive()` gates the auction; `GameSeason.isActive()`
gates the Exchange.

### effectiveVictoryPending vs. SETTLING  (do not conflate)
- **`effectiveVictoryPending`** (`useSeasonVictory`) = `isVictoryPending ||
  isTradingTimeExpired` — a **frontend prediction** that the game is about to end
  (live Gini crossed a victory target, OR trading clock expired). Fires *before*
  the chain moves. This **drives the "Trading is halted" hold** — intentionally.
- **`SETTLING`** (`isSettling`) = the on-chain phase (`getPhase()==="SETTLING"`)
  that only exists *after* someone cranks `startSettlement`. Modeled in
  `useSeasonPhase` for label/gating completeness, but **deliberately NOT wired to
  the halt.**

**Resolved (the halt stays on the prediction).** There is a gap between "game
decidable / clock expired" and "someone cranks settling" — cranking is
permissionless and may lag. The early predictive halt is the *safe* driver:
(1) on clock expiry `Exchange.isActive()` already returns false, so trades revert
`"Game not active"` regardless of phase — halting early just matches the chain;
(2) for a victory-crossing, halting into a decided outcome beats inviting a
money-losing trade. Switching the halt to `isSettling` would halt *later and less
safely* (a window where trades revert but the UI still invites them). So
`isSettling` is an accurate signal for "is the crank running now," not for "stop
the user from trading."

### ENDED (removed — cleanup folded into this pass)
The `ENDED` phase was **removed** — `getPhase()` will never return it. Do **not**
add `isEnded` to `useSeasonPhase`. All 4 surviving `'ENDED'` references are dead
disjuncts removed in this pass — **no UI re-mapping needed**, because the
existing `PAYOUT` view already covers concluded seasons (and better):
- `SeasonPhasePills:12` — drop `'ENDED'` from the payout-pill disjunct.
- `SeasonsList:208` — drop `'ENDED'` from the hide filter.
- `Alerts:315` — drop `'ENDED'` from the alert disjunct.
- `SeasonListDashboard` — **delete the entire `isEnded` compact-grid branch**
  (L246/302/421); the `PAYOUT` branch is a strict superset (adds victory rail,
  Holdings/Claimable, Season PnL) and becomes the sole concluded view.
The only post-PAYOUT event is the Council sweep, which leaves the phase `PAYOUT`.

### Stale-funds sweep (Council only)
`GameSeason.sweepUnclaimed(to)` — `onlyOwner` (Council multisig); recovers the
remaining prize-pool USDC ≥365 days after `distributionStartTime` (reverts
`"Too early"` before). Does **not** flip the phase (stays `PAYOUT`). After a
sweep, `computePayout` returns 0 but `claimPayout` still works to burn FIM /
release collateral. Pure ops action — **no player button**; only a Council admin
panel (if one exists) would surface it. Players hitting a swept PAYOUT screen see
a "claim window closed" banner but can still claim to recover locked RGD.

### Bid-fill collateral revert (RESOLVED)
Previously open: would a taker selling into a maker's bid get reverted by the
maker's under-collateralization? **Resolved** — the backend now reserves the
maker's collateral at bid placement, so every open bid is honorable and the
taker never reverts on the maker's account. The frontend does **no** maker
simulation; it only (a) pre-checks the *taker's* cumulative FIM-to-receive across
ask legs of a `fillBatch`, and (b) pre-checks the *maker* before placing a bid.
