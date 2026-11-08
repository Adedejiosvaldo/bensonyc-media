// TikTok Login Kit + Content Posting API + Display API (open.tiktokapis.com/v2).
//
// Until TikTok audits the app, posts made with Direct Post can only be private (SELF_ONLY).
// The default mode, "inbox", sends the video to the account's TikTok drafts instead: someone
// opens TikTok, adds a sound if they want, and taps Post. Set TIKTOK_POST_MODE=direct after the audit.
import { SocialError, type MediaFile, type SocialAccount } from './types';

const API = 'https://open.tiktokapis.com/v2';
export const TT_SCOPES = ['user.info.basic', 'user.info.profile', 'user.info.stats', 'video.upload', 'video.publish', 'video.list'];

export const ttConfigured = () => !!(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET);
export const ttMode = (): 'inbox' | 'direct' => (process.env.TIKTOK_POST_MODE === 'direct' ? 'direct' : 'inbox');

export function ttAuthUrl(redirectUri: string, state: string) {
  const q = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    scope: TT_SCOPES.join(','),
    response_type: 'code',
    redirect_uri: redirectUri,
    state,
  });
  return `https://www.tiktok.com/v2/auth/authorize/?${q}`;
}

type TokenResponse = { access_token: string; expires_in: number; refresh_token: string; refresh_expires_in: number; open_id: string; scope: string; error?: string; error_description?: string };

async function token(params: Record<string, string>) {
  const res = await fetch(`${API}/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_key: process.env.TIKTOK_CLIENT_KEY!, client_secret: process.env.TIKTOK_CLIENT_SECRET!, ...params }),
    cache: 'no-store',
  });
  const body = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || body.error || !body.access_token) throw new SocialError(body.error_description || body.error || `TikTok sign-in failed (${res.status})`);
  return {
    account_id: body.open_id,
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    token_expires_at: new Date(Date.now() + body.expires_in * 1000).toISOString(),
    refresh_expires_at: new Date(Date.now() + body.refresh_expires_in * 1000).toISOString(),
    scopes: body.scope,
  };
}

export const ttExchangeCode = (code: string, redirectUri: string) => token({ code, grant_type: 'authorization_code', redirect_uri: redirectUri });
export const ttRefresh = (refreshToken: string) => token({ grant_type: 'refresh_token', refresh_token: refreshToken });

async function call<T>(acct: Pick<SocialAccount, 'access_token'>, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${acct.access_token}`, 'Content-Type': 'application/json; charset=UTF-8' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  const err = json.error;
  if (!res.ok || (err && err.code && err.code !== 'ok')) {
    const hint =
      err?.code === 'unaudited_client_can_only_post_to_private_accounts'
        ? 'TikTok only allows private posts until the app passes its audit. Use TIKTOK_POST_MODE=inbox (drafts) for now.'
        : err?.message || err?.code || `TikTok error ${res.status}`;
    throw new SocialError(hint);
  }
  return json.data as T;
}

export async function ttUser(acct: Pick<SocialAccount, 'access_token'>) {
  const d = await call<{ user: { open_id: string; display_name?: string; username?: string; follower_count?: number; following_count?: number; likes_count?: number; video_count?: number } }>(
    acct,
    '/user/info/?fields=open_id,display_name,username,follower_count,following_count,likes_count,video_count',
  );
  return d.user;
}

const MB = 1024 * 1024;

/** TikTok's chunk rules: whole file if under 64 MB, otherwise 5–64 MB chunks with the last one taking the remainder. */
export function chunkPlan(size: number) {
  if (size <= 64 * MB) return { chunk_size: size, total_chunk_count: 1 };
  const chunk = 20 * MB;
  return { chunk_size: chunk, total_chunk_count: Math.floor(size / chunk) };
}

async function privacyFor(acct: SocialAccount) {
  const info = await call<{ privacy_level_options: string[] }>(acct, '/post/publish/creator_info/query/', {});
  const opts = info.privacy_level_options ?? [];
  const wanted = process.env.TIKTOK_PRIVACY || 'PUBLIC_TO_EVERYONE';
  return opts.includes(wanted) ? wanted : (opts[0] ?? 'SELF_ONLY');
}

/** Start a video upload. Returns the publish id and where to PUT the bytes. */
export async function ttInitVideo(acct: SocialAccount, video: MediaFile, caption: string) {
  const source_info = { source: 'FILE_UPLOAD', video_size: video.size, ...chunkPlan(video.size) };
  if (ttMode() === 'inbox') {
    const d = await call<{ publish_id: string; upload_url: string }>(acct, '/post/publish/inbox/video/init/', { source_info });
    return d;
  }
  const d = await call<{ publish_id: string; upload_url: string }>(acct, '/post/publish/video/init/', {
    post_info: { title: caption.slice(0, 2200), privacy_level: await privacyFor(acct), disable_comment: false, disable_duet: false, disable_stitch: false },
    source_info,
  });
  return d;
}

/** Upload chunk `index` (0-based). Reads that byte range straight from storage. */
export async function ttUploadChunk(uploadUrl: string, video: MediaFile, index: number) {
  const { chunk_size, total_chunk_count } = chunkPlan(video.size);
  const start = index * chunk_size;
  const end = index === total_chunk_count - 1 ? video.size - 1 : start + chunk_size - 1;
  const src = await fetch(video.url, { headers: { Range: `bytes=${start}-${end}` }, cache: 'no-store' });
  if (!src.ok) throw new SocialError(`Could not read the video from storage (${src.status}).`);
  const bytes = new Uint8Array(await src.arrayBuffer());
  if (bytes.length !== end - start + 1) throw new SocialError('Storage returned the wrong number of bytes for this chunk.');
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': video.mime || 'video/mp4', 'Content-Length': String(bytes.length), 'Content-Range': `bytes ${start}-${end}/${video.size}` },
    body: bytes,
  });
  if (!res.ok && res.status !== 206) throw new SocialError(`TikTok rejected the upload (${res.status}).`);
  return { done: index + 1 >= total_chunk_count, total: total_chunk_count };
}

