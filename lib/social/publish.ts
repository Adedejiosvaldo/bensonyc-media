import { createAdminClient } from '@/lib/supabase/admin';
import { deleteMedia } from '@/lib/storage';
import { getAccount } from './accounts';
import { igContainerStatus, igCreateCarousel, igCreateContainers, igPublish } from './instagram';
import { ttInitPhotos, ttInitVideo, ttStatus, ttUploadChunk } from './tiktok';
import { PLATFORM_NAME, SocialError, type MediaFile, type SocialPost, type SocialTarget } from './types';

type Step = Partial<Pick<SocialTarget, 'status' | 'remote_id' | 'permalink' | 'error' | 'published_at'>> & { state?: Record<string, unknown> };

/** Public URL on this site for a stored file (TikTok needs a domain it has verified). */
export function proxiedUrl(file: MediaFile) {
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
  return `${site}/api/media/${file.path.split('/').map(encodeURIComponent).join('/')}`;
}

async function stepInstagram(post: SocialPost, t: SocialTarget): Promise<Step> {
  const acct = await getAccount('instagram');
  if (!acct) throw new SocialError('Instagram is not connected.');
  const s = t.state as { container?: string | null; children?: string[] };

  if (t.status === 'pending') {
    const c = await igCreateContainers(acct, post.media, post.caption);
    return { status: 'processing', state: { container: c.container, children: c.children } };
  }

  // Carousel: wait for every child, then build the parent.
  if (!s.container && s.children?.length) {
    for (const id of s.children) {
      const st = await igContainerStatus(acct, id);
      if (st.code === 'ERROR' || st.code === 'EXPIRED') throw new SocialError(`Instagram could not process one of the files. ${st.detail}`.trim());
      if (st.code !== 'FINISHED') return {};
    }
    const container = await igCreateCarousel(acct, s.children, post.caption);
    return { state: { ...s, container } };
  }

  if (!s.container) throw new SocialError('Lost track of the Instagram upload. Retry the post.');
  const st = await igContainerStatus(acct, s.container);
  if (st.code === 'ERROR' || st.code === 'EXPIRED') throw new SocialError(`Instagram could not process this post. ${st.detail}`.trim());
  if (st.code === 'IN_PROGRESS') return {};
  const done = await igPublish(acct, s.container);
  return { status: 'published', remote_id: done.id, permalink: done.permalink, published_at: new Date().toISOString() };
}

async function stepTikTok(post: SocialPost, t: SocialTarget): Promise<Step> {
  const acct = await getAccount('tiktok');
  if (!acct) throw new SocialError('TikTok is not connected.');
  const s = t.state as { publish_id?: string; upload_url?: string; chunk?: number; uploaded?: boolean };
  const videos = post.media.filter((m) => m.type === 'video');
  const images = post.media.filter((m) => m.type === 'image');

  if (t.status === 'pending') {
    if (videos.length && images.length) throw new SocialError("TikTok can't mix photos and videos in one post.");
    if (videos.length > 1) throw new SocialError('TikTok takes one video per post.');
    if (videos.length === 1) {
      const d = await ttInitVideo(acct, videos[0], post.caption);
      return { status: 'processing', state: { publish_id: d.publish_id, upload_url: d.upload_url, chunk: 0, uploaded: false } };
    }
    const d = await ttInitPhotos(acct, images.map(proxiedUrl), post.caption);
    return { status: 'processing', state: { publish_id: d.publish_id, uploaded: true } };
  }

  // One chunk per step keeps each request well inside the serverless time limit.
  if (!s.uploaded && s.upload_url) {
    const r = await ttUploadChunk(s.upload_url, videos[0], s.chunk ?? 0);
    return { state: { ...s, chunk: (s.chunk ?? 0) + 1, uploaded: r.done } };
  }

  if (!s.publish_id) throw new SocialError('Lost track of the TikTok upload. Retry the post.');
  const st = await ttStatus(acct, s.publish_id);
  if (st.status === 'FAILED') throw new SocialError(`TikTok rejected the post: ${st.fail_reason ?? 'unknown reason'}.`);
  if (st.status === 'PUBLISH_COMPLETE') {
    const id = st.publicaly_available_post_id?.[0];
    return { status: 'published', remote_id: id ? String(id) : null, permalink: id && acct.username ? `https://www.tiktok.com/@${acct.username}/video/${id}` : null, published_at: new Date().toISOString() };
  }
  if (st.status === 'SEND_TO_USER_INBOX') return { status: 'sent_to_drafts' };
  return {};
}

