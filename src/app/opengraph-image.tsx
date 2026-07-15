import { ImageResponse } from 'next/og';

/* Generated OG/Twitter card for every public route (root segment file
   convention — metadataBase resolves it absolute). Colors are the dark-theme
   brand tokens from globals.css: bg #0D0B14, sunset gradient purple #9D4EDD →
   magenta #D81B60 → orange #FF8C00 → gold #FFC300. Served at
   /opengraph-image — the middleware passes metadata paths through the tenant
   rewrites. TODO(design): replace with an art-directed card (brand font +
   Regardo/Carlo artwork) when one exists. */

export const alt = 'Regarded Games — Class War: The On-Chain Strategy Game';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const SUNSET = 'linear-gradient(90deg, #9D4EDD 0%, #D81B60 45%, #FF8C00 75%, #FFC300 100%)';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0D0B14',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 48,
            display: 'flex',
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: '0.35em',
            color: '#8B87A0',
          }}
        >
          REGARDED.GAMES
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 110,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            backgroundImage: SUNSET,
            backgroundClip: 'text',
            color: 'transparent',
            padding: '0 40px',
          }}
        >
          Regarded Games
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 12,
            fontSize: 40,
            fontWeight: 700,
            letterSpacing: '0.18em',
            color: '#F8F9FC',
          }}
        >
          CLASS WAR — THE GAME
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 36,
            fontSize: 28,
            color: '#8B87A0',
          }}
        >
          Perfect information. Real stakes. On Base.
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 0,
            width: '100%',
            height: 14,
            backgroundImage: SUNSET,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
