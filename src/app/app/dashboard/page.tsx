'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { WalletButton } from '../_components/WalletButton';

export default function DashboardIndexPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (isConnected && address) {
      router.replace(`/dashboard/${address}`);
    }
  }, [isConnected, address, router]);

  return (
    <div className="w-full py-16 flex flex-col items-center gap-4 text-center">
      <h2 className="font-display font-extrabold text-2xl text-text">
        Connect your wallet
      </h2>
      <p className="section-label opacity-60">
        Connect to view your dashboard.
      </p>
      <div className="mt-2">
        <WalletButton />
      </div>
    </div>
  );
}
