import { AppShell } from '@/components/AppShell';
import { requireMember } from '@/lib/auth';
import { LESSONS } from '@/content/lessons';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, member } = await requireMember();
  const [{ count }, { data: pledge }] = await Promise.all([
    supabase.from('lesson_progress').select('lesson_slug', { count: 'exact', head: true }).eq('member_id', member.id),
    supabase.from('pledges').select('agreed_at').eq('member_id', member.id).maybeSingle(),
  ]);
  const onboarded = (count ?? 0) >= LESSONS.length && !!pledge;
  return (
    <AppShell name={member.full_name} role={member.role} onboarded={onboarded}>
      {children}
    </AppShell>
  );
}
