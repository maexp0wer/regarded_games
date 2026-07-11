import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReferralTier } from '@/utils/quests';

export type { ReferralTier };

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

export interface ForumPost {
  title: string;
  categorySlug: string;
  pinned: boolean;
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

/**
 * Load a plain forum post (frontmatter + markdown body) from
 * content/discourse/<slug>.md. Same file shape as loadManifestVote(), minus the
 * poll fields — used to turn a .md file into a Discourse topic everyone can see.
 */
export function loadForumPost(slug: string): ForumPost {
  const raw = readFileSync(join(process.cwd(), 'content', 'discourse', `${slug}.md`), 'utf-8');
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`${slug}.md missing frontmatter`);
  const fm: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^(\w+):\s*"?([^"]*)"?$/);
    if (m) fm[m[1]] = m[2];
  }
  return {
    title: fm.title ?? '',
    categorySlug: fm.categorySlug ?? 'uncategorized',
    pinned: fm.pinned === 'true',
    body: match[2].trim(),
  };
}
