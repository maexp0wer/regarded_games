import { NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { query } from '@/lib/db';
import { fetchAllPonderItems } from '@/lib/ponder';
import {
  loadQuestsConfig,
  computeTotalReferralPoints,
  computeWinScoreForSeason,
  relativePnl,
  type QuestsConfig,
} from '@/lib/quests';
import { getCommunitySession } from '@/lib/communitySession';
import { TENANTS } from '@/config/tenants';

const PONDER_URL = TENANTS.sepolia.ponderUrl;

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e: unknown) {
    console.warn(`[quests] ${label} failed: ${e instanceof Error ? e.message : e}`);
    return fallback;
  }
}

interface SubQuestOut {
  id: string;
  title: string;
  points: number;
  type: 'galxe' | 'internal';
  isCompleted: boolean;
  actionUrl?: string;
  copyUrl?: string;
  auctionGate?: boolean;
  tradingGate?: boolean;
  payoutGate?: boolean;
  note?: string;
}

interface MainQuestOut {
  id: string;
  title: string;
  description: string;
  subQuests: SubQuestOut[];
}

async function upsertCompletion(address: string, questId: string, points: number, note?: string) {
  await query(
    `INSERT INTO quest_completions (address, quest_id, points, note)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (address, quest_id) DO UPDATE
       SET points = EXCLUDED.points,
           note   = COALESCE(EXCLUDED.note, quest_completions.note)`,
    [address, questId, points, note ?? null],
  );
}

async function existing(address: string): Promise<Map<string, { points: number; note: string | null }>> {
  const { rows } = await query<{ quest_id: string; points: number; note: string | null }>(
    `SELECT quest_id, points, note FROM quest_completions WHERE address = $1`,
    [address],
  );
  const m = new Map<string, { points: number; note: string | null }>();
  for (const r of rows) m.set(r.quest_id, { points: r.points, note: r.note });
  return m;
}

async function ponderHasFaucet(addr: string) {
  const q = `query($id: String!) { faucetClaims(id: $id) { id } }`;
  const res = await fetch(PONDER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q, variables: { id: addr } }),
  });
  const j = await res.json();
  return Boolean(j?.data?.faucetClaims?.id);
}

async function ponderHasSwap(addr: string) {
  const q = `query($sender: String!, $after: String, $limit: Int!) {
    rgdSwapss(where: { sender: $sender }, limit: $limit, after: $after) {
      items { id }
      pageInfo { endCursor hasNextPage }
    }
  }`;
  const items = await fetchAllPonderItems<{ id: string }>(
    PONDER_URL, q, { sender: addr }, (d) => d.rgdSwapss,
  );
  return items.length > 0;
}

async function ponderHasStake(addr: string) {
  const q = `query($staker: String!, $after: String, $limit: Int!) {
    rgdStakess(where: { staker: $staker }, limit: $limit, after: $after) {
      items { id }
      pageInfo { endCursor hasNextPage }
    }
  }`;
  const items = await fetchAllPonderItems<{ id: string }>(
    PONDER_URL, q, { staker: addr }, (d) => d.rgdStakess,
  );
  return items.length > 0;
}

async function ponderHasAuctionMint(addr: string) {
  const q = `query($p: String!, $after: String, $limit: Int!) {
    auctionMintss(where: { playerAddress: $p }, limit: $limit, after: $after) {
      items { id }
      pageInfo { endCursor hasNextPage }
    }
  }`;
  const items = await fetchAllPonderItems<{ id: string }>(
    PONDER_URL, q, { p: addr }, (d) => d.auctionMintss,
  );
  return items.length > 0;
}

async function ponderHasTrade(addr: string) {
  const q = (field: 'buyer' | 'seller') => `query($u: String!, $after: String, $limit: Int!) {
    tradess(where: { ${field}: $u }, limit: $limit, after: $after) {
      items { id }
      pageInfo { endCursor hasNextPage }
    }
  }`;
  const [b, s] = await Promise.all([
    fetchAllPonderItems<{ id: string }>(PONDER_URL, q('buyer'), { u: addr }, (d) => d.tradess),
    fetchAllPonderItems<{ id: string }>(PONDER_URL, q('seller'), { u: addr }, (d) => d.tradess),
  ]);
  return b.length > 0 || s.length > 0;
}

