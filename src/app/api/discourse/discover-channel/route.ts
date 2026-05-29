// app/api/discourse/discover-channel/route.ts
import { NextResponse } from 'next/server';
import { tenantFromRequest } from '@/lib/tenant.server';
import { getTenant, type TenantKey } from '@/config/tenants';
import { discourseNames } from '@/lib/discourseNames';

export async function POST(req: Request) {
  try {
    const { seasonSlug, isCapitalist, isGeneral, tenant: bodyTenant } = await req.json();
    const seasonNumber = Number(seasonSlug.match(/\d+/)?.[0] || "1");

    const tenant = (bodyTenant === 'mainnet' || bodyTenant === 'sepolia')
      ? getTenant(bodyTenant as TenantKey)
      : tenantFromRequest(req);
    const names = discourseNames(tenant.key, seasonNumber);

    const targetGroupName = isGeneral
      ? names.channels.general
      : isCapitalist ? names.channels.bourgeoisie : names.channels.proletariat;

    const res = await fetch(`${process.env.NEXT_PUBLIC_DISCOURSE_URL}/chat/api/channels`, {
      headers: {
        'Api-Key': process.env.DISCOURSE_API_KEY!,
        'Api-Username': 'system'
      }
    });

    const channelsData = await res.json();
    const channels: any[] = channelsData.channels || [];
    const target = targetGroupName.toLowerCase();
    // Strict equality only — `includes` would let a mainnet target match a sepolia channel title.
    const activeChannel = channels.find((c: any) => (c.title || '').toLowerCase() === target);

    return NextResponse.json({ channelId: activeChannel?.id || null });
  } catch (error) {
    return NextResponse.json({ error: "Failed to discover channel" }, { status: 500 });
  }
}