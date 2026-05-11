import { NextResponse } from 'next/server';
import { createPublicClient, http, erc20Abi } from 'viem';
import { foundry, base, baseSepolia } from 'viem/chains'; 
import GameSeasonAbi from '@/deployments/abis/GameSeason.json';

// --- IN-MEMORY CACHES ---
// 1. Caches Group IDs to save API lookups
const groupIdCache: Record<string, number> = {};
// 2. NEW: Caches the user's last known faction to prevent spamming Discourse
const userFactionCache: Record<string, string> = {};

const getChainConfig = (chainId: number) => {
  switch (chainId) {
    case 8453: return { chain: base, rpcUrl: process.env.NEXT_PUBLIC_ALCHEMY_BASE_RPC_URL };
    case 84532: return { chain: baseSepolia, rpcUrl: process.env.NEXT_PUBLIC_ALCHEMY_BASE_SEPOLIA_RPC_URL };
    case 31337: 
    default: return { chain: foundry, rpcUrl: process.env.NEXT_PUBLIC_ANVIL_RPC_URL || "http://127.0.0.1:8545" };
  }
};

export async function POST(req: Request) {
  try {
    const { addresses, walletAddress, seasonAddress, fimAddress, seasonSlug } = await req.json();
    const walletsToProcess: string[] = addresses || (walletAddress ? [walletAddress] :[]);

    const url = process.env.NEXT_PUBLIC_DISCOURSE_URL!;
    const apiKey = process.env.DISCOURSE_API_KEY!;

    if (!url || !apiKey) return NextResponse.json({ error: "Env missing" }, { status: 500 });

    const headers: Record<string, string> = {
      'Api-Key': apiKey,
      'Api-Username': 'system',
      'Content-Type': 'application/json'
    };

    const targetChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 31337);
    const { chain, rpcUrl } = getChainConfig(targetChainId);
    
    const publicClient = createPublicClient({ chain, transport: rpcUrl ? http(rpcUrl) : http() });

    async function getGroupId(name: string): Promise<number | null> {
        if (groupIdCache[name]) return groupIdCache[name];
        const res = await fetch(`${url}/groups/${name}.json`, { headers });
        if (!res.ok) return null;
        const data = await res.json();
        groupIdCache[name] = data.group.id;
        return data.group.id;
    }

    for (const wallet of walletsToProcess) {
      const lowerWallet = wallet.toLowerCase();
      const username = lowerWallet; 
      
      // 1. BLOCKCHAIN CHECK
      const[balRaw, limitRaw] = await Promise.all([
        publicClient.readContract({ address: fimAddress as `0x${string}`, abi: erc20Abi, functionName: 'balanceOf', args:[lowerWallet as `0x${string}`] }),
        publicClient.readContract({ address: seasonAddress as `0x${string}`, abi: GameSeasonAbi, functionName: 'massThresholdBalance' })
      ]);

      const bal = BigInt(balRaw as bigint);
      const limit = BigInt(limitRaw as bigint);
      const isCap = bal > limit;

      const seasonIdMatch = seasonSlug?.match(/\d+/)?.[0] || "0";
      const seasonNum = Number(seasonIdMatch) + 1;

      const targetGroupName = isCap ? `S${seasonNum}_Capitalist` : `S${seasonNum}_Socialist`;
      const oldGroupName = isCap ? `S${seasonNum}_Socialist` : `S${seasonNum}_Capitalist`;

      // ==========================================
      // THE FIX: CHECK IN-MEMORY CACHE FIRST
      // ==========================================
      if (userFactionCache[username] === targetGroupName) {
          console.log(`⚡ CACHE HIT: ${username} is already ${targetGroupName}. Skipping API.`);
          continue; // Moves to the next wallet immediately!
      }
      
      console.log(`\n--- Switching Wallet: ${lowerWallet} ---`);
      console.log(`📊 On-Chain: Bal: ${bal}, Limit: ${limit} -> Target: ${targetGroupName}`);

      const targetGroupId = await getGroupId(targetGroupName);
      const oldGroupId = await getGroupId(oldGroupName);

      if (!targetGroupId || !oldGroupId) continue;

      // A. ADD TO TARGET GROUP
      const addRes = await fetch(`${url}/groups/${targetGroupId}/members.json`, {
          method: "PUT", headers, body: JSON.stringify({ usernames: username })
      });

      // B. REMOVE FROM OLD GROUP
      const removeRes = await fetch(`${url}/groups/${oldGroupId}/members.json`, {
          method: "DELETE", headers, body: JSON.stringify({ usernames: username })
      });

      // If successful, save the new state to our memory!
      if (addRes.ok) {
          userFactionCache[username] = targetGroupName;
          console.log(`✅ Assigned to ${targetGroupName} and cached.`);
      }
    }
    
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("BATCH SYNC CRASH:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}