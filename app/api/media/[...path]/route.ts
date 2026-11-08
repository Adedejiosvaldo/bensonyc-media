import type { NextRequest } from 'next/server';
import { storageMode } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/**
 * Serves post media on this site's own domain. TikTok only pulls photos from a domain
 * verified in its developer portal, so photos for TikTok go through here.
 * Looks in R2 first (when set up), then the Supabase bucket for older files.
 */
export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  if (params.path.some((p) => p === '..' || p === '.')) return new Response('Not found', { status: 404 });
  const path = params.path.map(encodeURIComponent).join('/');
  const range = request.headers.get('range');
  const sources = [
    ...(storageMode() === 'r2' ? [`${process.env.R2_PUBLIC_URL!.replace(/\/$/, '')}/${path}`] : []),
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/social/${path}`,
  ];
  for (const src of sources) {
    const upstream = await fetch(src, { headers: range ? { Range: range } : undefined, cache: 'no-store' });
    if (!upstream.ok && upstream.status !== 206) continue;
    const headers = new Headers();
    for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
      const v = upstream.headers.get(h);
      if (v) headers.set(h, v);
    }
    headers.set('cache-control', 'public, max-age=86400');
    return new Response(upstream.body, { status: upstream.status, headers });
  }
  return new Response('Not found', { status: 404 });
}
