import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envText = readFileSync(join(__dirname, '..', '.env'), 'utf8');
const url = envText.match(/^POSTGRES_URL\s*=\s*"?([^"\r\n]+)"?/m)[1];

const c = new pg.Client({ connectionString: url });
await c.connect();

const u = new URL(url);
console.log(`Connected to ${u.pathname.slice(1)} as ${u.username}\n`);

await c.query(`
  CREATE TABLE IF NOT EXISTS player_profiles (
    address    TEXT PRIMARY KEY,
    name       TEXT,
    image_url  TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`);
console.log('  player_profiles ✓');

await c.query(`
  CREATE TABLE IF NOT EXISTS faucet_referrals (
    referee_address  TEXT PRIMARY KEY,
    referrer_address TEXT NOT NULL,
    chain_id         INTEGER NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`);
await c.query(`
  CREATE INDEX IF NOT EXISTS faucet_referrals_referrer_idx
    ON faucet_referrals (referrer_address);
`);
console.log('  faucet_referrals + index ✓\n');

await c.end();
console.log('Tables created.');
