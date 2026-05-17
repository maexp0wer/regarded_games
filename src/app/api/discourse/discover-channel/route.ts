// app/api/discourse/discover-channel/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { seasonSlug, isCapitalist } = await req.json();
    const seasonNumber = seasonSlug.match(/\d+/)?.[0] || "1";
    const targetGroupName = isCapitalist ? `S${seasonNumber}_Bourgeoisie` : `S${seasonNumber}_Proletariat`;

    const res = await fetch(`${process.env.NEXT_PUBLIC_DISCOURSE_URL}/chat/api/channels`, {
      headers: {
        'Api-Key': process.env.DISCOURSE_API_KEY!,
        'Api-Username': 'system'
      }
    });

    const channelsData = await res.json();
    const channels: any[] = channelsData.channels || [];
    const target = targetGroupName.toLowerCase();
    const activeChannel = channels.find((c: any) => {
      const title = (c.title || '').toLowerCase();
      return title === target || title.includes(target);
    });

    return NextResponse.json({ channelId: activeChannel?.id || null });
  } catch (error) {
    return NextResponse.json({ error: "Failed to discover channel" }, { status: 500 });
  }
}