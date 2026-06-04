'use client';

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount, useSignMessage } from 'wagmi';
import { buildLoginMessage } from '@/utils/communityAuthMessage';

const SESSION_ENDPOINT = '/api/auth/community-session';

/**
 * The verified community session. Drives the "Sign in to the War Room" gate on
 * chat + forum. One signature establishes an HttpOnly session cookie that the
 * protected Discourse routes trust; no signing on connect, none per message.
 */
export function useCommunitySession() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const queryClient = useQueryClient();

  // Who (if anyone) the session cookie currently authenticates.
  const { data: sessionAddress, isLoading } = useQuery<string | null>({
    queryKey: ['communitySession'],
    queryFn: async () => {
      const res = await fetch(SESSION_ENDPOINT, { cache: 'no-store' });
      if (!res.ok) return null;
      const data = await res.json();
      return (data.address as string | null) ?? null;
    },
    staleTime: 60_000,
  });

  const signedIn =
    !!address && !!sessionAddress && sessionAddress.toLowerCase() === address.toLowerCase();

  const signInMutation = useMutation({
    mutationFn: async () => {
      if (!address) throw new Error('Connect your wallet first.');
      const issuedAt = Date.now();
      const signature = await signMessageAsync({ message: buildLoginMessage(address, issuedAt) });
      const res = await fetch(SESSION_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, issuedAt, signature }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Sign-in failed (${res.status})`);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['communitySession'] }),
  });

  const signOutMutation = useMutation({
    mutationFn: async () => {
      await fetch(SESSION_ENDPOINT, { method: 'DELETE' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['communitySession'] }),
  });

  const signIn = useCallback(() => signInMutation.mutateAsync(), [signInMutation]);
  const signOut = useCallback(() => signOutMutation.mutateAsync(), [signOutMutation]);

  return {
    signedIn,
    isLoading,
    signIn,
    signOut,
    isSigningIn: signInMutation.isPending,
    signInError: signInMutation.error instanceof Error ? signInMutation.error.message : null,
  };
}
