import { NextResponse } from 'next/server';
import { ponderPool as pool } from '@/lib/ponderDb';

export async function POST(req: Request) {
  try {
    const { seasonAddress, userAddress, massThreshold } = await req.json();

    // 1. Validate Inputs
    if (!seasonAddress || !userAddress || massThreshold === undefined) {
      return NextResponse.json({ error: 'Missing required fields: seasonAddress, userAddress, massThreshold' }, { status: 400 });
    }

    const sAddr = seasonAddress.toLowerCase();
    const uAddr = userAddress.toLowerCase();

    // 2. Fetch User Balance (effective: fim_balance + fim_burned)
    const userQuery = `
      SELECT fim_balance, fim_burned
      FROM player_season_stats
      WHERE season_address = $1 AND player_address = $2
      LIMIT 1
    `;

    const userRes = await pool.query(userQuery, [sAddr, uAddr]);

    if (userRes.rowCount === 0) {
      return NextResponse.json({ error: 'Player not found in season' }, { status: 404 });
    }

    const row = userRes.rows[0];

    // Handle potential casing differences safely
    const balanceValue = row.fim_balance ?? row.fimBalance ?? row.balance;
    const burnedValue = row.fim_burned ?? row.fimBurned ?? 0;

    if (balanceValue === undefined) {
      console.error("Percentile API Error: Column 'fim_balance' not found in result.");
      return NextResponse.json({ error: 'Database schema mismatch: fim_balance column not found' }, { status: 500 });
    }

    const rawUserBalance = BigInt(balanceValue) + BigInt(burnedValue);
    const rawThreshold = BigInt(massThreshold); 

    const isCapitalist = rawUserBalance > rawThreshold;
    const operator = isCapitalist ? '>' : '<=';

    // 3. Count Stats (Rank & Total) using effective balance (fim_balance + fim_burned)
    const statsQuery = `
      SELECT
        COUNT(*) as total_in_faction,
        COUNT(*) FILTER (WHERE (fim_balance + COALESCE(fim_burned, 0)) > $3::NUMERIC) as richer_than_user
      FROM player_season_stats
      WHERE season_address = $1
        AND (fim_balance + COALESCE(fim_burned, 0)) ${operator} $2::NUMERIC
    `;

    const statsRes = await pool.query(statsQuery, [
        sAddr,
        rawThreshold.toString(),
        rawUserBalance.toString()
    ]);
    
    const totalInClass = Number(statsRes.rows[0].total_in_faction ?? 0);
    const richerThanUser = Number(statsRes.rows[0].richer_than_user ?? 0);

    // 4. Calculate distance percentile within the class
    const rank = richerThanUser + 1;
    let classPercentile = 0;

    if (totalInClass <= 1) {
      classPercentile = 100;
    } else {
      const index = totalInClass - rank;
      classPercentile = (index / (totalInClass - 1)) * 100;
    }

    return NextResponse.json({
      classPercentile,
      isCapitalist,
      totalInClass,
      classRank: rank
    });

  } catch (error) {
    // Keep this error log for monitoring production issues
    console.error("Player-class API Error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}