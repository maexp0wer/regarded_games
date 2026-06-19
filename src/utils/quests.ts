// Pure quest scoring helpers. No I/O, no framework coupling — the config loaders
// that read these off disk live in src/lib/quests.ts.

export interface ReferralTier {
  from: number;
  to: number;
  perReferral: number;
}

export function computeTotalReferralPoints(
  qualifiedCount: number,
  tiers: ReferralTier[],
): number {
  let total = 0;
  for (const t of tiers) {
    const within = Math.max(0, Math.min(qualifiedCount, t.to) - (t.from - 1));
    total += within * t.perReferral;
  }
  return total;
}

/**
 * 0–1000 score for the user's PnL rank within a single season.
 * `allPnls` includes the user. Top rank → 1000, bottom → 0, linear.
 */
export function computeWinScoreForSeason(
  userPnl: number,
  allPnls: number[],
): number {
  if (allPnls.length <= 1) return 0;
  const sorted = [...allPnls].sort((a, b) => b - a);
  const rank = sorted.findIndex((v) => v <= userPnl);
  const r = rank < 0 ? sorted.length - 1 : rank;
  const score = Math.round(1000 * (sorted.length - 1 - r) / (sorted.length - 1));
  return Math.max(0, Math.min(1000, score));
}

export function relativePnl(totalPotentialPayout: bigint, netContribution: bigint): number | null {
  if (netContribution === 0n) return null;
  const ratio = Number(totalPotentialPayout) / Number(netContribution) - 1;
  return Number.isFinite(ratio) ? ratio : null;
}
