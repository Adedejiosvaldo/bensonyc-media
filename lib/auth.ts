import { redirect } from 'next/navigation';
import { cache } from 'react';
import { createClient } from './supabase/server';
import type { Member } from './types';

export const getSession = cache(async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, member: null as Member | null };
  const { data: member } = await supabase.from('members').select('*').eq('user_id', user.id).maybeSingle<Member>();
  return { supabase, user, member: member ?? null };
});

/** Signed in AND registered in the unit. */
export async function requireMember() {
  const s = await getSession();
  if (!s.user) redirect('/login');
  if (!s.member) redirect('/join');
  return { supabase: s.supabase, user: s.user, member: s.member };
}

export const isLead = (m: Member | null) => !!m && (m.role === 'admin' || m.role === 'head');
export const isAdmin = (m: Member | null) => !!m && m.role === 'admin';

/** Heads, admins and the Social Media department can post to the unit's accounts. */
export const canPostSocial = (m: Member | null) => !!m && m.status !== 'inactive' && (isLead(m) || m.department_id === 'social');

export async function requireLead() {
  const s = await requireMember();
  if (!isLead(s.member)) redirect('/home');
  return s;
}

export async function requireAdmin() {
  const s = await requireMember();
  if (!isAdmin(s.member)) redirect('/home');
  return s;
}
