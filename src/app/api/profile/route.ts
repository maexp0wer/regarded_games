import { NextResponse } from 'next/server';
import { verifyMessage } from 'viem';
import { Pool } from 'pg';

// Initialize the database pool
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

/**
 * GET: Fetch profile data
 * URL: /api/profile?address=0x...
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address')?.toLowerCase();

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    const result = await pool.query(
      'SELECT name, image_url FROM player_profiles WHERE address = $1',
      [address]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ name: null, image_url: null });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error("GET Error:", error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST: Update profile data (Authenticated via signature)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { address, name, imageUrl, signature } = body;

    if (!address || !signature) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Must match the frontend string exactly
    const cleanName = name || '';
    const cleanImage = imageUrl || '';
    const message = `Update profile: ${cleanName} ${cleanImage}`;

    // Verify the signature
    const isValid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature,
    });

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Upsert into Database
    await pool.query(
      `INSERT INTO player_profiles (address, name, image_url, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (address) 
       DO UPDATE SET name = $2, image_url = $3, updated_at = NOW()`,
      [address.toLowerCase(), cleanName, cleanImage]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST Error:", error.message);
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}