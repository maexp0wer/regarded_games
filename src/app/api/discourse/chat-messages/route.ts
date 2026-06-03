import { NextRequest, NextResponse } from 'next/server';

const DISCOURSE_URL = process.env.NEXT_PUBLIC_DISCOURSE_URL!;
const API_KEY = process.env.DISCOURSE_API_KEY!;

export async function GET(req: NextRequest) {
  const channelId = req.nextUrl.searchParams.get('channelId');
  if (!channelId) return NextResponse.json({ error: 'Missing channelId' }, { status: 400 });

  try {
    const res = await fetch(
      `${DISCOURSE_URL}/chat/api/channels/${channelId}/messages?page_size=50`,
      { headers: { 'Api-Key': API_KEY, 'Api-Username': 'system' } }
    );
    const data = await res.json();
    if (process.env.APP_DEBUG) console.log('[chat-messages] Discourse response:', JSON.stringify(data).slice(0, 500));
    return NextResponse.json({ messages: data.messages || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { channelId, message, walletAddress } = await req.json();
    if (!channelId || !message || !walletAddress) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const username = walletAddress.toLowerCase();

    const postMessage = () =>
      fetch(`${DISCOURSE_URL}/chat/${channelId}`, {
        method: 'POST',
        headers: {
          'Api-Key': API_KEY,
          'Api-Username': username,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

    let res = await postMessage();

    // Discourse requires the user to be a member of the channel to post; a
    // non-member gets a 404 ("Page Not Found"). A freshly connected/switched
    // wallet is provisioned but not yet joined (the old SSO login used to
    // auto-join). On 404, join the channel for this user and retry once.
    if (res.status === 404) {
      await fetch(`${DISCOURSE_URL}/chat/api/channels/${channelId}/memberships/me`, {
        method: 'POST',
        headers: { 'Api-Key': API_KEY, 'Api-Username': username },
      }).catch(() => {});
      res = await postMessage();
    }

    const body = await res.text();
    if (!res.ok) {
      console.error(`[chat-messages] POST failed ${res.status} as ${username}: ${body.slice(0, 300)}`);
      return NextResponse.json({ error: body }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
