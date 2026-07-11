// Event-driven quest crediting.
//
// The frontend's /api/quests route historically wrote quest completions lazily,
// as a side-effect of a signed-in GET. That means a quest only "concluded" if
// the user opened the board while authenticated — a wallet could claim its
// payout on-chain and never get the point until it happened to reload the board.
//
// These credits are all PROVABLE ON-CHAIN FACTS about a wallet (it claimed, it
// traded, it staked…). No one can fake them for someone else, so they don't need
// the session/captcha gate the read path uses. Writing them the instant the
// indexer processes the underlying event makes the quest conclude with zero
// reliance on a page visit.
//
// This writes to the QUEST database (the Next app's Postgres, `regarded_games`),
// which is SEPARATE from Ponder's own indexing DB (`DATABASE_URL`). The upsert is
// identical to the app's upsertCompletion() so the two write paths are
// interchangeable and idempotent (ON CONFLICT (address, quest_id)).

import { Pool } from "pg";

// Fixed point values, mirrored from content/discourse/quests.json (the app's
// single source of truth). Only the fixed-value, on-chain-derived quests live
// here — variable/off-chain quests (win_the_game, referrals, discussion_bonus,
// login_discourse, vote_manifest) are NOT credited from the indexer.
export const QUEST_POINTS = {
  use_faucet: 50,
  swap_usdc_rgd: 50,
  stake_rgd: 50,
  buy_fim_auction: 50,
  create_order: 50,
  execute_shuffle: 100,
  claim_payout: 50,
} as const;

export type FixedQuestId = keyof typeof QUEST_POINTS;

// Lazily-initialised pool. If QUEST_DATABASE_URL is unset (e.g. `ponder codegen`,
// tests, or a deploy that intentionally decouples the indexer from the quest DB),
// crediting becomes a silent no-op rather than a crash.
let _pool: Pool | null = null;
let _disabled = false;

function getPool(): Pool | null {
  if (_disabled) return null;
  if (_pool) return _pool;
  const url = process.env.QUEST_DATABASE_URL?.trim();
  if (!url) {
    console.warn(
      "[quest-credits] QUEST_DATABASE_URL not set — quest crediting disabled.",
    );
    _disabled = true;
    return null;
  }
  _pool = new Pool({ connectionString: url, max: 4 });
  _pool.on("error", (err) =>
    console.error("[quest-credits] idle client error:", err.message),
  );
  return _pool;
}

/**
 * Idempotently credit a fixed-value quest to a wallet. Address is lowercased to
 * match the app's convention and the quest_completions PK. Never throws — a
 * quest-DB hiccup must not stall or crash on-chain indexing.
 */
export async function creditQuest(
  address: string,
  questId: FixedQuestId,
): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  const addr = address.toLowerCase();
  const points = QUEST_POINTS[questId];
  try {
    await pool.query(
      `INSERT INTO quest_completions (address, quest_id, points)
       VALUES ($1, $2, $3)
       ON CONFLICT (address, quest_id) DO NOTHING`,
      [addr, questId, points],
    );
  } catch (e: unknown) {
    console.warn(
      `[quest-credits] ${questId} for ${addr} failed: ${
        e instanceof Error ? e.message : e
      }`,
    );
  }
}

/**
 * Upsert the variable-value `win_the_game` credit. Unlike the fixed quests this
 * is a whole-season relative-PnL ranking, so it's scored once per season (when
 * DISTRIBUTION opens and every player's stats are finalized) and only raised,
 * never lowered — a player keeps their best score across seasons. Mirrors the
 * `bestWin > existingWin` logic in the app's /api/quests route.
 */
export async function creditWinScore(
  address: string,
  score: number,
): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  const addr = address.toLowerCase();
  const pts = Math.max(0, Math.round(score));
  if (pts <= 0) return;
  try {
    await pool.query(
      `INSERT INTO quest_completions (address, quest_id, points)
       VALUES ($1, 'win_the_game', $2)
       ON CONFLICT (address, quest_id) DO UPDATE
         SET points = GREATEST(quest_completions.points, EXCLUDED.points)`,
      [addr, pts],
    );
  } catch (e: unknown) {
    console.warn(
      `[quest-credits] win_the_game for ${addr} failed: ${
        e instanceof Error ? e.message : e
      }`,
    );
  }
}
