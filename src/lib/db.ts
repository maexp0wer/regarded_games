// lib/db.ts OR src/lib/db.ts
import { Pool, types, QueryResult, QueryResultRow } from 'pg';

// --- Explicit Type Parsers ---
// Resolve potential ambiguities and ensure consistent type handling.
const TEXT_OID = 25;
const VARCHAR_OID = 1043;
const INT8_OID = 20;
const INT2_OID = 21;
const INT4_OID = 23;
const NUMERIC_OID = 1700;
const FLOAT4_OID = 700;
const FLOAT8_OID = 701;
// Add other OIDs as needed (DATE, TIMESTAMP, JSON, etc.) if default parsing isn't sufficient

types.setTypeParser(TEXT_OID, (val: string) => val);
types.setTypeParser(VARCHAR_OID, (val: string) => val);
types.setTypeParser(INT2_OID, (val: string) => parseInt(val, 10));
types.setTypeParser(INT4_OID, (val: string) => parseInt(val, 10));
// Consider using BigInt for INT8 if necessary: types.setTypeParser(INT8_OID, BigInt);
types.setTypeParser(INT8_OID, (val: string) => parseInt(val, 10)); // Assuming numbers fit in JS safe integer range
types.setTypeParser(NUMERIC_OID, (val: string) => parseFloat(val));
types.setTypeParser(FLOAT4_OID, (val: string) => parseFloat(val));
types.setTypeParser(FLOAT8_OID, (val: string) => parseFloat(val));
// --- End Type Parsers ---

let pool: Pool;

const CONNECTION_OPTIONS = {
  connectionString: process.env.POSTGRES_URL,
  // --- SSL Configuration ---
  // Uncomment and configure if your database provider requires SSL
  // ssl: {
  //   rejectUnauthorized: false // Adjust based on provider requirements
  // }
};



if (!process.env.POSTGRES_URL) {
  console.error("ERROR: Missing POSTGRES_URL environment variable. Database connections will fail.");
  // In production, you might want to prevent the app from starting or handle this more gracefully.
  // For now, create a dummy pool that will fail on connection attempts.
  pool = new Pool();
} else {
  pool = new Pool(CONNECTION_OPTIONS);
}

// Listen for errors on idle clients
/*
pool.on('error', (err, client) => {
  console.error('DATABASE POOL ERROR: Unexpected error on idle client', err);
  // Consider more robust error handling or process exit in production
  // process.exit(-1);
});
*/
/**
 * Executes a SQL query against the database pool.
 * @param text The SQL query string with placeholders ($1, $2, etc.).
 * @param params An optional array of parameters to safely substitute into the query.
 * @returns A Promise resolving to the QueryResult.
 */
export const query = async <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[] // 2. Use 'unknown[]' instead of 'any[]' for input safety
): Promise<QueryResult<T>> => {
  let client;
  try {
    client = await pool.connect();
    
    // 3. We cast 'params' to 'any[]' here because the 'pg' library internally 
    // expects 'any[]'. This isolates the 'any' usage to this one line.
    const result = await client.query<T>(text, params as (string | number | boolean | Date | null | undefined)[]);
    
    return result;
  } catch (error) {
     console.error('DATABASE QUERY ERROR:', {
        error: error,
        queryText: text,
        queryParams: params
    });
     throw error;
  } finally {
    if (client) {
        client.release();
    }
  }
};
