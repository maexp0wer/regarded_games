'use client';

import { useAccount } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { Turnstile } from '@marsidev/react-turnstile';
import { useQuests } from '@/hooks/useQuests';
import { QuestBoard } from './QuestBoard';
import { WalletButton } from './WalletButton';

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

async function verifyCaptchaToken(address: string, captchaToken: string): Promise<void> {
  const res = await fetch('/api/quests/verify-human', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, captchaToken }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error ?? 'captcha_failed');
  }
}

export function QuestBoardMask() {
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuests(address);

  const walletBanner = (!isConnected || !address) ? (
    <div className="w-full terminal-pane flex flex-col items-center justify-center gap-4 py-8 mb-6">
      <span className="font-mono text-[10px] uppercase text-text2 tracking-widest">
        Connect Your Wallet to participate
      </span>
      <WalletButton />
    </div>
  ) : null;

  if (isLoading || !data) {
    return (
      <>
        {walletBanner}
        <div className="w-full terminal-pane py-12 text-center animate-pulse">
          <span className="font-mono text-xs uppercase text-text2 tracking-widest">
            Reading Ledger...
          </span>
        </div>
      </>
    );
  }

  if (isError) {
    return (
      <>
        {walletBanner}
        <div className="w-full terminal-pane py-12 text-center">
          <span className="font-mono text-xs text-[--color-red]">
            Failed to load quests. Try refreshing.
          </span>
        </div>
      </>
    );
  }

  // Show CAPTCHA gate when wallet is connected but not yet verified.
  // In local dev (no SITE_KEY), the gate is skipped entirely.
  const needsCaptcha = isConnected && address && !data.captchaVerified && !!SITE_KEY;

  return (
    <>
      {walletBanner}
      {needsCaptcha && (
        <div className="w-full terminal-pane flex flex-col items-center gap-4 py-8 mb-6">
          <span className="font-mono text-[9px] uppercase tracking-widest text-text2">
            Anti-Bot Verification
          </span>
          <h2 className="h3-app text-text">Prove you are human</h2>
          <p className="font-mono text-[11px] text-text2 text-center max-w-xs leading-relaxed">
            Complete the check below once to unlock quest point tracking.
          </p>
          <Turnstile
            siteKey={SITE_KEY}
            onSuccess={async (token) => {
              try {
                await verifyCaptchaToken(address, token);
                await queryClient.invalidateQueries({ queryKey: ['quests', address.toLowerCase()] });
              } catch {
                // Turnstile will auto-reset on failure; user can retry
              }
            }}
          />
        </div>
      )}
      <QuestBoard
        mainQuests={data.mainQuests}
        userTotalPoints={data.totalPoints}
        tgeConversionRate={data.tgeConversionRate}
      />
    </>
  );
}
