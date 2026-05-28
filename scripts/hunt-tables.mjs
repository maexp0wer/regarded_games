import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envText = readFileSync(join(__dirname, '..', '.env'), 'utf8');
const url = envText.match(/^POSTGRES_URL\s*=\s*"?([^"\r\n]+)"?/m)[1];

const maintUrl = url.replace(/\/[^/]+$/, '/postgres');
const maint = new pg.Client({ connectionString: maintUrl });
try {
  await maint.connect();
} catch (e) {
  console.log(`Cannot connect to 'postgres' maintenance DB: ${e.message}`);
  process.exit(1);
}

const { rows: dbs } = await maint.query(
  `SELECT datname FROM pg_database WHERE datistemplate=false ORDER BY datname`
);
await maint.end();

console.log(`Scanning ${dbs.length} databases for 'player_profiles' or 'faucet_referrals'…\n`);

for (const { datname } of dbs) {
  const u = url.replace(/\/[^/]+$/, `/${datname}`);
  const c = new pg.Client({ connectionString: u });
  try {
    await c.connect();
    const { rows } = await c.query(
      `SELECT table_schema, table_name
       FROM information_schema.tables
       WHERE table_name IN ('player_profiles','faucet_referrals')
       ORDER BY table_schema, table_name`
    );
    if (rows.length) {
      console.log(`  ${datname}:`);
      for (const r of rows) console.log(`     ${r.table_schema}.${r.table_name}`);
    } else {
      console.log(`  ${datname}: (no match)`);
    }
    await c.end();
  } catch (e) {
    console.log(`  ${datname}: (skipped: ${e.message})`);
    try { await c.end(); } catch {}
  }
}
