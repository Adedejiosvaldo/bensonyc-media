'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin, requireLead, requireMember } from '@/lib/auth';
import { RULES_VERSION } from '@/content/rules';
import { LESSONS } from '@/content/lessons';
import { departmentById } from '@/content/departments';
import { buildRoster, servicesForWeek } from '@/lib/roster';
import { buildWeek, monthForWeek } from '@/lib/plan';
import { addDays, isValidDate, label, todayLagos, weekStart } from '@/lib/dates';
import { sendEmail } from '@/lib/email';
import type { ContentStatus, Member, MemberStatus, PlanMonth, RosterSlot, Role } from '@/lib/types';

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

/* ───────── Auth ───────── */

export async function sendMagicLink(_: unknown, form: FormData): Promise<{ ok: boolean; message: string }> {
  const email = str(form, 'email').toLowerCase();
  const next = str(form, 'next') || '/home';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, message: 'Enter a valid email address.' };
  const origin = process.env.NEXT_PUBLIC_SITE_URL || `https://${headers().get('host')}`;
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) {
    if (error.message.toLowerCase().includes('rate limit')) {
      return { ok: false, message: "Too many link requests for now. Wait a few minutes and try again, or sign in with your password instead." };
    }
    return { ok: false, message: error.message };
  }
  return { ok: true, message: `Check ${email}. We sent you a sign-in link.` };
}

export async function signInWithPassword(_: unknown, form: FormData): Promise<{ ok: boolean; message: string }> {
  const email = str(form, 'email').toLowerCase();
  const password = str(form, 'password');
  const next = str(form, 'next') || '/home';
  if (!email || !password) return { ok: false, message: 'Enter your email and password.' };
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: "Wrong email or password. If you haven't set a password yet, sign in with the emailed link instead." };
  revalidatePath('/', 'layout');
  redirect(next);
}

