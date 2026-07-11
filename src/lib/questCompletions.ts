// Quest-completion DB helpers shared by the quest API routes
// (src/app/api/quests/route.ts and src/app/api/quests/referrals/route.ts).
// All addresses are stored lowercased; (address, quest_id) is the PK, so every
// write here is idempotent.

import { query } from '@/lib/db';
import { computeTotalReferralPoints, type ReferralTier } from '@/utils/quests';

export async function upsertCompletion(
  address: string,
  questId: string,
  points: number,
  note?: string,
): Promise<void> {
  await query(
    `INSERT INTO quest_completions (address, quest_id, points, note)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (address, quest_id) DO UPDATE
       SET points = EXCLUDED.points,
           note   = COALESCE(EXCLUDED.note, quest_completions.note)`,
    [address, questId, points, note ?? null],
  );
}

/** Number of referees of `referrer` whose quest points sum to ≥ threshold. */
export async function qualifyingReferralCount(
  referrer: string,
  threshold: number,
): Promise<number> {
  const { rows } = await query<{ count: string }>(
    `SELECT COUNT(*)::int AS count FROM (
       SELECT fr.referee_address
       FROM faucet_referrals fr
       JOIN quest_completions qc ON qc.address = fr.referee_address
       WHERE fr.referrer_address = $1
       GROUP BY fr.referee_address
       HAVING SUM(qc.points) >= $2
     ) sub`,
    [referrer, threshold],
  );
  return Number(rows[0]?.count ?? 0);
}

export interface ReferralEntry {
  address: string;
  points: number;
  qualified: boolean;
}

/** Every referee of `referrer` with their current quest-point sum, best first. */
export async function listReferralsForReferrer(
  referrer: string,
  threshold: number,
): Promise<ReferralEntry[]> {
  const { rows } = await query<{ address: string; points: number }>(
    `SELECT fr.referee_address AS address,
            COALESCE(SUM(qc.points), 0)::int AS points
     FROM faucet_referrals fr
     LEFT JOIN quest_completions qc ON qc.address = fr.referee_address
     WHERE fr.referrer_address = $1
     GROUP BY fr.referee_address
     ORDER BY points DESC`,
    [referrer],
  );
  return rows.map((r) => ({
    address: r.address,
    points: r.points,
    qualified: r.points >= threshold,
  }));
}

/**
 * Settle the referrer's tiered referral credit for `qualifiedCount` qualified
 * referees. Returns the total (0 leaves the ledger untouched). The credit
 * derives entirely from state that was verified when it was written —
 * faucet_referrals rows are inserted only after an on-chain hasClaimed()
 * check, and the referees' points passed through their own gates — so callers
 * may invoke this without a session for the referrer.
 */
export async function creditReferralPoints(
  address: string,
  qualifiedCount: number,
  tiers: ReferralTier[],
): Promise<number> {
  const total = computeTotalReferralPoints(qualifiedCount, tiers);
  if (total > 0) await upsertCompletion(address, 'referrals', total);
  return total;
}
