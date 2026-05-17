import { NextResponse } from "next/server";
import crypto from "crypto";

// OPTIMIZATION 2: In-memory cache for Group IDs.
// This prevents fetching the Group ID on every single player creation.
const groupIdCache: Record<string, number> = {};

export async function POST(req: Request) {
  try {
    const { walletAddress, seasonId } = await req.json();

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
    const groupName = `S${seasonId + 1}_Players`;

    // ---- 1. Prepare SSO Payload ----
    const params = new URLSearchParams({
      external_id: wallet,
      email: `${wallet}@regarded.local`,
      username,
      name: `Player ${wallet.slice(2, 8)}`
    });

    const payload = Buffer.from(params.toString()).toString("base64");
    const sig = crypto.createHmac("sha256", ssoSecret).update(payload).digest("hex");

    // OPTIMIZATION 3: Start the SSO sync immediately but don't await it yet
    const syncPromise = fetch(`${url}/admin/users/sync_sso`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ sso: payload, sig }).toString(),
    });

    // ---- 2. Fetch Group ID (Using Cache) ----
    let groupId = groupIdCache[groupName];
    
    if (!groupId) {
      const groupRes = await fetch(`${url}/groups/${groupName}.json`, { headers });
      if (!groupRes.ok) {
        return NextResponse.json({ error: `Group ${groupName} not found` }, { status: 404 });
      }
      groupId = (await groupRes.json()).group.id;
      groupIdCache[groupName] = groupId; // Save to cache for next time
    }

    // Now we wait for the user creation to finish
    const syncRes = await syncPromise;
    if (!syncRes.ok) {
        return NextResponse.json({ error: "SSO User sync failed" }, { status: 500 });
    }

    // ---- 3. Add User to Group using Username ----
    // OPTIMIZATION 1: By using PUT /groups/{id}/members.json, 
    // we can pass the username directly and skip the User ID lookup entirely!
    const addRes = await fetch(`${url}/groups/${groupId}/members.json`, {
      method: "PUT", // Note: This endpoint requires PUT
      headers,
      body: JSON.stringify({ usernames: username }),
    });

    if (!addRes.ok) {
        return NextResponse.json({ error: "Failed to add user to group" }, { status: 500 });
    }

    console.log(`Player ${wallet} added to ${groupName}`);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Create player crash:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}