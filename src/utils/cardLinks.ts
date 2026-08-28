/* Resolves a landing card's footer link against the current launch state.
 *
 * Liveness is decided per TARGET HOST, not by the coarse stage: the Capital
 * Auction card is pinned to mainnet (a Sepolia TGE is meaningless) and the
 * Testnet Quests card is pinned to sepolia, so during a testnet-only launch one
 * of them pops the "coming soon" modal while its neighbour links through.
 *
 * A gated target resolves to `{ kind: 'gated' }` rather than to the app's
 * /coming-soon URL. The middleware still rewrites gated app.* requests there —
 * that remains the real boundary — but footer links open in a new tab, and a
 * fresh tab containing only the words "Coming Soon" is a poor destination. The
 * landing shows a modal instead and the visitor stays put. */

import type { LaunchState } from '@/config/stage';
import { appUrl, type AppHost } from './appUrls';

/** Which tenant a card's target lives on. 'stage' = wherever the game is live. */
export type CardHost = 'stage' | AppHost;

export type CardTarget =
  | { kind: 'link'; href: string }
  | { kind: 'gated' };

/** Resolve a path on the app to a concrete tenant, or report it as gated. */
export function resolveAppTarget(
  launch: LaunchState,
  mainDomain: string,
  host: CardHost,
  path: string,
): CardTarget {
  const live = (h: AppHost) => (h === 'mainnet' ? launch.appLive : launch.testnetLive);

  /* 'stage' follows the game: mainnet wins when it's open, otherwise fall back
     to the testnet tenant, otherwise nothing is open. */
  const resolved: AppHost | null =
    host === 'stage'
      ? launch.appLive
        ? 'mainnet'
        : launch.testnetLive
          ? 'testnet'
          : null
      : live(host)
        ? host
        : null;

  if (!resolved) return { kind: 'gated' };
  return { kind: 'link', href: appUrl(mainDomain, resolved, path) };
}

/** Resolve a path on the forum. An empty configured href means it isn't up yet. */
export function resolveDiscourseTarget(launch: LaunchState, path = ''): CardTarget {
  if (!launch.discourseLive) return { kind: 'gated' };
  return { kind: 'link', href: `${launch.discourseUrl.replace(/\/$/, '')}${path}` };
}

/** Resolve a path on the MAIN domain whose content only exists once a tenant is
 *  open. The treasury page is served from the main site — middleware never gates
 *  it — but the figures it reports come from the game, so before the app is live
 *  there is no treasury to show and the card pops the modal instead. Liveness is
 *  borrowed from resolveAppTarget so both link kinds follow the same flags. */
export function resolveMainTarget(
  launch: LaunchState,
  mainDomain: string,
  host: CardHost,
  path: string,
): CardTarget {
  if (resolveAppTarget(launch, mainDomain, host, path).kind === 'gated') return { kind: 'gated' };
  return { kind: 'link', href: `${mainDomain}${path.startsWith('/') ? path : `/${path}`}` };
}
