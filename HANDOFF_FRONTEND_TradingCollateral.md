# Frontend Handoff — RGD Collateral Now Required to Buy FIM in the Trading Phase

**Audience:** Frontend / dApp team
**Contracts version:** working branch (not yet deployed) — coordinate on the deploy that ships this
**TL;DR:** Buying FIM on the **Exchange** during the Trading Phase now requires the buyer to have enough **staked RGD**, exactly like the Auction already did. Selling FIM **releases** the seller's locked RGD. The UI must (1) pre-check the buyer's collateral before any FIM-acquiring trade, (2) surface a new revert, and (3) update the "locked RGD" display to react to trades, not just auction buys.

---

## 1. What changed on-chain

Previously, only `Auction.buyFIM` required staked RGD. The `Exchange` did **not** touch staking, so a player with **zero staked RGD** could acquire FIM purely by trading. That hole is now closed.

The model is **net-holdings collateral**: at every moment, a player's locked RGD for a season equals

```
seasonLocks[player][season] == (fimHeld(player) + fimCommittedInOpenBids(player)) * rgdLockedPerFim / 1e18
```

- **Buying FIM** (any path that hands you FIM) → your lock **rises**; the tx **reverts** if your staked RGD can't cover it.
- **Placing a bid** (`createOrder(isBuy=true)`) → reserves collateral **at placement**; lock **rises** and the tx reverts if you can't cover it. Cancelling/settling the bid frees it; filling it converts the reservation into a held-FIM lock (no double-count).
- **Selling FIM** → your lock **falls** (released automatically in the same tx).
- Auction-bought and trade-bought FIM share **one** lock bucket. An auction buyer who sells all their FIM gets fully released mid-season and can unstake.

There is **no new user-facing transaction.** Collateral is adjusted automatically inside the existing `createOrder` / `fillOrder` / `fillBatch` / `cancelOrder` calls. The frontend's job is **pre-validation + correct display**, not new buttons.

---

## 2. The one new failure mode you must handle

Any Exchange call where the connected wallet **receives FIM** can now revert with:

```
"Insufficient Collateral"
```

This happens when the user committing to FIM doesn't have enough staked RGD to cover it. The affected calls:

| Call | Reverts for the caller when… |
|---|---|
| `createOrder(isBuy=true, …)` — **placing a bid** | **caller (maker)** lacks collateral headroom for the bid → reverts at placement (see §6) |
| `fillOrder(orderId)` on a **SELL** order (caller buys FIM) | caller under-collateralized |
| `fillBatch(ids, amounts)` — any leg where the **taker** receives FIM | taker under-collateralized |

> ✅ **The "innocent taker" case is handled at the source.** A bid (`createOrder(isBuy=true)`) now **reserves** the maker's collateral at placement time, so a bid that can't be honored **cannot exist**. When a taker later *sells into a bid*, the maker's leg is already pre-reserved and the fill never reverts on the maker's account. You do **not** need to simulate maker collateral before letting someone fill a bid. (See §6 and the backend resolution doc.)

Add `"Insufficient Collateral"` to your revert-reason → friendly-message map. Suggested copy: *"You need more staked RGD to hold this much FIM. Stake more RGD or buy a smaller amount."* — applies to both auction/Exchange buys **and** placing a bid.

---

## 3. The collateral math (compute this in the UI to pre-check)

Per whole FIM, the required RGD is the per-season constant **`rgdLockedPerFim`** (RGD wei, 18 dec). FIM is also 18-dec.

```ts
// All values are bigint wei. FIM is 18-dec; rgdLockedPerFim is RGD wei per WHOLE FIM.
const ONE = 10n ** 18n;

// RGD required to *hold* a given FIM amount:
function regForFim(fimAmountWei: bigint, rgdLockedPerFim: bigint): bigint {
  return (fimAmountWei * rgdLockedPerFim) / ONE;
}
```

