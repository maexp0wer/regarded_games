/* Phase buckets.
 *
 * getPhase() returns seven values, but every surface groups them into the same
 * three: the season page renders AuctionPhaseLayout / TradingPhaseLayout /
 * PayoutPhaseLayout off exactly these predicates. The /play/[phase] resolvers
 * reuse them so "the season in the payout phase" means the same thing on the
 * landing as it does once you arrive.
 *
 * The buckets are mutually exclusive and exhaustive over the seven values.
 * Kept pure (raw phase string in, boolean out) so both the hook-based season
 * page and the plain-array resolver can share them. */

export type PhaseBucket = 'auction' | 'trading' | 'payout';

export const PHASE_BUCKETS: readonly PhaseBucket[] = ['auction', 'trading', 'payout'] as const;

export function isPhaseBucket(v: string): v is PhaseBucket {
  return (PHASE_BUCKETS as readonly string[]).includes(v);
}

/** Which bucket a raw getPhase() string belongs to, or null if unrecognised. */
export function phaseBucketOf(phase: string | null | undefined): PhaseBucket | null {
  switch (phase) {
    case 'AUCTION':
    case 'BOOTSTRAP':
      return 'auction';
    case 'TRADING':
      return 'trading';
    // Everything after trading shows the payout layout: the settlement crank,
    // the two-stage review window (ADR-0008), and the terminal payout itself.
    case 'SETTLING':
    case 'CALCULATING':
    case 'TRIAGE':
    case 'INVESTIGATION':
    case 'PAYOUT':
    case 'DISTRIBUTION':
      return 'payout';
    default:
      return null;
  }
}

/** Human label for the bucket, used in resolver loading/fallback copy. */
export const PHASE_BUCKET_LABEL: Record<PhaseBucket, string> = {
  auction: 'Auction',
  trading: 'Trading',
  payout: 'Payout',
};
