import { NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { loadQuestsConfig } from '@/lib/quests';
import { listReferralsForReferrer, creditReferralPoints } from '@/lib/questCompletions';

/**
 * GET /api/quests/referrals?address=0x…
 *
 * The referrer's referral ledger: every wallet that claimed the faucet through
 * their link, with its current quest-point sum and whether it has crossed the
 * qualifying threshold. Public read, same as GET /api/quests — everything
 * returned is derived from state that was verified when it was written, and
 * per-wallet point totals are already readable via /api/quests?address=X.
 *
 * Also settles the referrer's owed referral credit (idempotent), so opening
 * the list is itself enough to make newly-qualified points land.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const addressParam = searchParams.get('address');
    if (!addressParam || !isAddress(addressParam, { strict: false })) {
      return NextResponse.json({ error: 'invalid_address' }, { status: 400 });
    }
    const address = addressParam.toLowerCase();

    const config = loadQuestsConfig();
    const threshold = config.referralQualifyingThreshold;

    const referrals = await listReferralsForReferrer(address, threshold);
    const qualifiedCount = referrals.filter((r) => r.qualified).length;
    const totalReferralPoints = await creditReferralPoints(address, qualifiedCount, config.referralTiers);

    return NextResponse.json({
      success: true,
      data: {
        referrals,
        qualifiedCount,
        totalReferralPoints,
        threshold,
        tiers: config.referralTiers,
      },
    });
  } catch (err: unknown) {
    console.error('GET /api/quests/referrals error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
