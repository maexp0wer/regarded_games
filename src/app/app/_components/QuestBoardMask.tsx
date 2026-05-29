'use client';

import { useAccount } from 'wagmi';
import { useQuests } from '@/hooks/useQuests';
import { QuestBoard } from './QuestBoard';
import { WalletButton } from './WalletButton';

export function QuestBoardMask() {
  const { address, isConnected } = useAccount();
  const { data, isLoading, isError } = useQuests(address);

  if (!isConnected || !address) {
    return (
      <div className="w-full terminal-pane flex flex-col items-center justify-center gap-4 py-12">
        <span className="font-mono text-[10px] uppercase text-text2 tracking-widest">
          Wallet Required to Initialize Quest Vector
        </span>
        <WalletButton />
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="w-full terminal-pane py-12 text-center animate-pulse">
        <span className="font-mono text-xs uppercase text-text2 tracking-widest">
          Reading Ledger...
        </span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full terminal-pane py-12 text-center">
        <span className="font-mono text-xs text-red-500">
          Failed to load quests. Try refreshing.
        </span>
      </div>
    );
  }

  return (
    <QuestBoard
      mainQuests={data.mainQuests}
      userTotalPoints={data.totalPoints}
      tgeConversionRate={data.tgeConversionRate}
    />
  );
}
