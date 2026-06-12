/**
 * Collateral math — the single source of truth for "how much staked RGD does a
 * player need to acquire/hold N FIM," shared by the Auction and the Exchange.
 *
 * Mirrors the contract exactly (`Exchange._regOf` / `Staking.adjustCollateral`):
 * the required RGD to hold a FIM amount is
 *
 *     reg = fimAmountWei * rgdLockedPerFim / 1e18      // floor (truncating div)
 *
 * Both FIM and `rgdLockedPerFim` are 18-dec. We multiply THEN divide by 1e18,
 * flooring — never round up in JS, or the UI would demand more RGD than the
 * chain enforces and disable a buy the contract would have accepted.
 *
 * This file is PURE: it operates on already-fetched bigints. Fetching the live
 * values (`stakedBalances`, `requiredRegStake`, `seasonLocks`, `rgdLockedPerFim`)
 * is the job of `src/hooks/useCollateral.ts`.
 */

const ONE = 10n ** 18n;

/** RGD wei required to *hold* a given FIM amount (floor, matching the contract). */
export function regForFim(fimAmountWei: bigint, rgdLockedPerFim: bigint): bigint {
  if (fimAmountWei <= 0n || rgdLockedPerFim <= 0n) return 0n;
  return (fimAmountWei * rgdLockedPerFim) / ONE;
}

/**
 * Free collateral headroom: staked RGD not currently acting as collateral.
 * `requiredRegStake` is the cross-season high-water mark — the value `unstake`
 * checks against — so headroom against it is correct even with concurrent
 * seasons (a new lock only bites once it exceeds the current mark).
 */
export function headroomFor(stakedBalances: bigint, requiredRegStake: bigint): bigint {
  return stakedBalances > requiredRegStake ? stakedBalances - requiredRegStake : 0n;
}

/** Extra FIM the player can still acquire with their current headroom (floor). */
export function maxBuyableFim(headroomWei: bigint, rgdLockedPerFim: bigint): bigint {
  if (headroomWei <= 0n || rgdLockedPerFim <= 0n) return 0n;
  return (headroomWei * ONE) / rgdLockedPerFim;
}

export interface CollateralCheck {
  /** True if the player has enough headroom to acquire `fimToReceive`. */
  ok: boolean;
  /** RGD wei needed to hold `fimToReceive`. */
  needed: bigint;
  /** RGD wei of free headroom the player has. */
  headroom: bigint;
  /** RGD wei the player must stake to make `ok` true (0 if already ok). */
  shortfall: bigint;
}

/**
 * The buy-button gate. Pass the FIM the player will *receive* (NET of any FIM
 * they sell in the same tx — see the mixed-batch note below). All inputs are
 * already-fetched bigints; nothing here touches the network.
 *
 * Mixed `fillBatch`: the contract's collateral check is per-leg and
 * array-order-sensitive (releases land as sell legs execute). Because the
 * frontend builds the `ids` array with sell legs FIRST, the effective
 * requirement is NET — so callers pass `max(0, buyFimRaw - sellFimRaw)` here.
 */
export function collateralCheck(
  fimToReceive: bigint,
  stakedBalances: bigint,
  requiredRegStake: bigint,
  rgdLockedPerFim: bigint,
): CollateralCheck {
  const headroom = headroomFor(stakedBalances, requiredRegStake);
  const needed = regForFim(fimToReceive, rgdLockedPerFim);
  const ok = needed <= headroom;
  return {
    ok,
    needed,
    headroom,
    shortfall: ok ? 0n : needed - headroom,
  };
}

/**
 * Net FIM a taker receives from a `fillBatch`, used as the collateral-check
 * input. Buy legs (taking asks) add FIM; sell legs (selling into bids) subtract
 * it. Floored at 0 — a net-flat-or-negative shuffle needs no extra collateral
 * (and, with sell-legs-first ordering, the chain agrees).
 */
export function netFimToReceive(buyFimRaw: bigint, sellFimRaw: bigint): bigint {
  const net = buyFimRaw - sellFimRaw;
  return net > 0n ? net : 0n;
}
