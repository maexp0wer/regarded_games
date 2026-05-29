'use client';

import { useEffect } from 'react';
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

const HANDSHAKE_SESSION_KEY = 'discourse_handshake_wallet';

export function DiscourseHandshake() {
  const { address, isConnected } = useAccount();

  useEffect(() => {
    if (!isConnected || !address) return;

    // 1. Set a cookie that the Next.js API can read.
    // In a real app, you'd use SIWE, but for dev, this is 100% reliable.
    const domainAttr = cookieDomainAttr(window.location.host);
    document.cookie = `current_wallet=${address}; path=/; max-age=3600; ${domainAttr}SameSite=Lax`;

    // Idempotency guard: each handshake hits Discourse's logout + SSO endpoints,
    // and Discourse rate-limits aggressively. Without this, every remount
    // (HMR, StrictMode, tenant switch, navigation) re-fires the handshake and
    // trips Discourse's "high load" throttle. Only run once per wallet per
    // browser session.
    const last = sessionStorage.getItem(HANDSHAKE_SESSION_KEY);
    if (last === address.toLowerCase()) return;
    sessionStorage.setItem(HANDSHAKE_SESSION_KEY, address.toLowerCase());

      console.log(`War Room: Forcing sync for ${address}`);

      // 2. Create hidden logout iframe to clear old session
      const logoutIframe = document.createElement('iframe');
      logoutIframe.src = "http://community.localhost/logout";
      logoutIframe.style.display = "none";
      document.body.appendChild(logoutIframe);

      // 3. Short delay, then trigger fresh Login
      const timer = setTimeout(() => {
        const loginIframe = document.createElement('iframe');
        loginIframe.src = `http://community.localhost/session/sso?t=${Date.now()}`;
        loginIframe.style.display = "none";
        document.body.appendChild(loginIframe);

        // Cleanup
        setTimeout(() => {
          if (document.body.contains(logoutIframe)) document.body.removeChild(logoutIframe);
          if (document.body.contains(loginIframe)) document.body.removeChild(loginIframe);
        }, 5000);
      }, 1500); // 1.5s delay to ensure logout is processed

    return () => clearTimeout(timer);
  }, [isConnected, address]);

  return null;
}