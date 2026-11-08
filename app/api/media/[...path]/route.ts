import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Serves files from the public "social" storage bucket on this site's own domain.
 * TikTok only pulls photos from a domain verified in its developer portal, and you
 * can't verify Supabase's domain, so photos for TikTok go through here.
 */
export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.map(encodeURIComponent).join('/');
  if (params.path.some((p) => p === '..' || p === '.')) return new Response('Not found', { status: 404 });
  const range = request.headers.get('range');
  const upstream = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/social/${path}`, {
    headers: range ? { Range: range } : undefined,
    cache: 'no-store',
  });
  if (!upstream.ok && upstream.status !== 206) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  headers.set('cache-control', 'public, max-age=86400');
  return new Response(upstream.body, { status: upstream.status, headers });
}
