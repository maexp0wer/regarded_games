// Probes whether the Faucet contract has bytecode on the sepolia-fork RPC.
import { createPublicClient, http, defineChain } from 'viem';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const envText = readFileSync(join(__dirname, '..', '.env'), 'utf8');
const get = (k) => envText.match(new RegExp(`^${k}\\s*=\\s*"?([^"\\r\\n]+)"?`, 'm'))?.[1];

const sepoliaCore = JSON.parse(
  readFileSync(join(__dirname, '..', 'src', 'deployments', 'sepolia', 'core.json'), 'utf8')
);
const faucetAddr = sepoliaCore.Faucet;
console.log(`Faucet (per sepolia/core.json): ${faucetAddr}\n`);

const probes = [
  { id: 31338, name: 'Sepolia Fork (Anvil)', rpc: get('NEXT_PUBLIC_ANVIL_RPC_URL_SEPOLIA') || 'http://127.0.0.1:8546' },
  { id: 31337, name: 'Mainnet Fork (Anvil)', rpc: get('NEXT_PUBLIC_ANVIL_RPC_URL_MAINNET') || 'http://127.0.0.1:8545' },
];

for (const p of probes) {
  const chain = defineChain({ id: p.id, name: p.name, nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [p.rpc] } } });
  const client = createPublicClient({ chain, transport: http() });
  try {
    const blockNo = await client.getBlockNumber();
    const code = await client.getBytecode({ address: faucetAddr });
    const hasCode = code && code !== '0x';
    const cid = await client.getChainId();
    console.log(`${p.name} @ ${p.rpc}`);
    console.log(`  reachable: yes`);
    console.log(`  block:     ${blockNo}`);
    console.log(`  reported chainId: ${cid}`);
    console.log(`  faucet code: ${hasCode ? `YES (${code.length} chars)` : 'NO (0x)'}\n`);
  } catch (e) {
    console.log(`${p.name} @ ${p.rpc}`);
    console.log(`  unreachable: ${e.message}\n`);
  }
}
