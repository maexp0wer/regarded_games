import { NextResponse } from 'next/server';
import { isValidAdminToken } from '@/lib/adminAuth';
import { isAddress } from 'viem';
import { query } from '@/lib/db';
import { loadQuestsConfig } from '@/lib/quests';

interface GrantEntry {
  address: string;
  points: number;
  note?: string;
}

export async function POST(req: Request) {
  if (!isValidAdminToken(req.headers.get('x-quests-admin-token'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { grants?: GrantEntry[] };

    if (!Array.isArray(body.grants) || body.grants.length === 0) {
      return NextResponse.json({ error: 'grants array required' }, { status: 400 });
    }

    const config = loadQuestsConfig();
    const cap = config.points.discussion_bonus_cap;

    const results: { address: string; points: number }[] = [];
    const errors: { address: string; error: string }[] = [];

    for (const entry of body.grants) {
      const { address, points, note } = entry;

      if (!address || typeof points !== 'number') {
        errors.push({ address: address ?? '?', error: 'missing address or points' });
        continue;
      }
      if (!isAddress(address, { strict: false })) {
        errors.push({ address, error: 'invalid address' });
        continue;
      }

      const addr = address.toLowerCase();
      const capped = Math.max(0, Math.min(points, cap));

      await query(
        `INSERT INTO quest_completions (address, quest_id, points, note)
         VALUES ($1, 'discussion_bonus', $2, $3)
         ON CONFLICT (address, quest_id) DO UPDATE
           SET points = LEAST($4, GREATEST(quest_completions.points, EXCLUDED.points)),
               note   = COALESCE(EXCLUDED.note, quest_completions.note),
               awarded_at = NOW()`,
        [addr, capped, note ?? null, cap],
      );

      results.push({ address: addr, points: capped });
    }

    return NextResponse.json({ success: true, granted: results, errors });
  } catch (err: unknown) {
    console.error('POST /api/quests/admin/grant error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
