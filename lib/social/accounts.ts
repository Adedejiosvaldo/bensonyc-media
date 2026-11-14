import { createAdminClient } from '@/lib/supabase/admin';
import { igRefresh, igUnified } from './instagram';
import { ttRefresh } from './tiktok';
import type { Platform, SocialAccount } from './types';

const DAY = 86_400_000;

/** Load a connected account, refreshing its token first if it's close to expiring. */
export async function getAccount(platform: Platform): Promise<SocialAccount | null> {
  const db = createAdminClient();
  const { data } = await db.from('social_accounts').select('*').eq('platform', platform).maybeSingle<SocialAccount>();
  if (!data) return null;
  const expires = data.token_expires_at ? new Date(data.token_expires_at).getTime() : Infinity;

  try {
    if (platform === 'tiktok' && expires - Date.now() < 10 * 60_000 && data.refresh_token) {
      const t = await ttRefresh(data.refresh_token);
      const patch = { access_token: t.access_token, refresh_token: t.refresh_token, token_expires_at: t.token_expires_at, refresh_expires_at: t.refresh_expires_at };
      await db.from('social_accounts').update(patch).eq('platform', platform);
      return { ...data, ...patch };
    }
    // Unified-login tokens are system-user tokens with no refresh call; only Instagram-login tokens refresh.
    if (platform === 'instagram' && !igUnified() && expires - Date.now() < 10 * DAY) {
      const t = await igRefresh(data.access_token);
      await db.from('social_accounts').update(t).eq('platform', platform);
      return { ...data, ...t };
    }
  } catch {
    // Use the current token; if it is truly dead the next call says so and an admin reconnects.
  }
  return data;
}

export async function saveAccount(row: Omit<SocialAccount, 'refresh_token' | 'refresh_expires_at'> & Partial<SocialAccount> & { connected_by: string }) {
  const db = createAdminClient();
  const { error } = await db.from('social_accounts').upsert({ ...row, connected_at: new Date().toISOString() }, { onConflict: 'platform' });
  if (error) throw new Error(error.message);
}

/** Public view of connections (no tokens). */
export async function listConnections() {
  const db = createAdminClient();
  const { data } = await db.from('social_accounts').select('platform, username, token_expires_at, refresh_expires_at, connected_at');
  return (data ?? []) as { platform: Platform; username: string | null; token_expires_at: string | null; refresh_expires_at: string | null; connected_at: string }[];
}
