import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { loadManifestVote } from '@/lib/quests';

export async function POST(req: Request) {
  const adminToken = req.headers.get('x-quests-admin-token');
  if (!adminToken || adminToken !== process.env.DISCOURSE_INIT_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_DISCOURSE_URL;
  const apiKey = process.env.DISCOURSE_API_KEY;
  if (!url || !apiKey) {
    return NextResponse.json({ error: 'Discourse not configured' }, { status: 500 });
  }

  try {
    // If the caller supplies an existing post_id, just register it without creating a new post.
    const body = await req.json().catch(() => ({}));
    if (body?.existingPostId) {
      const manifest = loadManifestVote();
      const existingPostId = String(body.existingPostId);
      const pollName = body.pollName ?? manifest.pollName;
      await query(
        `INSERT INTO quest_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        ['manifest_post_id', existingPostId],
      );
      await query(
        `INSERT INTO quest_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        ['manifest_poll_name', pollName],
      );
      return NextResponse.json({ success: true, registered: true, postId: existingPostId, pollName });
    }

    const manifest = loadManifestVote();

    const discourseHeaders = {
      'Api-Key': apiKey,
      'Api-Username': 'system',
      'Content-Type': 'application/json',
    };

    // Resolve the target category ID by slug via /site.json.
    // If missing, create it automatically.
    const siteRes = await fetch(`${url}/site.json`, { headers: discourseHeaders });
    if (!siteRes.ok) {
      return NextResponse.json({ error: `Failed to read site.json (${siteRes.status})` }, { status: siteRes.status });
    }
    const siteData = await siteRes.json();
    let categoryId = (siteData?.categories as any[] ?? [])
      .find((c: any) => c.slug === manifest.categorySlug)?.id;

    if (!categoryId) {
      const createCatRes = await fetch(`${url}/categories.json`, {
        method: 'POST',
        headers: discourseHeaders,
        body: JSON.stringify({ name: 'Governance', color: 'CC4713', text_color: 'FFFFFF' }),
      });
      if (!createCatRes.ok) {
        const errText = await createCatRes.text();
        return NextResponse.json({ error: `Failed to create Governance category: ${errText}` }, { status: createCatRes.status });
      }
      categoryId = (await createCatRes.json())?.category?.id;
      if (!categoryId) {
        return NextResponse.json({ error: 'Discourse did not return a category ID after creation' }, { status: 500 });
      }
    }

    // Ensure the body contains a [poll] block. If not, append one using frontmatter fields.
    let raw = manifest.body;
    if (!/\[poll[\s\S]*?\[\/poll\]/i.test(raw)) {
      raw += `\n\n[poll name=${manifest.pollName} type=${manifest.pollType} results=${manifest.pollResults} public=true${manifest.closesAt ? ` close=${manifest.closesAt}` : ''}]\n- Ratify the Manifest as written\n- Reject — open a second draft round\n- Abstain\n[/poll]\n`;
    }

    // Create the topic as 'system' so it doesn't depend on any particular wallet user.
    const createRes = await fetch(`${url}/posts.json`, {
      method: 'POST',
      headers: discourseHeaders,
      body: JSON.stringify({ title: manifest.title, raw, category: categoryId }),
    });
    const createText = await createRes.text();
    if (!createRes.ok) {
      return NextResponse.json({ error: createText }, { status: createRes.status });
    }
    const created = JSON.parse(createText);
    const topicId = created?.topic_id;
    const postId = created?.id;
    if (!topicId || !postId) {
      return NextResponse.json({ error: 'Discourse response missing topic_id/id' }, { status: 500 });
    }

    // Persist topic + post IDs and poll name so /api/quests can query voters later.
    await query(
      `INSERT INTO quest_config (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      ['manifest_topic_id', String(topicId)],
    );
    await query(
      `INSERT INTO quest_config (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      ['manifest_post_id', String(postId)],
    );
    await query(
      `INSERT INTO quest_config (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      ['manifest_poll_name', manifest.pollName],
    );

    return NextResponse.json({ success: true, topicId, postId, pollName: manifest.pollName });
  } catch (err: any) {
    console.error('POST /api/quests/admin/create-manifest-vote error:', err?.message ?? err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
