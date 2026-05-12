'use client';

import { SwapMask } from '../_components/SwapMask';

export default function SwapPage() {
  return (
    <main className="py-8 flex flex-col items-center justify-center">
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
          <SwapMask/>
        </div>
    </main>
  );
}