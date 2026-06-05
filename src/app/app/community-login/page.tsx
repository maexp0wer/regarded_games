'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useCommunitySession } from '@/hooks/useCommunitySession';

/**
 * Bounce page for Discourse SSO. Discourse → /api/auth/discourse → here (when
 * no session exists) → user signs → back to /api/auth/discourse to complete SSO.
 */
export default function CommunityLoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { address } = useAccount();
  const { signedIn, isLoading, signIn, isSigningIn, signInError } = useCommunitySession();

  const sso = searchParams.get('sso') ?? '';
  const sig = searchParams.get('sig') ?? '';

  // Once session is established, forward back to the SSO endpoint to complete the flow.
  useEffect(() => {
    if (signedIn && sso && sig) {
      router.replace(`/api/auth/discourse?sso=${encodeURIComponent(sso)}&sig=${encodeURIComponent(sig)}`);
    }
  }, [signedIn, sso, sig, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="font-mono text-sm animate-pulse" style={{ color: 'var(--color-text2)' }}>
          Reading Ledger…
        </span>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="card-app flex flex-col items-center gap-5 text-center max-w-sm w-full">
        <h2 className="h3-app text-text">Enter the War Room</h2>
        <p className="font-mono text-[11px] leading-relaxed" style={{ color: 'var(--color-text2)' }}>
          Sign a message with your wallet to verify ownership and continue to the community forum. No gas, no transaction.
        </p>
        {!address ? (
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <button className="btn-game-primary w-full" onClick={openConnectModal}>
                Connect Wallet
              </button>
            )}
          </ConnectButton.Custom>
        ) : (
          <button className="btn-game-primary w-full" onClick={() => signIn().catch(() => {})} disabled={isSigningIn}>
            {isSigningIn ? 'Awaiting signature…' : 'Sign in'}
          </button>
        )}
        {signInError && (
          <p className="font-mono text-[10px]" style={{ color: 'var(--color-red)' }}>
            {signInError.slice(0, 140)}
          </p>
        )}
      </div>
    </div>
  );
}
