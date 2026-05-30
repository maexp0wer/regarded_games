import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const apiKey = process.env.ALCHEMY_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'ALCHEMY_API_KEY not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const rpcUrl = `https://base-mainnet.g.alchemy.com/v2/${apiKey}`;

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('RPC proxy error (mainnet):', error);
    return NextResponse.json(
      { error: 'RPC proxy failed' },
      { status: 500 }
    );
  }
}
