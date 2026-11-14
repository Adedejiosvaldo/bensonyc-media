'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { canPostSocial, requireMember } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { startRun } from '@/lib/ai/manager';
import { isValidDate, weekStart } from '@/lib/dates';

const str = (form: FormData, key: string) => String(form.get(key) ?? '').trim();

async function requirePoster() {
  const session = await requireMember();
  if (!canPostSocial(session.member)) redirect('/content');
  return session;
}

/** A lead or the Social team asks for suggestions for the week on screen. Results arrive within the hour. */
export async function requestSuggestions(form: FormData) {
  const { member } = await requirePoster();
  const week = str(form, 'week');
  const sunday = weekStart(isValidDate(week) ? week : '');
  let notice = 'Asked the AI for this week’s ideas. They usually arrive within the hour; check back here.';
  try {
    await startRun(sunday, member.id);
  } catch (e) {
    notice = (e as Error).message;
  }
  revalidatePath('/content');
  redirect(`/content?week=${sunday}&notice=${encodeURIComponent(notice)}`);
}

/** Turn a suggestion into a normal board item, keeping the hook, caption draft and references in the brief. */
export async function addSuggestionToBoard(form: FormData) {
  await requirePoster();
  const db = createAdminClient();
  const id = str(form, 'id');
  const { data: s } = await db.from('ai_suggestions').select('*').eq('id', id).maybeSingle();
  if (!s || s.status === 'added') return;
  const refs = (s.refs as { url: string; note: string }[]).map((r) => `• ${r.note}: ${r.url}`).join('\n');
  const brief = [
    `Hook: ${s.hook}`,
    `Caption draft:\n${s.caption}`,
    s.shot_notes ? `Shoot: ${s.shot_notes}` : '',
    `Why: ${s.why}`,
    refs ? `References:\n${refs}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
  const { data: item, error } = await db
    .from('content_items')
    .insert({
      week_start: s.week_start,
      day: s.day,
      series: s.series,
      pillar: ['People', 'Word', 'Events', 'Community'].includes(s.pillar) ? s.pillar : 'Community',
      format: s.format,
      title: s.title,
      brief,
      department_id: s.department_id,
      sort: 100,
    })
    .select('id')
    .single();
  if (error || !item) throw new Error(error?.message ?? 'Could not add it to the board.');
  await db.from('ai_suggestions').update({ status: 'added', content_item_id: item.id }).eq('id', id);
  revalidatePath('/content');
  revalidatePath('/home');
}

export async function dismissSuggestion(form: FormData) {
  await requirePoster();
  await createAdminClient().from('ai_suggestions').update({ status: 'dismissed' }).eq('id', str(form, 'id'));
  revalidatePath('/content');
}
