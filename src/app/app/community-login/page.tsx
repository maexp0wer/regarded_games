'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useCommunitySession } from '@/hooks/useCommunitySession';
import LedgerLoader from '@/components/LedgerLoader';
import { isSafeReturnPath } from '@/utils/discourseForum';

/**
 * Gate page for Discourse SSO. Two entry points:
 *
 * App forum links (`forumLoginUrl`) land here FIRST with `?return_path=<forum
 * page>` — the session is established BEFORE Discourse is contacted, then a warm
 * `/session/sso?return_path` round-trip (pure redirects, no human pause) carries
 * the user to the exact page. Starting at Discourse instead loses the target on
 * cold logins, because its nonce→return_path binding doesn't survive the sign-in
 * detour.
 *
 * Discourse-initiated logins arrive via /api/auth/discourse with `?sso=&sig=`
 * (whenever the connected wallet isn't confirmed to own the session cookie) →
 * user signs (or is already signed in with the *connected* wallet) → we mint a
 * nonce-bound confirm token → back to /api/auth/discourse to complete SSO. The
 * confirm token is what lets the SSO endpoint distinguish "cookie owner is
 * present" from "some stale cookie is lying around", so a foreign cookie can't
 * log its owner in as someone else.
 */
export default function CommunityLoginPage() {
  const searchParams = useSearchParams();
  const { address } = useAccount();
  const { signedIn, isLoading, signIn, isSigningIn, signInError } = useCommunitySession();

  const sso = searchParams.get('sso') ?? '';
  const sig = searchParams.get('sig') ?? '';
  // Intended forum page. App forum links (`forumLoginUrl`) land here FIRST, before
  // Discourse is ever contacted, carrying the target in this param.
  const returnPath = searchParams.get('return_path') ?? '';

  // Once the session is established AND belongs to the *connected* wallet
  // (`signedIn` already requires sessionAddress === connected address):
  //
  // 1. App-initiated (`return_path` present, no sso/sig yet): NOW start the SSO —
  //    `/session/sso?return_path=…`. Discourse binds the target to a fresh nonce
  //    and bounces back here with sso/sig (branch 2). Because the session already
  //    exists, that round-trip is pure redirects with no human pause — the only
  //    conditions under which Discourse's return_path binding reliably survives.
  //    Contacting Discourse BEFORE the session exists is the bug this ordering
  //    fixes: the sign-in pause invalidates the nonce binding → forum home.
  //
  // 2. Discourse-initiated (sso/sig present): resume the nonce — fetch a
  //    confirmation token bound to it, then forward to the SSO endpoint. The
  //    endpoint trusts the session cookie only when this token proves the cookie's
  //    owner is the wallet actually present — so a stale/foreign cookie can never
  //    silently log its owner in as whoever is at the keyboard.
  //
  // All hops use window.location (not router.*): these URLs are route handlers /
  // cross-origin redirect chains, and the App Router's RSC fetch would follow our
  // 307 cross-origin without cookies before falling back to a real navigation.
  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;

    if (isSafeReturnPath(returnPath)) {
      const discourseUrl = process.env.NEXT_PUBLIC_DISCOURSE_URL ?? '';
      window.location.replace(
        `${discourseUrl}/session/sso?return_path=${encodeURIComponent(returnPath)}`,
      );
      return;
    }

    if (!sso || !sig) return;
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
        window.location.replace(
          `/api/auth/discourse?sso=${encodeURIComponent(sso)}&sig=${encodeURIComponent(sig)}&confirm=${encodeURIComponent(confirm)}`,
        );
      } catch {
        // Transient — the effect re-runs on the next render / session change.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [signedIn, sso, sig, returnPath]);

  if (isLoading) {
    return <LedgerLoader fullPage />;
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="terminal-pane max-w-sm w-full">
        {/* HEADER */}
        <div className="terminal-pane-header">
          <span className="terminal-pane-title">Forum Log In</span>
        </div>

        {/* BODY */}
        <div className="flex flex-col items-center gap-5 text-center py-2">
          {signedIn ? (
            <p className="font-mono text-[11px] uppercase tracking-widest animate-pulse" style={{ color: 'var(--color-text2)' }}>
              Redirecting…
            </p>
          ) : (
            <>
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
                  disabled={isSigningIn}
                >
                  {isSigningIn ? 'Awaiting signature…' : 'Sign'}
                </button>
              )}
              {signInError && process.env.NEXT_PUBLIC_FRONTEND_DEBUG === 'true' && (
                <p className="font-mono text-[10px]" style={{ color: 'var(--color-red)' }}>
                  {signInError.slice(0, 140)}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
