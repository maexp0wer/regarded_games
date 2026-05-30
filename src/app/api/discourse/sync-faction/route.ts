import { NextResponse } from 'next/server';
import { createPublicClient, http, erc20Abi, isAddress } from 'viem';
import { foundry, base, baseSepolia } from 'viem/chains';
import { fetchAllPonderItems } from '@/lib/ponder';
import { tenantFromRequest } from '@/lib/tenant.server';
import { getTenant, type TenantKey } from '@/config/tenants';
import { discourseNames } from '@/lib/discourseNames';

// --- IN-MEMORY CACHES ---
const groupIdCache: Record<string, number> = {};
const userFactionCache: Record<string, string> = {};

interface ThresholdCacheEntry { threshold: bigint; expiresAt: number; }
const thresholdCache: Record<string, ThresholdCacheEntry> = {};
const THRESHOLD_TTL_MS = 30_000;
const debug = process.env.DEBUG === 'true';

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
    const { addresses, walletAddress, seasonAddress, fimAddress, seasonSlug, tenant: bodyTenant } = body;
    const walletsToProcess: string[] = addresses || (walletAddress ? [walletAddress] : []);

    if (!fimAddress || !isAddress(fimAddress, { strict: false })) {
      return NextResponse.json({ error: 'fimAddress missing or invalid' }, { status: 400 });
    }
    if (!seasonAddress || !isAddress(seasonAddress, { strict: false })) {
      return NextResponse.json({ error: 'seasonAddress missing or invalid' }, { status: 400 });
    }
    if (walletsToProcess.length === 0) {
      return NextResponse.json({ success: true });
    }

    const tenant = (bodyTenant === 'mainnet' || bodyTenant === 'sepolia')
      ? getTenant(bodyTenant as TenantKey)
      : tenantFromRequest(req);

    const url = process.env.NEXT_PUBLIC_DISCOURSE_URL!;
    const apiKey = process.env.DISCOURSE_API_KEY!;

    if (!url || !apiKey) return NextResponse.json({ error: "Env missing" }, { status: 500 });

    const headers: Record<string, string> = {
      'Api-Key': apiKey,
      'Api-Username': 'system',
      'Content-Type': 'application/json'
    };

    const publicClient = createPublicClient({
      chain: viemChainFor(tenant.activeChainId),
      transport: tenant.rpcUrl ? http(tenant.rpcUrl) : http()
    });

    const sAddr = seasonAddress.toLowerCase();

    // --- THRESHOLD: SERVE FROM CACHE OR COMPUTE VIA PONDER ---
    let threshold: bigint;
    const cachedEntry = thresholdCache[sAddr];
    if (cachedEntry && Date.now() < cachedEntry.expiresAt) {
      threshold = cachedEntry.threshold;
      if (debug) console.log(`[sync-faction] threshold cache hit: ${threshold.toString()}`);
    } else {
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
          tenant.ponderUrl, seasonMetaQuery, { season: sAddr }, (d) => d.seasonss
        ),
        fetchAllPonderItems<{ playerAddress: string; fimBalance: string; fimBurned: string }>(
          tenant.ponderUrl, playersQuery, { season: sAddr }, (d) => d.playerSeasonStatss
        ),
        fetchAllPonderItems<{ maker: string; remainingAmount: string }>(
          tenant.ponderUrl, ordersQuery, { season: sAddr }, (d) => d.orderss
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
      threshold = 0n;
      for (const bal of sortedBals) {
        accumulated += bal;
        if (accumulated <= halfSupply) threshold = bal;
        else break;
      }

      thresholdCache[sAddr] = { threshold, expiresAt: Date.now() + THRESHOLD_TTL_MS };
      if (debug) console.log(`[sync-faction] live threshold (off-chain): ${threshold.toString()}`);
    }

    async function getGroupId(name: string): Promise<number | null> {
      if (groupIdCache[name]) return groupIdCache[name];
      const res = await fetch(`${url}/groups/${name}.json`, { headers });
      if (!res.ok) return null;
      const data = await res.json();
      groupIdCache[name] = data.group.id;
      return data.group.id;
    }

    // --- BATCH ALL balanceOf READS IN PARALLEL ---
    const lowerWallets = walletsToProcess.map(w => w.toLowerCase());
    const balances = await Promise.all(
      lowerWallets.map(w =>
        publicClient.readContract({
          address: fimAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [w as `0x${string}`]
        })
      )
    );

    const seasonIdMatch = seasonSlug?.match(/\d+/)?.[0] || "1";
    const seasonNum = Number(seasonIdMatch);
    const names = discourseNames(tenant.key, seasonNum);

    for (let i = 0; i < lowerWallets.length; i++) {
      const lowerWallet = lowerWallets[i];
      const username = lowerWallet;

      const bal = BigInt(balances[i] as bigint);
      const isCap = bal > threshold;

      const targetGroupName = isCap ? names.groups.bourgeoisie : names.groups.proletariat;
      const oldGroupName = isCap ? names.groups.proletariat : names.groups.bourgeoisie;

      if (userFactionCache[username] === targetGroupName) {
        if (debug) console.log(`[sync-faction] cache hit: ${username} is already ${targetGroupName}. Skipping API.`);
        continue;
      }

      if (debug) console.log(`[sync-faction] switching wallet: ${lowerWallet}`);
      if (debug) console.log(`[sync-faction] on-chain: bal=${bal}, threshold=${threshold} -> target=${targetGroupName}`);

      const [targetGroupId, oldGroupId] = await Promise.all([
        getGroupId(targetGroupName),
        getGroupId(oldGroupName),
      ]);

      if (!targetGroupId || !oldGroupId) continue;

      const [targetMemberRes, oldMemberRes] = await Promise.all([
        fetch(`${url}/groups/${targetGroupName}/members.json?filter=${username}&limit=1`, { headers }),
        fetch(`${url}/groups/${oldGroupName}/members.json?filter=${username}&limit=1`, { headers }),
      ]);

      const alreadyInTarget = targetMemberRes.ok && ((await targetMemberRes.json()).members?.length ?? 0) > 0;
      const stillInOld = oldMemberRes.ok && ((await oldMemberRes.json()).members?.length ?? 0) > 0;

      let addOk = alreadyInTarget;
      if (!alreadyInTarget) {
        const addRes = await fetch(`${url}/groups/${targetGroupId}/members.json`, {
          method: "PUT", headers, body: JSON.stringify({ usernames: username })
        });
        addOk = addRes.ok;
      }

      if (stillInOld) {
        await fetch(`${url}/groups/${oldGroupId}/members.json`, {
          method: "DELETE", headers, body: JSON.stringify({ usernames: username })
        });
      }

      if (addOk) {
        userFactionCache[username] = targetGroupName;
        if (debug) console.log(`[sync-faction] ${username} -> ${targetGroupName} (skippedAdd=${alreadyInTarget}, skippedRemove=${!stillInOld})`);
      }
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("BATCH SYNC CRASH:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
