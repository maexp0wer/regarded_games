/* Official community channels — the single source of truth for every surface
   that lists them: the Rulebook "Comms Channels" pages on the landing and the
   JSON-LD sameAs array (src/config/seo.ts derives it from here).
   TODO(launch): fill in the real URLs. An empty href renders as "Coming Soon"
   on the landing and is omitted from sameAs — safe to ship empty. */

export interface SocialChannel {
  key: 'x' | 'discord' | 'github' | 'telegram' | 'discourse';
  /* Display name, rulebook register. */
  label: string;
  /* Full profile URL, or '' while the channel doesn't exist yet. */
  href: string;
  /* One-line clause description printed under the channel row. */
  description: string;
}

export const SOCIAL_CHANNELS: SocialChannel[] = [
  {
    key: 'x',
    label: 'Twitter',
    href: '',
    description:
      'Dispatches from the front: season announcements, market intel, and the official line.',
  },
  {
    key: 'discord',
    label: 'Discord',
    href: '',
    description:
      'The mess hall. Real-time coordination with both classes — strategy, alliances, betrayal.',
  },
  {
    key: 'github',
    label: 'GitHub',
    href: 'https://github.com/maexp0wer/regarded_games',
    description:
      'The open ledger of the machine: contracts, app, and tooling. Verify, do not trust.',
  },
  {
    key: 'telegram',
    label: 'Telegram',
    href: '',
    description:
      'The wire. Fast alerts for auctions opening, settlements, and claim windows.',
  },
  {
    key: 'discourse',
    label: 'Discourse',
    href: '',
    description:
      'The forum. Long-form strategy, faction debate, and the permanent record — coming soon.',
  },
];
