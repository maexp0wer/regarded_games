import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.PONDER_DATABASE_URL,
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }

  const seasonAddress = address.toLowerCase();

  try {
    // 1. Try selecting with snake_case (Standard Ponder behavior)
    // We use COALESCE(SUM(...), 0) so we never get NULL back
    const query = `
      SELECT 
        COALESCE(SUM(buyback_amt), 0)::TEXT as buyback,
        COALESCE(SUM(liquidity_amt), 0)::TEXT as liquidity,
        COALESCE(SUM(reinvest_amt), 0)::TEXT as reinvest,
        COALESCE(SUM(dao_amt), 0)::TEXT as dao
      FROM yield_events
      WHERE season_address = $1
    `;

    const res = await pool.query(query, [seasonAddress]);
    
    // DEBUG: Log the result to your terminal

    if (res.rows.length === 0) {
        // This shouldn't happen with aggregations, but just in case
        return NextResponse.json({ buyback: "0", liquidity: "0", reinvest: "0", dao: "0" });
    }

    return NextResponse.json(res.rows[0]);

  } catch (error) {
    // Full detail (e.g. "column buyback_amt does not exist") stays server-side.
    console.error("[API] SQL Error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}