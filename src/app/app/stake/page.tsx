'use client';

import { StakeMask } from '../_components/StakeMask';

export default function StakePage() {
  return (
    <main className="py-8 flex flex-col items-center justify-center">
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
          <StakeMask/>
        </div>
    </main>
  );
}