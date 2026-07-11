'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useCommunitySession } from '@/hooks/useCommunitySession';
import LedgerLoader from '@/components/LedgerLoader';

/**
 * Bounce page for Discourse SSO. Discourse → /api/auth/discourse → here (whenever
 * the connected wallet isn't confirmed to own the session cookie) → user signs (or
 * is already signed in with the *connected* wallet) → we mint a nonce-bound confirm
 * token → back to /api/auth/discourse with it to complete SSO. The confirm token is
 * what lets the SSO endpoint distinguish "cookie owner is present" from "some stale
 * cookie is lying around", so a foreign cookie can't log its owner in as someone else.
 */
export default function CommunityLoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { address } = useAccount();
  const { signedIn, isLoading, signIn, isSigningIn, signInError } = useCommunitySession();

  const sso = searchParams.get('sso') ?? '';
  const sig = searchParams.get('sig') ?? '';

  // Once the session is established AND belongs to the *connected* wallet
  // (`signedIn` already requires sessionAddress === connected address), fetch a
  // confirmation token bound to this SSO nonce, then forward to the SSO endpoint
  // with it. The endpoint trusts the session cookie only when this token proves
  // the cookie's owner is the wallet actually present — so a stale/foreign cookie
  // can never silently log its owner in as whoever is at the keyboard.
  useEffect(() => {
    if (!signedIn || !sso || !sig) return;
    let cancelled = false;

    const nonce = new URLSearchParams(atob(sso)).get('nonce');
    if (!nonce) return;

    (async () => {
      try {
        const res = await fetch(`/api/auth/discourse/confirm?nonce=${encodeURIComponent(nonce)}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const { confirm } = await res.json();
        if (cancelled || !confirm) return;
        router.replace(
          `/api/auth/discourse?sso=${encodeURIComponent(sso)}&sig=${encodeURIComponent(sig)}&confirm=${encodeURIComponent(confirm)}`,
        );
      } catch {
        // Transient — the effect re-runs on the next render / session change.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [signedIn, sso, sig, router]);

  if (isLoading) {
    return <LedgerLoader fullPage />;
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="card-app flex flex-col items-center gap-5 text-center max-w-sm w-full">
        <h2 className="h3-app text-text">Forum log in</h2>
        <p className="font-mono text-[11px] leading-relaxed" style={{ color: 'var(--color-text2)' }}>
          Sign a message to verify your wallet and continue to the forum.
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
          <button
            className="btn-game-primary w-full"
            onClick={() => signIn().catch(() => {})}
            disabled={isSigningIn || signedIn}
          >
            {signedIn ? 'Redirecting…' : isSigningIn ? 'Awaiting signature…' : 'Sign'}
          </button>
        )}
        {signInError && process.env.NEXT_PUBLIC_FRONTEND_DEBUG === 'true' && (
          <p className="font-mono text-[10px]" style={{ color: 'var(--color-red)' }}>
            {signInError.slice(0, 140)}
          </p>
        )}
      </div>
    </div>
  );
}
