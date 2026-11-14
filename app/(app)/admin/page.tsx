import Link from 'next/link';
import { requireLead, isAdmin } from '@/lib/auth';
import { addMember, updateMember } from '@/app/actions';
import { PageHeader } from '@/components/PageHeader';
import { ProgressBar } from '@/components/Progress';
import { SubmitButton } from '@/components/SubmitButton';
import { Icon } from '@/components/Icon';
import { LESSONS } from '@/content/lessons';
import { DEPARTMENTS, departmentById } from '@/content/departments';
import type { Member } from '@/lib/types';
import { AdminSave } from './AdminSave';

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

  const stat = (n: number, total: number, l: string) => (
    <div className="card p-5">
      <p className="font-display text-4xl tabular-nums">{n}<span className="text-xl text-muted">/{total}</span></p>
      <p className="mt-1 text-xs font-bold uppercase tracking-wider text-muted">{l}</p>
      <ProgressBar value={n} max={total} className="mt-3" />
    </div>
  );

  return (
    <div>
      <PageHeader eyebrow="Unit overview" title="Admin" actions={admin && <Link href="/admin/plan" className="btn-ghost"><Icon name="plan" className="h-4 w-4" /> Edit 9-month plan</Link>}>
        Who has registered, finished onboarding and signed the pledge.
      </PageHeader>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {stat(registered, active.length, 'Registered')}
        {stat(signed.size, active.length, 'Signed the pledge')}
        {stat(finished, active.length, 'Finished onboarding')}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin" aria-current={!searchParams.dept ? 'true' : undefined} className={`chip min-h-9 px-3 ${!searchParams.dept ? 'bg-plum-700 text-white' : 'bg-plum-100 text-ink'}`}>All</Link>
        {DEPARTMENTS.map((d) => (
          <Link key={d.id} href={`/admin?dept=${d.id}`} aria-current={searchParams.dept === d.id ? 'true' : undefined} className={`chip min-h-9 px-3 ${searchParams.dept === d.id ? 'bg-plum-700 text-white' : 'bg-plum-100 text-ink'}`}>{d.name}</Link>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3">Pledge</th>
              <th className="px-4 py-3">{admin ? 'Department · role · status' : 'Department'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {all.map((m) => {
              const n = doneBy.get(m.id) ?? 0;
              return (
                <tr key={m.id}>
                  <td className="px-4 py-3">
                    <p className={`font-bold ${m.status === 'inactive' ? 'text-muted line-through decoration-1' : ''}`}>{m.full_name}</p>
                    <p className="text-xs text-muted">{m.email ?? 'Not registered yet'}{m.phone ? ` · ${m.phone}` : ''}</p>
                  </td>
                  <td className="w-44 px-4 py-3">
                    <p className="mb-1 text-xs font-semibold tabular-nums">{n}/{LESSONS.length}</p>
                    <ProgressBar value={n} max={LESSONS.length} label={`${m.full_name}: lessons done`} />
                  </td>
                  <td className="px-4 py-3">
                    {signed.has(m.id) ? <span className="chip bg-good/15 text-good-ink"><Icon name="check" className="h-3 w-3" /> Signed</span> : <span className="chip bg-line text-muted">Not yet</span>}
                  </td>
                  <td className="px-4 py-3">
                    {admin ? (
                      <form action={updateMember} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="id" value={m.id} />
                        <select name="department_id" defaultValue={m.department_id ?? ''} className="select-sm" aria-label={`Department for ${m.full_name}`}>
                          <option value="">—</option>
                          {DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <select name="role" defaultValue={m.role} className="select-sm" aria-label={`Role for ${m.full_name}`} data-was={m.role}>
                          <option value="member">Member</option><option value="head">Head</option><option value="admin">Admin</option>
                        </select>
                        <select name="status" defaultValue={m.status} className="select-sm" aria-label={`Status for ${m.full_name}`}>
                          <option value="active">Active</option><option value="on_break">On break</option><option value="inactive">Inactive</option>
                        </select>
                        <input type="date" name="break_until" defaultValue={m.break_until ?? ''} className="select-sm" aria-label={`On break until (${m.full_name})`} />
                        <AdminSave name={m.full_name} />
                      </form>
                    ) : (
                      <span className="text-sm">{departmentById(m.department_id)?.name ?? '—'} · <span className="capitalize">{m.role}</span></span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {admin && (
        <form action={addMember} className="card mt-4 flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="label" htmlFor="new_name">Add a member by name</label>
            <input id="new_name" name="full_name" className="input" placeholder="First name is enough. They claim it when they register" />
          </div>
          <select name="department_id" className="input sm:w-56" aria-label="Department" defaultValue="content">
            {DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <SubmitButton pendingText="Adding…">Add member</SubmitButton>
        </form>
      )}
    </div>
  );
}
