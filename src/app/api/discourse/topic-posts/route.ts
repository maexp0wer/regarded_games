import { NextRequest, NextResponse } from 'next/server';

const DISCOURSE_URL = process.env.NEXT_PUBLIC_DISCOURSE_URL!;
const API_KEY = process.env.DISCOURSE_API_KEY!;

export async function GET(req: NextRequest) {
  const topicId = req.nextUrl.searchParams.get('topicId');
  if (!topicId) return NextResponse.json({ error: 'Missing topicId' }, { status: 400 });

  try {
    const res = await fetch(`${DISCOURSE_URL}/t/${topicId}.json`, {
      headers: { 'Api-Key': API_KEY, 'Api-Username': 'system' },
    });
    if (!res.ok) return NextResponse.json({ error: `Discourse returned ${res.status}` }, { status: res.status });

    const data = await res.json();
    return NextResponse.json({
      title: data.title,
      posts: data.post_stream?.posts ?? [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { topicId, raw, walletAddress } = await req.json();
    if (!topicId || !raw || !walletAddress) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const res = await fetch(`${DISCOURSE_URL}/posts.json`, {
      method: 'POST',
      headers: {
        'Api-Key': API_KEY,
        'Api-Username': walletAddress.toLowerCase(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic_id: topicId, raw }),
    });

    const body = await res.text();
    if (!res.ok) {
      console.error(`[topic-posts] POST failed ${res.status} as ${walletAddress.toLowerCase()}: ${body.slice(0, 300)}`);
      return NextResponse.json({ error: body }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
