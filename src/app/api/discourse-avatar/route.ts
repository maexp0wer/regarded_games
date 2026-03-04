import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get('wallet');
  const name = searchParams.get('name') || wallet;

  if (!wallet) return new Response("Missing wallet", { status: 400 });

  // Replicate your PlayerProfile.tsx logic
  const seed = (name && name !== "Regarded Anon") ? name : wallet;
  const dicebearUrl = `https://api.dicebear.com/9.x/bottts/png?seed=${encodeURIComponent(seed)}`;

  try {
    const response = await fetch(dicebearUrl);
    const blob = await response.blob();

    return new Response(blob, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
      }
    });
  } catch (e) {
    return new Response("Failed to fetch image", { status: 500 });
  }
}