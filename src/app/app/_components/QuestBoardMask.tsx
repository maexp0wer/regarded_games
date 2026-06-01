'use client';

import { useAccount } from 'wagmi';
import { useQuests } from '@/hooks/useQuests';
import { QuestBoard } from './QuestBoard';
import { WalletButton } from './WalletButton';

export function QuestBoardMask() {
  const { address, isConnected } = useAccount();
  const { data, isLoading, isError } = useQuests(address);

  // Until a wallet is connected the board still renders (nothing completed),
  // with this prompt sitting above it.
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
          <span className="font-mono text-xs text-red-500">
            Failed to load quests. Try refreshing.
          </span>
        </div>
      </>
    );
  }

  return (
    <>
      {walletBanner}
      <QuestBoard
        mainQuests={data.mainQuests}
        userTotalPoints={data.totalPoints}
        tgeConversionRate={data.tgeConversionRate}
      />
    </>
  );
}
