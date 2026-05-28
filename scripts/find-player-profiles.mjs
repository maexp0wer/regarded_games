import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envText = readFileSync(join(__dirname, '..', '.env'), 'utf8');
const m = envText.match(/^POSTGRES_URL\s*=\s*"?([^"\r\n]+)"?/m);
const appUrl = m[1];
console.log(`App POSTGRES_URL points to: ${new URL(appUrl).pathname.slice(1)}`);

// Connect to the maintenance DB so we can iterate all databases.
const maintUrl = appUrl.replace(/\/[^/]+$/, '/postgres');
const maint = new pg.Client({ connectionString: maintUrl });
try {
  await maint.connect();
} catch (e) {
  console.log(`(Could not connect to 'postgres' maintenance DB: ${e.message})`);
  console.log('Falling back to checking just the app DB.');
  const c = new pg.Client({ connectionString: appUrl });
  await c.connect();
  const r = await c.query("SELECT to_regclass('public.player_profiles') AS exists");
  console.log(`player_profiles in ${new URL(appUrl).pathname.slice(1)}: ${r.rows[0].exists ? 'YES' : 'NO'}`);
  await c.end();
  process.exit(0);
}

const { rows: dbs } = await maint.query(
  `SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname`
);
await maint.end();

console.log(`\nFound ${dbs.length} databases. Checking each for 'player_profiles'…\n`);

for (const { datname } of dbs) {
  const u = appUrl.replace(/\/[^/]+$/, `/${datname}`);
  const c = new pg.Client({ connectionString: u });
  try {
    await c.connect();
    const r = await c.query("SELECT to_regclass('public.player_profiles') AS exists");
    const exists = r.rows[0].exists !== null;
    let count = null;
    if (exists) {
      try {
        const cr = await c.query('SELECT COUNT(*)::int AS n FROM player_profiles');
        count = cr.rows[0].n;
      } catch {}
    }
    console.log(`  ${datname.padEnd(30)} player_profiles: ${exists ? `YES (${count} rows)` : 'no'}`);
    await c.end();
  } catch (e) {
    console.log(`  ${datname.padEnd(30)} (skipped: ${e.message})`);
    try { await c.end(); } catch {}
  }
}
