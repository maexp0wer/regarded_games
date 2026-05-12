import React from 'react';
import { isAddress } from 'viem';
import { notFound } from 'next/navigation';
import { PlayerActiveSeasons } from '../../_components/PlayerActiveSeasons';
import { PlayerProfile } from '../../_components/PlayerProfile';
import { ClaimableAlerts } from '../../_components/ClaimableAlerts'; // Add this


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
    <div className="w-full">
      <main className="py-8 w-full">
        
        {/* Mobile: flex-col-reverse puts Holdings on TOP. Desktop: grid resets it. */}
        <div className="flex flex-col-reverse lg:grid lg:grid-cols-3 gap-12 items-start">
          
          {/* Left Column (2/3): Main Content */}
          <div className="w-full lg:col-span-2 space-y-8 min-w-0">
            <ClaimableAlerts playerAddress={address} />
            <PlayerActiveSeasons playerAddress={address} />
          </div>

          {/* Right Column (1/3): Player Stats/Profile */}
          <div className="w-full lg:col-span-1 min-w-0">
            <PlayerProfile profileAddress={address as `0x${string}`} />
          </div>

        </div>

      </main>
    </div>
  );
}