`rgdLockedPerFim` is **identical** to the value the Auction uses — read it from whichever is convenient:

- `Exchange.rgdLockedPerFim()` → `uint256`  ← **new public getter, use this for Exchange flows**
- `Auction.rgdLockedPerFim()` → `uint256` (same value)

> Match the contract's integer rounding exactly (multiply then divide by `1e18`, floor). Do **not** round up in JS or you'll show a higher requirement than the chain enforces. For a worked check, mirror `Exchange._regOf`.

---

## 4. Reads you'll use (all on the `Staking` contract)

These are auto-generated getters from public mappings — already in the ABI:

| Getter | Signature | Meaning |
|---|---|---|
| `stakedBalances(address)` | `→ uint256` | RGD wei the user has staked |
| `requiredRegStake(address)` | `→ uint256` | **High-water mark**: the max lock across ALL the user's active seasons. This is what `unstake` checks against. |
| `seasonLocks(address user, address season)` | `→ uint256` | RGD locked for one specific season (== their FIM in that season × rate) |
| `isApprovedExchange(address)` | `→ bool` | (mostly ops/debug) whether an Exchange is wired into Staking |

**Free collateral headroom for a buy** (this season):

```ts
const headroom = stakedBalances - requiredRegStake; // RGD wei the user can still commit
const maxBuyableFim = (headroom * ONE) / rgdLockedPerFim; // extra FIM they can acquire now
```

> ⚠️ `requiredRegStake` is the **cross-season MAX**, not this season's lock. If the user only plays one season it equals `seasonLocks[user][thisSeason]`. If you support multiple concurrent seasons, headroom is correctly computed against `requiredRegStake` (a new lock in this season only bites once it exceeds the current high-water mark). Use `requiredRegStake` for the unstake/headroom check; use `seasonLocks[user][season]` to display this season's lock specifically.

---

## 5. UI changes required

