import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { foundry, base, baseSepolia } from 'viem/chains';
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';
import crypto from 'crypto';
import { fetchAllPonderItems } from '@/lib/ponder';
import { tenantFromRequest } from '@/lib/tenant.server';
import { getTenant, type TenantKey } from '@/config/tenants';

const viemChainFor = (chainId: number) => {
  switch (chainId) {
    case 8453: return base;
    case 84532: return baseSepolia;
    case 31337:
    default: return foundry;
  }
};

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

    const publicClient = createPublicClient({
      chain: viemChainFor(tenant.activeChainId),
      transport: tenant.rpcUrl ? http(tenant.rpcUrl) : http()
    });

    const threshold = BigInt(await publicClient.readContract({
      address: seasonAddress as `0x${string}`,
      abi: GameSeasonAbi,
      functionName: 'massThresholdBalance'
    }) as bigint);

    console.log(`Threshold: ${threshold.toString()}`);

    // Query Ponder (all pages)
    const playersQuery = `
      query GetPlayers($season: String!, $after: String, $limit: Int!) {
        playerSeasonStatss(
          where: { seasonAddress: $season, fimBalance_gt: "0" },
          limit: $limit,
          after: $after
        ) {
          items { playerAddress, fimBalance }
          pageInfo { endCursor, hasNextPage }
        }
      }
    `;

    const players = await fetchAllPonderItems<{ playerAddress: string; fimBalance: string }>(
      ponderUrl,
      playersQuery,
      { season: seasonAddress.toLowerCase() },
      (d) => d.playerSeasonStatss
    );

    console.log(`Found ${players.length} players`);

    // Fetch S{seasonId}_Players group ID once before the loop
    const playersGroupName = `S${seasonId}_Players`;
    const playersGroupRes = await fetch(`${url}/groups/${playersGroupName}.json`, { headers });
    const playersGroupId = playersGroupRes.ok ? (await playersGroupRes.json()).group.id : null;
    if (!playersGroupId) console.log(`Warning: group ${playersGroupName} not found — players will not be added to it`);

    let successCount = 0;

    //Provision Players
    for (const player of players) {

      const wallet = player.playerAddress.toLowerCase();
      const isCapitalist = BigInt(player.fimBalance) > threshold;
      const targetGroupName = isCapitalist
        ? `S${seasonId}_Bourgeoisie`
        : `S${seasonId}_Proletariat`;

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