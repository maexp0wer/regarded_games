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

    // ── 2. Ensure Categories (idempotent via /site.json slug lookup) ───
    async function ensureCategory(slug: string, payload: object): Promise<number | null> {
      const siteRes = await fetch(`${url}/site.json`, { headers });
      const siteData = safeJson(await siteRes.text());
      const existing = (siteData?.categories as any[] || []).find((c: any) => c.slug === slug);
      if (existing) { console.log(`Category exists: ${slug} (id=${existing.id})`); return existing.id; }
      const res = await fetch(`${url}/categories.json`, { method: 'POST', headers, body: JSON.stringify(payload) });
      const body = await res.text();
      const id = safeJson(body)?.category?.id ?? null;
      console.log(`Created category: ${slug} (id=${id}, status=${res.status}) ${body.slice(0, 200)}`);
      return id;
    }

    const parentId = await ensureCategory(`season-${seasonNum}`, {
      name: `Season ${seasonNum}`,
      slug: `season-${seasonNum}`,
      color: 'CC4713',
      text_color: 'FFFFFF',
      permissions: {
        [`S${seasonNum}_Players`]: 1,
        [`S${seasonNum}_Bourgeoisie`]: 1,
        [`S${seasonNum}_Proletariat`]: 1
      }
    });

    const capCategoryId = await ensureCategory(`s${seasonNum}-bourgeoisie-strategy`, {
      name: `S${seasonNum} Bourgeoisie Strategy`,
      slug: `s${seasonNum}-bourgeoisie-strategy`,
      parent_category_id: parentId,
      color: '0088CC',
      text_color: 'FFFFFF',
      permissions: { [`S${seasonNum}_Bourgeoisie`]: 1 }
    });

    const socCategoryId = await ensureCategory(`s${seasonNum}-proletariat-strategy`, {
      name: `S${seasonNum} Proletariat Strategy`,
      slug: `s${seasonNum}-proletariat-strategy`,
      parent_category_id: parentId,
      color: 'FA6C8A',
      text_color: 'FFFFFF',
      permissions: { [`S${seasonNum}_Proletariat`]: 1 }
    });

    // ── 3. Ensure Chat Channels (idempotent via name lookup) ────────────
    async function ensureChannel(name: string, payload: object): Promise<void> {
      const listRes = await fetch(`${url}/chat/api/channels`, { headers });
      const listData = safeJson(await listRes.text());
      const existing = (listData?.channels as any[] || []).find(
        (c: any) => (c.title || '').toLowerCase() === name.toLowerCase()
      );
      if (existing) { console.log(`Channel exists: ${name} (id=${existing.id})`); return; }
      const res = await fetch(`${url}/chat/api/channels`, { method: 'POST', headers, body: JSON.stringify(payload) });
      const body = await res.text();
      console.log(`Created channel: ${name} (${res.status}) ${body.slice(0, 200)}`);
    }

    if (parentId) {
      await ensureChannel(`S${seasonNum}_General`, {
        channel: {
          chatable_type: 'Category',
          chatable_id: parentId,
          name: `S${seasonNum}_General`,
          description: `Season ${seasonNum} general chat for all players`,
          auto_join_users: true
        }
      });
    }
    if (capCategoryId) {
      await ensureChannel(`S${seasonNum}_Bourgeoisie`, {
        channel: {
          chatable_type: 'Category',
          chatable_id: capCategoryId,
          name: `S${seasonNum}_Bourgeoisie`,
          description: `Season ${seasonNum} Bourgeoisie faction chat`,
          auto_join_users: true
        }
      });
    }
    if (socCategoryId) {
      await ensureChannel(`S${seasonNum}_Proletariat`, {
        channel: {
          chatable_type: 'Category',
          chatable_id: socCategoryId,
          name: `S${seasonNum}_Proletariat`,
          description: `Season ${seasonNum} Proletariat faction chat`,
          auto_join_users: true
        }
      });
    }

    console.log(`===== SETUP COMPLETE: SEASON ${seasonNum} =====`);
    return NextResponse.json({ success: true, seasonNum });

  } catch (error: any) {
    console.error('Setup crash:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
