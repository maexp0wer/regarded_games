import { NextResponse } from 'next/server';

function buildCategorySlug(seasonSlug: string, isCapitalist: boolean) {
  const seasonNum = seasonSlug.match(/\d+/)?.[0] || '1';
  return isCapitalist
    ? `season-${seasonNum}/s${seasonNum}-bourgeoisie-strategy`
    : `season-${seasonNum}/s${seasonNum}-proletariat-strategy`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seasonSlug = searchParams.get('seasonSlug');
  const isCapitalist = searchParams.get('isCapitalist') === 'true';

  if (!seasonSlug) {
    return NextResponse.json({ error: 'seasonSlug is required' }, { status: 400 });
  }

  const discourseUrl = process.env.NEXT_PUBLIC_DISCOURSE_URL;
  const apiKey = process.env.DISCOURSE_API_KEY;
  if (!discourseUrl || !apiKey) {
    return NextResponse.json({ error: 'Discourse not configured' }, { status: 500 });
  }

  const categorySlug = buildCategorySlug(seasonSlug, isCapitalist);

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
      categoryId: data.topic_list?.category_id ?? null,
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
    const { seasonSlug, isCapitalist, title, raw, walletAddress } = await req.json();
    if (!seasonSlug || !title || !raw || !walletAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Resolve category ID
    const categorySlug = buildCategorySlug(seasonSlug, isCapitalist === true);
    const catRes = await fetch(`${discourseUrl}/c/${categorySlug}.json`, {
      headers: { 'Api-Key': apiKey, 'Api-Username': 'system' },
    });
    if (!catRes.ok) {
      return NextResponse.json({ error: `Failed to resolve category (${catRes.status})` }, { status: catRes.status });
    }
    const catData = await catRes.json();
    const categoryId = catData.topic_list?.category_id;
    if (!categoryId) {
      return NextResponse.json({ error: 'Could not resolve category ID' }, { status: 500 });
    }

    // Create topic
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
