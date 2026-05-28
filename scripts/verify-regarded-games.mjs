import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envText = readFileSync(join(__dirname, '..', '.env'), 'utf8');
const m = envText.match(/^POSTGRES_URL\s*=\s*"?([^"\r\n]+)"?/m);
const url = m[1];
console.log(`Connecting to: ${new URL(url).pathname.slice(1)} as ${new URL(url).username}\n`);

const c = new pg.Client({ connectionString: url });
await c.connect();

for (const t of ['player_profiles', 'faucet_referrals']) {
  const exists = await c.query(`SELECT to_regclass('public.${t}') AS r`);
  if (!exists.rows[0].r) {
    console.log(`  ${t}: MISSING`);
    continue;
  }
  const cols = await c.query(
    `SELECT column_name, data_type
     FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1
     ORDER BY ordinal_position`,
    [t]
  );
  const count = await c.query(`SELECT COUNT(*)::int AS n FROM ${t}`);
  console.log(`  ${t} (${count.rows[0].n} rows): ${cols.rows.map((r) => `${r.column_name} ${r.data_type}`).join(', ')}`);
}

// Verify the runtime role can write to faucet_referrals (idempotent).
const refTest = '0xdead000000000000000000000000000000000001';
const refrTest = '0xdead000000000000000000000000000000000002';
await c.query(
  `INSERT INTO faucet_referrals (referee_address, referrer_address, chain_id)
   VALUES ($1, $2, $3) ON CONFLICT (referee_address) DO NOTHING`,
  [refTest, refrTest, 84532]
);
const back = await c.query(
  `SELECT referrer_address, chain_id FROM faucet_referrals WHERE referee_address=$1`,
  [refTest]
);
console.log(`\n  write/read test: referrer=${back.rows[0].referrer_address} chain=${back.rows[0].chain_id}`);

await c.query(`DELETE FROM faucet_referrals WHERE referee_address=$1`, [refTest]);
console.log('  cleanup ok\n');

await c.end();
console.log('All checks passed.');
