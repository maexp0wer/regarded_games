import { NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { query } from '@/lib/db';
import { loadQuestsConfig } from '@/lib/quests';

export async function POST(req: Request) {
  const adminToken = req.headers.get('x-quests-admin-token');
  if (!adminToken || adminToken !== process.env.DISCOURSE_INIT_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      address?: string;
      questId?: string;
      points?: number;
      note?: string;
    };
    const { address, questId, points, note } = body;

    if (!address || !questId || typeof points !== 'number') {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    if (!isAddress(address, { strict: false })) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }
    if (questId !== 'discussion_bonus') {
      return NextResponse.json({ error: 'questId not grantable' }, { status: 400 });
    }

    const config = loadQuestsConfig();
    const cap = config.points.discussion_bonus_cap;
    const capped = Math.max(0, Math.min(points, cap));

    const addr = address.toLowerCase();
    await query(
      `INSERT INTO quest_completions (address, quest_id, points, note)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (address, quest_id) DO UPDATE
         SET points = LEAST($5, GREATEST(quest_completions.points, EXCLUDED.points)),
             note   = COALESCE(EXCLUDED.note, quest_completions.note),
             awarded_at = NOW()`,
      [addr, questId, capped, note ?? null, cap],
    );

    return NextResponse.json({ success: true, address: addr, points: capped });
  } catch (err: any) {
    console.error('POST /api/quests/admin/grant error:', err?.message ?? err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
