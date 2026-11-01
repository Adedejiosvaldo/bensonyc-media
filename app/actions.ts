'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin, requireLead, requireMember } from '@/lib/auth';
import { RULES_VERSION } from '@/content/rules';
import { LESSONS } from '@/content/lessons';
import { buildRoster, servicesForWeek } from '@/lib/roster';
import { buildWeek, monthForWeek } from '@/lib/plan';
import { addDays, isValidDate, weekStart } from '@/lib/dates';
import type { ContentStatus, Member, MemberStatus, PlanMonth, Role } from '@/lib/types';

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
  if (error) return { ok: false, message: error.message };
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
  const { error } = await supabase.from('pledges').upsert({ member_id: member.id, signature, rules_version: RULES_VERSION, agreed_at: new Date().toISOString() });
  if (error) return { error: error.message };
  await supabase.from('lesson_progress').upsert({ member_id: member.id, lesson_slug: 'rules' }, { onConflict: 'member_id,lesson_slug' });
  revalidatePath('/', 'layout');
  return {};
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

  const [{ data: members }, { data: recent }] = await Promise.all([
    supabase.from('members').select('id, department_id, status, break_until').returns<Pick<Member, 'id' | 'department_id' | 'status' | 'break_until'>[]>(),
    supabase.from('roster_slots').select('member_id, service_date').gte('service_date', addDays(sunday, -56)).lt('service_date', sunday),
  ]);
  const counts: Record<string, number> = {};
  (recent ?? []).forEach((r: { member_id: string | null }) => r.member_id && (counts[r.member_id] = (counts[r.member_id] ?? 0) + 1));

  const slots = buildRoster(members ?? [], counts, servicesForWeek(sunday, { midweek, midweekDay, special }));

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
  await supabase.from('roster_slots').update({ member_id: str(form, 'member_id') || null }).eq('id', str(form, 'id'));
  revalidatePath('/roster');
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
