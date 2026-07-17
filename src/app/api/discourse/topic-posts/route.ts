import { NextRequest, NextResponse } from 'next/server';
import { getCommunitySession } from '@/lib/communitySession';
import { sameOriginOk } from '@/lib/rateLimit';

const DISCOURSE_URL = process.env.NEXT_PUBLIC_DISCOURSE_URL!;
const API_KEY = process.env.DISCOURSE_API_KEY!;

export async function GET(req: NextRequest) {
  // Read the topic AS the verified user. Discourse returns 403/404 if the topic's
  // category is gated to a faction the user isn't in, so faction isolation holds
  // even though we only have a topicId (not an explicit faction) here.
  const wallet = getCommunitySession(req);
  if (!wallet) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const topicId = req.nextUrl.searchParams.get('topicId');
  if (!topicId) return NextResponse.json({ error: 'Missing topicId' }, { status: 400 });

  try {
    const res = await fetch(`${DISCOURSE_URL}/t/${topicId}.json`, {
      headers: { 'Api-Key': API_KEY, 'Api-Username': wallet },
    });
    if (!res.ok) return NextResponse.json({ error: 'Topic unavailable' }, { status: res.status });

    const data = await res.json();
    return NextResponse.json({
      title: data.title,
      posts: data.post_stream?.posts ?? [],
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!sameOriginOk(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const wallet = getCommunitySession(req);
  if (!wallet) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  try {
    const { topicId, raw } = await req.json();
    if (!topicId || !raw) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const res = await fetch(`${DISCOURSE_URL}/posts.json`, {
      method: 'POST',
      headers: {
        'Api-Key': API_KEY,
        'Api-Username': wallet,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic_id: topicId, raw }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[topic-posts] POST failed ${res.status} as ${wallet}: ${body.slice(0, 300)}`);
      return NextResponse.json({ error: 'Failed to post reply' }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}
