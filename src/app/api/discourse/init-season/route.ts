import { NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { fetchAllPonderItems } from '@/lib/ponder';
import { tenantFromRequest } from '@/lib/tenant.server';
import { getTenant, type TenantKey } from '@/config/tenants';
import { discourseNames } from '@/utils/discourseNames';
import { ssoSync } from '@/lib/discourseSSO';

const debug = process.env.APP_DEBUG === 'true';
const GET_BATCH_SIZE = 20; // parallel existence checks per batch
const SSO_CONCURRENCY = 5; // concurrent SSO sync workers

export async function POST(req: Request) {
  const adminToken = req.headers.get('x-discourse-admin-token');
  if (!adminToken || adminToken !== process.env.DISCOURSE_INIT_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { seasonAddress, seasonId, tenant: bodyTenant } = body;

    // S12: validate inputs before they reach Ponder / Discourse.
    if (!seasonAddress || !isAddress(seasonAddress, { strict: false })) {
      return NextResponse.json({ error: 'seasonAddress missing or invalid' }, { status: 400 });
    }
    if (seasonId === undefined || seasonId === null || Number.isNaN(Number(seasonId))) {
      return NextResponse.json({ error: 'seasonId missing or invalid' }, { status: 400 });
    }

    const tenant = (bodyTenant === 'mainnet' || bodyTenant === 'sepolia')
      ? getTenant(bodyTenant as TenantKey)
      : tenantFromRequest(req);
    const names = discourseNames(tenant.key, Number(seasonId));

    if (debug) console.log(`[init-season] initializing season ${seasonId} (tenant=${tenant.key})`);

    const url = process.env.NEXT_PUBLIC_DISCOURSE_URL;
    const apiKey = process.env.DISCOURSE_API_KEY;
    const ssoSecret = process.env.DISCOURSE_SSO_SECRET;
    const ponderUrl = tenant.ponderUrl;

    if (!url || !apiKey || !ssoSecret) {
      return NextResponse.json({ error: "Missing Discourse ENV" }, { status: 500 });
    }

    const headers: Record<string,string> = {
      'Api-Key': apiKey,
      'Api-Username': 'system',
      'Content-Type': 'application/json'
    };

    // Compute mass threshold off-chain.
    // The on-chain `massThresholdBalance()` is stale (per CLAUDE.md) and reverts
    // in some lifecycle states. Mirror the algorithm used by the indexer's
    // Exchange:OrderFilled handler and useBatchPlayerClass: effective
    // balance per player = fimBalance + fimBurned + FIM locked in active sell
    // orders, minus the exchange phantom.
    const sAddr = seasonAddress.toLowerCase();

    const seasonMetaQuery = `
      query GetSeason($season: String!, $after: String, $limit: Int!) {
        seasonss(where: { address: $season }, limit: $limit, after: $after) {
          items { address, exchangeAddress }
          pageInfo { endCursor, hasNextPage }
        }
      }
    `;
    const playersQuery = `
      query GetPlayers($season: String!, $after: String, $limit: Int!) {
        playerSeasonStatss(
          where: { seasonAddress: $season },
          limit: $limit,
          after: $after
        ) {
          items { playerAddress, fimBalance, fimBurned }
          pageInfo { endCursor, hasNextPage }
        }
      }
    `;
    const ordersQuery = `
      query GetOrders($season: String!, $after: String, $limit: Int!) {
        orderss(
          where: { seasonAddress: $season, active: true, isBuy: false },
          limit: $limit,
          after: $after
        ) {
          items { maker, remainingAmount }
          pageInfo { endCursor, hasNextPage }
        }
      }
    `;

    const [seasonMeta, allPlayers, openSellOrders] = await Promise.all([
      fetchAllPonderItems<{ address: string; exchangeAddress: string }>(
        ponderUrl, seasonMetaQuery, { season: sAddr }, (d) => d.seasonss
      ),
      fetchAllPonderItems<{ playerAddress: string; fimBalance: string; fimBurned: string }>(
        ponderUrl, playersQuery, { season: sAddr }, (d) => d.playerSeasonStatss
      ),
      fetchAllPonderItems<{ maker: string; remainingAmount: string }>(
        ponderUrl, ordersQuery, { season: sAddr }, (d) => d.orderss
      ),
    ]);

    // S12: reject an address that isn't a known indexed season.
    if (seasonMeta.length === 0) {
      return NextResponse.json({ error: 'Unknown season' }, { status: 404 });
    }

    const exchangeAddress = seasonMeta[0]?.exchangeAddress?.toLowerCase();

    const effectiveBals = new Map<string, bigint>();
    for (const p of allPlayers) {
      effectiveBals.set(
        p.playerAddress.toLowerCase(),
        BigInt(p.fimBalance) + BigInt(p.fimBurned || "0")
      );
    }
    for (const o of openSellOrders) {
      const maker = o.maker.toLowerCase();
      effectiveBals.set(maker, (effectiveBals.get(maker) ?? 0n) + BigInt(o.remainingAmount));
    }
    if (exchangeAddress) effectiveBals.delete(exchangeAddress);

    const sortedBals = Array.from(effectiveBals.values()).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const totalSupply = sortedBals.reduce((s, v) => s + v, 0n);
    const halfSupply = totalSupply / 2n;
    let accumulated = 0n;
    let threshold = 0n;
    for (const bal of sortedBals) {
      accumulated += bal;
      if (accumulated <= halfSupply) threshold = bal;
      else break;
    }

    if (debug) console.log(`[init-season] threshold (off-chain): ${threshold.toString()}`);

    // Provision only players with a positive effective balance.
    const players = Array.from(effectiveBals.entries())
      .filter(([, bal]) => bal > 0n)
      .map(([playerAddress, bal]) => ({ playerAddress, fimBalance: bal.toString() }));

    if (debug) console.log(`[init-season] found ${players.length} players`);

    // --- Fetch all three group IDs upfront in parallel ---
    const [bourgeoisieGroupRes, proletariatGroupRes, playersGroupRes] = await Promise.all([
      fetch(`${url}/groups/${names.groups.bourgeoisie}.json`, { headers }),
      fetch(`${url}/groups/${names.groups.proletariat}.json`, { headers }),
      fetch(`${url}/groups/${names.groups.players}.json`, { headers }),
    ]);

    if (!bourgeoisieGroupRes.ok || !proletariatGroupRes.ok) {
      return NextResponse.json({ error: 'Faction groups not found — run setup-season first' }, { status: 404 });
    }

    const bourgeoisieGroupId = (await bourgeoisieGroupRes.json()).group.id as number;
    const proletariatGroupId = (await proletariatGroupRes.json()).group.id as number;
    const playersGroupId = playersGroupRes.ok ? (await playersGroupRes.json()).group.id as number : null;

    if (!playersGroupId) console.warn(`[init-season] players group not found — skipping players group assignment`);

    // --- Phase 1: classify all players by faction ---
    const bourgeoisieWallets: string[] = [];
    const proletariatWallets: string[] = [];

    for (const player of players) {
      const wallet = player.playerAddress.toLowerCase();
      if (BigInt(player.fimBalance) > threshold) bourgeoisieWallets.push(wallet);
      else proletariatWallets.push(wallet);
    }

    const allWallets = [...bourgeoisieWallets, ...proletariatWallets];

    // --- Phase 2: existence checks in parallel batches (GETs are cheap rate-limit-wise) ---
    const newWallets: string[] = [];

    for (let i = 0; i < allWallets.length; i += GET_BATCH_SIZE) {
      const batch = allWallets.slice(i, i + GET_BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async wallet => {
          const res = await fetch(`${url}/users/by-external/${wallet}.json`, { headers });
          return { wallet, exists: res.ok };
        })
      );
      for (const { wallet, exists } of results) {
        if (!exists) newWallets.push(wallet);
      }
    }

    if (debug) console.log(`[init-season] ${newWallets.length} new / ${allWallets.length - newWallets.length} existing players`);

    // --- Phase 3: SSO sync only new players — concurrency pool with 429 retry ---
    let syncCount = 0;
    let queueIdx = 0;

    async function ssoWorker() {
      while (true) {
        const idx = queueIdx++;
        if (idx >= newWallets.length) break;
        const ok = await ssoSync(url!, headers, ssoSecret!, newWallets[idx]);
        if (ok) syncCount++;
        else console.warn(`[init-season] skipping ${newWallets[idx]} after failed SSO sync`);
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(SSO_CONCURRENCY, newWallets.length) }, ssoWorker)
    );

    if (debug) console.log(`[init-season] SSO synced ${syncCount}/${newWallets.length} new players`);

    // --- Phase 4: bulk group assignments for ALL players (existing + new) ---
    // PUT is idempotent — already-members are silently skipped by Discourse.
    const bulkPuts: Promise<Response>[] = [];

    if (bourgeoisieWallets.length > 0) {
      bulkPuts.push(fetch(`${url}/groups/${bourgeoisieGroupId}/members.json`, {
        method: 'PUT', headers,
        body: JSON.stringify({ usernames: bourgeoisieWallets.join(',') }),
      }));
    }
    if (proletariatWallets.length > 0) {
      bulkPuts.push(fetch(`${url}/groups/${proletariatGroupId}/members.json`, {
        method: 'PUT', headers,
        body: JSON.stringify({ usernames: proletariatWallets.join(',') }),
      }));
    }
    if (playersGroupId && allWallets.length > 0) {
      bulkPuts.push(fetch(`${url}/groups/${playersGroupId}/members.json`, {
        method: 'PUT', headers,
        body: JSON.stringify({ usernames: allWallets.join(',') }),
      }));
    }

    await Promise.all(bulkPuts);

    if (debug) console.log(`[init-season] done — ${allWallets.length} players assigned to groups, ${syncCount} newly created`);

    return NextResponse.json({ success: true, total: allWallets.length, created: syncCount });

  } catch (error) {
    console.error("Init Crash:", error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}