import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envText = readFileSync(join(__dirname, '..', '.env'), 'utf8');
const m = envText.match(/^POSTGRES_URL\s*=\s*"?([^"\r\n]+)"?/m);
const url = m[1];

const c = new pg.Client({ connectionString: url });
await c.connect();

const { rows: tables } = await c.query(`
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename;
`);

console.log(`Tables in ritardo_games (${tables.length}):\n`);

for (const { tablename } of tables) {
  const cols = await c.query(
    `SELECT column_name, data_type, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1
     ORDER BY ordinal_position`,
    [tablename]
  );
  const constraints = await c.query(
    `SELECT con.conname, pg_get_constraintdef(con.oid) AS def
     FROM pg_constraint con
     JOIN pg_class cls ON cls.oid = con.conrelid
     WHERE cls.relname = $1`,
    [tablename]
  );
  const indexes = await c.query(
    `SELECT indexname, indexdef FROM pg_indexes
     WHERE schemaname='public' AND tablename=$1`,
    [tablename]
  );
  const count = await c.query(`SELECT COUNT(*)::int AS n FROM "${tablename}"`);

  console.log(`-- TABLE: ${tablename} (${count.rows[0].n} rows) --`);
  for (const col of cols.rows) {
    const def = col.column_default ? ` DEFAULT ${col.column_default}` : '';
    const nn = col.is_nullable === 'NO' ? ' NOT NULL' : '';
    console.log(`  ${col.column_name}  ${col.data_type}${nn}${def}`);
  }
  for (const con of constraints.rows) console.log(`  CONSTRAINT ${con.conname} ${con.def}`);
  for (const idx of indexes.rows) console.log(`  ${idx.indexdef};`);
  console.log('');
}

await c.end();
