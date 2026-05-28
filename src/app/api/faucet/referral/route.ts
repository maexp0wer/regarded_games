import { NextResponse } from 'next/server';
import { createPublicClient, http, isAddress, defineChain } from 'viem';
import { baseSepolia } from 'viem/chains';
import { query } from '@/lib/db';
import { FakeUSDCFaucetABI } from '@/lib/contracts';
import sepoliaCore from '@/deployments/sepolia/core.json';

const FORK_SEPOLIA = defineChain({
  id: 31338,
  name: 'Foundry Sepolia Fork',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_ANVIL_RPC_URL_SEPOLIA || 'http://127.0.0.1:8546'],
    },
  },
});

function clientForChain(chainId: number) {
  if (chainId === 31338) {
    return createPublicClient({ chain: FORK_SEPOLIA, transport: http() });
  }
  if (chainId === 84532) {
    const rpc = process.env.NEXT_PUBLIC_ALCHEMY_BASE_SEPOLIA_RPC_URL;
    return createPublicClient({ chain: baseSepolia, transport: http(rpc) });
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { referee, referrer, chainId } = body as {
      referee?: string;
      referrer?: string;
      chainId?: number;
    };

    if (!referee || !referrer || typeof chainId !== 'number') {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    if (!isAddress(referee, { strict: false }) || !isAddress(referrer, { strict: false })) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }

    const refereeLc = referee.toLowerCase();
    const referrerLc = referrer.toLowerCase();

    if (refereeLc === referrerLc) {
      return NextResponse.json({ error: 'self_referral' }, { status: 400 });
    }

    const client = clientForChain(chainId);
    if (!client) {
      return NextResponse.json({ error: 'Unsupported chain' }, { status: 400 });
    }

    const faucetAddr = (sepoliaCore as { Faucet?: `0x${string}` }).Faucet;
    if (!faucetAddr || faucetAddr === '0x0000000000000000000000000000000000000000') {
      return NextResponse.json({ error: 'Faucet not configured' }, { status: 500 });
    }

    const hasClaimed = await client.readContract({
      address: faucetAddr,
      abi: FakeUSDCFaucetABI,
      functionName: 'hasClaimed',
      args: [referee as `0x${string}`],
    });

    if (!hasClaimed) {
      return NextResponse.json({ error: 'not_claimed' }, { status: 400 });
    }

    await query(
      `INSERT INTO faucet_referrals (referee_address, referrer_address, chain_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (referee_address) DO NOTHING`,
      [refereeLc, referrerLc, chainId]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('POST /api/faucet/referral error:', error?.message ?? error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
