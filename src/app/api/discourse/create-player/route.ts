import { NextResponse } from "next/server";
import { tenantFromRequest } from "@/lib/tenant.server";
import { getTenant, type TenantKey } from "@/config/tenants";
import { discourseNames } from "@/lib/discourseNames";
import { ssoSync } from "@/lib/discourseSSO";

const groupIdCache: Record<string, number> = {};
// Tracks wallets already registered + group-added this server lifecycle.
// Cache key: `${wallet}:${groupName}`. Mirrors the userFactionCache pattern in sync-faction.
const registeredPlayersCache = new Set<string>();
const debug = process.env.APP_DEBUG === 'true';

export async function POST(req: Request) {
  try {
    const { walletAddress, seasonId, tenant: bodyTenant } = await req.json();

    const tenant = (bodyTenant === 'mainnet' || bodyTenant === 'sepolia')
      ? getTenant(bodyTenant as TenantKey)
      : tenantFromRequest(req);
    const seasonNum = seasonId + 1;
    const names = discourseNames(tenant.key, seasonNum);

    const url = process.env.NEXT_PUBLIC_DISCOURSE_URL!;
    const apiKey = process.env.DISCOURSE_API_KEY!;
    const ssoSecret = process.env.DISCOURSE_SSO_SECRET!;

    const headers: Record<string, string> = {
      "Api-Key": apiKey,
      "Api-Username": "system",
      "Content-Type": "application/json",
    };

    const wallet = walletAddress.toLowerCase();
    const username = wallet;
    const groupName = names.groups.players;

    // Tier 1: skip all Discourse calls if we already registered this wallet this session.
    const cacheKey = `${wallet}:${groupName}`;
    if (registeredPlayersCache.has(cacheKey)) {
      return NextResponse.json({ success: true });
    }

    // ---- 1. Fetch Group ID (Using Cache) ----
    let groupId = groupIdCache[groupName];

    if (!groupId) {
      const groupRes = await fetch(`${url}/groups/${groupName}.json`, { headers });
      if (!groupRes.ok) {
        console.warn(`[create-player] Group ${groupName} not found at Discourse (seasonId=${seasonId}, wallet=${wallet}, status=${groupRes.status}). Was setup-season run for seasonNum=${seasonId + 1}?`);
        return NextResponse.json({ error: `Group ${groupName} not found`, seasonId, groupName }, { status: 404 });
      }
      groupId = (await groupRes.json()).group.id;
      groupIdCache[groupName] = groupId;
    }

    // Tier 2a: check user existence before SSO sync to skip the POST for returning players.
    const existsRes = await fetch(`${url}/users/by-external/${wallet}.json`, { headers });
    const userExists = existsRes.ok;

    if (!userExists) {
      // ---- 2. SSO sync — only for new players ----
      // Short backoff: user-facing call, 500ms → 1s → 2s (max ~3.5s wait)
      const ok = await ssoSync(url, headers, ssoSecret, wallet, { maxRetries: 3, baseBackoffMs: 500 });
      if (!ok) {
        return NextResponse.json({ error: "SSO User sync failed" }, { status: 500 });
      }
    }

    // Tier 2b: check group membership before adding to skip the PUT for existing members.
    const memberRes = await fetch(`${url}/groups/${groupName}/members.json?filter=${username}&limit=1`, { headers });
    const alreadyMember = memberRes.ok && ((await memberRes.json()).members?.length ?? 0) > 0;

    if (!alreadyMember) {
      // ---- 3. Add User to Group ----
      const addRes = await fetch(`${url}/groups/${groupId}/members.json`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ usernames: username }),
      });
      if (!addRes.ok) {
        return NextResponse.json({ error: "Failed to add user to group" }, { status: 500 });
      }
    }

    registeredPlayersCache.add(cacheKey);
    if (debug) console.log(`[create-player] ${wallet} -> ${groupName} (userExists=${userExists}, alreadyMember=${alreadyMember})`);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Create player crash:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}