import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Use /api/rpc/mainnet or /api/rpc/sepolia' },
    { status: 400 }
  );
}