/** Photo posts. TikTok pulls the images itself, so the URLs must be on a domain verified in the TikTok developer portal. */
export async function ttInitPhotos(acct: SocialAccount, urls: string[], caption: string) {
  if (urls.length > 35) throw new SocialError('TikTok photo posts take up to 35 images.');
  const direct = ttMode() === 'direct';
  const [first, ...rest] = caption.split('\n');
  return call<{ publish_id: string }>(acct, '/post/publish/content/init/', {
    post_info: {
      title: first.slice(0, 90),
      description: (rest.join('\n') || caption).slice(0, 4000),
      ...(direct ? { privacy_level: await privacyFor(acct), disable_comment: false, auto_add_music: true } : {}),
    },
    source_info: { source: 'PULL_FROM_URL', photo_cover_index: 0, photo_images: urls },
    post_mode: direct ? 'DIRECT_POST' : 'MEDIA_UPLOAD',
    media_type: 'PHOTO',
  });
}

export async function ttStatus(acct: SocialAccount, publishId: string) {
  return call<{ status: string; fail_reason?: string; publicaly_available_post_id?: (string | number)[] }>(acct, '/post/publish/status/fetch/', { publish_id: publishId });
}

type TtVideo = { id: string; title?: string; video_description?: string; cover_image_url?: string; share_url?: string; create_time?: number; view_count?: number; like_count?: number; comment_count?: number; share_count?: number };

export async function ttRecentVideos(acct: SocialAccount, max = 20) {
  const d = await call<{ videos: TtVideo[] }>(
    acct,
    '/video/list/?fields=id,title,video_description,cover_image_url,share_url,create_time,view_count,like_count,comment_count,share_count',
    { max_count: Math.min(max, 20) },
  );
  return (d.videos ?? []).map((v) => ({
    remote_id: String(v.id),
    caption: v.video_description || v.title || null,
    media_type: 'VIDEO',
    permalink: v.share_url ?? null,
    thumbnail_url: v.cover_image_url ?? null,
    posted_at: v.create_time ? new Date(v.create_time * 1000).toISOString() : null,
    views: v.view_count ?? null,
    likes: v.like_count ?? null,
    comments: v.comment_count ?? null,
    shares: v.share_count ?? null,
    reach: null,
    saves: null,
  }));
}
