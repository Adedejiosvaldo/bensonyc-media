// Instagram API with Instagram Login (graph.instagram.com).
// Needs an Instagram Professional (Business or Creator) account.
import { SocialError, type MediaFile, type SocialAccount } from './types';

const VERSION = process.env.IG_GRAPH_VERSION ? `/${process.env.IG_GRAPH_VERSION}` : '';
const GRAPH = `https://graph.instagram.com${VERSION}`;
export const IG_SCOPES = ['instagram_business_basic', 'instagram_business_content_publish', 'instagram_business_manage_insights'];

export const igConfigured = () => !!(process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_SECRET);

export function igAuthUrl(redirectUri: string, state: string) {
  const q = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: IG_SCOPES.join(','),
    state,
  });
  return `https://www.instagram.com/oauth/authorize?${q}`;
}

async function igFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, cache: 'no-store' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    const msg = body.error?.error_user_msg || body.error?.message || body.error_message || `Instagram error ${res.status}`;
    throw new SocialError(msg);
  }
  return body as T;
}

/** Code → long-lived (60-day) token. */
export async function igExchangeCode(code: string, redirectUri: string) {
  const form = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    client_secret: process.env.INSTAGRAM_APP_SECRET!,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code,
  });
  const short = await igFetch<{ access_token?: string; user_id?: string | number; permissions?: string[] | string; data?: { access_token: string; user_id: string; permissions: string }[] }>(
    'https://api.instagram.com/oauth/access_token',
    { method: 'POST', body: form },
  );
  const first = short.data?.[0] ?? short;
  if (!first.access_token) throw new SocialError('Instagram did not return a token.');
  const long = await igFetch<{ access_token: string; expires_in: number }>(
    `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(process.env.INSTAGRAM_APP_SECRET!)}&access_token=${encodeURIComponent(first.access_token)}`,
  );
  const me = await igMe(long.access_token);
  return {
    account_id: String(me.user_id ?? me.id),
    username: me.username ?? null,
    access_token: long.access_token,
    token_expires_at: new Date(Date.now() + long.expires_in * 1000).toISOString(),
    scopes: Array.isArray(first.permissions) ? first.permissions.join(',') : (first.permissions ?? IG_SCOPES.join(',')),
  };
}

/** Long-lived tokens can be refreshed once they're 24h old; each refresh gives another 60 days. */
export async function igRefresh(token: string) {
  const r = await igFetch<{ access_token: string; expires_in: number }>(
    `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`,
  );
  return { access_token: r.access_token, token_expires_at: new Date(Date.now() + r.expires_in * 1000).toISOString() };
}

export async function igMe(token: string) {
  return igFetch<{ id: string; user_id?: string; username?: string; followers_count?: number; follows_count?: number; media_count?: number }>(
    `${GRAPH}/me?fields=id,user_id,username,followers_count,follows_count,media_count&access_token=${encodeURIComponent(token)}`,
  );
}

const post = (acct: SocialAccount, path: string, params: Record<string, string>) =>
  igFetch<{ id: string }>(`${GRAPH}/${path}`, { method: 'POST', body: new URLSearchParams({ ...params, access_token: acct.access_token }) });

/** Step 1: create the container(s). Returns the container that gets published. */
export async function igCreateContainers(acct: SocialAccount, media: MediaFile[], caption: string) {
  const me = acct.account_id;
  if (media.length === 0) throw new SocialError('Add a photo or video.');
  if (media.length > 10) throw new SocialError('Instagram carousels take up to 10 items.');

  if (media.length === 1) {
    const m = media[0];
    const c =
      m.type === 'video'
        ? await post(acct, `${me}/media`, { media_type: 'REELS', video_url: m.url, caption, share_to_feed: 'true' })
        : await post(acct, `${me}/media`, { image_url: m.url, caption });
    return { container: c.id, children: [] as string[] };
  }

  const children: string[] = [];
  for (const m of media) {
    const c =
      m.type === 'video'
        ? await post(acct, `${me}/media`, { media_type: 'VIDEO', video_url: m.url, is_carousel_item: 'true' })
        : await post(acct, `${me}/media`, { image_url: m.url, is_carousel_item: 'true' });
    children.push(c.id);
  }
  // The parent can only be created once every child has finished processing.
  return { container: null as string | null, children };
}

export async function igContainerStatus(acct: SocialAccount, id: string) {
  const r = await igFetch<{ status_code?: string; status?: string }>(`${GRAPH}/${id}?fields=status_code,status&access_token=${encodeURIComponent(acct.access_token)}`);
  return { code: r.status_code ?? 'FINISHED', detail: r.status ?? '' };
}

export async function igCreateCarousel(acct: SocialAccount, children: string[], caption: string) {
  const c = await post(acct, `${acct.account_id}/media`, { media_type: 'CAROUSEL', children: children.join(','), caption });
  return c.id;
}

export async function igPublish(acct: SocialAccount, container: string) {
  const r = await post(acct, `${acct.account_id}/media_publish`, { creation_id: container });
  const info = await igFetch<{ permalink?: string }>(`${GRAPH}/${r.id}?fields=permalink&access_token=${encodeURIComponent(acct.access_token)}`).catch(() => ({ permalink: undefined }));
  return { id: r.id, permalink: info.permalink ?? null };
}

type IgMedia = {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  permalink?: string;
  thumbnail_url?: string;
  media_url?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
};

/** Recent posts plus their insights. Metric names differ by media type, so we fall back if one is rejected. */
export async function igRecentMedia(acct: SocialAccount, limit = 25) {
  const list = await igFetch<{ data: IgMedia[] }>(
    `${GRAPH}/${acct.account_id}/media?fields=id,caption,media_type,media_product_type,permalink,thumbnail_url,media_url,timestamp,like_count,comments_count&limit=${limit}&access_token=${encodeURIComponent(acct.access_token)}`,
  );
  const out = [];
  for (const m of list.data ?? []) {
    const metrics: Record<string, number> = {};
    for (const set of ['views,reach,saved,shares', 'reach,saved,shares', 'reach,saved']) {
      try {
        const r = await igFetch<{ data: { name: string; values?: { value: number }[]; total_value?: { value: number } }[] }>(
          `${GRAPH}/${m.id}/insights?metric=${set}&access_token=${encodeURIComponent(acct.access_token)}`,
        );
        for (const d of r.data ?? []) metrics[d.name] = d.total_value?.value ?? d.values?.[0]?.value ?? 0;
        break;
      } catch {
        // try a smaller metric set
      }
    }
    out.push({
      remote_id: m.id,
      caption: m.caption ?? null,
      media_type: m.media_product_type === 'REELS' ? 'REEL' : (m.media_type ?? null),
      permalink: m.permalink ?? null,
      thumbnail_url: m.thumbnail_url ?? (m.media_type === 'VIDEO' ? null : (m.media_url ?? null)),
      posted_at: m.timestamp ?? null,
      likes: m.like_count ?? null,
      comments: m.comments_count ?? null,
      views: metrics.views ?? null,
      reach: metrics.reach ?? null,
      saves: metrics.saved ?? null,
      shares: metrics.shares ?? null,
    });
  }
  return out;
}
