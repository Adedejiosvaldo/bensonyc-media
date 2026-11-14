import { createAdminClient } from '@/lib/supabase/admin';
import { todayLagos } from '@/lib/dates';
import { getAccount } from './accounts';
import { igMe, igRecentMedia } from './instagram';
import { ttRecentVideos, ttUser } from './tiktok';
import { PLATFORM_NAME, type Platform } from './types';

/** Pull follower counts and recent post numbers into the database. Returns per-platform results. */
export async function syncStats(): Promise<{ platform: Platform; ok: boolean; message: string }[]> {
  const db = createAdminClient();
  const day = todayLagos();
  const results: { platform: Platform; ok: boolean; message: string }[] = [];

  const ig = await getAccount('instagram');
  if (ig) {
    try {
      const me = await igMe(ig.access_token, ig.account_id);
      await db.from('social_account_stats').upsert({ platform: 'instagram', day, followers: me.followers_count ?? null, following: me.follows_count ?? null, posts: me.media_count ?? null }, { onConflict: 'platform,day' });
      if (me.username && me.username !== ig.username) await db.from('social_accounts').update({ username: me.username }).eq('platform', 'instagram');
      const media = await igRecentMedia(ig, 60);
      if (media.length) await db.from('social_media_stats').upsert(media.map((m) => ({ ...m, platform: 'instagram', updated_at: new Date().toISOString() })), { onConflict: 'platform,remote_id' });
      results.push({ platform: 'instagram', ok: true, message: `${media.length} posts updated` });
    } catch (e) {
      results.push({ platform: 'instagram', ok: false, message: (e as Error).message });
    }
  }

  const tt = await getAccount('tiktok');
  if (tt) {
    try {
      const u = await ttUser(tt);
      await db.from('social_account_stats').upsert({ platform: 'tiktok', day, followers: u.follower_count ?? null, following: u.following_count ?? null, posts: u.video_count ?? null, total_likes: u.likes_count ?? null }, { onConflict: 'platform,day' });
      if (u.username && u.username !== tt.username) await db.from('social_accounts').update({ username: u.username }).eq('platform', 'tiktok');
      const vids = await ttRecentVideos(tt);
      if (vids.length) await db.from('social_media_stats').upsert(vids.map((m) => ({ ...m, platform: 'tiktok', updated_at: new Date().toISOString() })), { onConflict: 'platform,remote_id' });
      results.push({ platform: 'tiktok', ok: true, message: `${vids.length} videos updated` });
    } catch (e) {
      results.push({ platform: 'tiktok', ok: false, message: (e as Error).message });
    }
  }

  if (results.length === 0) results.push({ platform: 'instagram', ok: false, message: 'No accounts connected yet.' });
  return results.map((r) => ({ ...r, message: `${PLATFORM_NAME[r.platform]}: ${r.message}` }));
}
