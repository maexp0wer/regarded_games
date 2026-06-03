import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface ReferralTier {
  from: number;
  to: number;
  perReferral: number;
}

export interface QuestsConfig {
  galxe: { followX: string; joinDiscord: string; retweet: string };
  externalLinks: { discordInvite: string; xProfile: string; discourseUrl: string };
  internalRoutes: {
    faucet: string; swap: string; stake: string;
    auction: string; trading: string; payout: string;
  };
  points: Record<string, number>;
  referralTiers: ReferralTier[];
  referralQualifyingThreshold: number;
  tgeConversionRate: string;
}

export interface ManifestVote {
  title: string;
  categorySlug: string;
  pollName: string;
  pollType: string;
  pollResults: string;
  closesAt: string;
  body: string;
}

let _cachedConfig: QuestsConfig | null = null;

export function loadQuestsConfig(): QuestsConfig {
  if (_cachedConfig) return _cachedConfig;
  const raw = readFileSync(join(process.cwd(), 'content', 'discourse', 'quests.json'), 'utf-8');
  _cachedConfig = JSON.parse(raw) as QuestsConfig;
  return _cachedConfig;
}

export function loadManifestVote(): ManifestVote {
  const raw = readFileSync(join(process.cwd(), 'content', 'discourse', 'manifest-vote.md'), 'utf-8');
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error('manifest-vote.md missing frontmatter');
  const fm: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^(\w+):\s*"?([^"]*)"?$/);
    if (m) fm[m[1]] = m[2];
  }
  return {
    title: fm.title ?? '',
    categorySlug: fm.categorySlug ?? '',
    pollName: fm.pollName ?? 'manifest_s1',
    pollType: fm.pollType ?? 'regular',
    pollResults: fm.pollResults ?? 'always',
    closesAt: fm.closesAt ?? '',
    body: match[2].trim(),
  };
}

export function computeTotalReferralPoints(
  qualifiedCount: number,
  tiers: ReferralTier[],
): number {
  let total = 0;
  for (const t of tiers) {
    const within = Math.max(0, Math.min(qualifiedCount, t.to) - (t.from - 1));
    total += within * t.perReferral;
  }
  return total;
}

/**
 * 0–1000 score for the user's PnL rank within a single season.
 * `allPnls` includes the user. Top rank → 1000, bottom → 0, linear.
 */
export function computeWinScoreForSeason(
  userPnl: number,
  allPnls: number[],
): number {
  if (allPnls.length <= 1) return 0;
  const sorted = [...allPnls].sort((a, b) => b - a);
  const rank = sorted.findIndex((v) => v <= userPnl);
  const r = rank < 0 ? sorted.length - 1 : rank;
  const score = Math.round(1000 * (sorted.length - 1 - r) / (sorted.length - 1));
  return Math.max(0, Math.min(1000, score));
}

export function relativePnl(totalPotentialPayout: bigint, netContribution: bigint): number | null {
  if (netContribution === 0n) return null;
  const ratio = Number(totalPotentialPayout) / Number(netContribution) - 1;
  return Number.isFinite(ratio) ? ratio : null;
}