### 5.1 Buy flow (filling a SELL/ask order, **or placing a BUY/bid**)
1. Before enabling "Buy" or "Place bid", compute `regForFim(fimToReceive)` and compare against `headroom`.
2. If insufficient, **disable the action** and show an inline staking prompt: *"Buying N FIM requires X RGD staked. You have Y free. Stake Z more."* Provide a deep link / CTA to the existing **Stake RGD** flow.
3. Order the user's actions: **Stake RGD → approve USDC → fill/place.** (The stake must land first.)
4. Keep `"Insufficient Collateral"` handled as a fallback even when pre-check passes (race: someone else moves the price/size, or the user has another season's lock change).
5. **Placing a bid now reserves collateral immediately** — the same pre-check applies to the *maker* at `createOrder(isBuy=true)`, not only to fills. A bid locks the maker's RGD up front (and reverts if short), so apply `canBuyFim` to the maker before they place a bid, exactly as you would for a direct buy.

### 5.2 Sell flow (creating a SELL order / filling a BUY order)
- Selling now **frees** RGD. After a sale settles, refresh `seasonLocks` / `requiredRegStake` and the "unstakable" amount — the user may now be able to unstake more than before. No gating on sells.
- **SELL-order escrow nuance:** placing a SELL order (`createOrder(false, …)`) moves the maker's FIM into the Exchange but does **NOT** release collateral yet — release happens only when the order **fills**. So a maker with an open, unfilled sell order is still locked for that FIM. If you show "locked RGD," do **not** decrement it at sell-order-creation time; decrement when the order fills (or re-read `seasonLocks`). Cancelling returns the FIM with no collateral change. (Intentional — the FIM is still "theirs" until sold.)

### 5.2b Bid (BUY-order) collateral lifecycle — NEW
- Placing a **bid** (`createOrder(isBuy=true, …)`) **reserves** RGD immediately → the maker's locked RGD **rises** at placement. Reflect this in "locked RGD" right after the tx.
- **Cancelling** a bid **frees** the reserved RGD → locked RGD falls back. Refresh after `cancelOrder`.
- When a bid **fills**, the reservation simply becomes a held-FIM lock — **no change** to the maker's locked total at fill (reserved → held). Don't double-count it.
- An unfilled bid left open at season end is released by the `settleOrders` drain. Refresh after settlement.
- **Invariant to display against:** `locked RGD = (FIM you hold + FIM committed in your open bids) × rate`.

### 5.3 "Locked RGD" / staking dashboard
- The locked amount now changes on **trades**, not just auction buys. Re-read `seasonLocks(user, season)` and `requiredRegStake(user)` after **any** Exchange fill (yours or one that filled your order), not only after `buyFIM`.
- Consider showing the invariant explicitly: *"Locked RGD = your FIM × rate"* so users understand why selling frees RGD.

### 5.4 Unstake flow
- Unchanged mechanics, but the available-to-unstake number is now more dynamic. `unstake(amount)` reverts `"Funds Locked by Active Season"` if `staked - amount < requiredRegStake`. Max unstakable = `stakedBalances - requiredRegStake`. Re-fetch after trades.

---

## 6. Order book / matching considerations

- **Bids are collateral-reserved at placement, so every open bid is honorable.** `createOrder(isBuy=true)` locks the maker's RGD up front and reverts if they're short. A taker selling into a bid therefore **never** reverts on the maker's collateral. You do **NOT** need to fetch maker balances or simulate maker headroom to render bids as fillable — just show them. (This resolves the earlier "innocent taker gets reverted" concern; see `HANDOFF_BACKEND_BidCollateralAtPlacement.md`.)
- **Makers cannot double-commit headroom across bids.** Because each bid actually *locks* collateral (not just a point-in-time check), stacking multiple bids that exceed the maker's stake fails on the later `createOrder` — there's no cumulative simulation for you to do.
- **`fillBatch` taker leg is still all-or-nothing:** if the **taker** (msg.sender) lacks collateral on any leg where they receive FIM (filling ask orders), that leg reverts and unwinds the whole `fillBatch` tx. Pre-validate the *taker's* cumulative FIM-to-receive across the batch before submitting. (Maker legs need no pre-validation — they're pre-reserved.)
- **Self-fill** is still blocked (`"Self fill"`), so buyer ≠ seller always.

---

## 7. ABI / integration checklist

