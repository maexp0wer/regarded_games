/**
 * Gini coefficient in BPS (0-10000), computed bit-for-bit identically to the
 * on-chain `GameSeason._calculateReg()` (src/seasonal/GameSeason.sol).
 *
 * The contract walks players in balance-ascending order, and for each player
 * whose balance clears the existential (dust) threshold it does:
 *
 *     effectivePopulation++;                       // 1-based rank, dust excluded
 *     accumulatedSupply += bal;
 *     regAccumulator    += effectivePopulation * bal;
 *
 * then:
 *
 *     term1 = (2 * regAccumulator * 10000) / (effectivePopulation * accumulatedSupply);
 *     term2 = ((effectivePopulation + 1) * 10000) / effectivePopulation;
 *     g     = term1 > term2 ? term1 - term2 : 0;
 *     return g > 10000 ? 10000 : g;
 *
 * Solidity's integer division truncates at exactly those two `/` sites and
 * nowhere else. BigInt division truncates identically, so as long as we feed
 * RAW-WEI balances (never floored to whole FIM, never floats) and replay the
 * same operations in the same order, the result matches the contract exactly —
 * no rounding drift, regardless of how many trades produced the distribution.
 *
 * Filtering is done HERE, before ranking, so a dust-balance player can never
 * accidentally consume a rank index (which would desync from the contract).
 *
 * @param balances Raw-wei effective FIM balances (exchange already excluded).
 * @param threshold existentialThresholdFim (raw wei). Balances `< threshold` are
 *                  dropped, mirroring the contract's `bal >= existentialThresholdFim`.
 */
export function giniScaledFromBalances(
  balances: bigint[],
  threshold: bigint = 0n,
  scale: bigint = 10000n,
): number {
  // Filter first (dust excluded), then sort ascending — both in raw wei.
  const sorted = balances
    .filter((b) => b >= threshold)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  const effectivePopulation = BigInt(sorted.length);
  if (effectivePopulation === 0n) return 0;

  let accumulatedSupply = 0n;
  let regAccumulator = 0n;
  let rank = 0n;
  for (const bal of sorted) {
    // rank is 1-based among threshold-passing players (contract: ++_effPop first)
    rank += 1n;
    regAccumulator += rank * bal;
    accumulatedSupply += bal;
  }
  if (accumulatedSupply === 0n) return 0;

  const term1 = (2n * regAccumulator * scale) / (effectivePopulation * accumulatedSupply);
  const term2 = ((effectivePopulation + 1n) * scale) / effectivePopulation;
  const g = term1 > term2 ? term1 - term2 : 0n;

  // Contract clamps overshoot so `scale - g_initial` can never underflow.
  return Number(g > scale ? scale : g);
}

/**
 * Contract-exact Gini in whole BPS (0-10000). The truncation sites match
 * `_calculateReg()` byte-for-byte — this is the value to use anywhere the
 * on-chain figure must be reproduced exactly.
 */
export function giniBpsFromBalances(balances: bigint[], threshold: bigint = 0n): number {
  return giniScaledFromBalances(balances, threshold, 10000n);
}

/**
 * Higher-resolution Gini in PPM (parts-per-million, 0-1_000_000), i.e. BPS ×100.
 * Same exact integer replay as `giniBpsFromBalances`, just read at 100× the
 * resolution so sub-BPS moves (which whole-BPS truncates to 0) are visible.
 * The contract's whole-BPS value is always `Math.trunc(ppm / 100)`.
 */
export function giniPpmFromBalances(balances: bigint[], threshold: bigint = 0n): number {
  return giniScaledFromBalances(balances, threshold, 1_000_000n);
}
