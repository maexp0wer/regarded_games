import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getCommunitySession } from '@/lib/communitySession';

const debug = process.env.APP_DEBUG === 'true';

/**
 * Robust fetch for the profile. 
 * Note: On the server, app.localhost might not resolve. 
 * We use 127.0.0.1 to ensure it hits the local dev server.
 */
async function getPlayerProfile(address: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_MAIN_DOMAIN;
    const res = await fetch(`${baseUrl}/api/profile?address=${address.toLowerCase()}`, { 
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!res.ok) {
      console.error(`Profile API returned ${res.status} for ${address}`);
      return null;
    }
    
    return await res.json();
  } catch (e) {
    console.error("SSO DB Fetch Error:", e);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sso = searchParams.get('sso');
  const sig = searchParams.get('sig');

  if (!sso || !sig) return new NextResponse("Missing SSO", { status: 400 });

  const SECRET = process.env.DISCOURSE_SSO_SECRET;
  if (!SECRET) return new NextResponse("Server misconfigured", { status: 500 });

  // 1. Signature Check
  const hmac = crypto.createHmac('sha256', SECRET);
  const calculatedSig = hmac.update(sso).digest('hex');
  if (calculatedSig !== sig) return new NextResponse("Sig Mismatch", { status: 403 });

  // 2. Identify wallet from the VERIFIED community session (a forged cookie can no
  //    longer log a user into the forum as someone else — the session is HMAC-signed
  //    and only issued after a wallet-signature check).
  const walletAddress = getCommunitySession(req);
  if (!walletAddress) {
    const mainDomain = new URL(process.env.NEXT_PUBLIC_MAIN_DOMAIN ?? 'http://localhost:3000');
    mainDomain.hostname = `app.${mainDomain.hostname}`;
    const loginUrl = new URL('/community-login', mainDomain);
    loginUrl.searchParams.set('sso', sso);
    loginUrl.searchParams.set('sig', sig);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Admin Check
  const ADMIN_WALLET = process.env.ADMIN_WALLET?.toLowerCase() ?? '';
  const isSystemAdmin = ADMIN_WALLET !== '' && walletAddress === ADMIN_WALLET;

  // 4. Fetch the profile (This is where the magic happens)
  const profileData = await getPlayerProfile(walletAddress);
  
  // --- REPLICATING YOUR PlayerProfile.tsx LOGIC ---
  const dbName = profileData?.name || '';
  const dbImageUrl = profileData?.image_url || '';

  // Display Name: Custom name OR "Regarded Anon"
  const displayName = dbName.trim() !== "" ? dbName : "Regarded Anon";

  // Avatar Seed: Use Name if exists, otherwise Wallet Address
  const seed = dbName.trim() !== "" ? dbName : walletAddress;
  
  // Final Avatar URL: User URL OR DiceBear
  const finalAvatarUrl = dbImageUrl.trim() !== "" 
    ? dbImageUrl 
    : `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(seed)}`;
  // ------------------------------------------------

  if (debug) console.log(`[sso] syncing: ${walletAddress} | name: ${displayName}`);

  // 5. Decode Nonce
  const payloadRaw = Buffer.from(sso, 'base64').toString();
  const nonce = new URLSearchParams(payloadRaw).get('nonce');

  // 6. Build Return Payload
  // Note: do NOT include 'groups' for non-admins — group membership is managed
  // exclusively by init-season and sync-faction API routes. Including groups=""
  // with discourse_connect_overrides_groups would wipe faction memberships on login.
  const returnParams = new URLSearchParams({
    nonce: nonce!,
    external_id: walletAddress,
    email: `${walletAddress}@regarded.local`,
    username: walletAddress,
    name: displayName,
    avatar_url: finalAvatarUrl,
    avatar_force_update: "true",
    require_activation: "false",
    admin: isSystemAdmin ? "true" : "false",
    moderator: isSystemAdmin ? "true" : "false",
  });
  if (isSystemAdmin) {
    returnParams.set('groups', 'admins');
  }

  const returnPayload = Buffer.from(returnParams.toString()).toString('base64');
  const returnHmac = crypto.createHmac('sha256', SECRET);
  const returnSig = returnHmac.update(returnPayload).digest('hex');

  return NextResponse.redirect(`http://community.localhost/session/sso_login?sso=${returnPayload}&sig=${returnSig}`);
}