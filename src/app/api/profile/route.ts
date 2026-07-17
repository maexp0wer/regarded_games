import { NextResponse } from 'next/server';
import { isAddress, verifyMessage } from 'viem';
import { query } from '@/lib/db';
import {
  buildProfileMessage,
  isValidProfileImageUrl,
  isValidProfileName,
  PROFILE_FRESHNESS_MS,
} from '@/utils/profileMessage';
import { checkRateLimit, tooManyRequests } from '@/lib/rateLimit';

/**
 * GET: Fetch profile data
 * URL: /api/profile?address=0x...
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Batch mode: ?addresses=0x1,0x2,... → { profiles: { '0x1': { name, image_url } } }.
    // Only addresses with a stored profile appear in the map.
    const addressesParam = searchParams.get('addresses');
    if (addressesParam) {
      const addresses = [...new Set(
        addressesParam.split(',').map((a) => a.trim().toLowerCase()).filter(Boolean)
      )];
      if (addresses.length === 0) {
        return NextResponse.json({ profiles: {} });
      }

      const result = await query(
        'SELECT address, name, image_url FROM player_profiles WHERE address = ANY($1::text[])',
        [addresses]
      );

      const profiles: Record<string, { name: string | null; image_url: string | null }> = {};
      for (const row of result.rows) {
        profiles[row.address] = { name: row.name, image_url: row.image_url };
      }
      return NextResponse.json({ profiles });
    }

    const address = searchParams.get('address')?.toLowerCase();

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    const result = await query(
      'SELECT name, image_url FROM player_profiles WHERE address = $1',
      [address]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ name: null, image_url: null });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("GET Error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST: Update profile data (Authenticated via signature)
 */
export async function POST(request: Request) {
  try {
    const rl = checkRateLimit(request, { bucket: 'profile-write', limit: 10, windowMs: 60_000 });
    if (!rl.ok) return tooManyRequests(rl.retryAfterSec);

    const body = await request.json();
    const { address, name, imageUrl, issuedAt, signature } = body;

    if (!address || !signature || typeof address !== 'string') {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    if (!isAddress(address, { strict: false })) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }

    const cleanName = typeof name === 'string' ? name : '';
    const cleanImage = typeof imageUrl === 'string' ? imageUrl : '';

    // Reject oversized names and any non-https / internal-host image URL. The
    // stored image_url is later handed to Discourse's server-side avatar fetcher,
    // so an unvalidated URL is an SSRF vector (see utils/profileMessage.ts).
    if (!isValidProfileName(cleanName)) {
      return NextResponse.json({ error: 'Name too long' }, { status: 400 });
    }
    if (!isValidProfileImageUrl(cleanImage)) {
      return NextResponse.json({ error: 'Image URL must be an https link to a public host' }, { status: 400 });
    }

    // Signature must be fresh — the signed message carries a timestamp so a
    // captured signature can't be replayed indefinitely.
    if (typeof issuedAt !== 'number' || Math.abs(Date.now() - issuedAt) > PROFILE_FRESHNESS_MS) {
      return NextResponse.json({ error: 'Signature expired' }, { status: 401 });
    }

    const message = buildProfileMessage(address, cleanName, cleanImage, issuedAt);

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
    await query(
      `INSERT INTO player_profiles (address, name, image_url, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (address)
       DO UPDATE SET name = $2, image_url = $3, updated_at = NOW()`,
      [address.toLowerCase(), cleanName, cleanImage]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST Error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}