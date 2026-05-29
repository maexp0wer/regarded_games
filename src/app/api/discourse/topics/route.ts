import { NextResponse } from 'next/server';
import { tenantFromRequest } from '@/lib/tenant.server';
import { getTenant, type TenantKey } from '@/config/tenants';
import { discourseNames } from '@/lib/discourseNames';

function resolveTenantFromQuery(req: Request, bodyTenant?: unknown) {
  if (bodyTenant === 'mainnet' || bodyTenant === 'sepolia') {
    return getTenant(bodyTenant as TenantKey);
  }
  return tenantFromRequest(req);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seasonSlug = searchParams.get('seasonSlug');
  const isCapitalist = searchParams.get('isCapitalist') === 'true';
  const tenantParam = searchParams.get('tenant');

  if (!seasonSlug) {
    return NextResponse.json({ error: 'seasonSlug is required' }, { status: 400 });
  }

  const discourseUrl = process.env.NEXT_PUBLIC_DISCOURSE_URL;
  const apiKey = process.env.DISCOURSE_API_KEY;
  if (!discourseUrl || !apiKey) {
    return NextResponse.json({ error: 'Discourse not configured' }, { status: 500 });
  }

  const tenant = resolveTenantFromQuery(req, tenantParam);
  const seasonNum = Number(seasonSlug.match(/\d+/)?.[0] || '1');
  const names = discourseNames(tenant.key, seasonNum);
  const child = isCapitalist ? names.categories.bourgeoisie : names.categories.proletariat;
  const categorySlug = `${names.categories.parent.slug}/${child.slug}`;

  try {
    const res = await fetch(`${discourseUrl}/c/${categorySlug}.json`, {
      headers: { 'Api-Key': apiKey, 'Api-Username': 'system' },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Discourse returned ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({
      topics: data.topic_list?.topics ?? [],
      categoryId: data.category?.id ?? null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const discourseUrl = process.env.NEXT_PUBLIC_DISCOURSE_URL;
  const apiKey = process.env.DISCOURSE_API_KEY;
  if (!discourseUrl || !apiKey) {
    return NextResponse.json({ error: 'Discourse not configured' }, { status: 500 });
  }

  try {
    const { seasonSlug, isCapitalist, title, raw, walletAddress, tenant: bodyTenant } = await req.json();
    if (!seasonSlug || !title || !raw || !walletAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const tenant = resolveTenantFromQuery(req, bodyTenant);
    const seasonNum = Number(seasonSlug.match(/\d+/)?.[0] || '1');
    const names = discourseNames(tenant.key, seasonNum);
    const subcategorySlug = isCapitalist === true
      ? names.categories.bourgeoisie.slug
      : names.categories.proletariat.slug;

    const siteRes = await fetch(`${discourseUrl}/site.json`, {
      headers: { 'Api-Key': apiKey, 'Api-Username': 'system' },
    });
    if (!siteRes.ok) {
      return NextResponse.json({ error: `Failed to fetch site config (${siteRes.status})` }, { status: siteRes.status });
    }
    const siteData = await siteRes.json();
    const categoryId = (siteData?.categories as any[] ?? []).find((c: any) => c.slug === subcategorySlug)?.id;
    if (!categoryId) {
      return NextResponse.json({ error: 'Could not resolve category ID' }, { status: 500 });
    }

    const res = await fetch(`${discourseUrl}/posts.json`, {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        'Api-Username': walletAddress.toLowerCase(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, raw, category: categoryId }),
    });

    const body = await res.text();
    if (!res.ok) {
      console.error(`[topics] POST failed ${res.status} as ${walletAddress.toLowerCase()}: ${body.slice(0, 300)}`);
      return NextResponse.json({ error: body }, { status: res.status });
    }

    const created = JSON.parse(body);
    return NextResponse.json({ success: true, topicId: created.topic_id, topicSlug: created.topic_slug });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
