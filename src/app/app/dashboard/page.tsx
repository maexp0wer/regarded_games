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
    <main className="w-full animate-in fade-in duration-700">
      <div className="terminal-pane connect-gate w-full max-w-2xl mx-auto">
        <div className="terminal-pane-header">
          <span className="terminal-pane-title">Dashboard</span>
        </div>
        <div className="connect-gate-body">
          <span className="font-sans text-sm text-text2 mb-4">
            Connect your wallet to view your dashboard
          </span>
          <WalletButton />
        </div>
      </div>
    </main>
  );
}