interface PlayerStatRow {
  seasonAddress: string;
  playerAddress: string;
  totalPotentialPayout: string;
  netContribution: string;
  realizedPayout: string;
}

async function ponderUserStats(addr: string): Promise<PlayerStatRow[]> {
  const q = `query($p: String!, $after: String, $limit: Int!) {
    playerSeasonStatss(where: { playerAddress: $p }, limit: $limit, after: $after) {
      items { seasonAddress playerAddress totalPotentialPayout netContribution realizedPayout }
      pageInfo { endCursor hasNextPage }
    }
  }`;
  return fetchAllPonderItems<PlayerStatRow>(
    PONDER_URL, q, { p: addr }, (d) => d.playerSeasonStatss,
  );
}

async function ponderSeasonStats(seasonAddr: string): Promise<PlayerStatRow[]> {
  const q = `query($s: String!, $after: String, $limit: Int!) {
    playerSeasonStatss(where: { seasonAddress: $s }, limit: $limit, after: $after) {
      items { seasonAddress playerAddress totalPotentialPayout netContribution realizedPayout }
      pageInfo { endCursor hasNextPage }
    }
  }`;
  return fetchAllPonderItems<PlayerStatRow>(
    PONDER_URL, q, { s: seasonAddr }, (d) => d.playerSeasonStatss,
  );
}

async function discourseAccountExists(addr: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_DISCOURSE_URL;
  const apiKey = process.env.DISCOURSE_API_KEY;
  if (!url || !apiKey) return false;
  const res = await fetch(`${url}/u/by-external/${addr}.json`, {
    headers: { 'Api-Key': apiKey, 'Api-Username': 'system' },
  });
  if (!res.ok) return false;
  const data = await res.json();
  return Boolean(data?.user?.id);
}

async function discourseHasVoted(addr: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_DISCOURSE_URL;
  const apiKey = process.env.DISCOURSE_API_KEY;
  if (!url || !apiKey) return false;

  const { rows } = await query<{ key: string; value: string }>(
    `SELECT key, value FROM quest_config WHERE key IN ('manifest_post_id','manifest_poll_name')`,
  );
  const postId = rows.find((r) => r.key === 'manifest_post_id')?.value;
  const pollName = rows.find((r) => r.key === 'manifest_poll_name')?.value;
  if (!postId || !pollName) {
    console.warn('[quests] discourseHasVoted: missing manifest_post_id/manifest_poll_name in quest_config');
    return false;
  }

  const discourseHeaders = { 'Api-Key': apiKey, 'Api-Username': 'system' };

  // Resolve the Discourse user.id for this wallet (external_id == wallet).
  // Matching by numeric user.id is robust regardless of username formatting.
  const userRes = await fetch(`${url}/u/by-external/${addr}.json`, { headers: discourseHeaders });
  if (!userRes.ok) {
    console.warn(`[quests] discourseHasVoted: by-external lookup failed (${userRes.status}) for ${addr}`);
    return false;
  }
  const userData = await userRes.json();
  const discourseUserId = userData?.user?.id;
  if (typeof discourseUserId !== 'number') {
    console.warn(`[quests] discourseHasVoted: no user.id returned for ${addr}`);
    return false;
  }

  // Paginate through voter pages (Discourse returns ~25 per page per option).
  for (let page = 1; page <= 20; page++) {
    const res = await fetch(
      `${url}/polls/voters.json?post_id=${postId}&poll_name=${encodeURIComponent(pollName)}&page=${page}`,
      { headers: discourseHeaders },
    );
    if (!res.ok) {
      console.warn(`[quests] discourseHasVoted: voters.json failed (${res.status}) page ${page}`);
      return false;
    }
    const data = await res.json();
    const voters = data?.voters ?? {};
    let totalOnPage = 0;
    for (const arr of Object.values(voters)) {
      if (!Array.isArray(arr)) continue;
      totalOnPage += arr.length;
      if (arr.some((u: unknown) => (u as { id?: number })?.id === discourseUserId)) return true;
    }
    // If every option returned 0 voters this page, we've exhausted all pages.
    if (totalOnPage === 0) break;
  }
  return false;
}

