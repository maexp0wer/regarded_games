export function calculateGini(players: any[]): number {
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