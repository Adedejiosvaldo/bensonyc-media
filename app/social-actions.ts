'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { canPostSocial, requireAdmin, requireMember } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { advanceAll } from '@/lib/social/publish';
import { syncStats } from '@/lib/social/sync';
import { monthStart, todayLagos } from '@/lib/dates';
import { isOurUrl, presignUpload, publicUrl, storageMode } from '@/lib/storage';
import { PLATFORMS, type MediaFile, type Platform } from '@/lib/social/types';

const MB = 1024 * 1024;
const LIMITS = { r2: { image: 30 * MB, video: 2048 * MB }, supabase: { image: 50 * MB, video: 50 * MB } };

/** Reserve a storage path for one file. With R2 it also returns a signed URL the browser uploads to. */
export async function prepareUpload(input: { name: string; type: string; size: number }): Promise<{ error?: string; path?: string; url?: string; uploadUrl?: string; mode?: 'r2' | 'supabase' }> {
  const { member } = await requireMember();
  if (!canPostSocial(member)) return { error: 'Only heads, admins and the Social Media team can post.' };
  const kind = input.type.startsWith('video/') ? 'video' : input.type.startsWith('image/') ? 'image' : null;
  if (!kind) return { error: 'Only photos and videos can be posted.' };
  const mode = storageMode();
  const max = LIMITS[mode][kind];
  if (!(input.size > 0) || input.size > max) return { error: `${input.name} is too big. The limit is ${Math.round(max / MB)} MB per ${kind}.` };

  const base = input.name.toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/g, '-').slice(0, 40) || 'file';
  const ext = kind === 'image' ? 'jpg' : (/\.([a-z0-9]{2,5})$/i.exec(input.name)?.[1] ?? 'mp4').toLowerCase();
  const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}-${base}.${ext}`;
  const uploadUrl = mode === 'r2' ? await presignUpload(path, input.type) : undefined;
  return { path, url: publicUrl(path), uploadUrl, mode };
}

export async function createSocialPost(input: { caption: string; media: MediaFile[]; platforms: Platform[]; contentItemId?: string | null }): Promise<{ error?: string; id?: string }> {
  const { supabase, member } = await requireMember();
  if (!canPostSocial(member)) return { error: 'Only heads, admins and the Social Media team can post.' };

  const platforms = Array.from(new Set(input.platforms)).filter((p) => PLATFORMS.includes(p));
  if (platforms.length === 0) return { error: 'Pick at least one platform.' };
  const caption = input.caption.trim().slice(0, 2200);
  // Only accept files that live in our own storage.
  const media = (input.media ?? []).filter(
    (m) => m && typeof m.path === 'string' && typeof m.url === 'string' && isOurUrl(m.path, m.url) && (m.type === 'image' || m.type === 'video') && Number(m.size) > 0,
  );
  if (media.length === 0) return { error: 'Add at least one photo or video.' };

  const { data: post, error } = await supabase
    .from('social_posts')
    .insert({ created_by: member.id, caption, media, content_item_id: input.contentItemId || null })
    .select('id')
    .single();
  if (error || !post) return { error: error?.message ?? 'Could not save the post.' };

  const db = createAdminClient();
  await db.from('social_post_targets').insert(platforms.map((platform) => ({ post_id: post.id, platform })));
  // Kick it off straight away; the page keeps it moving from here.
  await advanceAll(8_000).catch(() => {});
  revalidatePath('/social');
  return { id: post.id };
}

/** Called every few seconds by the Social page while something is uploading. */
export async function advanceSocial(): Promise<number> {
  const { member } = await requireMember();
  if (!canPostSocial(member)) return 0;
  const n = await advanceAll(25_000);
  return n;
}

export async function retryTarget(form: FormData) {
  const { member } = await requireMember();
  if (!canPostSocial(member)) return;
  const db = createAdminClient();
  const { data: t } = await db.from('social_post_targets').select('post_id').eq('id', String(form.get('id'))).maybeSingle();
  const { data: post } = t ? await db.from('social_posts').select('media_deleted_at').eq('id', t.post_id).maybeSingle() : { data: null };
  if (!post || post.media_deleted_at) redirect(`/social?error=${encodeURIComponent('The files for this post were cleared after 7 days. Start a new post to try again.')}`);
  await db
    .from('social_post_targets')
    .update({ status: 'pending', state: {}, error: null, attempts: 0, updated_at: new Date().toISOString() })
    .eq('id', String(form.get('id')))
    .eq('status', 'failed');
  revalidatePath('/social');
}

export async function disconnectAccount(form: FormData) {
  await requireAdmin();
  const p = String(form.get('platform'));
  if (!PLATFORMS.includes(p as Platform)) return;
  await createAdminClient().from('social_accounts').delete().eq('platform', p);
  revalidatePath('/social');
  redirect(`/social?notice=${encodeURIComponent('Disconnected.')}`);
}

export async function syncSocialNow() {
  const { member } = await requireMember();
  if (!canPostSocial(member)) return;
  const res = await syncStats();
  revalidatePath('/insights');
  redirect(`/insights?notice=${encodeURIComponent(res.map((r) => r.message).join(' · '))}`);
}

/** Copy today's combined follower count into this month's "actual" on the 9-month plan. */
export async function saveFollowersToPlan(form: FormData) {
  const { supabase } = await requireAdmin();
  const total = Number(form.get('total'));
  if (!Number.isFinite(total) || total < 0) return;
  await supabase.from('plan_months').update({ followers_actual: Math.round(total) }).eq('month', monthStart(todayLagos()));
  revalidatePath('/plan');
  revalidatePath('/insights');
  redirect(`/insights?notice=${encodeURIComponent('Saved to this month on the 9-month plan.')}`);
}
