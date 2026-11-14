import Link from 'next/link';
import { requireLead, isAdmin } from '@/lib/auth';
import { PageHeader } from '@/components/PageHeader';
import { ProgressBar } from '@/components/Progress';
import { Icon } from '@/components/Icon';
import { LESSONS } from '@/content/lessons';
import { DEPARTMENTS, departmentById } from '@/content/departments';
import type { Member, MemberStatus } from '@/lib/types';
import { MemberDialog } from './MemberDialog';
import { label } from '@/lib/dates';

export const metadata = { title: 'Admin' };

export default async function AdminPage({ searchParams }: { searchParams: { dept?: string } }) {
  const { supabase, member } = await requireLead();
  const admin = isAdmin(member);
  const [{ data: members }, { data: progress }, { data: pledges }] = await Promise.all([
    supabase.from('members').select('*').order('department_id').order('full_name').returns<Member[]>(),
    supabase.from('lesson_progress').select('member_id, lesson_slug'),
    supabase.from('pledges').select('member_id, agreed_at'),
  ]);
  const doneBy = new Map<string, number>();
  (progress ?? []).forEach((p) => doneBy.set(p.member_id, (doneBy.get(p.member_id) ?? 0) + 1));
  const signed = new Map((pledges ?? []).map((p) => [p.member_id, p.agreed_at]));
  const all = (members ?? []).filter((m) => !searchParams.dept || m.department_id === searchParams.dept);
  const active = (members ?? []).filter((m) => m.status !== 'inactive');
  const registered = active.filter((m) => m.user_id).length;
  const finished = active.filter((m) => (doneBy.get(m.id) ?? 0) >= LESSONS.length && signed.has(m.id)).length;

  const depts = DEPARTMENTS.map((d) => ({ id: d.id, name: d.name }));
  const STATUS: Record<MemberStatus, { text: string; cls: string }> = {
    active: { text: 'Active', cls: 'bg-good/15 text-good-ink' },
    on_break: { text: 'On break', cls: 'bg-gold/25 text-warn-ink' },
    inactive: { text: 'Inactive', cls: 'bg-line text-muted' },
  };

  const stat = (n: number, total: number, l: string) => (
    <div className="card p-5">
      <p className="font-display text-4xl tabular-nums">{n}<span className="text-xl text-muted">/{total}</span></p>
      <p className="mt-1 text-xs font-bold uppercase tracking-wider text-muted">{l}</p>
      <ProgressBar value={n} max={total} className="mt-3" />
    </div>
  );

  return (
    <div>
      <PageHeader
        eyebrow="Unit overview"
        title="Admin"
        actions={
          admin && (
            <>
              <Link href="/admin/plan" className="btn-ghost"><Icon name="plan" className="h-4 w-4" /> Edit 9-month plan</Link>
              <MemberDialog departments={depts} />
            </>
          )
        }
      >
        Who has registered, finished onboarding and signed the pledge.{admin ? ' Add, edit or remove members here.' : ''}
      </PageHeader>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {stat(registered, active.length, 'Registered')}
        {stat(signed.size, active.length, 'Signed the pledge')}
        {stat(finished, active.length, 'Finished onboarding')}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin" aria-current={!searchParams.dept ? 'true' : undefined} className={`chip min-h-9 px-3 ${!searchParams.dept ? 'bg-magenta text-white' : 'bg-plum-100 text-ink hover:bg-plum-100/70'}`}>All</Link>
        {DEPARTMENTS.map((d) => (
          <Link key={d.id} href={`/admin?dept=${d.id}`} aria-current={searchParams.dept === d.id ? 'true' : undefined} className={`chip min-h-9 px-3 ${searchParams.dept === d.id ? 'bg-magenta text-white' : 'bg-plum-100 text-ink hover:bg-plum-100/70'}`}>{d.name}</Link>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
            <tr>
              <th scope="col" className="px-4 py-3">Member</th>
              <th scope="col" className="px-4 py-3">Department · role</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Course</th>
              <th scope="col" className="px-4 py-3">Pledge</th>
              {admin && <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {all.length === 0 && (
              <tr><td colSpan={admin ? 6 : 5} className="px-4 py-8 text-center text-muted">No members in this department yet.</td></tr>
            )}
            {all.map((m) => {
              const n = doneBy.get(m.id) ?? 0;
              return (
                <tr key={m.id} className="align-middle">
                  <th scope="row" className="px-4 py-3 text-left font-normal">
                    <p className={`font-bold ${m.status === 'inactive' ? 'text-muted' : ''}`}>{m.full_name}{m.id === member.id && <span className="ml-1.5 text-xs font-semibold text-muted">(you)</span>}</p>
                    <p className="text-xs text-muted">{m.email ?? 'Not registered yet'}{m.phone ? ` · ${m.phone}` : ''}</p>
                  </th>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{departmentById(m.department_id)?.name ?? '—'}</p>
                    <p className="text-xs capitalize text-muted">{m.role}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`chip ${STATUS[m.status].cls}`}>{STATUS[m.status].text}</span>
                    {m.status === 'on_break' && m.break_until && <p className="mt-1 text-xs text-muted">Back {label(m.break_until)}</p>}
                  </td>
                  <td className="w-40 px-4 py-3">
                    <p className="mb-1 text-xs font-semibold tabular-nums">{n}/{LESSONS.length}</p>
                    <ProgressBar value={n} max={LESSONS.length} label={`${m.full_name}: lessons done`} />
                  </td>
                  <td className="px-4 py-3">
                    {signed.has(m.id) ? <span className="chip bg-good/15 text-good-ink"><Icon name="check" className="h-3 w-3" /> Signed</span> : <span className="chip bg-line text-muted">Not yet</span>}
                  </td>
                  {admin && (
                    <td className="px-4 py-3 text-right">
                      <MemberDialog member={m} departments={depts} isSelf={m.id === member.id} />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}