- [ ] Re-pull ABIs for **`Exchange`**, **`Staking`**, **`SeasonFactory`**, **`GameController`** after the deploy (constructors/interfaces changed).
- [ ] `Exchange` constructor now takes 2 extra args (`staking`, `rgdLockedPerFim`) — if you instantiate/verify Exchange addresses anywhere, update.
- [ ] New `Exchange` getters available: `staking()`, `rgdLockedPerFim()`.
- [ ] New `Staking` getter: `isApprovedExchange(address)`; new admin event `ExchangeApprovalSet(exchange, status)` (only relevant if you index events).
- [ ] No **signature** changes to `createOrder`, `cancelOrder`, `settleOrders`, `fillOrder`, `fillBatch`. **Behavior** changed: `createOrder(isBuy=true)` now reserves collateral (can revert `"Insufficient Collateral"`); `cancelOrder`/`settleOrders` release a bid's reserved collateral; fills carry the collateral side-effect.
- [ ] New `Staking` functions (Exchange-internal, you won't call them directly, but they appear in the ABI): `reserveCollateral`, `releaseCollateralPartial`, `adjustCollateral`.
- [ ] Add `"Insufficient Collateral"` to revert-reason handling — now also on `createOrder(isBuy=true)`.

---

## 8. Events for indexing (optional but recommended)

Collateral movements emit on `Staking`:

- `CollateralRegistered(address indexed user, address indexed season, uint256 amount)` — collateral **locked**: auction buy, Exchange buy (taker), **or bid placement (maker reservation)**.
- `CollateralReleased(address indexed user, address indexed season, uint256 amount)` — collateral **freed**: seller leg of a trade, **bid cancel**, **bid settle-drain**, or season-end `releaseCollateral` at claim.

If you maintain an off-chain "locked RGD" view per user, index both — they now fire on bid placement/cancel/settlement in addition to auction buys and trades. (Note: a bid *fill* converts reservation→held with no net event for the maker, so don't expect a paired register/release at fill on the maker side.)

---

## 9. Quick reference — pseudocode for the buy button

```ts
async function canBuyFim(user: Address, season: Address, fimToReceive: bigint) {
  const [staked, required, rate] = await Promise.all([
    staking.stakedBalances(user),
    staking.requiredRegStake(user),     // cross-season high-water mark
    exchange.rgdLockedPerFim(),
  ]);
  const headroom = staked > required ? staked - required : 0n;
  const needed = (fimToReceive * rate) / 10n ** 18n;
  return {
    ok: needed <= headroom,
    needed,
    headroom,
    shortfall: needed > headroom ? needed - headroom : 0n, // RGD wei to stake
  };
}
```

If `!ok`, route the user to stake `shortfall` (round up to a nice unit) before allowing the fill.

---

## 10. What did NOT change

- Auction `buyFIM` flow and its collateral check — unchanged.
- USDC payment legs, trade fees, prize-pool routing — unchanged.
- FIM is still transfer-restricted to the Exchange (users can't move FIM peer-to-peer; the only way to acquire it is auction mint or Exchange fill), so the Exchange is the only place collateral needs enforcing.
- Settlement / payout / claim flows — unchanged (collateral is released at claim too, harmlessly, if any residual remains).
- **`"ENDED"` phase no longer exists.** `endSeason()` has been removed. A season stays in `"PAYOUT"` indefinitely. The only way to close it is the Council calling `sweepUnclaimed` after the 1-year window (see §11.3). Remove any `"ENDED"` branch from your phase switch.

---

## 11. Season lifecycle → which interactions to enable/disable

This is the master gating reference: **what the user can do at each point in a Season's life**, so the UI can enable/disable buttons correctly. Two things drive availability: (a) the **on-chain phase** (the `GameSeason` state machine) and (b) **per-user preconditions** (mainly: do they have enough staked RGD).

### 11.1 The phase model

`GameSeason` exposes its phase two ways. Use **`getPhase()`** (returns a string) as your primary signal — it folds the auction sub-phase in for you:

| `getPhase()` | Underlying `currentState` | What's happening |
|---|---|---|
| `"AUCTION"` | `BOOTSTRAP` (auction clock still running) | Initial FIM auction is live. |
| `"BOOTSTRAP"` | `BOOTSTRAP` (auction clock expired, not yet cranked to ACTIVE) | Auction over; settlement crank must compute the initial Gini before trading opens. Short, transient. |
| `"TRADING"` | `ACTIVE` | The game / Exchange order book is live. |
| `"SETTLING"` | `CALCULATING` | A settlement crank is in progress; outcome being computed. Transient. |
| `"PAYOUT"` | `DISTRIBUTION` | Game decided. Winners claim USDC; open orders are being drained. This is the terminal player-facing phase — it lasts until the Council sweeps unclaimed funds (≥1 year). |

> ⚠️ **`getPhase()` is partly time-based, not purely state-based.** The transition from `"AUCTION"` → `"BOOTSTRAP"` happens by **wall-clock** (`auctionEndTime`), with no transaction — so the auction's "Buy" button stops working the instant the clock passes `auctionEndTime`, even though `currentState` is still `BOOTSTRAP`. Likewise `TRADING` can effectively close on time (`tradingStartTime + tradingDuration`) before anyone cranks settlement: `Exchange.isActive()` already returns false, so trades revert `"Game not active"` even while `getPhase()` still says `"TRADING"`. **Always pre-check `Auction.isActive()` / the Exchange's `isActive()` view (via `GameSeason.isActive()`) right before enabling a trade button — don't trust the phase label alone near a deadline.**

### 11.2 Master interaction matrix

✅ = enable · ❌ = disable/hide · ⚠️ = enable only if the per-user precondition holds (see notes). "User action" = a tx the connected wallet sends directly.

| User action | Contract.fn | AUCTION | BOOTSTRAP | TRADING | SETTLING | PAYOUT | Per-user precondition |
|---|---|:--:|:--:|:--:|:--:|:--:|---|
| **Stake RGD** | `Staking.stake` | ✅ | ✅ | ✅ | ✅ | ✅ | Holds RGD. Always allowed — never gated by phase. |
| **Unstake RGD** | `Staking.unstake` | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | Only the free part: `staked − requiredRegStake`. Reverts `"Funds Locked by Active Season"` otherwise. Frees up as the user sells FIM / after PAYOUT claim. |
| **Buy FIM (auction)** | `Auction.buyFIM` | ⚠️ | ❌ | ❌ | ❌ | ❌ | **Needs staked RGD ≥ requiredReg for the buy.** Only callable while `Auction.isActive()`. This is the *only* phase to mint new FIM. |
| **Place order (bid/ask)** | `Exchange.createOrder` | ❌ | ❌ | ⚠️ | ❌ | ❌ | Reverts `"Game not active"` outside TRADING. **Ask** (sell): needs FIM balance to escrow; no collateral. **Bid** (buy): needs USDC to escrow **AND reserves the maker's collateral now** — reverts `"Insufficient Collateral"` if the maker is short. Pre-check the maker with `canBuyFim` (§9) before enabling "Place bid". |
| **Fill / take order** | `Exchange.fillOrder`, `fillBatch` | ❌ | ❌ | ⚠️ | ❌ | ❌ | Reverts `"Game not active"` outside TRADING. **If filling makes _you_ (the taker) receive FIM** (taking an ask), you need collateral → `"Insufficient Collateral"`. **Selling into a bid needs no collateral and never reverts on the maker** (the bid is pre-reserved, §6). |
| **Cancel own order** | `Exchange.cancelOrder` | ✅* | ✅* | ✅ | ✅* | ✅* | Owner-only; refunds escrow. *Not phase-gated in the contract — but in practice orders only exist once TRADING has run. After PAYOUT, `settleOrders` may have already drained & closed it (then cancel reverts `"Not active"`). Re-read order `active` before showing Cancel. |
| **Claim payout** | `GameSeason.claimPayout` | ❌ | ❌ | ❌ | ❌ | ⚠️ | PAYOUT only. Must be an indexed player, not already claimed. Pays 0 (but still releases collateral) if below dust threshold. Use `computePayout(user)` to show the amount first. |

\* See the per-user note — technically callable but usually irrelevant in that phase.

### 11.3 Keeper / crank actions (usually NOT player buttons)

These advance the state machine. They're **permissionless** but require posting a **USDC bond** (`bondAmountUsdc`, refunded on successful finalize, forfeited if abandoned). Treat them as keeper/ops automation, not normal player UI — but you may want an "advance season" affordance for power users or your own bots:

| Action | Contract.fn | Valid phase | Notes |
|---|---|---|---|
| Start initial-Gini crank | `GameSeason.startBootstrap` | BOOTSTRAP (auction clock expired) | Posts bond, becomes the `settlementStarter`. |
| Feed sorted player batch | `GameSeason.processBatch` | BOOTSTRAP or SETTLING | **Caller must be the current `settlementStarter`.** Players must be passed **sorted ascending by FIM balance** or it reverts `"Unsorted"`. |
| Open trading | `GameSeason.finalizeBootstrap` | BOOTSTRAP (all players processed) | Flips to TRADING, refunds bond. |
| Start end-of-game crank | `GameSeason.startSettlement` | TRADING | Posts bond, flips to SETTLING. |
| Finalize outcome | `GameSeason.finalizeGame` | SETTLING (all players processed) | Decides win/draw → PAYOUT (or, if no victory condition met & time not up, falls **back to TRADING** and forfeits the bond). |
| Drain leftover orders | `Exchange.settleOrders` | PAYOUT (after `settlementOpen`) | Permissionless, paginated, no bond. Refunds escrow of every still-open order. Anyone can call; safe to expose. |
| Sweep unclaimed prize pool | `GameSeason.sweepUnclaimed(address to)` | PAYOUT only, ≥ 1 year after `distributionStartTime` | Council (`onlyOwner`) only. Pulls the entire remaining prize-pool balance from Treasury and sends it to `to`. Reverts `"Too early"` before the 1-year window. See §11.5. |

> The batch crank is sequenced and sorting-sensitive (`processBatch` requires the global sorted order across all calls and rejects duplicates per round). If you build a "advance the season" button, drive it from a backend that sorts players by `fimBalances` and paginates — don't expose raw `processBatch` to end users.

### 11.4 Practical UI rules of thumb

1. **Gate every action on `getPhase()` first, then on the per-user precondition.** E.g. show the Exchange order book read-only outside TRADING; only enable place/fill in TRADING.
2. **Any action that commits you to FIM needs a collateral pre-check:** auction buy, Exchange buy (taking an ask), **and placing a bid**. Reuse `canBuyFim` from §9. If short, surface the Stake-RGD CTA instead. Sells (and selling into a bid) never need collateral.
3. **Near deadlines, trust the time-based view, not the label.** Before enabling a buy/fill, call the relevant `isActive()` (`Auction.isActive()` for the auction, `GameSeason.isActive()` for the Exchange) — both can be false while the phase string still reads AUCTION/TRADING.
4. **Re-read after every state-changing event.** Phase can change with no user action (auction/trading clock expiry) and locks change on trades. Poll `getPhase()` + the `Staking` reads (§4), and subscribe to `StateChanged` / `VictoryDeclared` on `GameSeason` and the collateral events on `Staking` (§8).
5. **PAYOUT screen:** show `computePayout(user)`; enable Claim if `> 0` **or** the user still holds FIM/locked RGD (claim releases collateral even on a zero payout). After claiming, refresh unstakable RGD — it usually jumps.
6. **No `"ENDED"` phase.** There is no state transition out of PAYOUT from the user's perspective. The season stays in `"PAYOUT"` until the Council sweeps. Remove any `"ENDED"` branch from your phase switch — `getPhase()` will never return it.

### 11.5 Stale prize-pool sweep (Council only)

After a season has been in PAYOUT for **1 year without all players claiming**, the Council can recover the remaining USDC:

```
GameSeason.sweepUnclaimed(address to)
```

- `onlyOwner` (the Council multisig)
- Requires `block.timestamp >= distributionStartTime + 365 days` — reverts `"Too early"` otherwise
- Pulls **everything left in `Treasury.seasonPrincipals[season]`** in one call — there is no partial sweep
- Does **not** flip the phase; the season stays in `"PAYOUT"` after the sweep. Players who claim after a sweep receive 0 USDC (the pool is empty) but still have their FIM burned and collateral released.
- `distributionStartTime` is a public `uint256` on `GameSeason` — read it to compute and display the earliest sweep date: `new Date((Number(distributionStartTime) + 365 * 86400) * 1000)`

**Frontend implications:**
- This is a pure ops/Council action — no player-facing button needed.
- If you show a season admin panel for the Council, surface a "Sweep unclaimed funds" button gated on `block.timestamp >= distributionStartTime + 365 days` and `getSeasonPoolSize(season) > 0`.
- Players who visit a swept season's PAYOUT screen will see `computePayout` return 0. Handle this gracefully: show a banner explaining the claim window has closed, but still allow `claimPayout` so they can recover their locked RGD (the collateral release in `claimPayout` still fires even on a zero payout).
