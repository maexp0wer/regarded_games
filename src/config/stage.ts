/* Launch state — the single source of truth for "is this surface open yet".
 *
 * SERVER ONLY. This module reads the server-only APP_LIVE / TESTNET_APP_LIVE
 * flags (deliberately NOT NEXT_PUBLIC_) that middleware.ts uses as the real
 * gate, so it must never be imported from a client component. The landing's
 * server wrapper (src/app/main/page.tsx) reads it once per request and passes
 * the resolved LaunchState down as a prop.
 *
 * Before this existed the landing read a hand-synced NEXT_PUBLIC_APP_LIVE
 * mirror, which could drift from the real gate. There is now one set of flags.
 *
 * NOTE (Vercel): env binds at build/deploy time — flag changes need a redeploy,
 * exactly as documented for middleware.ts. */

import { SOCIAL_CHANNELS } from './socials';

/** Coarse stage, used only for the landing hero's banner copy. Per-card link
 *  decisions read the individual booleans instead — a card pinned to one tenant
 *  (the ICO is mainnet-only, Testnet Quests is sepolia-only) cares about ITS
 *  host's flag, not about the aggregate. */
export type GameStage = 'live' | 'testnet' | 'coming-soon';

export interface LaunchState {
  /** app.<domain> is serving the real app (mainnet tenant). */
  appLive: boolean;
  /** app.sepolia.<domain> is serving the real app (testnet tenant). */
  testnetLive: boolean;
  /** The forum exists publicly. Empty href is the documented "not yet" marker. */
  discourseLive: boolean;
  /** Public base URL of the forum, or '' when it doesn't exist yet. */
  discourseUrl: string;
  stage: GameStage;
}

export function getLaunchState(): LaunchState {
  /* Mirrors middleware.ts exactly: anything other than the literal "false"
     leaves the surface live. */
  const appLive = process.env.APP_LIVE !== 'false';
  const testnetLive = process.env.TESTNET_APP_LIVE !== 'false';

  const discourseUrl =
    SOCIAL_CHANNELS.find((c) => c.key === 'discourse')?.href ?? '';

  return {
    appLive,
    testnetLive,
    discourseLive: discourseUrl !== '',
    discourseUrl,
    stage: appLive ? 'live' : testnetLive ? 'testnet' : 'coming-soon',
  };
}
