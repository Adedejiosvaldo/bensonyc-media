// Where post media lives. Cloudflare R2 when configured (10 GB free, free downloads,
// files up to 5 GB), otherwise the Supabase "social" bucket.
import { AwsClient } from 'aws4fetch';
import { createAdminClient } from '@/lib/supabase/admin';

export type StorageMode = 'r2' | 'supabase';

export const storageMode = (): StorageMode =>
  process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET && process.env.R2_PUBLIC_URL ? 'r2' : 'supabase';

const encodePath = (path: string) => path.split('/').map(encodeURIComponent).join('/');

/** Public URL Instagram and TikTok download from. */
export function publicUrl(path: string) {
  if (storageMode() === 'r2') return `${process.env.R2_PUBLIC_URL!.replace(/\/$/, '')}/${encodePath(path)}`;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/social/${encodePath(path)}`;
}

/** True if this URL is a file we stored at `path` (in either store, so older posts still work). */
export function isOurUrl(path: string, url: string) {
  const r2 = process.env.R2_PUBLIC_URL ? `${process.env.R2_PUBLIC_URL.replace(/\/$/, '')}/${encodePath(path)}` : null;
  const sb = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/social/${encodePath(path)}`;
  return url === r2 || url === sb;
}

const r2 = () =>
  new AwsClient({ accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!, service: 's3', region: 'auto' });
const objectUrl = (path: string) => `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}/${encodePath(path)}`;

/** A short-lived URL the browser can PUT one file to. */
export async function presignUpload(path: string, contentType: string) {
  const url = new URL(objectUrl(path));
  url.searchParams.set('X-Amz-Expires', '3600');
  const signed = await r2().sign(new Request(url, { method: 'PUT', headers: { 'Content-Type': contentType } }), { aws: { signQuery: true } });
  return signed.url;
}

const SUPABASE_MARK = '/storage/v1/object/public/social/';

/** Delete stored files, each from whichever store it lives in. Returns how many were removed. */
export async function deleteMedia(files: { path: string; url: string }[]) {
  const inSupabase = files.filter((f) => f.url.includes(SUPABASE_MARK)).map((f) => f.path);
  const inR2 = files.filter((f) => !f.url.includes(SUPABASE_MARK)).map((f) => f.path);
  let n = 0;
  if (inSupabase.length) {
    const { data, error } = await createAdminClient().storage.from('social').remove(inSupabase);
    if (error) throw new Error(error.message);
    n += data?.length ?? 0;
  }
  if (inR2.length) {
    if (storageMode() !== 'r2') throw new Error('R2 is not configured, so its files cannot be deleted.');
    const client = r2();
    for (const p of inR2) {
      const res = await client.fetch(objectUrl(p), { method: 'DELETE' });
      if (!res.ok && res.status !== 404) throw new Error(`R2 delete failed (${res.status})`);
      n++;
    }
  }
  return n;
}
