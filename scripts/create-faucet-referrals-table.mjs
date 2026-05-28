import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');

const envText = readFileSync(envPath, 'utf8');
const match = envText.match(/^POSTGRES_URL\s*=\s*"?([^"\r\n]+)"?/m);
if (!match) {
  console.error('POSTGRES_URL not found in .env');
  process.exit(1);
}
const connectionString = match[1];

const client = new pg.Client({ connectionString });
await client.connect();

await client.query(`
  CREATE TABLE IF NOT EXISTS faucet_referrals (
    referee_address  TEXT PRIMARY KEY,
    referrer_address TEXT NOT NULL,
    chain_id         INTEGER NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`);

await client.query(`
  CREATE INDEX IF NOT EXISTS faucet_referrals_referrer_idx
    ON faucet_referrals (referrer_address);
`);

const { rows } = await client.query(`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'faucet_referrals'
  ORDER BY ordinal_position;
`);

console.log('faucet_referrals columns:');
for (const r of rows) console.log(`  ${r.column_name} : ${r.data_type}`);

await client.end();
console.log('Done.');
