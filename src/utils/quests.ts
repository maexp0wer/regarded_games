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

/**
 * Relative PnL used to rank a season for `win_the_game`. Mirrors the Season Stats
 * leaderboard's "relative" (efficiency) metric exactly: (payout − netContribution)
 * / netContribution, over players with a POSITIVE net contribution only. Players
 * with netContribution ≤ 0 are not ranked (they can't have a meaningful ratio and
 * the leaderboard excludes them), so this returns null for them.
 *
 * `potentialPayout` is the settled/potential USDC payout BEFORE claiming — the
 * finalized snapshot for a wallet that already claimed (the contract's
 * computePayout returns 0 post-claim), or live computePayout() for the rest.
 */
export function relativePnl(potentialPayout: bigint, netContribution: bigint): number | null {
  if (netContribution <= 0n) return null;
  const ratio = Number(potentialPayout) / Number(netContribution) - 1;
  return Number.isFinite(ratio) ? ratio : null;
}

/**
 * One player's stable payout + net contribution for a settled season. `claimed`
 * selects the source: a claimed wallet uses its finalized snapshot (computePayout
 * is zeroed after claiming), everyone else uses live computePayout().
 */
export interface SeasonFieldEntry {
  address: string;
  potentialPayout: bigint;
  netContribution: bigint;
}

/**
 * Score `me` against a season's full player field for `win_the_game`.
 * Builds the relative-PnL vector (positive-contribution players only), then ranks
 * `me` within it: median → 500, top → 1000, bottom → 0 (see
 * computeWinScoreForSeason). Returns null when the field has fewer than 2 ranked
 * players (no meaningful rank) or `me` has no defined relative PnL.
 */
export function scoreWinAgainstField(
  me: SeasonFieldEntry,
  field: SeasonFieldEntry[],
): number | null {
  const myPnl = relativePnl(me.potentialPayout, me.netContribution);
  if (myPnl === null) return null;
  const pnls = field
    .map((e) => relativePnl(e.potentialPayout, e.netContribution))
    .filter((v): v is number => v !== null);
  if (pnls.length < 2) return null;
  return computeWinScoreForSeason(myPnl, pnls);
}
