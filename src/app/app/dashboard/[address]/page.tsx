import React from 'react';
import { isAddress } from 'viem';
import { notFound } from 'next/navigation';
import { SeasonListDashboard } from '../../_components/SeasonListDashboard';
import { PlayerProfile } from '../../_components/PlayerProfile';
import { Alerts } from '../../_components/Alerts';


// 1. Mark the component as async
// 2. Update the type: params is now a Promise
export default async function UserDashboardPage({ 
  params 
}: { 
  params: Promise<{ address: string }> 
}) {
  
  // 3. Await the params before using them
  const { address } = await params;

  // 1. Safety: Validate Ethereum Address
  if (!isAddress(address)) {
    return notFound();
  }

  return (
    <main className="w-full flex flex-col gap-8 animate-in fade-in duration-700">
      <Alerts playerAddress={address} />
      <PlayerProfile profileAddress={address as `0x${string}`} />
      <SeasonListDashboard playerAddress={address} />
    </main>
  );
}