export async function setPassword(_: unknown, form: FormData): Promise<{ ok: boolean; message: string }> {
  const { supabase } = await requireMember();
  const password = str(form, 'password');
  const confirm = str(form, 'confirm');
  if (password.length < 8) return { ok: false, message: 'Use at least 8 characters.' };
  if (password !== confirm) return { ok: false, message: "Passwords don't match." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Password set. Use it next time you sign in.' };
}

/* ───────── Registration ───────── */

export async function joinUnit(_: unknown, form: FormData): Promise<{ error?: string }> {
  const name = str(form, 'full_name');
  const phone = str(form, 'phone');
  const dept = str(form, 'department_id');
  if (name.length < 2) return { error: 'Enter your full name.' };
  if (!dept) return { error: 'Pick your department.' };
  const supabase = createClient();
  const { error } = await supabase.rpc('join_unit', { p_full_name: name, p_phone: phone, p_department: dept });
  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  redirect('/onboarding');
}

/* ───────── Onboarding ───────── */

export async function completeLesson(form: FormData) {
  const { supabase, member } = await requireMember();
  const slug = str(form, 'slug');
  if (!LESSONS.some((l) => l.slug === slug)) return;
  await supabase.from('lesson_progress').upsert({ member_id: member.id, lesson_slug: slug }, { onConflict: 'member_id,lesson_slug' });
  revalidatePath('/onboarding');
  const i = LESSONS.findIndex((l) => l.slug === slug);
  const next = LESSONS[i + 1];
  redirect(next ? `/onboarding/${next.slug}` : '/onboarding?done=1');
}

export async function signPledge(_: unknown, form: FormData): Promise<{ error?: string }> {
  const { supabase, member } = await requireMember();
  const signature = str(form, 'signature');
  if (form.get('agree') !== 'on') return { error: 'Tick the box to confirm you agree.' };
  if (signature.toLowerCase() !== member.full_name.toLowerCase()) return { error: `Type your full name exactly as registered: ${member.full_name}` };
  const { data: existingPledge } = await supabase.from('pledges').select('member_id').eq('member_id', member.id).maybeSingle();
  const { error } = await supabase.from('pledges').upsert({ member_id: member.id, signature, rules_version: RULES_VERSION, agreed_at: new Date().toISOString() });
  if (error) return { error: error.message };
  await supabase.from('lesson_progress').upsert({ member_id: member.id, lesson_slug: 'rules' }, { onConflict: 'member_id,lesson_slug' });
  if (!existingPledge && member.email) {
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? '';
    await sendEmail(member.email, 'Welcome to the Benson YC Media Unit', welcomeEmailHtml(member, site)).catch(() => {});
  }
  revalidatePath('/', 'layout');
  return {};
}

function welcomeEmailHtml(member: Member, site: string) {
  const dept = departmentById(member.department_id);
  const firstName = member.full_name.split(' ')[0];
  return `<!doctype html><html><body style="margin:0;background:#f7f1f7;font-family:Arial,Helvetica,sans-serif;color:#1b0f1d">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <div style="background:#2b0a2c;color:#fff;border-radius:20px;padding:28px">
    <p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#f6b40e;font-weight:bold">Benson YC Media Unit</p>
    <h1 style="margin:10px 0 0;font-size:28px;line-height:1.1">Welcome, ${firstName}</h1>
    <p style="margin:8px 0 0;color:#d9c6da">You've finished onboarding and signed the pledge — you're now a full member of the media team${dept ? `, ${dept.name}` : ''}.</p>
  </div>
  <div style="background:#fff;border-radius:20px;padding:24px;margin-top:12px">
    <p style="margin:0;font-size:15px;line-height:1.5">Check Home for your next duty and the content you own this week.</p>
    ${site ? `<p style="margin:20px 0 0"><a href="${site}/home" style="background:#d6197a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:bold;display:inline-block">Open the media app</a></p>` : ''}
  </div>
</div></body></html>`;
}

/* ───────── Content board ───────── */

export async function generateContentWeek(form: FormData) {
  const { supabase } = await requireLead();
  const sunday = weekStart(str(form, 'week'));
  const replace = form.get('replace') === 'on';
  const { data: months } = await supabase.from('plan_months').select('*').returns<PlanMonth[]>();
  const month = monthForWeek(sunday, months ?? []);
  if (replace) await supabase.from('content_items').delete().eq('week_start', sunday);
  else {
    const { count } = await supabase.from('content_items').select('id', { count: 'exact', head: true }).eq('week_start', sunday);
    if (count) redirect(`/content?week=${sunday}`);
  }
  const rows = buildWeek(sunday, month).map((d) => ({ ...d, week_start: sunday }));
  await supabase.from('content_items').insert(rows);
  revalidatePath('/content');
  redirect(`/content?week=${sunday}`);
}

export async function updateContentItem(form: FormData) {
  const { supabase } = await requireMember();
  const id = str(form, 'id');
  const patch: Record<string, unknown> = {};
  const status = str(form, 'status');
  if (['planned', 'shot', 'edited', 'posted', 'skipped'].includes(status)) patch.status = status as ContentStatus;
  if (form.has('owner_id')) patch.owner_id = str(form, 'owner_id') || null;
  if (form.has('title')) patch.title = str(form, 'title');
  if (form.has('brief')) patch.brief = str(form, 'brief');
  if (form.has('link')) patch.link = str(form, 'link') || null;
  await supabase.from('content_items').update(patch).eq('id', id);
  revalidatePath('/content');
  revalidatePath('/home');
}

/* ───────── Roster ───────── */

export async function generateRoster(form: FormData) {
  const { supabase, member } = await requireLead();
  const sunday = weekStart(str(form, 'week'));
  const midweek = form.get('midweek') === 'on';
  const special = form.get('special') === 'on';
  const midweekDay = Number(str(form, 'midweek_day') || 3);

  const [{ data: members }, { data: recent }, { data: blockouts }] = await Promise.all([
    supabase.from('members').select('id, department_id, status, break_until').returns<Pick<Member, 'id' | 'department_id' | 'status' | 'break_until'>[]>(),
    supabase.from('roster_slots').select('member_id, service_date').gte('service_date', addDays(sunday, -56)).lt('service_date', sunday),
    supabase.from('blockouts').select('member_id, start_date, end_date').lte('start_date', addDays(sunday, 6)).gte('end_date', sunday),
  ]);
  const counts: Record<string, number> = {};
  (recent ?? []).forEach((r: { member_id: string | null }) => r.member_id && (counts[r.member_id] = (counts[r.member_id] ?? 0) + 1));

  const slots = buildRoster(members ?? [], counts, servicesForWeek(sunday, { midweek, midweekDay, special }), Math.random, blockouts ?? []);

  const { data: week, error } = await supabase
    .from('roster_weeks')
    .upsert({ week_start: sunday, created_by: member.id }, { onConflict: 'week_start' })
    .select('id')
    .single();
  if (error || !week) throw new Error(error?.message ?? 'Could not save the roster week');
  await supabase.from('roster_slots').delete().eq('week_id', week.id);
  await supabase.from('roster_slots').insert(slots.map((s) => ({ ...s, week_id: week.id })));
  revalidatePath('/roster');
  redirect(`/roster?week=${sunday}`);
}

export async function assignSlot(form: FormData) {
  const { supabase } = await requireLead();
  const id = str(form, 'id');
  await supabase.from('roster_slots').update({ member_id: str(form, 'member_id') || null }).eq('id', id);
  // A lead moving the slot by hand settles any open swap request on it.
  const { data: open } = await supabase.from('swap_requests').select('id').eq('slot_id', id).eq('status', 'open').maybeSingle();
  if (open) await supabase.rpc('cancel_swap', { p_swap: open.id });
  revalidatePath('/roster');
}

/* ───────── Availability ───────── */

export async function addBlockout(_: unknown, form: FormData): Promise<{ ok: boolean; message: string }> {
  const { supabase, member } = await requireMember();
  const start = str(form, 'start_date');
  const end = str(form, 'end_date') || start;
  const reason = str(form, 'reason').slice(0, 120);
  if (!isValidDate(start) || !isValidDate(end)) return { ok: false, message: 'Pick a start date.' };
  if (end < start) return { ok: false, message: 'The end date is before the start date.' };
  if (end < todayLagos()) return { ok: false, message: 'Those dates are already in the past.' };
  const { error } = await supabase.from('blockouts').insert({ member_id: member.id, start_date: start, end_date: end, reason: reason || null });
  if (error) return { ok: false, message: error.message };
  revalidatePath('/availability');
  revalidatePath('/roster');
  return { ok: true, message: start === end ? `Saved. You won't be rostered on ${label(start, 'long')}.` : `Saved. You won't be rostered from ${label(start)} to ${label(end)}.` };
}

export async function deleteBlockout(form: FormData) {
  const { supabase } = await requireMember();
  await supabase.from('blockouts').delete().eq('id', str(form, 'id'));
  revalidatePath('/availability');
  revalidatePath('/roster');
}

/* ───────── Duty swaps ───────── */

const swapEmail = (title: string, body: string, site: string) => `<!doctype html><html><body style="margin:0;background:#f7f1f7;font-family:Arial,Helvetica,sans-serif;color:#1b0f1d">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <div style="background:#2b0a2c;color:#fff;border-radius:20px;padding:28px">
    <p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#f6b40e;font-weight:bold">Benson YC Media Unit</p>
    <h1 style="margin:10px 0 0;font-size:26px;line-height:1.15">${escapeHtml(title)}</h1>
  </div>
  <div style="background:#fff;border-radius:20px;padding:24px;margin-top:12px">
    <p style="margin:0;font-size:15px;line-height:1.5">${body}</p>
    ${site ? `<p style="margin:20px 0 0"><a href="${site}/roster" style="background:#d6197a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:bold;display:inline-block">Open the roster</a></p>` : ''}
  </div>
</div></body></html>`;

const rosterUrl = (form: FormData) => {
  const week = str(form, 'week');
  return `/roster?week=${isValidDate(week) ? week : weekStart(todayLagos())}`;
};

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export async function requestSwap(form: FormData) {
  const { supabase, member } = await requireMember();
  const slotId = str(form, 'slot_id');
  const note = str(form, 'note').slice(0, 200);
  const back = rosterUrl(form);
  const { error } = await supabase.rpc('request_swap', { p_slot: slotId, p_note: note });
  if (error) redirect(`${back}&notice=${encodeURIComponent(error.message)}`);

  // Let the rest of the department know (best effort).
  const { data: slot } = await supabase.from('roster_slots').select('*').eq('id', slotId).maybeSingle<RosterSlot>();
  if (slot) {
    const { data: team } = await supabase
      .from('members')
      .select('email, status')
      .eq('department_id', slot.department_id)
      .neq('id', member.id)
      .neq('status', 'inactive');
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? '';
    const first = escapeHtml(member.full_name.split(' ')[0]);
    const body = `${first} needs cover for <b>${escapeHtml(slot.duty)}</b> at ${escapeHtml(slot.service_label)} on ${label(slot.service_date, 'long')}.${note ? `<br><br>“${escapeHtml(note)}”` : ''}<br><br>If you can take it, open the roster and tap <b>Take this duty</b>. First to tap gets it.`;
    await Promise.all(
      (team ?? [])
        .filter((t) => t.email)
        .map((t) => sendEmail(t.email!, `Can you cover ${slot.duty} on ${label(slot.service_date)}?`, swapEmail('Cover needed', body, site)).catch(() => {})),
    );
  }
  revalidatePath('/roster');
  revalidatePath('/home');
  redirect(`${back}&notice=${encodeURIComponent('Swap requested. Your department has been emailed.')}`);
}

export async function takeSwap(form: FormData) {
  const { supabase, member } = await requireMember();
  const swapId = str(form, 'swap_id');
  const back = rosterUrl(form);
  const { error } = await supabase.rpc('take_swap', { p_swap: swapId });
  if (error) redirect(`${back}&notice=${encodeURIComponent(error.message)}`);

  const { data: swap } = await supabase.from('swap_requests').select('from_member, slot_id').eq('id', swapId).maybeSingle();
  if (swap) {
    const [{ data: from }, { data: slot }] = await Promise.all([
      supabase.from('members').select('email, full_name').eq('id', swap.from_member).maybeSingle(),
      supabase.from('roster_slots').select('*').eq('id', swap.slot_id).maybeSingle<RosterSlot>(),
    ]);
    if (from?.email && slot) {
      const site = process.env.NEXT_PUBLIC_SITE_URL ?? '';
      const body = `${escapeHtml(member.full_name)} is now covering <b>${escapeHtml(slot.duty)}</b> at ${escapeHtml(slot.service_label)} on ${label(slot.service_date, 'long')}. You're off this one.`;
      await sendEmail(from.email, `${member.full_name.split(' ')[0]} is covering your duty`, swapEmail('Your duty is covered', body, site)).catch(() => {});
    }
  }
  revalidatePath('/roster');
  revalidatePath('/home');
  redirect(`${back}&notice=${encodeURIComponent("It's yours. The roster is updated.")}`);
}

export async function cancelSwap(form: FormData) {
  const { supabase } = await requireMember();
  await supabase.rpc('cancel_swap', { p_swap: str(form, 'swap_id') });
  revalidatePath('/roster');
  revalidatePath('/home');
}

/* ───────── Calendar feed ───────── */

export async function resetCalendarToken() {
  const { supabase, member } = await requireMember();
  await supabase.from('calendar_tokens').upsert({ member_id: member.id, token: crypto.randomUUID() }, { onConflict: 'member_id' });
  revalidatePath('/availability');
}

/* ───────── Admin ───────── */

export async function updateMember(form: FormData) {
  const { supabase } = await requireAdmin();
  const status = str(form, 'status') as MemberStatus;
  const patch = {
    department_id: str(form, 'department_id') || null,
    role: str(form, 'role') as Role,
    status,
    break_until: status === 'on_break' && isValidDate(str(form, 'break_until')) ? str(form, 'break_until') : null,
  };
  await supabase.from('members').update(patch).eq('id', str(form, 'id'));
  revalidatePath('/admin');
}

export async function addMember(form: FormData) {
  const { supabase } = await requireAdmin();
  const name = str(form, 'full_name');
  if (!name) return;
  await supabase.from('members').insert({ full_name: name, department_id: str(form, 'department_id') || null });
  revalidatePath('/admin');
}

export async function updatePlanMonth(form: FormData) {
  const { supabase } = await requireAdmin();
  const actual = str(form, 'followers_actual');
  await supabase
    .from('plan_months')
    .update({
      theme: str(form, 'theme'),
      big_moment: str(form, 'big_moment'),
      hero_content: str(form, 'hero_content'),
      follower_target: Number(str(form, 'follower_target')) || 0,
      followers_actual: actual ? Number(actual) : null,
    })
    .eq('id', str(form, 'id'));
  revalidatePath('/plan');
  revalidatePath('/admin/plan');
}
