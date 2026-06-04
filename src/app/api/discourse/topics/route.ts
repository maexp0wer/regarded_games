import { NextResponse } from 'next/server';
import { tenantFromRequest } from '@/lib/tenant.server';
import { getTenant, type TenantKey } from '@/config/tenants';
import { discourseNames } from '@/utils/discourseNames';
import { getCommunitySession } from '@/lib/communitySession';

function resolveTenantFromQuery(req: Request, bodyTenant?: unknown) {
  if (bodyTenant === 'mainnet' || bodyTenant === 'sepolia') {
    return getTenant(bodyTenant as TenantKey);
  }
  return tenantFromRequest(req);
}

export async function GET(req: Request) {
  // Identity from the verified session. Reading the category AS the user (not
  // `system`) means Discourse enforces faction-group access — a Proletariat user
  // requesting the Bourgeoisie category is denied at the source.
  const wallet = getCommunitySession(req);
  if (!wallet) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

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
      headers: { 'Api-Key': apiKey, 'Api-Username': wallet },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Category unavailable' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({
      topics: data.topic_list?.topics ?? [],
      categoryId: data.category?.id ?? null,
    });
  } catch (e) {
    console.error('[topics]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const wallet = getCommunitySession(req);
  if (!wallet) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const discourseUrl = process.env.NEXT_PUBLIC_DISCOURSE_URL;
  const apiKey = process.env.DISCOURSE_API_KEY;
  if (!discourseUrl || !apiKey) {
    return NextResponse.json({ error: 'Discourse not configured' }, { status: 500 });
  }

  try {
    const { seasonSlug, isCapitalist, title, raw, tenant: bodyTenant } = await req.json();
    if (!seasonSlug || !title || !raw) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const tenant = resolveTenantFromQuery(req, bodyTenant);
    const seasonNum = Number(seasonSlug.match(/\d+/)?.[0] || '1');
    const names = discourseNames(tenant.key, seasonNum);
    const subcategorySlug = isCapitalist === true
      ? names.categories.bourgeoisie.slug
      : names.categories.proletariat.slug;

    const siteRes = await fetch(`${discourseUrl}/site.json`, {
      headers: { 'Api-Key': apiKey, 'Api-Username': wallet },
    });
    if (!siteRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch site config' }, { status: siteRes.status });
    }
    const siteData = await siteRes.json();
    const categories = (siteData?.categories ?? []) as Array<{ slug: string; id: number }>;
    const categoryId = categories.find((c) => c.slug === subcategorySlug)?.id;
    if (!categoryId) {
      return NextResponse.json({ error: 'Could not resolve category ID' }, { status: 500 });
    }

    const res = await fetch(`${discourseUrl}/posts.json`, {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        'Api-Username': wallet,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, raw, category: categoryId }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[topics] POST failed ${res.status} as ${wallet}: ${body.slice(0, 300)}`);
      return NextResponse.json({ error: 'Failed to create topic' }, { status: res.status });
    }

    const created = await res.json();
    return NextResponse.json({ success: true, topicId: created.topic_id, topicSlug: created.topic_slug });
  } catch (e) {
    console.error('[topics]', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
