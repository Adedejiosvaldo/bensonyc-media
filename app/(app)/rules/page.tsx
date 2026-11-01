import { requireMember } from '@/lib/auth';
import { PageHeader } from '@/components/PageHeader';
import { RulesView } from '@/components/sections';
import { PledgeForm } from '../onboarding/PledgeForm';

export const metadata = { title: 'Rules & regulations' };

export default async function RulesPage() {
  const { supabase, member } = await requireMember();
  const [{ data: pledge }, { data: signed }, { count }] = await Promise.all([
    supabase.from('pledges').select('agreed_at').eq('member_id', member.id).maybeSingle(),
    supabase.from('pledges').select('member_id, agreed_at, members(full_name)').order('agreed_at', { ascending: false }),
    supabase.from('members').select('id', { count: 'exact', head: true }).neq('status', 'inactive'),
  ]);
  const rows = (signed ?? []) as unknown as { member_id: string; agreed_at: string; members: { full_name: string } | null }[];
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Every member signs" title="Rules & regulations" />
      <RulesView />
      <PledgeForm name={member.full_name} signedAt={pledge?.agreed_at ?? null} />
      <section className="card p-6">
        <div className="mb-4 flex items-baseline justify-between">
          <p className="font-display text-2xl uppercase">Signed</p>
          <p className="text-sm font-bold text-muted">{rows.length} of {count ?? '–'} members</p>
        </div>
        <ul className="flex flex-wrap gap-2">
          {rows.map((r) => (
            <li key={r.member_id} className="chip bg-good/15 normal-case tracking-normal text-good">{r.members?.full_name ?? 'Member'}</li>
          ))}
          {rows.length === 0 && <li className="text-muted">Nobody has signed yet.</li>}
        </ul>
      </section>
    </div>
  );
}
