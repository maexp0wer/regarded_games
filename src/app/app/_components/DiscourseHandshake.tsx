'use client';

import { useEffect } from 'react';
import { useAccount } from 'wagmi';

export function DiscourseHandshake() {
  const { address, isConnected } = useAccount();

  useEffect(() => {
    if (isConnected && address) {
      // 1. Set a cookie that the Next.js API can read
      // In a real app, you'd use SIWE, but for dev, this is 100% reliable.
      document.cookie = `current_wallet=${address}; path=/; max-age=3600;`;

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
    }
  }, [isConnected, address]);

  return null;
}