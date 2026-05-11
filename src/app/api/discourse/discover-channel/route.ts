// app/api/discourse/discover-channel/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { seasonSlug, isCapitalist } = await req.json();
    const seasonNumber = seasonSlug.match(/\d+/)?.[0] || "1";
    const targetGroupName = isCapitalist ? `S${seasonNumber}_Capitalist` : `S${seasonNumber}_Socialist`;

    const res = await fetch(`${process.env.NEXT_PUBLIC_DISCOURSE_URL}/chat/channels.json`, {
      headers: {
        'Api-Key': process.env.DISCOURSE_API_KEY!,
        'Api-Username': 'system'
      }
    });
    
    const channelsData = await res.json();
    const activeChannel = channelsData.find((c: any) => {
        const title = c.title.toLowerCase();
        return title.includes(targetGroupName.toLowerCase()) || 
               title.includes(targetGroupName.toLowerCase().replace('_', ' '));
    });

    return NextResponse.json({ channelId: activeChannel?.id || null });
  } catch (error) {
    return NextResponse.json({ error: "Failed to discover channel" }, { status: 500 });
  }
}