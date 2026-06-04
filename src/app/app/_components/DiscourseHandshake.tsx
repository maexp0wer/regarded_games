'use client';

import { useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Keeps Discourse + community-session state aligned with the connected wallet.
 *
 * Identity for chat/forum and the SSO forum-login now comes from the *verified*
 * community session (see `useCommunitySession`), established on demand when the
 * user signs the sign-in message — NOT from a client-written cookie, and NOT on
 * connect. Account provisioning (`sync_sso`) also happens at that sign-in step.
 *
 * So this component's only remaining job is teardown on wallet switch/disconnect:
 *   - clear the community session cookie, so the previous wallet's session can't
 *     carry over to a newly connected wallet, and
 *   - terminate the previous wallet's Discourse sessions (admin `log_out`).
 */
export function DiscourseHandshake() {
  const { address, isConnected } = useAccount();
  const prevAddressRef = useRef<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const currentAddress = address?.toLowerCase() || null;
    const prev = prevAddressRef.current;
    if (currentAddress === prev) return;
    prevAddressRef.current = currentAddress;

    // Wallet switched or disconnected — tear down the previous wallet's state.
    if (prev && prev !== currentAddress) {
      // Drop the verified session cookie (it's HttpOnly, so only the server can).
      fetch('/api/auth/community-session', { method: 'DELETE', keepalive: true }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['communitySession'] });
      // Terminate the previous wallet's Discourse sessions.
      fetch('/api/discourse/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: prev, action: 'logout' }),
        keepalive: true,
      }).catch(() => {});
    }
  }, [isConnected, address, queryClient]);

  return null;
}
