import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_METHODS = new Set([
  'eth_call',
  'eth_getBalance',
  'eth_blockNumber',
  'eth_chainId',
  'eth_getTransactionReceipt',
  'eth_getTransactionByHash',
  'eth_getLogs',
  'eth_estimateGas',
  'eth_gasPrice',
  'eth_maxPriorityFeePerGas',
  'eth_feeHistory',
  'eth_getBlockByNumber',
  'eth_getBlockByHash',
  'eth_getCode',
  'net_version',
]);

function isAllowed(body: unknown): boolean {
  if (Array.isArray(body)) return body.every(isAllowed);
  if (typeof body !== 'object' || body === null) return false;
  const method = (body as Record<string, unknown>).method;
  return typeof method === 'string' && ALLOWED_METHODS.has(method);
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ALCHEMY_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'ALCHEMY_API_KEY not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();

    if (!isAllowed(body)) {
      return NextResponse.json({ error: 'Method not allowed' }, { status: 403 });
    }

    const rpcUrl = `https://base-sepolia.g.alchemy.com/v2/${apiKey}`;

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('RPC proxy error (sepolia):', error);
    return NextResponse.json({ error: 'RPC proxy failed' }, { status: 500 });
  }
}
