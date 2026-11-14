import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { createClient } from './supabase/server';
import { createAdminClient } from './supabase/admin';
import type { Grant, Member } from './types';

/**
 * Who can do what (least privilege):
 * - Member: their own duties, availability, onboarding, and board items they own.
 * - Head: as a member, plus their own department's roster duties, board items and team progress.
 * - Admin: everything, including members, permissions, connected accounts and the plan.
 * - Grants an admin switches on per person: 'post' (Instagram/TikTok), 'plan' (content board + AI ideas),
 *   'roster' (generate, publish and assign the whole roster). Admins have all three.
 * The database enforces the same rules (migration 0007); these helpers decide what the UI offers.
 */

export const VIEW_AS = ['member', 'social', 'head'] as const;
export type ViewAs = (typeof VIEW_AS)[number];
const VIEW_AS_COOKIE = 'yc_view_as';

const active = (m: Member | null): m is Member => !!m && m.status !== 'inactive';

/** What an admin sees while previewing another kind of user. Their real access in the database is unchanged. */
function previewAs(real: Member, as: ViewAs): Member {
  if (as === 'social') return { ...real, role: 'member', department_id: 'social', grants: ['post'] };
  if (as === 'head') return { ...real, role: 'head', grants: [] };
  return { ...real, role: 'member', grants: [] };
}

export const getSession = cache(async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, member: null as Member | null, realMember: null as Member | null, viewAs: null as ViewAs | null };
  // Your own row, including your own phone and email (members can't read anyone's contact details directly).
  const { data: row } = await createAdminClient().from('members').select('*').eq('user_id', user.id).maybeSingle<Member>();
  const realMember = row ? { ...row, grants: row.grants ?? [] } : null;
  const asCookie = cookies().get(VIEW_AS_COOKIE)?.value as ViewAs | undefined;
  const viewAs = realMember?.role === 'admin' && asCookie && VIEW_AS.includes(asCookie) ? asCookie : null;
  const member = realMember && viewAs ? previewAs(realMember, viewAs) : realMember;
  return { supabase, user, member, realMember, viewAs };
});

/** Signed in AND registered in the unit. `member` is who the pages act as (the preview while an admin uses View as). */
export async function requireMember() {
  const s = await getSession();
  if (!s.user) redirect('/login');
  if (!s.member || !s.realMember) redirect('/join');
  return { supabase: s.supabase, user: s.user, member: s.member, realMember: s.realMember, viewAs: s.viewAs };
}

export const isAdmin = (m: Member | null) => active(m) && m.role === 'admin';
export const can = (m: Member | null, g: Grant) => active(m) && (m.role === 'admin' || (m.grants ?? []).includes(g));
/** The department this person heads, or null. */
export const headOf = (m: Member | null) => (active(m) && m.role === 'head' ? m.department_id : null);

export const canPostSocial = (m: Member | null) => can(m, 'post');
export const canPlan = (m: Member | null) => can(m, 'plan');
export const canRoster = (m: Member | null) => can(m, 'roster');
/** Admins and heads see the team overview (heads: their own department only). */
export const canSeeTeam = (m: Member | null) => isAdmin(m) || !!headOf(m);

async function requireThat(ok: (m: Member) => boolean) {
  const s = await requireMember();
  if (!ok(s.member)) redirect('/home');
  return s;
}

export const requireAdmin = () => requireThat(isAdmin);
export const requireRoster = () => requireThat(canRoster);
export const requirePlan = () => requireThat(canPlan);
export const requirePoster = () => requireThat(canPostSocial);
export const requireTeamView = () => requireThat(canSeeTeam);

export { VIEW_AS_COOKIE };
