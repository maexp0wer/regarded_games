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
console.log(`DB: ${u.pathname.slice(1)}  user: ${u.username}`);

const { rows: cur } = await c.query(`SELECT current_database() AS db, current_user AS usr, current_schemas(true) AS schemas`);
console.log(`current_database=${cur[0].db} current_user=${cur[0].usr} schemas=${cur[0].schemas}\n`);

const { rows: schemas } = await c.query(
  `SELECT schema_name FROM information_schema.schemata
   WHERE schema_name NOT IN ('information_schema','pg_catalog','pg_toast')
   ORDER BY schema_name`
);
console.log(`Schemas: ${schemas.map((s) => s.schema_name).join(', ')}\n`);

const { rows: tables } = await c.query(
  `SELECT table_schema, table_name
   FROM information_schema.tables
   WHERE table_schema NOT IN ('information_schema','pg_catalog')
   ORDER BY table_schema, table_name`
);
if (tables.length === 0) {
  console.log('No user tables found in any non-system schema.');
} else {
  for (const t of tables) console.log(`  ${t.table_schema}.${t.table_name}`);
}

await c.end();
