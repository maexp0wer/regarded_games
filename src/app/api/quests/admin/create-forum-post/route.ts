import { NextResponse } from 'next/server';
import { isValidAdminToken } from '@/lib/adminAuth';
import { query } from '@/lib/db';
import { loadForumPost } from '@/lib/quests';

/**
 * Turn a content/discourse/<slug>.md file into a Discourse topic everyone can see.
 *
 * Mirrors create-manifest-vote: admin-token gated, posts as `system` so it doesn't
 * depend on any wallet user, resolves the target category by slug (creating it if
 * missing), and records the resulting post id in quest_config keyed by slug so a
 * second run doesn't create a duplicate.
 *
 * Body (JSON, all optional):
 *   { "slug": "welcome" }   // which .md file to publish; defaults to "welcome"
 *   { "force": true }       // publish even if a post for this slug already exists
 */
export async function POST(req: Request) {
  if (!isValidAdminToken(req.headers.get('x-quests-admin-token'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_DISCOURSE_URL;
  const apiKey = process.env.DISCOURSE_API_KEY;
  if (!url || !apiKey) {
    return NextResponse.json({ error: 'Discourse not configured' }, { status: 500 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const slug = String(body?.slug ?? 'welcome').replace(/[^a-z0-9-]/gi, '');
    if (!slug) {
      return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
    }
    const configKey = `forum_post_id:${slug}`;

    // Idempotency: skip if we already published this slug, unless force=true.
    if (!body?.force) {
      const existing = await query(`SELECT value FROM quest_config WHERE key = $1`, [configKey]);
      if (existing.rows.length > 0) {
        return NextResponse.json({
          success: true,
          alreadyExists: true,
          postId: existing.rows[0].value,
          hint: 'Pass { "force": true } to publish a new copy.',
        });
      }
    }

    const post = loadForumPost(slug);

    const discourseHeaders = {
      'Api-Key': apiKey,
      'Api-Username': 'system',
      'Content-Type': 'application/json',
    };

    // Resolve the target category ID by slug via /site.json; create it if missing.
    const siteRes = await fetch(`${url}/site.json`, { headers: discourseHeaders });
    if (!siteRes.ok) {
      return NextResponse.json({ error: `Failed to read site.json (${siteRes.status})` }, { status: siteRes.status });
    }
    const siteData = await siteRes.json();
    let categoryId = ((siteData?.categories ?? []) as Array<{ slug: string; id: number }>)
      .find((c) => c.slug === post.categorySlug)?.id;

    if (!categoryId) {
      // Derive a display name from the slug (e.g. "welcome" -> "Welcome").
      const name = post.categorySlug.charAt(0).toUpperCase() + post.categorySlug.slice(1);
      const createCatRes = await fetch(`${url}/categories.json`, {
        method: 'POST',
        headers: discourseHeaders,
        body: JSON.stringify({ name, color: '0088CC', text_color: 'FFFFFF' }),
      });
      if (!createCatRes.ok) {
        const errText = await createCatRes.text();
        return NextResponse.json({ error: `Failed to create ${name} category: ${errText}` }, { status: createCatRes.status });
      }
      categoryId = (await createCatRes.json())?.category?.id;
      if (!categoryId) {
        return NextResponse.json({ error: 'Discourse did not return a category ID after creation' }, { status: 500 });
      }
    }

    // Create the topic as 'system' so it doesn't depend on any particular wallet user.
    const createRes = await fetch(`${url}/posts.json`, {
      method: 'POST',
      headers: discourseHeaders,
      body: JSON.stringify({ title: post.title, raw: post.body, category: categoryId }),
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

    // Optionally pin the topic so it stays at the top of the category / homepage.
    if (post.pinned) {
      const pinRes = await fetch(`${url}/t/${topicId}/status`, {
        method: 'PUT',
        headers: discourseHeaders,
        body: JSON.stringify({ status: 'pinned', enabled: 'true' }),
      });
      if (!pinRes.ok) {
        // Non-fatal: the post exists, pinning is a nicety.
        console.warn(`create-forum-post: pin failed for topic ${topicId} (${pinRes.status})`);
      }
    }

    // Record the post id keyed by slug so re-runs are idempotent.
    await query(
      `INSERT INTO quest_config (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [configKey, String(postId)],
    );

    return NextResponse.json({ success: true, slug, topicId, postId, pinned: post.pinned });
  } catch (err) {
    console.error('POST /api/quests/admin/create-forum-post error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
