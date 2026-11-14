'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { DEPARTMENTS } from '@/content/departments';
import { isValidDate } from '@/lib/dates';
import type { Grant, MemberStatus, Role } from '@/lib/types';

export type MemberFormState = { ok: boolean; message: string } | null;

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const ROLES: Role[] = ['member', 'head', 'admin'];
const STATUSES: MemberStatus[] = ['active', 'on_break', 'inactive'];
const DEPT_IDS = DEPARTMENTS.map((d) => d.id as string);
const GRANTS: Grant[] = ['post', 'plan', 'roster'];

/** Read and check the shared member fields. Returns an error message instead of throwing. */
function readFields(form: FormData) {
  const full_name = str(form, 'full_name').replace(/\s+/g, ' ');
  const phone = str(form, 'phone');
  const department_id = str(form, 'department_id');
  const role = str(form, 'role') as Role;
  const status = str(form, 'status') as MemberStatus;
  const breakUntil = str(form, 'break_until');
  // Admins can do everything, so their switches are ignored and stored empty.
  const grants = role === 'admin' ? [] : GRANTS.filter((g) => form.getAll('grants').includes(g));

  if (full_name.length < 2) return { error: 'Add the member’s name (at least 2 letters).' };
  if (full_name.length > 80) return { error: 'That name is too long. Keep it under 80 characters.' };
  if (phone && !/^[+\d][\d\s()-]{6,19}$/.test(phone)) return { error: 'The WhatsApp number doesn’t look right. Use digits, for example 0803 000 0000.' };
  if (department_id && !DEPT_IDS.includes(department_id)) return { error: 'Pick a department from the list.' };
  if (!ROLES.includes(role)) return { error: 'Pick a role from the list.' };
  if (!STATUSES.includes(status)) return { error: 'Pick a status from the list.' };
  if (status === 'on_break' && breakUntil && !isValidDate(breakUntil)) return { error: 'The break end date isn’t a valid date.' };

  return {
    fields: {
      full_name,
      phone: phone || null,
      department_id: department_id || null,
      role,
      status,
      break_until: status === 'on_break' && breakUntil ? breakUntil : null,
      grants,
    },
  };
}

/** Add someone to the unit before they register. They claim the row when they join with the same first name and department. */
export async function createMember(_: MemberFormState, form: FormData): Promise<MemberFormState> {
  const { supabase } = await requireAdmin();
  const r = readFields(form);
  if ('error' in r) return { ok: false, message: r.error! };
  const { error } = await supabase.from('members').insert(r.fields);
  if (error) return { ok: false, message: `Couldn’t add the member: ${error.message}` };
  revalidatePath('/admin');
  return { ok: true, message: `${r.fields.full_name} added.` };
}

export async function editMember(_: MemberFormState, form: FormData): Promise<MemberFormState> {
  const { supabase, member: me } = await requireAdmin();
  const id = str(form, 'id');
  const r = readFields(form);
  if ('error' in r) return { ok: false, message: r.error! };

  // Don't let an admin lock themselves out.
  if (id === me.id && (r.fields.role !== 'admin' || r.fields.status === 'inactive')) {
    return { ok: false, message: 'You can’t remove your own admin role or make yourself inactive. Ask another admin to do it.' };
  }
  const { error } = await supabase.from('members').update(r.fields).eq('id', id);
  if (error) return { ok: false, message: `Couldn’t save the changes: ${error.message}` };
  revalidatePath('/admin');
  revalidatePath('/roster');
  return { ok: true, message: `${r.fields.full_name} updated.` };
}

/**
 * Remove a member for good. Their lesson progress, pledge, blocked dates, swap requests and calendar link go
 * with them; roster duties and board items they held become unassigned. Their sign-in account is untouched,
 * so if they sign in again they are asked to join afresh.
 */
export async function deleteMember(_: MemberFormState, form: FormData): Promise<MemberFormState> {
  const { supabase, member: me } = await requireAdmin();
  const id = str(form, 'id');
  if (id === me.id) return { ok: false, message: 'You can’t remove yourself. Ask another admin to do it.' };

  const { data: target } = await supabase.from('members').select('full_name, role').eq('id', id).maybeSingle();
  if (!target) return { ok: false, message: 'That member no longer exists.' };
  if (target.role === 'admin') {
    const { count } = await supabase.from('members').select('id', { count: 'exact', head: true }).eq('role', 'admin');
    if ((count ?? 0) <= 1) return { ok: false, message: 'This is the only admin. Make someone else an admin first.' };
  }

  const { error } = await supabase.from('members').delete().eq('id', id);
  if (error) return { ok: false, message: `Couldn’t remove the member: ${error.message}` };
  revalidatePath('/admin');
  revalidatePath('/roster');
  revalidatePath('/content');
  return { ok: true, message: `${target.full_name} removed.` };
}
