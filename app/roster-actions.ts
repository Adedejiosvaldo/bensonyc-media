'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireMember, requireRoster } from '@/lib/auth';
import { deadlineFor, notifyDecline, notifyNewDuties } from '@/lib/roster-notify';
import { isValidDate, weekStart } from '@/lib/dates';

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

/**
 * Publish the roster (once) and email everyone on it who hasn't been told yet. Running it again after
 * reshuffling or reassigning only emails the people whose duty is new to them.
 */
export async function publishRoster(form: FormData) {
  const { supabase, member } = await requireRoster();
  const week = str(form, 'week');
  const sunday = weekStart(isValidDate(week) ? week : '');
  const { data: row } = await supabase.from('roster_weeks').select('id, published_at').eq('week_start', sunday).maybeSingle();
  if (!row) redirect(`/roster?week=${sunday}`);

  if (!row.published_at) {
    const deadline = deadlineFor(sunday);
    await supabase
      .from('roster_weeks')
      .update({ published_at: new Date().toISOString(), published_by: member.id, deadline: new Date(deadline) > new Date() ? deadline : null })
      .eq('id', row.id);
  }
  const sent = await notifyNewDuties(row.id);
  revalidatePath('/roster');
  revalidatePath('/home');
  const notice = row.published_at
    ? `Sent ${sent} email${sent === 1 ? '' : 's'} to people with new duties.`
    : `Published. ${sent} email${sent === 1 ? '' : 's'} sent; everyone also sees their duty on Home.`;
  redirect(`/roster?week=${sunday}&notice=${encodeURIComponent(notice)}`);
}

export type DutyReplyState = { ok: boolean; message: string } | null;

/** The person on a duty accepts it, or says they can't make it with a reason (which opens a swap). */
export async function respondToDuty(_: DutyReplyState, form: FormData): Promise<DutyReplyState> {
  const { supabase } = await requireMember();
  const slot = str(form, 'slot');
  const response = str(form, 'response');
  const reason = str(form, 'reason').slice(0, 200);
  if (response === 'declined' && !reason) return { ok: false, message: 'Add a short reason so your head can plan.' };

  const { error } = await supabase.rpc('respond_to_duty', { p_slot: slot, p_response: response, p_reason: reason });
  if (error) return { ok: false, message: error.message };
  if (response === 'declined') await notifyDecline(slot).catch(() => undefined);

  revalidatePath('/home');
  revalidatePath('/roster');
  return {
    ok: true,
    message: response === 'accepted' ? 'Thanks, you’re confirmed.' : 'Got it. Your department can now take this duty, and the admins know.',
  };
}
