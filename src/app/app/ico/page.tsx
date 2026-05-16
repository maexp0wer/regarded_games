'use client';

import { IcoMask } from '../_components/IcoMask';

export default function IcoPage() {
  return (
    <main className="py-8 flex flex-col items-center justify-center">
      <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
        <IcoMask />
      </div>
    </main>
  );
}
