import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/quests/admin/debug-vote?address=0x...
// Dumps every step the vote-detection logic does so you can see which piece is wrong.
export async function GET(req: Request) {
  const adminToken = req.headers.get('x-quests-admin-token');
  if (!adminToken || adminToken !== process.env.DISCOURSE_INIT_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_DISCOURSE_URL;
  const apiKey = process.env.DISCOURSE_API_KEY;
  if (!url || !apiKey) {
    return NextResponse.json({ error: 'Discourse not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const addr = (searchParams.get('address') ?? '').toLowerCase();
  if (!addr) return NextResponse.json({ error: 'address required' }, { status: 400 });

  const headers = { 'Api-Key': apiKey, 'Api-Username': 'system' };

  // 1) What's stored in quest_config?
  const { rows } = await query<{ key: string; value: string }>(
    `SELECT key, value FROM quest_config ORDER BY key`,
  );
  const cfg: Record<string, string> = {};
  for (const r of rows) cfg[r.key] = r.value;

  const postId = cfg.manifest_post_id;
  const pollName = cfg.manifest_poll_name;

  // 2) Resolve Discourse user id for this wallet
  let discourseUser: { id: number; username: string; name: string } | null = null;
  let userLookupError: string | null = null;
  try {
    const r = await fetch(`${url}/u/by-external/${addr}.json`, { headers });
    if (!r.ok) userLookupError = `HTTP ${r.status} ${r.statusText}`;
    else discourseUser = (await r.json())?.user ?? null;
  } catch (e: unknown) {
    userLookupError = e instanceof Error ? e.message : String(e);
  }

  // 3) Fetch the post itself so we can see what poll(s) it actually has
  let postPolls: unknown = null;
  let postError: string | null = null;
  if (postId) {
    try {
      const r = await fetch(`${url}/posts/${postId}.json`, { headers });
      if (!r.ok) postError = `HTTP ${r.status} ${r.statusText}`;
      else {
        const post = await r.json();
        postPolls = post?.polls ?? null;
      }
    } catch (e: unknown) {
      postError = e instanceof Error ? e.message : String(e);
    }
  }

  // 4) Pull voters.json page 1 raw so we see the actual shape
  let votersPage1: Record<string, unknown> | null = null;
  let votersError: string | null = null;
  if (postId && pollName) {
    try {
      const r = await fetch(
        `${url}/polls/voters.json?post_id=${postId}&poll_name=${encodeURIComponent(pollName)}&page=1`,
        { headers },
      );
      if (!r.ok) votersError = `HTTP ${r.status} ${r.statusText}`;
      else votersPage1 = await r.json();
    } catch (e: unknown) {
      votersError = e instanceof Error ? e.message : String(e);
    }
  }

  // 5) Does the user.id appear in voters page 1?
  let matched = false;
  let matchedOption: string | null = null;
  if (votersPage1 && discourseUser?.id != null) {
    for (const [opt, arr] of Object.entries(votersPage1.voters ?? {})) {
      if (!Array.isArray(arr)) continue;
      if (arr.some((u: unknown) => (u as { id?: number })?.id === discourseUser!.id)) {
        matched = true;
        matchedOption = opt;
        break;
      }
    }
  }

  return NextResponse.json({
    address: addr,
    questConfig: cfg,
    discourseUser: discourseUser
      ? { id: discourseUser.id, username: discourseUser.username, name: discourseUser.name }
      : null,
    userLookupError,
    postPolls,
    postError,
    votersPage1Sample: votersPage1
      ? {
          voters: Object.fromEntries(
            Object.entries(votersPage1.voters ?? {}).map(([k, v]) => [
              k,
              { count: Array.isArray(v) ? v.length : 0, first3: Array.isArray(v) ? v.slice(0, 3) : [] },
            ]),
          ),
        }
      : null,
    votersError,
    matched,
    matchedOption,
  });
}
