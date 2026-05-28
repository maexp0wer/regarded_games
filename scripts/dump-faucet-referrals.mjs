import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = readFileSync(join(__dirname, '..', '.env'), 'utf8')
  .match(/^POSTGRES_URL\s*=\s*"?([^"\r\n]+)"?/m)[1];

const u = new URL(url);
console.log(`Using DB: ${u.pathname.slice(1)} via ${u.username}\n`);

const c = new pg.Client({ connectionString: url });
await c.connect();
const { rows } = await c.query(
  `SELECT referee_address, referrer_address, chain_id, created_at
   FROM faucet_referrals ORDER BY created_at DESC`
);
if (rows.length === 0) {
  console.log('(empty)');
} else {
  for (const r of rows) {
    console.log(`  ${r.created_at.toISOString()}  chain=${r.chain_id}`);
    console.log(`    referee  = ${r.referee_address}`);
    console.log(`    referrer = ${r.referrer_address}`);
  }
}
await c.end();
