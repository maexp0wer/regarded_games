# Frontend Integration — Breaking Changes

This document covers every contract-level change that affects the frontend. All changes are live on `main`.

---

## 1. Governance Token: `$REG` → `$RGD`

| Field | Old | New |
|---|---|---|
| Contract file | `REG.sol` | `RGD.sol` |
| ERC20 name | `"Gini Governance"` | `"Regarded Games"` |
| ERC20 symbol | `"REG"` | `"RGD"` |
| Key in `deployments/local/core.json` | `"REG"` | `"RGD"` |

**Action required:** Update the JSON key used to read the governance token address from `core.json`.

---

## 2. FIM Token: display name change

| Field | Old | New |
|---|---|---|
| ERC20 name | `"Gini Game Token"` | `"Regarded Game Token"` |
| ERC20 symbol | `"FIM"` (unchanged) | `"FIM"` |

No ABI change. Display name update only.

---

## 3. FIM Token: transfer restrictions

FIM can only move through the `Exchange` contract. Direct `transfer()` or `transferFrom()` calls from any other address revert. Users cannot send FIM wallet-to-wallet — all trades must go through the order book.

---

## 4. `claimPayout()` now burns the caller's FIM

When a player calls `claimPayout()`, their entire FIM balance is **burned atomically** as part of the transaction. There is no separate burn step. After a successful claim:
- Player's FIM balance: `0`
- Player's USDC: increased by their season payout

The frontend should not display FIM balance as meaningful once a player has claimed.

---

## 5. DISTRIBUTION phase auto-cancels all open Exchange orders

When `finalizeGame()` transitions the game to `DISTRIBUTION`, every open order on the Exchange is cancelled and escrowed assets returned automatically:

| Order type | Asset returned |
|---|---|
| Open buy order | Escrowed USDC → maker |
| Open sell order | Escrowed FIM → maker |

**No user action required.** Once the game enters DISTRIBUTION the order book is empty. Any cached order book state should be invalidated when the game state changes to `DISTRIBUTION`.

---

## 6. New `GameSeason` state variable: `fim`

```solidity
address public fim;   // address of the season's FIM token
```

This getter is now available on `GameSeason`. Useful if you need to resolve the FIM address from the season contract rather than the season registry.

---

## 7. `GameController`: new `factory` field, constructor changed

A new `SeasonFactory` contract handles per-season deployment. `GameController` stores its address:

```solidity
address public immutable factory;
```

**Constructor signature changed** (relevant only if you deploy `GameController` yourself):

```
// Before
GameController(address usdc, address treasury, address staking)

// After
GameController(address usdc, address treasury, address staking, address factory)
```

`startNewSeason()` external signature is **unchanged** — same 11 parameters, same order.

---

## 8. New contract: `SeasonFactory`

`src/core/SeasonFactory.sol` — stateless factory used internally by `GameController`. The frontend never calls it directly. Its address is readable from `GameController.factory()` if needed.

---

## ABI files to regenerate

Run `python script/export_abis.py` after `forge build`. The following ABIs have changed:

| Contract | What changed |
|---|---|
| `RGD` | Renamed from `REG` (same ABI shape) |
| `GameSeason` | New `fim()` getter, new `setFim()`, `claimPayout` burns FIM |
| `Exchange` | New `settleAllOrders()` function |
| `GameController` | New `factory()` getter, constructor has 4th param |
| `SeasonFactory` | New contract |
| `FIM` | ERC20 name changed (same ABI) |
