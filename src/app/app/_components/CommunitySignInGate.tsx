'use client';

import { useAccount } from 'wagmi';
import { useCommunitySession } from '@/hooks/useCommunitySession';

interface CommunitySignInGateProps {
  /** Short line describing what the user is unlocking, e.g. "the faction chat". */
  feature?: string;
}

/**
 * Sign-in wall for the community features (chat + forum). Renders in place of the
 * room contents until the user establishes a verified community session. One
 * signature here unlocks both chat and forum for ~7 days. See useCommunitySession.
 */
export function CommunitySignInGate({ feature = 'the War Room' }: CommunitySignInGateProps) {
  const { address } = useAccount();
  const { signIn, isSigningIn, signInError } = useCommunitySession();

  if (!address) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="terminal-pane-title" style={{ color: 'var(--color-text2)' }}>
          Connect your wallet to participate
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="terminal-pane-title">Verify to enter {feature}</span>
      <p className="font-mono text-[11px] max-w-[22rem]" style={{ color: 'var(--color-text2)' }}>
        Sign a message to prove this wallet. No gas, no transaction — it just unlocks
        the faction rooms for this device.
      </p>
      <button className="btn-game-secondary" onClick={() => signIn().catch(() => {})} disabled={isSigningIn}>
        {isSigningIn ? 'Awaiting signature…' : 'Sign in to the War Room'}
      </button>
      {signInError && (
        <p className="font-mono text-[10px] text-red-500" style={{ color: 'var(--color-red)' }}>
          {signInError.slice(0, 140)}
        </p>
      )}
    </div>
  );
}