async function qualifyingReferralCount(addr: string, threshold: number): Promise<number> {
  const { rows } = await query<{ count: string }>(
    `SELECT COUNT(*)::int AS count FROM (
       SELECT fr.referee_address
       FROM faucet_referrals fr
       JOIN quest_completions qc ON qc.address = fr.referee_address
       WHERE fr.referrer_address = $1
       GROUP BY fr.referee_address
       HAVING SUM(qc.points) >= $2
     ) sub`,
    [addr, threshold],
  );
  return Number(rows[0]?.count ?? 0);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function checkGalxe(_addr: string, _campaign: string): Promise<boolean> {
  // Galxe API integration is deferred. Always returns false in v1 so the
  // sub-quest is rendered as "Launch" (galxe type) but never auto-completed.
  return false;
}

type CompletionMap = Map<string, { points: number; note: string | null }>;

/**
 * Build the full quest catalogue. `finalMap` carries the wallet's recorded
 * completions; an empty map (anonymous, no wallet connected) yields the
 * catalogue with nothing completed. `address` is null in the anonymous case.
 */
async function buildMainQuests(
  config: QuestsConfig,
  finalMap: CompletionMap,
  manifestActionUrl: string,
  address: string | null,
): Promise<MainQuestOut[]> {
  const P = config.points;
  const isDone = (id: string) => finalMap.has(id);
  const pts = (id: string, fallback: number) => finalMap.get(id)?.points ?? fallback;
  const discussionRow = finalMap.get('discussion_bonus');

  return [
    {
      id: 'join_community',
      title: 'Join the Community',
      description: 'Plug into the Regarded Games signal network.',
      subQuests: [
        {
          id: 'follow_x', type: 'galxe',
          title: 'Follow us on X',
          points: P.follow_x,
          isCompleted: isDone('follow_x') || (await checkGalxe(address ?? '', 'follow_x')),
          actionUrl: config.galxe.followX,
        },
        {
          id: 'join_discord', type: 'galxe',
          title: 'Join us on Discord',
          points: P.join_discord,
          isCompleted: isDone('join_discord') || (await checkGalxe(address ?? '', 'join_discord')),
          actionUrl: config.galxe.joinDiscord,
        },
        {
          id: 'login_discourse', type: 'internal',
          title: 'Log into our Discourse',
          points: P.login_discourse,
          isCompleted: isDone('login_discourse'),
          actionUrl: config.externalLinks.discourseUrl,
        },
        {
          id: 'discussion_bonus', type: 'internal',
          title: 'Strategic voice bonus — join the discussion',
          points: discussionRow?.points ?? 0,
          isCompleted: !!discussionRow,
          note: `Determined at the end of the Testnet Phase.`,
        },
        {
          id: 'vote_manifest', type: 'internal',
          title: 'Vote on the Mainnet Season 1 Manifest',
          points: P.vote_manifest,
          isCompleted: isDone('vote_manifest'),
          actionUrl: manifestActionUrl,
        },
      ],
    },
    {
      id: 'spread_word',
      title: 'Spread the Word',
      description: 'Amplify the protocol signal beyond the inner circle.',
      subQuests: [
        {
          id: 'retweet_x', type: 'galxe',
          title: 'Retweet on X',
          points: P.retweet_x,
          isCompleted: isDone('retweet_x') || (await checkGalxe(address ?? '', 'retweet')),
          actionUrl: config.galxe.retweet,
        },
        {
          id: 'referrals', type: 'internal',
          title: 'Invite players via your referral link',
          points: pts('referrals', 0),
          isCompleted: pts('referrals', 0) > 0,
          // The referral link is wallet-specific, so omit it for the
          // anonymous catalogue.
          ...(address ? { copyUrl: `${config.internalRoutes.faucet}/${address}` } : {}),
          note: `Tiers: 1–10 refs (50 pts each) · 11–35 (20 pts) · 36–100 (5 pts). Referee must reach ≥${config.referralQualifyingThreshold} quest points.`,
        },
      ],
    },
    {
      id: 'dominate_testnet',
      title: 'Dominate the Testnet',
      description: 'Run the full loop — capital in, capital out.',
      subQuests: [
        { id: 'use_faucet',      type: 'internal', title: 'Use the faucet to get FakeUSDC', points: P.use_faucet,      isCompleted: isDone('use_faucet'),      actionUrl: config.internalRoutes.faucet },
        { id: 'swap_usdc_rgd',   type: 'internal', title: 'Exchange FakeUSDC for RGD',       points: P.swap_usdc_rgd,   isCompleted: isDone('swap_usdc_rgd'),   actionUrl: config.internalRoutes.swap },
        { id: 'stake_rgd',       type: 'internal', title: 'Stake RGD',                       points: P.stake_rgd,       isCompleted: isDone('stake_rgd'),       actionUrl: config.internalRoutes.stake },
        { id: 'buy_fim_auction', type: 'internal', title: 'Buy Fake Internet Money during the Auction',      points: P.buy_fim_auction, isCompleted: isDone('buy_fim_auction'), auctionGate: true },
        { id: 'trade_fim',       type: 'internal', title: 'Buy or sell Fake Internet Money during Trading',  points: P.trade_fim,       isCompleted: isDone('trade_fim'),       tradingGate: true },
        { id: 'claim_payout',    type: 'internal', title: 'Claim your payout',                    points: P.claim_payout,    isCompleted: isDone('claim_payout'),    payoutGate: true },
        {
          id: 'win_the_game', type: 'internal',
          title: 'Win the Game',
          points: pts('win_the_game', 0),
          isCompleted: isDone('win_the_game'),
          note: `0–${P.win_the_game_max} pts based on your best season's relative PnL rank.`,
        },
      ],
    },
  ];
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const addressParam = searchParams.get('address');
    // A wallet address is optional. When present it must be well-formed; when
    // absent we serve an anonymous catalogue (nothing completed) so the board
    // can render before a wallet is connected.
    if (addressParam && !isAddress(addressParam, { strict: false })) {
      return NextResponse.json({ error: 'invalid_address' }, { status: 400 });
    }
    const address = addressParam ? addressParam.toLowerCase() : null;
    const config = loadQuestsConfig();
    const P = config.points;

    // ── Layer 1: session gate ──────────────────────────────────────────────
    // Writes require a matching verified session. Reads (anonymous catalogue
    // or viewing existing completions) are always served.
    const sessionAddr = getCommunitySession(req);
    // If a session exists for a *different* address than the one being queried,
    // silently treat as read-only — don't block legitimate users with stale sessions.
    const sessionMatch = address !== null && sessionAddr === address;

    // ── Layer 2: CAPTCHA gate ──────────────────────────────────────────────
    // quest credits are only written after the user has solved a CAPTCHA once.
    // When TURNSTILE_SECRET_KEY is absent (local dev) the widget is skipped on
    // the frontend too, so we mirror that by treating captcha as auto-verified.
    const captchaRequired = !!process.env.TURNSTILE_SECRET_KEY;
    let captchaVerified = !captchaRequired;
    if (sessionMatch && captchaRequired) {
      try {
        const { rows: fpRows } = await query<{ id: number }>(
          `SELECT id FROM session_fingerprints
           WHERE address = $1 AND captcha_verified = TRUE
           LIMIT 1`,
          [address],
        );
        captchaVerified = fpRows.length > 0;
      } catch { /* non-fatal — fail open on DB error */ }
    }

    const canWrite = sessionMatch && captchaVerified;

    // Manifest topic link (DB-derived, with graceful fallback) — needed for
    // both the anonymous catalogue and the per-wallet response.
    let manifestTopicId: string | undefined;
    try {
      const r = await query<{ value: string }>(
        `SELECT value FROM quest_config WHERE key = 'manifest_topic_id'`,
      );
      manifestTopicId = r.rows[0]?.value;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[quests] manifest_topic_id lookup failed: ${msg}`);
    }
    const discourseBase = process.env.NEXT_PUBLIC_DISCOURSE_URL ?? config.externalLinks.discourseUrl;
    const manifestActionUrl = manifestTopicId
      ? `${discourseBase}/t/${manifestTopicId}`
      : config.externalLinks.discourseUrl;

    let finalMap: CompletionMap = new Map();

    if (address) {
      // Single-shot Ponder probes, in parallel. Each is wrapped so one
      // unreachable service (Ponder sepolia, Discourse) does not 500 the route.
      const [
        hasFaucet, hasSwap, hasStake, hasAuctionMint, hasTrade,
        userStats, discourseExists, hasVoted, existingMap,
      ] = await Promise.all([
        safe('ponderHasFaucet',      () => ponderHasFaucet(address),      false),
        safe('ponderHasSwap',        () => ponderHasSwap(address),        false),
        safe('ponderHasStake',       () => ponderHasStake(address),       false),
        safe('ponderHasAuctionMint', () => ponderHasAuctionMint(address), false),
        safe('ponderHasTrade',       () => ponderHasTrade(address),       false),
        safe('ponderUserStats',      () => ponderUserStats(address),      [] as PlayerStatRow[]),
        safe('discourseAccountExists', () => discourseAccountExists(address), false),
        safe('discourseHasVoted',    () => discourseHasVoted(address),    false),
        existing(address),
      ]);

      // ── Internal credit insertions (gated by canWrite) ─────────────────
      if (canWrite) {
        if (hasFaucet && !existingMap.has('use_faucet')) {
          await upsertCompletion(address, 'use_faucet', P.use_faucet);
        }
        if (hasSwap && !existingMap.has('swap_usdc_rgd')) {
          await upsertCompletion(address, 'swap_usdc_rgd', P.swap_usdc_rgd);
        }
        if (hasStake && !existingMap.has('stake_rgd')) {
          await upsertCompletion(address, 'stake_rgd', P.stake_rgd);
        }
        if (hasAuctionMint && !existingMap.has('buy_fim_auction')) {
          await upsertCompletion(address, 'buy_fim_auction', P.buy_fim_auction);
        }
        if (hasTrade && !existingMap.has('trade_fim')) {
          await upsertCompletion(address, 'trade_fim', P.trade_fim);
        }
        const claimedAny = userStats.some((s) => BigInt(s.realizedPayout) > 0n);
        if (claimedAny && !existingMap.has('claim_payout')) {
          await upsertCompletion(address, 'claim_payout', P.claim_payout);
        }
        if (discourseExists && !existingMap.has('login_discourse')) {
          await upsertCompletion(address, 'login_discourse', P.login_discourse);
        }
        if (hasVoted && !existingMap.has('vote_manifest')) {
          await upsertCompletion(address, 'vote_manifest', P.vote_manifest);
        }

        // ── Win the Game (variable, lazy, best-across-seasons) ───────────
        let bestWin = 0;
        for (const stat of userStats) {
          if (BigInt(stat.realizedPayout) <= 0n) continue;
          const userPnl = relativePnl(BigInt(stat.totalPotentialPayout), BigInt(stat.netContribution));
          if (userPnl === null) continue;
          const allStats = await safe(
            `ponderSeasonStats(${stat.seasonAddress})`,
            () => ponderSeasonStats(stat.seasonAddress),
            [] as PlayerStatRow[],
          );
          const pnls = allStats
            .map((s) => relativePnl(BigInt(s.totalPotentialPayout), BigInt(s.netContribution)))
            .filter((v): v is number => v !== null);
          if (pnls.length < 2) continue;
          const score = computeWinScoreForSeason(userPnl, pnls);
          if (score > bestWin) bestWin = score;
        }
        const existingWin = existingMap.get('win_the_game')?.points ?? 0;
        if (bestWin > existingWin) {
          await upsertCompletion(address, 'win_the_game', bestWin);
        }

        // ── Referrals (variable, gated by 500-pt threshold) ──────────────
        const qualified = await qualifyingReferralCount(address, config.referralQualifyingThreshold);
        const totalReferralPts = computeTotalReferralPoints(qualified, config.referralTiers);
        if (totalReferralPts > 0) {
          await upsertCompletion(address, 'referrals', totalReferralPts);
        }
      }

      // Re-read after any upserts (also serves as the read-only path).
      finalMap = await existing(address);
    }

    // ── Build response ─────────────────────────────────────────────────
    const mainQuests = await buildMainQuests(config, finalMap, manifestActionUrl, address);
    const totalPoints = Array.from(finalMap.values()).reduce((s, v) => s + v.points, 0);
    return NextResponse.json({
      success: true,
      data: {
        mainQuests,
        totalPoints,
        tgeConversionRate: config.tgeConversionRate,
        captchaVerified,
      },
    });
  } catch (err: unknown) {
    console.error('GET /api/quests error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
