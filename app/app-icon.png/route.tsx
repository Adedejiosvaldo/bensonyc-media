import { ImageResponse } from 'next/og';

export const runtime = 'edge';

/**
 * A 1024 × 1024 app icon for developer portals (TikTok, Meta) that ask for one.
 * Open /app-icon.png and save the image. It is drawn from the site icon on a plum field.
 */
export async function GET(request: Request) {
  const logo = await fetch(new URL('/icon.png', request.url)).then((r) => r.arrayBuffer());
  const bytes = new Uint8Array(logo);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const src = `data:image/png;base64,${btoa(bin)}`;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2B0A2C' }}>
        <div style={{ width: 640, height: 640, borderRadius: 9999, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 24px rgba(214,25,122,0.55)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
          <img src={src} width={560} height={560} style={{ borderRadius: 9999 }} />
        </div>
      </div>
    ),
    { width: 1024, height: 1024, headers: { 'Cache-Control': 'public, max-age=86400' } },
  );
}
