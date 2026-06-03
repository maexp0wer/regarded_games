'use client';

import { useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';

// Cookie domain strategy:
//   - In dev (*.localhost), `localhost` is on the Public Suffix List, so browsers
//     reject any cookie with `domain=localhost` set from a subdomain. The only
//     thing that works is a host-only cookie (no `domain=` attribute). This means
//     Discourse's `discourse_connect_url` must point at this same host
//     (http://app.localhost:3000/api/auth/discourse) so the callback can read it.
//   - In prod, set `domain=<registrable-domain>` so the cookie is shared across
//     app.* and community.* subdomains — `discourse_connect_url` can then live on
//     either subdomain. Returns empty string in dev to signal "no domain attribute".
function cookieDomainAttr(host: string): string {
  const hostNoPort = host.split(':')[0];
  if (hostNoPort === 'localhost' || hostNoPort.endsWith('.localhost')) return '';
  const parts = hostNoPort.split('.');
  const registrable = parts.length <= 2 ? hostNoPort : parts.slice(-2).join('.');
  return `domain=${registrable}; `;
}

/**
 * Keeps the Discourse session aligned with the connected wallet.
 *
 * Modern Discourse blocks the old hidden-iframe SSO trick (it sends
 * `X-Frame-Options: SAMEORIGIN` + CSP `frame-ancestors 'self'`, and its session
 * cookie is `SameSite=Lax`, which a cross-site iframe can neither load nor hold).
 * We follow the documented DiscourseConnect server-to-server flow instead
 * (`POST /api/discourse/session`):
 *
 *   - connect    → log the wallet IN: `sync_sso` provisions/activates its
 *                  Discourse account so the API-key-backed in-app chat can post
 *                  as it (`Api-Username: <wallet>`).
 *   - disconnect → log the wallet OUT: admin `log_out` terminates its sessions.
 *   - switch     → both: log the previous wallet out, then the new one in.
 *
 * The `current_wallet` cookie still tells the SSO provider route
 * (`/api/auth/discourse`) which wallet to authenticate when the user opens the
 * actual forum via a top-level `/session/sso` link (see `forumLoginUrl` in
 * `@/utils/discourseForum`, used by the forum links/alerts).
 */
export function DiscourseHandshake() {
  const { address, isConnected } = useAccount();
  const prevAddressRef = useRef<string | null>(null);

  useEffect(() => {
    const currentAddress = address?.toLowerCase() || null;
    const prev = prevAddressRef.current;
    if (currentAddress === prev) return;
    prevAddressRef.current = currentAddress;

    const domainAttr = cookieDomainAttr(window.location.host);
    const dev = process.env.NODE_ENV === 'development';

    const session = (wallet: string, action: 'login' | 'logout') =>
      fetch('/api/discourse/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, action }),
        keepalive: true,
      }).catch(() => {});

    // Wallet switched or disconnected — log the previous wallet OUT of Discourse.
    if (prev && prev !== currentAddress) {
      if (dev) console.log(`War Room: Discourse logout ${prev}`);
      session(prev, 'logout');
    }

    if (isConnected && currentAddress) {
      // Tell the SSO provider which wallet to authenticate (used when the user
      // opens the forum via a top-level /session/sso link).
      document.cookie = `current_wallet=${currentAddress}; path=/; max-age=86400; ${domainAttr}SameSite=Lax`;
      // Log the current wallet IN: provision/activate its Discourse account so the
      // (server-side, API-key) chat can post as it.
      if (dev) console.log(`War Room: Discourse login ${currentAddress}`);
      session(currentAddress, 'login');
    } else {
      // Disconnected — clear the hint cookie (logout already issued above).
      document.cookie = `current_wallet=; path=/; max-age=0; ${domainAttr}SameSite=Lax`;
    }
  }, [isConnected, address]);

  return null;
}
