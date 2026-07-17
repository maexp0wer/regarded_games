// Shared connection pool for the Ponder indexer database (PONDER_DATABASE_URL).
//
// This is a DIFFERENT database from the app's own Postgres (POSTGRES_URL, served
// by src/lib/db.ts) — it holds the indexer's on-chain-derived tables. Routes that
// read those tables (player-class, yield) share this one process-wide pool instead
// of each instantiating their own, so we don't multiply idle connections.
//
// pg type parsers are configured globally in src/lib/db.ts (setTypeParser is
// module-global), so both pools share the same numeric/text parsing.

import { Pool, QueryResult, QueryResultRow } from 'pg';

let pool: Pool;

if (!process.env.PONDER_DATABASE_URL) {
  console.error('ERROR: Missing PONDER_DATABASE_URL. Ponder DB queries will fail.');
  pool = new Pool();
} else {
  pool = new Pool({ connectionString: process.env.PONDER_DATABASE_URL });
}

export const ponderPool = pool;

/** Run a parameterized query against the Ponder DB. Mirrors src/lib/db.ts `query`. */
export const ponderQuery = async <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> => {
  const client = await pool.connect();
  try {
    return await client.query<T>(text, params as (string | number | boolean | Date | null | undefined)[]);
  } finally {
    client.release();
  }
};
