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
  CREATE TABLE IF NOT EXISTS session_fingerprints (
    id               SERIAL PRIMARY KEY,
    address          TEXT NOT NULL,
    ip_hash          TEXT,
    user_agent_hash  TEXT,
    captcha_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`);

await client.query(`
  CREATE INDEX IF NOT EXISTS idx_sf_address ON session_fingerprints(address);
`);

await client.query(`
  CREATE INDEX IF NOT EXISTS idx_sf_ip_hash ON session_fingerprints(ip_hash)
    WHERE ip_hash IS NOT NULL;
`);

const { rows } = await client.query(`
  SELECT column_name, data_type FROM information_schema.columns
  WHERE table_name = 'session_fingerprints' ORDER BY ordinal_position;
`);
console.log('session_fingerprints columns:');
for (const r of rows) console.log(`  ${r.column_name} : ${r.data_type}`);

await client.end();
console.log('Done.');
