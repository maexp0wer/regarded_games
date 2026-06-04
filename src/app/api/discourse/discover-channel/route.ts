// app/api/discourse/discover-channel/route.ts
import { NextResponse } from 'next/server';
import { tenantFromRequest } from '@/lib/tenant.server';
import { getTenant, type TenantKey } from '@/config/tenants';
import { discourseNames } from '@/lib/discourseNames';
import { getCommunitySession } from '@/lib/communitySession';

export async function POST(req: Request) {
  // Require a verified session and enumerate channels AS the user, so Discourse
  // only surfaces channels this wallet may access. The client's `isCapitalist`
  // hint merely picks which title to look for; it can no longer grant access to
  // the other faction's room (the read itself is user-scoped, and chat-messages
  // re-checks on every fetch).
  const wallet = getCommunitySession(req);
  if (!wallet) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

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
        'Api-Username': wallet
      }
    });

    const channelsData = await res.json();
    const channels = (channelsData.channels || []) as Array<{ title?: string; id: number }>;
    const target = targetGroupName.toLowerCase();

    if (process.env.APP_DEBUG) {
      console.log(`[discover-channel] Looking for "${target}" in channels:`, channels.map((c) => `${c.title} (id: ${c.id})`));
    }

    // Strict equality only — `includes` would let a mainnet target match a sepolia channel title.
    const activeChannel = channels.find((c) => (c.title || '').toLowerCase() === target);

    if (process.env.APP_DEBUG) console.log(`[discover-channel] Found channel:`, activeChannel?.id || 'null');

    return NextResponse.json({ channelId: activeChannel?.id || null });
  } catch {
    return NextResponse.json({ error: "Failed to discover channel" }, { status: 500 });
  }
}