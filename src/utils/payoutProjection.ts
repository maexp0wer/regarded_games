/**
 * Client-side replica of GameSeason settlement math (`processBatch` aggregates +
 * `_calculateSinglePayout`). Used to project a player's USDC payout and Season
 * P/L before the on-chain snapshot exists (during TRADING) and to keep those
 * figures consistent with the contract once it settles.
 *
 * Authoritative source: regarded_contracts/src/seasonal/GameSeason.sol.
 *
 * Key facts encoded here:
 *  - The distributable pool is `seasonPrincipals` = auction USDC + trading fees +
 *    reinvested Aave yield ("Yield Bonus"). The base prize pool already includes
 *    trading fees (Treasury.collectTradingFee), so callers pass
 *    `poolSize = basePrizePool + yieldBonus`.
 *  - The Masses / Oligarchy boundary is drawn at 50% of FIM *total supply*, not of
 *    the dust-filtered accumulated supply.
 *  - The Solidarity Fund (Socialist win) is redistributed by positive Net
 *    Contribution (MoneyIn − MoneyOut), NOT by the face-value-adjusted figure the
 *    UI labels "Contribution".
 *
 * All amounts here are plain floats (display precision), not chain-precision
 * BigInts — callers format raw values before passing them in.
 */

export interface ProjectionPlayer {
  /**
   * Effective FIM held at settlement: wallet balance + FIM escrowed in the
   * player's own open sell orders (refunded before payout). Excludes burned FIM,
   * matching the contract's `fimBalances[p]` after open orders are settled.
   */
  bal: number;
  /** Net contribution in USDC (MoneyIn − MoneyOut); may be negative. */
  netContribUsdc: number;
}

export interface PayoutProjectionInput {
  /**
   * Total distributable pool in USDC: base prize pool (auction USDC + trading
   * fees) plus the reinvested Aave yield bonus.
   */
  poolSize: number;
  /** FIM total supply, used for the 50%-of-supply Masses/Oligarchy boundary. */
  totalFimSupply: number;
  /** Existential (dust) threshold in FIM; holders below this are excluded. */
  dustThresholdFim: number;
  /** true → Capitalist (Oligarchy) logic; false → Socialist (Solidarity) logic. */
  isOligarchyWin: boolean;
  /**
   * Whether a faction is currently leading. When false the win share is unused
   * and the payout collapses to the proportional draw share (pure stalemate).
   */
  hasWinner: boolean;
  /** Settlement progress toward the victory threshold, 0..1 (P_final). */
  progress: number;
}

export interface SettlementAggregates {
  accumulatedSupply: number;          // Σ bal over dust-filtered players
  massThresholdBalance: number;       // highest balance still inside the Masses
  winningCoalitionSupply: number;     // Σ bal of the Oligarchy (top holders ≥ 50%)
  effectiveSocialistSupply: number;   // Σ min(bal, massThresholdBalance)
  totalPositiveNetContribution: number; // Σ max(0, netContribUsdc)
}

/**
 * Mirrors GameSeason.processBatch: walk the dust-filtered player set in ascending
 * balance order, deriving the aggregates `_calculateSinglePayout` depends on.
 */
export function computeSettlementAggregates(
  players: ProjectionPlayer[],
  totalFimSupply: number,
  dustThresholdFim: number,
): SettlementAggregates {
  const active = players
    .filter((p) => p.bal >= dustThresholdFim && p.bal > 0)
    .sort((a, b) => a.bal - b.bal); // ascending — the contract requires a sorted batch

  const halfSupply = totalFimSupply / 2;
  let accumulatedSupply = 0;
  let massThresholdBalance = 0;
  let winningCoalitionSupply = 0;

  // Boundary pass. The cumulative test INCLUDES the current player, exactly as in
  // processBatch (`_accumSup += bal; if (_accumSup <= _totalSup/2) ...`).
  for (const p of active) {
    accumulatedSupply += p.bal;
    if (accumulatedSupply <= halfSupply) {
      massThresholdBalance = p.bal;
    } else {
      winningCoalitionSupply += p.bal;
    }
  }

  // Capped-balance sum (Solidarity base) and Proof-of-Sacrifice weighting.
  let effectiveSocialistSupply = 0;
  let totalPositiveNetContribution = 0;
  for (const p of active) {
    effectiveSocialistSupply += Math.min(p.bal, massThresholdBalance);
    if (p.netContribUsdc > 0) totalPositiveNetContribution += p.netContribUsdc;
  }

  return {
    accumulatedSupply,
    massThresholdBalance,
    winningCoalitionSupply,
    effectiveSocialistSupply,
    totalPositiveNetContribution,
  };
}

/**
 * Mirrors GameSeason._calculateSinglePayout for one player. Returns the projected
 * USDC payout, blending the winning-ideology share with the proportional draw
 * share by `progress` (Scenario C / partial victories).
 */
export function projectPlayerPayout(
  me: ProjectionPlayer,
  agg: SettlementAggregates,
  input: PayoutProjectionInput,
): number {
  const { poolSize, dustThresholdFim, isOligarchyWin, hasWinner, progress } = input;
  if (me.bal < dustThresholdFim || me.bal <= 0) return 0;

  const {
    accumulatedSupply,
    massThresholdBalance,
    winningCoalitionSupply,
    effectiveSocialistSupply,
    totalPositiveNetContribution,
  } = agg;

  let winShare = 0;
  if (isOligarchyWin) {
    // Oligarchy: only the top coalition shares the pool, proportional to holdings.
    if (me.bal > massThresholdBalance && winningCoalitionSupply > 0) {
      winShare = (poolSize * me.bal) / winningCoalitionSupply;
    }
  } else if (accumulatedSupply > 0) {
    // Solidarity: capped pro-rata base + Solidarity Fund weighted by Net Contribution.
    const capBal = Math.min(me.bal, massThresholdBalance);
    const base = (poolSize * capBal) / accumulatedSupply;
    const solidarityFund =
      (poolSize * (accumulatedSupply - effectiveSocialistSupply)) / accumulatedSupply;

    let solidarityShare = 0;
    if (totalPositiveNetContribution > 0) {
      const cPos = me.netContribUsdc > 0 ? me.netContribUsdc : 0;
      solidarityShare = (solidarityFund * cPos) / totalPositiveNetContribution;
    } else if (effectiveSocialistSupply > 0) {
      // No positive contributors → flat pro-rata of capped holdings.
      solidarityShare = (solidarityFund * capBal) / effectiveSocialistSupply;
    }
    winShare = base + solidarityShare;
  }

  const drawShare = accumulatedSupply > 0 ? (poolSize * me.bal) / accumulatedSupply : 0;
  const prog = hasWinner ? Math.min(Math.max(progress, 0), 1) : 0;
  return winShare * prog + drawShare * (1 - prog);
}
