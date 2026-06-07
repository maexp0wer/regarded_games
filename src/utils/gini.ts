export function calculateGini(players: { fimBalance?: string | number | bigint }[]): number {
  if (!players || players.length === 0) return 0;

  // 1. Convert count to BigInt
  const count = BigInt(players.length);
  let totalSupply = 0n;
  let giniAccumulator = 0n;

  // 2. Loop and accumulate using BigInt
  players.forEach((player, index) => {
    // BigInt() handles the strings from GraphQL automatically
    const balance = BigInt(player.fimBalance || 0);
    const rank = BigInt(index + 1);

    giniAccumulator += rank * balance;
    totalSupply += balance;
  });

  if (totalSupply === 0n) return 0;

  // 3. Formula: (2 * acc * 10000) / (n * supply) - ((n + 1) * 10000) / n
  const term1 = (2n * giniAccumulator * 10000n) / (count * totalSupply);
  const term2 = ((count + 1n) * 10000n) / count;

  if (term1 > term2) {
    return Number(term1 - term2);
  }
  return 0;
}

/**
 * Gini coefficient in BPS (0-10000) over a list of raw balances. Mirrors the
 * live population math in useSeasonGini (sort ascending, mean-absolute-difference
 * form), but operates on a prepared balance list so callers can compute the same
 * metric for both the current state and a hypothetical post-trade state.
 *
 * Balances are bigint whole-FIM (post threshold filter, exchange excluded).
 */
export function giniBpsFromBalances(balances: bigint[]): number {
  const n = balances.length;
  if (n === 0) return 0;

  const sorted = [...balances].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const count = BigInt(n);
  let total = 0n;
  let accumulator = 0n;
  for (let i = 0; i < n; i++) {
    accumulator += BigInt(i + 1) * sorted[i];
    total += sorted[i];
  }
  if (total === 0n) return 0;

  const term1 = (2n * accumulator * 10000n) / (count * total);
  const term2 = ((count + 1n) * 10000n) / count;
  return term1 > term2 ? Number(term1 - term2) : 0;
}