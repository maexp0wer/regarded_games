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
  CREATE TABLE IF NOT EXISTS quest_completions (
    address    TEXT NOT NULL,
    quest_id   TEXT NOT NULL,
    points     INTEGER NOT NULL,
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    note       TEXT,
    PRIMARY KEY (address, quest_id)
  );
`);

await client.query(`
  CREATE INDEX IF NOT EXISTS quest_completions_address_idx
    ON quest_completions (address);
`);

await client.query(`
  CREATE TABLE IF NOT EXISTS quest_config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

const { rows: completionsCols } = await client.query(`
  SELECT column_name, data_type FROM information_schema.columns
  WHERE table_name = 'quest_completions' ORDER BY ordinal_position;
`);
console.log('quest_completions columns:');
for (const r of completionsCols) console.log(`  ${r.column_name} : ${r.data_type}`);

const { rows: configCols } = await client.query(`
  SELECT column_name, data_type FROM information_schema.columns
  WHERE table_name = 'quest_config' ORDER BY ordinal_position;
`);
console.log('quest_config columns:');
for (const r of configCols) console.log(`  ${r.column_name} : ${r.data_type}`);

await client.end();
console.log('Done.');
