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

const HANDSHAKE_SESSION_KEY = 'discourse_handshake_wallet';

function getProceedDomain(): string {
  if (typeof window === 'undefined') return 'localhost';
  const hostNoPort = window.location.host.split(':')[0];
  if (hostNoPort === 'localhost' || hostNoPort.endsWith('.localhost')) {
    return 'localhost';
  }
  const parts = hostNoPort.split('.');
  return parts.length <= 2 ? hostNoPort : parts.slice(-2).join('.');
}

export function DiscourseHandshake() {
  const { address, isConnected } = useAccount();
  const prevAddressRef = useRef<string | null>(null);
  const pendingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const currentAddress = address?.toLowerCase() || null;

    // Detect wallet disconnection or account switch
    if (prevAddressRef.current && currentAddress !== prevAddressRef.current) {
      // Wallet switched or disconnected — log out
      const domainAttr = cookieDomainAttr(window.location.host);
      document.cookie = `current_wallet=; path=/; max-age=0; ${domainAttr}SameSite=Lax`;
      sessionStorage.removeItem(HANDSHAKE_SESSION_KEY);

      if (currentAddress) {
        // Account switched — log out then log back in with new address
        if (process.env.NODE_ENV === 'development') {
          console.log(`War Room: Account switch detected ${prevAddressRef.current} → ${currentAddress}`);
        }
        const logoutIframe = document.createElement('iframe');
        logoutIframe.src = `http://community.${getProceedDomain()}/logout`;
        logoutIframe.style.display = 'none';
        document.body.appendChild(logoutIframe);

        const timer = setTimeout(() => {
          const loginIframe = document.createElement('iframe');
          loginIframe.src = `http://community.${getProceedDomain()}/session/sso?t=${Date.now()}`;
          loginIframe.style.display = 'none';
          document.body.appendChild(loginIframe);

          setTimeout(() => {
            if (document.body.contains(logoutIframe)) document.body.removeChild(logoutIframe);
            if (document.body.contains(loginIframe)) document.body.removeChild(loginIframe);
          }, 5000);
        }, 1500);

        pendingTimeoutRef.current = timer;
      } else {
        // Wallet disconnected — just log out
        if (process.env.NODE_ENV === 'development') {
          console.log(`War Room: Wallet disconnected`);
        }
        const logoutIframe = document.createElement('iframe');
        logoutIframe.src = `http://community.${getProceedDomain()}/logout`;
        logoutIframe.style.display = 'none';
        document.body.appendChild(logoutIframe);

        setTimeout(() => {
          if (document.body.contains(logoutIframe)) document.body.removeChild(logoutIframe);
        }, 3000);
      }
      prevAddressRef.current = currentAddress;
      return;
    }

    // Normal login flow: connected with address and not yet handed off
    if (isConnected && currentAddress) {
      prevAddressRef.current = currentAddress;

      const domainAttr = cookieDomainAttr(window.location.host);
      document.cookie = `current_wallet=${currentAddress}; path=/; max-age=3600; ${domainAttr}SameSite=Lax`;

      // Idempotency guard
      const last = sessionStorage.getItem(HANDSHAKE_SESSION_KEY);
      if (last === currentAddress) return;
      sessionStorage.setItem(HANDSHAKE_SESSION_KEY, currentAddress);

      if (process.env.NODE_ENV === 'development') {
        console.log(`War Room: Forcing sync for ${currentAddress}`);
      }

      const logoutIframe = document.createElement('iframe');
      logoutIframe.src = `http://community.${getProceedDomain()}/logout`;
      logoutIframe.style.display = 'none';
      document.body.appendChild(logoutIframe);

      const timer = setTimeout(() => {
        const loginIframe = document.createElement('iframe');
        loginIframe.src = `http://community.${getProceedDomain()}/session/sso?t=${Date.now()}`;
        loginIframe.style.display = 'none';
        document.body.appendChild(loginIframe);

        setTimeout(() => {
          if (document.body.contains(logoutIframe)) document.body.removeChild(logoutIframe);
          if (document.body.contains(loginIframe)) document.body.removeChild(loginIframe);
        }, 5000);
      }, 1500);

      pendingTimeoutRef.current = timer;
      return () => clearTimeout(timer);
    }
  }, [isConnected, address]);

  useEffect(() => {
    return () => {
      if (pendingTimeoutRef.current) clearTimeout(pendingTimeoutRef.current);
    };
  }, []);

  return null;
}