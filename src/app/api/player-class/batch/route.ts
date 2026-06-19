import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.PONDER_DATABASE_URL,
});

export async function POST(req: Request) {
  try {
    const { seasonAddress, userAddresses, massThreshold } = await req.json();

    if (!seasonAddress || !Array.isArray(userAddresses) || massThreshold === undefined) {
      return NextResponse.json(null, { status: 400 });
    }

    const sAddr = seasonAddress.toLowerCase();
    // Remove duplicates to save DB calls
    const uniqueAddresses = Array.from(new Set(userAddresses.map((a: string) => a.toLowerCase())));

    if (uniqueAddresses.length === 0) return NextResponse.json({});

    const rawThreshold = BigInt(massThreshold);
    const results: Record<string, { classPercentile: number; isCapitalist: boolean; totalInClass: number; classRank: number }> = {};

    // Parallel execution is efficient here because Postgres handles concurrent reads well
    await Promise.all(uniqueAddresses.map(async (uAddr) => {
      
      // 1. Get Balance
      const userRes = await pool.query(`
        SELECT fim_balance 
        FROM player_season_stats 
        WHERE season_address = $1 AND player_address = $2
        LIMIT 1
      `, [sAddr, uAddr]);

      if (userRes.rowCount === 0) {
        // Player has no stats, skip
        return;
      }

      const row = userRes.rows[0];
      const balanceValue = row.fim_balance ?? row.fimBalance ?? row.balance;
      const rawUserBalance = BigInt(balanceValue);

      const isCapitalist = rawUserBalance > rawThreshold;
      const operator = isCapitalist ? '>' : '<=';

      // 2. Get Stats relative to faction
      // Optimization: We check "richer than" count directly
      const statsRes = await pool.query(`
        SELECT 
          COUNT(*) as total_in_faction,
          COUNT(*) FILTER (WHERE fim_balance > $3::NUMERIC) as richer_than_user
        FROM player_season_stats
        WHERE season_address = $1
          AND fim_balance ${operator} $2::NUMERIC
      `, [sAddr, rawThreshold.toString(), rawUserBalance.toString()]);

      const totalInClass = Number(statsRes.rows[0].total_in_faction ?? 0);
      const richerThanUser = Number(statsRes.rows[0].richer_than_user ?? 0);
      const rank = richerThanUser + 1;

      let classPercentile = 0;
      if (totalInClass <= 1) {
        classPercentile = 100;
      } else {
        const index = totalInClass - rank;
        classPercentile = (index / (totalInClass - 1)) * 100;
      }

      results[uAddr] = {
        classPercentile,
        isCapitalist,
        totalInClass,
        classRank: rank
      };
    }));

    return NextResponse.json(results);

  } catch (error: unknown) {
    console.error("Batch player-class API Error:", error instanceof Error ? error.message : error);
    return NextResponse.json(null, { status: 500 });
  }
}