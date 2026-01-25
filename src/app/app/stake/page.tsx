'use client';

import { Stake } from '../_components/Stake';

export default function StakePage() {
  return (
    <main className="min-h-screen p-4 md:p-8 flex flex-col items-center justify-center relative overflow-hidden bg-background">
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
          <Stake/>
        </div>
    </main>
  );
}