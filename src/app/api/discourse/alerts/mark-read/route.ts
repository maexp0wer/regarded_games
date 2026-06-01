import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { address, notificationIds } = body;

  if (!address || !isAddress(address, { strict: false }) || !Array.isArray(notificationIds)) {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_DISCOURSE_URL;
  const apiKey = process.env.DISCOURSE_API_KEY;
  if (!url || !apiKey) {
    return NextResponse.json({ error: 'Discourse not configured' }, { status: 500 });
  }

  const headers = {
    'Api-Key': apiKey,
    'Api-Username': address.toLowerCase(),
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
