# Frontend Integration Guide — Audit-Fix Release (July 2026)

The contract suite changed in ABI-breaking ways. **Regenerate all ABIs from the next
deployment** (`deployments/` artifacts) before touching anything below. Where the old
and new worlds differ, the old call will not just misbehave — it will not exist.

---

## 1. New season phases: TRIAGE → INVESTIGATION

The `GameSeason` state machine gained a two-stage review between settlement and payout:

```
BOOTSTRAP(0) → ACTIVE(1) → CALCULATING(2) → TRIAGE(3) → INVESTIGATION(4) → DISTRIBUTION(5)
```

- **The numeric enum values shifted** (`DISTRIBUTION` was `3`, is now `5`; a prior
  interim build had `REVIEW(3)`/`DISTRIBUTION(4)` — that is gone). If you compare
  `currentState()` numerically anywhere, this is a silent bug. Prefer `getPhase()`,
  which now returns `"TRIAGE"` then `"INVESTIGATION"` between `"SETTLING"` and
  `"PAYOUT"`.
- After `finalizeGame()`, the season sits in **TRIAGE** for `triageWindowSeconds()`
  (default 24h), timestamped by `reviewPhaseStart()`. The Council may
  `raiseSuspicion()` (owner-only) to escalate to **INVESTIGATION**, which lasts
  `investigationWindowSeconds()` (default 14d) and restarts `reviewPhaseStart()`.
- **Opening payouts:** `openDistribution()` is callable **by anyone** once the current
  phase's window lapses (TRIAGE if no suspicion, INVESTIGATION otherwise). The Council
  may also `concludeInvestigation()` early. Show a countdown for the active phase and,
  once expired, an "Open Distribution" button.
- Claims/previews are unavailable until distribution opens: `computePayout()` returns
  0 during TRIAGE/INVESTIGATION, and `finalPoolSize()` is only snapshotted at
  `openDistribution` (not at `finalizeGame`).
- New events: `StateChanged(TRIAGE|INVESTIGATION|DISTRIBUTION)`, `SuspicionRaised`,
  `InvestigationConcluded`, `DistributionOpened(finalPoolSize)`.

## 2. The Entry Bond is GONE

The previously-planned per-account Entry Bond (and `Staking.postEntryBond` /
`releaseEntryBond` / `slashEntryBond`, `entryBonds`, `entryBondRgd` on Auction/Exchange,
and the `entryBondRgdWei` manifest field) **was removed entirely.** Delete any UI that
referenced it. There is now no per-wallet sybil bond and no `"Insufficient stake for
bond"` revert — the only RGD a purchase requires is the ordinary per-FIM collateral.

## 3. Flagging (Council action during INVESTIGATION)

- `GameSeason.flagWallets(address[])` — owner-only, **INVESTIGATION-only** (revert
  `"Not investigating"` otherwise), multiple calls allowed, irreversible. Getter:
  `isFlagged(address)`. Event: `WalletFlagged(wallet)`.
- **A flag has a season-wide effect.** The flagged wallet's payout becomes **zero**,
  and because a flag asserts the outcome was manufactured, `forcedDraw()` flips true
  and the **whole season pays the draw distribution** (pro-rata of final holdings) —
  every player, not just the flagged one, is repriced to draw-rate. `computePayout()`
  reflects all of this; no frontend math needed. **No RGD is burned or slashed** — a
  flagged wallet still recovers its full staked collateral at claim.
- UI implication: once any flag exists, previews for *all* players change (winners drop
  to draw-rate). Surface a clear "season under review / settled as draw" banner, and a
  neutral badge on flagged wallets.

**Cross-season flag display (display only — no protocol enforcement):** flags are
permanent public data, so you may surface a wallet's *prior*-season flags in later
seasons by indexing `WalletFlagged` events / reading each past season's
`isFlagged(addr)`. The protocol never carries a flag forward or excludes a flagged
wallet from a new season (see ADR-0008 / ADR-0003 for why cross-season exclusion was
rejected). Present it as **neutral, season-scoped history** ("Flagged — Season 3"),
never as a verdict, and always link the specific season. Expect it to inform careful
counterparties rather than stop real attackers, who rotate wallets.

## 4. Exchange: settlement drain is GONE; escrow reclaim is self-service

**Removed entirely:** `settleOrders`, `settlementOpen`, `settleCursor`,
`openSettlement`. Delete any keeper logic or UI that referenced them.

