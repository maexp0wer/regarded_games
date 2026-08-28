/* Official community channels — the single source of truth for every surface
   that lists them: the Rulebook "Links" pages on the landing and the
   JSON-LD sameAs array (src/config/seo.ts derives it from here).
   TODO(launch): fill in the real URLs. An empty href renders as "Coming Soon"
   on the landing and is omitted from sameAs — safe to ship empty. */

export interface SocialChannel {
  key: 'discourse' | 'x' | 'discord' | 'telegram' | 'github';
  /* Display name, rulebook register. */
  label: string;
  /* Full profile URL, or '' while the channel doesn't exist yet. */
  href: string;
}

export const SOCIAL_CHANNELS: SocialChannel[] = [
  { key: 'discourse', label: 'Discourse', href: '' },
  { key: 'x', label: 'Twitter', href: '' },
  { key: 'discord', label: 'Discord', href: '' },
  { key: 'telegram', label: 'Telegram', href: '' },
  { key: 'github', label: 'GitHub', href: 'https://github.com/maexp0wer/regarded_games' },
];
