import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const adminToken = req.headers.get('x-discourse-admin-token');
  if (!adminToken || adminToken !== process.env.DISCOURSE_INIT_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { seasonNum } = await req.json(); // 1-indexed

    const url = process.env.NEXT_PUBLIC_DISCOURSE_URL!;
    const apiKey = process.env.DISCOURSE_API_KEY!;
    if (!url || !apiKey) return NextResponse.json({ error: 'Env missing' }, { status: 500 });

    const headers: Record<string, string> = {
      'Api-Key': apiKey,
      'Api-Username': 'system',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const safeJson = (s: string) => { try { return JSON.parse(s); } catch { return null; } };

    console.log(`\n===== DISCOURSE SETUP: SEASON ${seasonNum} =====`);

    // ── 1. Ensure Groups (idempotent) ──────────────────────────────────
    async function ensureGroup(name: string): Promise<void> {
      const check = await fetch(`${url}/groups/${name}.json`, { headers });
      if (check.ok) { console.log(`Group exists: ${name}`); return; }
      const res = await fetch(`${url}/admin/groups`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ group: { name, visibility_level: 1, members_visibility_level: 2 } })
      });
      const body = await res.text();
      console.log(`Created group: ${name} (${res.status}) ${body.slice(0, 200)}`);
    }

    await ensureGroup(`S${seasonNum}_Players`);
    await ensureGroup(`S${seasonNum}_Bourgeoisie`);
    await ensureGroup(`S${seasonNum}_Proletariat`);

    // ── 2. Create Parent Category (restricted to S{N}_Players) ─────────
    const parentRes = await fetch(`${url}/categories.json`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: `Season ${seasonNum}`,
        slug: `season-${seasonNum}`,
        color: 'CC4713',
        text_color: 'FFFFFF',
        permissions: {
          [`S${seasonNum}_Players`]: 1,
          [`S${seasonNum}_Bourgeoisie`]: 1,
          [`S${seasonNum}_Proletariat`]: 1
        }
      })
    });
    const parentBody = await parentRes.text();
    const parentId = safeJson(parentBody)?.category?.id;
    console.log(`Parent category: season-${seasonNum} (id=${parentId}, status=${parentRes.status}) ${parentBody.slice(0, 200)}`);

    // ── 3. Faction Subcategories ────────────────────────────────────────
    const capRes = await fetch(`${url}/categories.json`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: `S${seasonNum} Bourgeoisie Strategy`,
        slug: `s${seasonNum}-bourgeoisie-strategy`,
        parent_category_id: parentId,
        color: '0088CC',
        text_color: 'FFFFFF',
        permissions: { [`S${seasonNum}_Bourgeoisie`]: 1 }
      })
    });
    const capBody = await capRes.text();
    const capCategoryId = safeJson(capBody)?.category?.id;
    console.log(`Bourgeoisie category id=${capCategoryId} (${capRes.status}) ${capBody.slice(0, 200)}`);

    const socRes = await fetch(`${url}/categories.json`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: `S${seasonNum} Proletariat Strategy`,
        slug: `s${seasonNum}-proletariat-strategy`,
        parent_category_id: parentId,
        color: 'FA6C8A',
        text_color: 'FFFFFF',
        permissions: { [`S${seasonNum}_Proletariat`]: 1 }
      })
    });
    const socBody = await socRes.text();
    const socCategoryId = safeJson(socBody)?.category?.id;
    console.log(`Proletariat category id=${socCategoryId} (${socRes.status}) ${socBody.slice(0, 200)}`);

    // ── 4. Chat Channels (linked to faction subcategories) ──────────────
    if (capCategoryId) {
      const capChanRes = await fetch(`${url}/chat/api/channels`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          channel: {
            chatable_type: 'Category',
            chatable_id: capCategoryId,
            name: `S${seasonNum}_Bourgeoisie`,
            description: `Season ${seasonNum} Bourgeoisie faction chat`,
            auto_join_users: true
          }
        })
      });
      console.log(`Bourgeoisie channel (${capChanRes.status}) ${await capChanRes.text()}`);
    }
    if (socCategoryId) {
      const socChanRes = await fetch(`${url}/chat/api/channels`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          channel: {
            chatable_type: 'Category',
            chatable_id: socCategoryId,
            name: `S${seasonNum}_Proletariat`,
            description: `Season ${seasonNum} Proletariat faction chat`,
            auto_join_users: true
          }
        })
      });
      console.log(`Proletariat channel (${socChanRes.status}) ${await socChanRes.text()}`);
    }

    console.log(`===== SETUP COMPLETE: SEASON ${seasonNum} =====`);
    return NextResponse.json({ success: true, seasonNum });

  } catch (error: any) {
    console.error('Setup crash:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