**Replacement model:**
- Escrow (USDC in bids, FIM in asks) belongs to the order owner and is reclaimable
  **only by them, at any time — including after the season ends** (post-season fills
  are impossible, so escrow can only flow back to its owner).
- `cancelOrder(id)` — unchanged, works forever.
- **NEW `cancelOrders(uint256[] orderIds)`** — the one-click "return all my locked
  funds" button you asked for. Build the id list from your event index
  (`OrderCreated` minus `OrderFilled`/`OrderCancelled` for that owner). Invalid,
  filled, or foreign ids are **skipped, not reverted on**, so a stale list is safe;
  the call is also safely repeatable.
- Recommended UX: after a season leaves TRADING, surface a persistent
  "Reclaim escrowed funds" action for any user with open orders.

## 5. Claims

- `claimPayout()` no longer burns FIM and no longer touches the Exchange. A user
  with open orders **can claim without cancelling anything**; their ledger balance
  (`season.fimBalances(user)`) already includes escrowed FIM.
- Post-season wallet FIM balances **do not go to zero** anymore. Treat the season's
  FIM token as decorative once the season ends; the authoritative number for payout
  purposes was always `season.fimBalances` (zeroed at claim).
- `claimPayout` releases the player's staked collateral on every path (zero payout,
  flagged, or normal) — there is no separate bond to return.
- **Claim Window:** payouts expire 365 days after `distributionStartTime()`. After a
  Council sweep (`swept()` returns true, `UnclaimedSwept` event), claims still
  *succeed* but pay zero — collateral is still released. Show a claim
  deadline countdown and warn dormant users.

## 6. Settlement is player-driven with a deadman switch

- `startSettlement()`/`startBootstrap()` now start a deadline:
  `settlementDeadline()` = start + `settlementTimeoutSeconds()` (manifest default
  24 h).
- If the starter hasn't finalized by then, **anyone** may call
  `takeOverSettlement()`: they post the 100-USDC bond (approve USDC first), the
  stalled starter's bond is forfeited to the season's DAO recipient, and the batch
  restarts. Event: `SettlementTakenOver(previous, new)`.
- Recommended UX: in SETTLING phase show the deadline countdown; after expiry,
  surface a "Take over settlement" action.

## 7. CapitalAuction (ILO)

- New `aborted()` flag. If true: hide deposit/finalize, show a **"Refund my
  deposit"** button → `refund()` (self-service, no deadline). Events: `Aborted()`,
  `Refunded(user, amount)`.
- `abortAuction()` is owner-only (emergency stop for a discovered flaw).

## 8. Treasury reads that changed

- The global getters `buybackRecipient()`, `liquidityRecipient()`, `daoRecipient()`
  **no longer exist.** Recipients are per-season: read the `seasonPolicies(season)`
  struct (now 7 fields: 4 bps + 3 addresses) or `seasonDaoRecipient(season)`.
- New yield-accounting views if you display treasury stats: `accruedYield(season)`,
  `totalAccruedYield()`, `isAccruing(season)`, `hasRetired(season)`; events
  `YieldAttributed`, `SeasonRetired`, `SeasonRecipientsSet`.

## 9. Deployment/manifest

`config/seasonManifest.json` gained three required season fields:
`triageWindowSeconds`, `investigationWindowSeconds`, `settlementTimeoutSeconds` — and
`GameController.startNewSeason` takes six additional args (those three plus the
three recipient addresses). Any admin tooling that crafts that call must be updated.

## Quick checklist

- [ ] Regenerate ABIs; audit every numeric `currentState()` comparison (DISTRIBUTION is now 5)
- [ ] TRIAGE/INVESTIGATION phase UI: per-phase countdown + permissionless "Open Distribution"
- [ ] Council-only `raiseSuspicion` / `flagWallets` / `concludeInvestigation` controls (if Council-facing)
- [ ] Delete all Entry Bond UI (no bond, no `"Insufficient stake for bond"` revert)
- [ ] Flag handling: any flag → whole season previews as draw-rate; flagged wallets show zero
- [ ] Delete settleOrders/settlementOpen code paths
- [ ] "Reclaim escrowed funds" button → `cancelOrders(ids)` from event index
- [ ] Claim view: claim-deadline countdown, post-sweep zero-payout state
- [ ] SETTLING deadline countdown + "Take over settlement" action
- [ ] ILO: `aborted()` → refund flow
- [ ] Replace global Treasury recipient reads with per-season policy reads
