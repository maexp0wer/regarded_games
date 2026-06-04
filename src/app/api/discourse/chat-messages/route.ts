import { NextRequest, NextResponse } from 'next/server';
import { getCommunitySession } from '@/lib/communitySession';

const DISCOURSE_URL = process.env.NEXT_PUBLIC_DISCOURSE_URL!;
const API_KEY = process.env.DISCOURSE_API_KEY!;

export async function GET(req: NextRequest) {
  // Identity comes from the verified session — never the query. Reading as the
  // user (not `system`) lets Discourse enforce faction-room membership, so a
  // member of one faction cannot pull the other faction's channel.
  const wallet = getCommunitySession(req);
  if (!wallet) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const channelId = req.nextUrl.searchParams.get('channelId');
  if (!channelId) return NextResponse.json({ error: 'Missing channelId' }, { status: 400 });

  try {
    const res = await fetch(
      `${DISCOURSE_URL}/chat/api/channels/${channelId}/messages?page_size=50`,
      { headers: { 'Api-Key': API_KEY, 'Api-Username': wallet } }
    );
    if (!res.ok) {
      return NextResponse.json({ error: 'Channel unavailable' }, { status: res.status });
    }
    const data = await res.json();
    if (process.env.APP_DEBUG) console.log('[chat-messages] Discourse response:', JSON.stringify(data).slice(0, 500));
    return NextResponse.json({ messages: data.messages || [] });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const wallet = getCommunitySession(req);
  if (!wallet) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  try {
    const { channelId, message } = await req.json();
    if (!channelId || !message) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Post AS the verified wallet. No auto-join fallback: channel access must come
    // from faction-group membership (sync-faction / create-player). A 404 here means
    // the user isn't a member of this faction's channel — which is correct denial.
    const res = await fetch(`${DISCOURSE_URL}/chat/${channelId}`, {
      method: 'POST',
      headers: {
        'Api-Key': API_KEY,
        'Api-Username': wallet,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[chat-messages] POST failed ${res.status} as ${wallet}: ${body.slice(0, 300)}`);
      return NextResponse.json({ error: 'Failed to send message' }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}