/** Move one target forward a single step. Safe to call repeatedly from several places. */
export async function advanceTarget(target: SocialTarget): Promise<SocialTarget> {
  const db = createAdminClient();
  // Claim it: if someone else moved it since we read it, skip.
  const now = new Date().toISOString();
  const { data: claimed } = await db
    .from('social_post_targets')
    .update({ updated_at: now })
    .eq('id', target.id)
    .eq('updated_at', target.updated_at)
    .select('*')
    .maybeSingle<SocialTarget>();
  if (!claimed) return target;

  const { data: post } = await db.from('social_posts').select('*').eq('id', target.post_id).single<SocialPost>();
  let step: Step;
  try {
    step = claimed.platform === 'instagram' ? await stepInstagram(post!, claimed) : await stepTikTok(post!, claimed);
  } catch (e) {
    const msg = e instanceof SocialError ? e.message : `${PLATFORM_NAME[claimed.platform]} upload failed: ${(e as Error).message}`;
    step = { status: 'failed', error: msg };
  }

  const patch = { ...step, state: step.state ?? claimed.state, attempts: claimed.attempts + 1, updated_at: new Date().toISOString() };
  const { data: saved } = await db.from('social_post_targets').update(patch).eq('id', claimed.id).select('*').single<SocialTarget>();

  // Close the loop with the weekly content board.
  if (step.status === 'published' && post?.content_item_id) {
    const { data: item } = await db.from('content_items').select('link').eq('id', post.content_item_id).maybeSingle();
    await db.from('content_items').update({ status: 'posted', ...(item?.link ? {} : { link: step.permalink ?? null }) }).eq('id', post.content_item_id);
  }
  if (step.status === 'published' || step.status === 'sent_to_drafts') await cleanupPost(claimed.post_id).catch(() => {});
  return saved ?? claimed;
}

/** Files are only needed until every platform has its own copy. */
const DONE: SocialTarget['status'][] = ['published', 'sent_to_drafts'];

/**
 * Delete a post's files from storage once every platform has them,
 * or after `maxAgeDays` whatever happened (so failed posts don't pile up).
 */
export async function cleanupPost(postId: string, maxAgeDays = 7) {
  const db = createAdminClient();
  const { data: post } = await db.from('social_posts').select('*').eq('id', postId).maybeSingle<SocialPost>();
  if (!post || post.media_deleted_at || post.media.length === 0) return false;
  const { data: targets } = await db.from('social_post_targets').select('status').eq('post_id', postId);
  const allDone = (targets ?? []).length > 0 && (targets ?? []).every((t) => DONE.includes(t.status));
  const old = Date.now() - new Date(post.created_at).getTime() > maxAgeDays * 86_400_000;
  const busy = (targets ?? []).some((t) => t.status === 'pending' || t.status === 'processing');
  if (!allDone && !(old && !busy)) return false;
  await deleteMedia(post.media);
  await db.from('social_posts').update({ media_deleted_at: new Date().toISOString() }).eq('id', postId);
  return true;
}

/** Daily sweep for posts whose files are still in storage. */
export async function cleanupAll() {
  const db = createAdminClient();
  const { data } = await db.from('social_posts').select('id').is('media_deleted_at', null).order('created_at').limit(50);
  let n = 0;
  for (const p of data ?? []) if (await cleanupPost(p.id).catch(() => false)) n++;
  return n;
}

/** Advance every unfinished target a little, within a time budget. */
export async function advanceAll(budgetMs = 40_000, includeDrafts = false) {
  const db = createAdminClient();
  const statuses = includeDrafts ? ['pending', 'processing', 'sent_to_drafts'] : ['pending', 'processing'];
  const { data } = await db.from('social_post_targets').select('*').in('status', statuses).order('updated_at').limit(20).returns<SocialTarget[]>();
  const start = Date.now();
  let moved = 0;
  for (const t of data ?? []) {
    if (Date.now() - start > budgetMs) break;
    // Drafts can sit for days; give up checking after a week.
    if (t.status === 'sent_to_drafts' && Date.now() - new Date(t.updated_at).getTime() > 7 * 86_400_000) continue;
    await advanceTarget(t);
    moved++;
  }
  return moved;
}
