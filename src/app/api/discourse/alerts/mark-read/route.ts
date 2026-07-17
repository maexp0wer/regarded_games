import { NextRequest, NextResponse } from 'next/server';
import { getCommunitySession } from '@/lib/communitySession';
import { sameOriginOk } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  if (!sameOriginOk(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  // Marking notifications read acts AS the user on Discourse — the target wallet
  // must be the verified session, not a body-supplied address (else anyone could
  // clear another player's alerts).
  const wallet = getCommunitySession(req);
  if (!wallet) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const body = await req.json();
  const { notificationIds } = body;
  if (!Array.isArray(notificationIds)) {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_DISCOURSE_URL;
  const apiKey = process.env.DISCOURSE_API_KEY;
  if (!url || !apiKey) {
    return NextResponse.json({ error: 'Discourse not configured' }, { status: 500 });
  }

  const headers = {
    'Api-Key': apiKey,
    'Api-Username': wallet,
    'Content-Type': 'application/json',
  };

  await Promise.all(
    (notificationIds as number[]).map((id) =>
      fetch(`${url}/notifications/mark-read.json`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ id }),
      }),
    ),
  );

  return NextResponse.json({ success: true });
}
