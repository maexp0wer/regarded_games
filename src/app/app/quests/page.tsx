'use client';

import { QuestBoardMask } from '../_components/QuestBoardMask';

export default function QuestsPage() {
  return (
    <main className="py-8 flex flex-col items-center justify-center px-4">
      <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150 w-full max-w-5xl">
        <QuestBoardMask />
      </div>
    </main>
  );
}
