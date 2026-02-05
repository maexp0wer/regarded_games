import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.PONDER_DATABASE_URL,
});

export async function POST(req: Request) {
  try {
    const { seasonAddress, userAddress, massThreshold } = await req.json();

    // 1. Validate Inputs
    if (!seasonAddress || !userAddress || massThreshold === undefined) {
      return NextResponse.json(null, { status: 400 });
    }

    const sAddr = seasonAddress.toLowerCase();
    const uAddr = userAddress.toLowerCase();

    // 2. Fetch User Balance
    const userQuery = `
      SELECT fim_balance 
      FROM player_season_stats 
      WHERE season_address = $1 AND player_address = $2
      LIMIT 1
    `;

    const userRes = await pool.query(userQuery, [sAddr, uAddr]);

    if (userRes.rowCount === 0) {
      return NextResponse.json(null); // User not in season
    }

    const row = userRes.rows[0];
    
    // Handle potential casing differences safely
    const balanceValue = row.fim_balance ?? row.fimBalance ?? row.balance;
    
    if (balanceValue === undefined) {
      console.error("Percentile API Error: Column 'fim_balance' not found in result.");
      return NextResponse.json(null, { status: 500 });
    }

    const rawUserBalance = BigInt(balanceValue);
    const rawThreshold = BigInt(massThreshold); 

    const isCapitalist = rawUserBalance > rawThreshold;
    const operator = isCapitalist ? '>' : '<=';

    // 3. Count Stats (Rank & Total)
    const statsQuery = `
      SELECT 
        COUNT(*) as total_in_faction,
        COUNT(*) FILTER (WHERE fim_balance > $3::NUMERIC) as richer_than_user
      FROM player_season_stats
      WHERE season_address = $1
        AND fim_balance ${operator} $2::NUMERIC
    `;

    const statsRes = await pool.query(statsQuery, [
        sAddr, 
        rawThreshold.toString(), 
        rawUserBalance.toString()
    ]);
    
    const totalInFaction = Number(statsRes.rows[0].total_in_faction ?? 0);
    const richerThanUser = Number(statsRes.rows[0].richer_than_user ?? 0);

    // 4. Calculate Percentile
    const rank = richerThanUser + 1;
    let factionPercentile = 0;

    if (totalInFaction <= 1) {
      factionPercentile = 100; 
    } else {
      const index = totalInFaction - rank;
      factionPercentile = (index / (totalInFaction - 1)) * 100;
    }

    return NextResponse.json({
      factionPercentile,
      isCapitalist,
      totalInFaction,
      factionRank: rank
    });

  } catch (error: any) {
    // Keep this error log for monitoring production issues
    console.error("Percentile API Error:", error.message);
    return NextResponse.json(null, { status: 500 });
  }
}