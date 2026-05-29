import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { fetchAllPonderItems } from '@/lib/ponder';
import { tenantFromRequest } from '@/lib/tenant.server';
import { getTenant, type TenantKey } from '@/config/tenants';
import { discourseNames } from '@/lib/discourseNames';

export async function POST(req: Request) {
  const adminToken = req.headers.get('x-discourse-admin-token');
  if (!adminToken || adminToken !== process.env.DISCOURSE_INIT_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { seasonAddress, seasonId, tenant: bodyTenant } = body;

    const tenant = (bodyTenant === 'mainnet' || bodyTenant === 'sepolia')
      ? getTenant(bodyTenant as TenantKey)
      : tenantFromRequest(req);
    const names = discourseNames(tenant.key, Number(seasonId));

    console.log(`\n========================================`);
    console.log(`INITIALIZING DISCOURSE FOR SEASON ${seasonId} (tenant=${tenant.key})`);

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
    // Exchange:OrderFilled handler and useBatchPlayerPercentiles: effective
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

    console.log(`Threshold (off-chain): ${threshold.toString()}`);

    // Provision only players with a positive effective balance.
    const players = Array.from(effectiveBals.entries())
      .filter(([, bal]) => bal > 0n)
      .map(([playerAddress, bal]) => ({ playerAddress, fimBalance: bal.toString() }));

    console.log(`Found ${players.length} players`);

    // Fetch S{seasonId}_Players group ID once before the loop
    const playersGroupName = names.groups.players;
    const playersGroupRes = await fetch(`${url}/groups/${playersGroupName}.json`, { headers });
    const playersGroupId = playersGroupRes.ok ? (await playersGroupRes.json()).group.id : null;
    if (!playersGroupId) console.log(`Warning: group ${playersGroupName} not found — players will not be added to it`);

    let successCount = 0;

    //Provision Players
    for (const player of players) {

      const wallet = player.playerAddress.toLowerCase();
      const isCapitalist = BigInt(player.fimBalance) > threshold;
      const targetGroupName = isCapitalist
        ? names.groups.bourgeoisie
        : names.groups.proletariat;

      console.log(`Processing ${wallet}`);

      // --- A. Create/Sync User via SSO ---
      const ssoParams = new URLSearchParams({
        external_id: wallet,
        email: `${wallet}@regarded.local`,
        username: wallet,
        name: `Player ${wallet.slice(2, 8)}`
      });

      const payloadBase64 = Buffer.from(ssoParams.toString(), 'utf8').toString('base64');

      const sig = crypto
        .createHmac('sha256', ssoSecret)
        .update(payloadBase64)
        .digest('hex');

      await fetch(`${url}/admin/users/sync_sso`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          sso: payloadBase64,
          sig
        }).toString()
      });

      // --- B. Fetch User ---
      const userRes = await fetch(
        `${url}/users/by-external/${wallet}.json`,
        { headers }
      );

      if (!userRes.ok) {
        console.log(`User lookup failed: ${wallet}`);
        continue;
      }

      const user = (await userRes.json()).user;

      // --- C. Fetch Group ---
      const groupRes = await fetch(
        `${url}/groups/${targetGroupName}.json`,
        { headers }
      );

      if (!groupRes.ok) {
        console.log(`Group not found: ${targetGroupName}`);
        continue;
      }

      const groupId = (await groupRes.json()).group.id;

      // --- D. Add User To Group (ADMIN ENDPOINT like working route) ---
      const addRes = await fetch(`${url}/admin/users/${user.id}/groups`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          group_id: groupId
        })
      });

      if (addRes.ok) {
        successCount++;
        console.log(`${wallet} -> ${targetGroupName}`);
      } else {
        console.log(`Failed assigning ${wallet}`);
      }

      // --- E. Also Add to S{seasonId}_Players ---
      if (playersGroupId) {
        await fetch(`${url}/admin/users/${user.id}/groups`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ group_id: playersGroupId })
        });
      }
    }

    console.log(`Provisioned ${successCount}/${players.length} users`);

    return NextResponse.json({
      success: true,
      provisioned: successCount
    });

  } catch (error: any) {

    console.error("Init Crash:", error);

    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}