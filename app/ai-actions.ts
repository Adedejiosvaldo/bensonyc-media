'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { canPostSocial, requireMember } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { startRun } from '@/lib/ai/manager';
import { isValidDate, rangeLabel, todayLagos, weekStart } from '@/lib/dates';
import { planningWeek } from '@/lib/ai/week';
import { tidy, unquote } from '@/lib/ai/text';

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
  const today = todayLagos();
  // Late in the week (or on a past week), plan the week ahead rather than days that are already gone.
  const sunday = planningWeek(weekStart(isValidDate(week) ? week : today), today);
  let notice = `Asked the AI for ideas for ${rangeLabel(sunday)}. They usually arrive within the hour; check back here.`;
  try {
    await startRun(sunday, member.id);
  } catch (e) {
    notice = (e as Error).message;
  }
  revalidatePath('/content');
  redirect(`/content?week=${sunday}&notice=${encodeURIComponent(notice)}`);
}

type SuggestionRow = {
  id: string;
  week_start: string;
  day: string;
  series: string;
  pillar: string;
  format: string;
  title: string;
  hook: string;
  caption: string;
  shot_notes: string;
  why: string;
  refs: { url: string; note: string }[];
  department_id: string | null;
  status: string;
};

/** Insert one suggestion as a normal board item, keeping hook, caption, shot notes and references in its brief. */
async function addToBoard(db: ReturnType<typeof createAdminClient>, s: SuggestionRow) {
  const refs = (s.refs ?? []).map((r) => `• ${tidy(r.note)}: ${r.url}`).join('\n');
  const brief = [
    `Hook: ${unquote(s.hook)}`,
    `Caption draft:\n${tidy(s.caption)}`,
    s.shot_notes ? `Shoot: ${tidy(s.shot_notes)}` : '',
    `Why: ${tidy(s.why)}`,
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
      title: unquote(s.title),
      brief,
      department_id: s.department_id,
      sort: 100,
    })
    .select('id')
    .single();
  if (error || !item) throw new Error(error?.message ?? 'Could not add it to the board.');
  await db.from('ai_suggestions').update({ status: 'added', content_item_id: item.id }).eq('id', s.id);
}

export async function addSuggestionToBoard(form: FormData) {
  await requirePoster();
  const db = createAdminClient();
  const { data: s } = await db.from('ai_suggestions').select('*').eq('id', str(form, 'id')).maybeSingle<SuggestionRow>();
  if (!s || s.status === 'added') return;
  await addToBoard(db, s);
  revalidatePath('/content');
  revalidatePath('/home');
}

/** Add every open suggestion for the week whose day hasn't passed. */
export async function addAllSuggestions(form: FormData) {
  await requirePoster();
  const db = createAdminClient();
  const week = str(form, 'week');
  const { data: rows } = await db
    .from('ai_suggestions')
    .select('*')
    .eq('week_start', week)
    .eq('status', 'new')
    .gte('day', todayLagos())
    .order('day')
    .returns<SuggestionRow[]>();
  for (const s of rows ?? []) await addToBoard(db, s);
  revalidatePath('/content');
  revalidatePath('/home');
  redirect(`/content?week=${week}&notice=${encodeURIComponent(`${rows?.length ?? 0} ideas added to the board.`)}`);
}

export async function dismissSuggestion(form: FormData) {
  await requirePoster();
  await createAdminClient().from('ai_suggestions').update({ status: 'dismissed' }).eq('id', str(form, 'id'));
  revalidatePath('/content');
}
