import { NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { query } from '@/lib/db';
import { fetchAllPonderItems } from '@/lib/ponder';
import { loadQuestsConfig, type QuestsConfig } from '@/lib/quests';
import {
  upsertCompletion,
  qualifyingReferralCount,
  creditReferralPoints,
} from '@/lib/questCompletions';
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
  forumUrl?: string;
  discordUrl?: string;
}

interface MainQuestOut {
  id: string;
  title: string;
  subQuests: SubQuestOut[];
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

// Any order row with this maker qualifies — open, cancelled, and filled orders
// all live in the same `orders` table (state is just active/isCancelled/settledAt),
// so a single maker filter covers every state.
async function ponderHasOrderCreated(addr: string) {
  const q = `query($u: String!, $after: String, $limit: Int!) {
    orderss(where: { maker: $u }, limit: $limit, after: $after) {
      items { id }
      pageInfo { endCursor hasNextPage }
    }
  }`;
  const items = await fetchAllPonderItems<{ id: string }>(
    PONDER_URL, q, { u: addr }, (d) => d.orderss,
  );
  return items.length > 0;
}

interface ShuffleFill {
  id: string;
  txHash: string;
  buyer: string;
  seller: string;
  giniBps: number;
  giniBpsAfter: number;
  buyerIsCapitalist: boolean;
  sellerIsCapitalist: boolean;
}

// A shuffle is a mixed taker queue: fillBatch settles every leg in ONE
// transaction, so its trade rows share a txHash (the wallet is buyer on legs
// that hit resting sells, seller on legs that hit resting buys). It qualifies
// when, at a leg by which both roles have appeared, the Gini has net-moved from
// its pre-shuffle value (first leg's giniBps, legs ordered by the logIndex in
// the row id) toward the wallet's class pole — up for a Capitalist, down for a
// Proletarian, class read from the first leg. Mirrors the indexer's
// event-driven check in indexer/src/index.ts (Exchange:OrderFilled).
async function ponderHasShuffle(addr: string) {
  const q = `query($u: String!, $after: String, $limit: Int!) {
    tradess(where: { taker: $u }, limit: $limit, after: $after) {
      items { id txHash buyer seller giniBps giniBpsAfter buyerIsCapitalist sellerIsCapitalist }
      pageInfo { endCursor hasNextPage }
    }
  }`;
  const fills = await fetchAllPonderItems<ShuffleFill>(
    PONDER_URL, q, { u: addr }, (d) => d.tradess,
  );
  const byTx = new Map<string, ShuffleFill[]>();
  for (const f of fills) {
    const legs = byTx.get(f.txHash);
    if (legs) legs.push(f);
    else byTx.set(f.txHash, [f]);
  }
  for (const unsorted of byTx.values()) {
    const legs = unsorted.sort((a, b) => Number(a.id.split('-')[1]) - Number(b.id.split('-')[1]));
    const first = legs[0];
    const preShuffleGini = first.giniBps;
    const isCapitalist = first.buyer.toLowerCase() === addr
      ? first.buyerIsCapitalist
      : first.sellerIsCapitalist;
    let bought = false;
    let sold = false;
    for (const leg of legs) {
      if (leg.buyer.toLowerCase() === addr) bought = true;
      if (leg.seller.toLowerCase() === addr) sold = true;
      if (!(bought && sold)) continue;
      // 0 is the "no meaningful sample" sentinel — never judge direction on it.
      if (preShuffleGini <= 0 || leg.giniBpsAfter <= 0) continue;
      if (isCapitalist ? leg.giniBpsAfter > preShuffleGini : leg.giniBpsAfter < preShuffleGini) {
        return true;
      }
    }
  }
  return false;
}

// Only `realizedPayout` is consumed here — it gates the claim_payout credit.
// win_the_game scoring lives in the indexer (it needs contract reads), so this
// route no longer needs the season-wide finalized field.
interface PlayerStatRow {
  realizedPayout: string;
}

async function ponderUserStats(addr: string): Promise<PlayerStatRow[]> {
  const q = `query($p: String!, $after: String, $limit: Int!) {
    playerSeasonStatss(where: { playerAddress: $p }, limit: $limit, after: $after) {
      items { realizedPayout }
      pageInfo { endCursor hasNextPage }
    }
  }`;
  return fetchAllPonderItems<PlayerStatRow>(
    PONDER_URL, q, { p: addr }, (d) => d.playerSeasonStatss,
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
  forumRootLoginUrl: string,
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
          title: 'Log into our Forum',
          points: P.login_discourse,
          isCompleted: isDone('login_discourse'),
          actionUrl: forumRootLoginUrl,
        },
        {
          id: 'discussion_bonus', type: 'internal',
          title: 'Join the discussion',
          points: discussionRow?.points ?? 0,
          isCompleted: !!discussionRow,
          note: 'Awarded at the end of the Testnet Phase based on the quality and engagement of your participation on the Forum and Discord.',
          forumUrl: forumRootLoginUrl,
          discordUrl: config.externalLinks.discordInvite,
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
          ...(address ? { copyUrl: `${config.internalRoutes.faucet}/${address}` } : {}),
          note: `Referee must reach ${config.referralQualifyingThreshold} quest points. Earn points per qualified referral: 1–10: 50 pts · 11–35: 20 pts · 36–100: 5 pts.`,
        },
      ],
    },
    {
      id: 'dominate_testnet',
      title: 'Dominate the Testnet',
      subQuests: [
        { id: 'use_faucet',      type: 'internal', title: 'Use the faucet to get fUSDC', points: P.use_faucet,      isCompleted: isDone('use_faucet'),      actionUrl: config.internalRoutes.faucet },
        { id: 'swap_usdc_rgd',   type: 'internal', title: 'Exchange fUSDC for RGD',       points: P.swap_usdc_rgd,   isCompleted: isDone('swap_usdc_rgd'),   actionUrl: config.internalRoutes.swap },
        { id: 'stake_rgd',       type: 'internal', title: 'Stake RGD',                       points: P.stake_rgd,       isCompleted: isDone('stake_rgd'),       actionUrl: config.internalRoutes.stake },
        { id: 'buy_fim_auction', type: 'internal', title: 'Buy FIM during the Auction Phase',      points: P.buy_fim_auction, isCompleted: isDone('buy_fim_auction'), auctionGate: true },
        { id: 'create_order',    type: 'internal', title: 'Create an Order during the Trading Phase', points: P.create_order,    isCompleted: isDone('create_order'),    tradingGate: true },
        {
          id: 'execute_shuffle', type: 'internal',
          title: 'Execute a Shuffle Order that moves the gini in favor of your class',
          points: P.execute_shuffle,
          isCompleted: isDone('execute_shuffle'),
          tradingGate: true,
          note: "Execute a Buy and Sell taker Order in one transaction — it must push the Gini toward your class's pole: up for Capitalists, down for Proletarians.",
        },
        { id: 'claim_payout',    type: 'internal', title: 'Claim your payout',                    points: P.claim_payout,    isCompleted: isDone('claim_payout'),    payoutGate: true },
        {
          id: 'win_the_game', type: 'internal',
          title: 'Win the Game',
          points: pts('win_the_game', 0),
          isCompleted: isDone('win_the_game'),
          note: `Points are awarded at the end of each season based on your relative P&L (USDC earned / USDC spent), up to ${P.win_the_game_max} for the highest % gain.`,
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
    // Wrap a forum path in the app's forum-login flow so clicking it carries the
    // exact destination through login: /community-login establishes the session
    // FIRST, then fires the Discourse SSO warm — the only order in which
    // Discourse's return_path binding reliably survives. Canonical `app.` host on
    // purpose: that's where the session cookie lives. Mirrors the client-side
    // forumLoginUrl() in utils/discourseForum.ts.
    const mainDomain = new URL(process.env.NEXT_PUBLIC_MAIN_DOMAIN ?? 'http://localhost:3000');
    const forumLoginUrl = (returnPath: string) => {
      const path = returnPath.startsWith('/') ? returnPath : `/${returnPath}`;
      return `${mainDomain.protocol}//app.${mainDomain.host}/community-login?return_path=${encodeURIComponent(path)}`;
    };
    const manifestActionUrl = forumLoginUrl(manifestTopicId ? `/t/${manifestTopicId}` : '/');

    let finalMap: CompletionMap = new Map();

    if (address) {
      // Single-shot Ponder probes, in parallel. Each is wrapped so one
      // unreachable service (Ponder sepolia, Discourse) does not 500 the route.
      const [
        hasFaucet, hasSwap, hasStake, hasAuctionMint, hasOrderCreated, hasShuffle,
        userStats, discourseExists, hasVoted, existingMap,
      ] = await Promise.all([
        safe('ponderHasFaucet',      () => ponderHasFaucet(address),      false),
        safe('ponderHasSwap',        () => ponderHasSwap(address),        false),
        safe('ponderHasStake',       () => ponderHasStake(address),       false),
        safe('ponderHasAuctionMint', () => ponderHasAuctionMint(address), false),
        safe('ponderHasOrderCreated', () => ponderHasOrderCreated(address), false),
        safe('ponderHasShuffle',     () => ponderHasShuffle(address),     false),
        safe('ponderUserStats',      () => ponderUserStats(address),      [] as PlayerStatRow[]),
        safe('discourseAccountExists', () => discourseAccountExists(address), false),
        safe('discourseHasVoted',    () => discourseHasVoted(address),    false),
        existing(address),
      ]);

      // Discourse-side credits are ungated: they depend only on state that
      // lives on the forum (a provisioned account / a cast poll vote), which
      // is verified server-to-server against Discourse. Both actions happen
      // entirely on Discourse's side, so there is no community-session cookie
      // to gate on when the board polls.
      if (discourseExists && !existingMap.has('login_discourse')) {
        await upsertCompletion(address, 'login_discourse', P.login_discourse);
      }
      if (hasVoted && !existingMap.has('vote_manifest')) {
        await upsertCompletion(address, 'vote_manifest', P.vote_manifest);
      }

      // Referral credit is likewise ungated: it derives entirely from state
      // that was verified when it was written — faucet_referrals rows are
      // inserted only after an on-chain hasClaimed() check, and the referees'
      // points passed through their own session/captcha gates. A caller can't
      // forge any of it, and gating it on the REFERRER's session silently
      // withheld earned points whenever their cookie was stale or belonged to
      // another wallet.
      const qualified = await qualifyingReferralCount(address, config.referralQualifyingThreshold);
      if (qualified > 0) {
        await creditReferralPoints(address, qualified, config.referralTiers);
      }

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
        if (hasOrderCreated && !existingMap.has('create_order')) {
          await upsertCompletion(address, 'create_order', P.create_order);
        }
        if (hasShuffle && !existingMap.has('execute_shuffle')) {
          await upsertCompletion(address, 'execute_shuffle', P.execute_shuffle);
        }
        const claimedAny = userStats.some((s) => BigInt(s.realizedPayout) > 0n);
        if (claimedAny && !existingMap.has('claim_payout')) {
          await upsertCompletion(address, 'claim_payout', P.claim_payout);
        }

        // ── Win the Game ─────────────────────────────────────────────────
        // NOT scored here. It ranks a wallet against the season's FULL player
        // field using the same relative-PnL basis as the Season Stats
        // leaderboard, which requires reading each player's live/settled payout
        // straight from the GameSeason contract (computePayout / netContributions)
        // — the indexer's finalized snapshots lag until every player settles.
        // That contract read needs the chain RPC, which the indexer already has
        // (context.client) but this route does not on the Sepolia tenant in
        // production (its rpcUrl is a relative proxy). So the indexer is the sole
        // writer — see scoreWinForClaimer in indexer/src/index.ts, credited on
        // GameSeason:PayoutClaimed. This route just surfaces whatever it wrote.
      }

      // Re-read after any upserts (also serves as the read-only path).
      finalMap = await existing(address);
    }

    // ── Build response ─────────────────────────────────────────────────
    const forumRootLoginUrl = forumLoginUrl('/');
    const mainQuests = await buildMainQuests(config, finalMap, manifestActionUrl, forumRootLoginUrl, address);
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
