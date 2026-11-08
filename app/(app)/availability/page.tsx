import { headers } from 'next/headers';
import { requireMember } from '@/lib/auth';
import { deleteBlockout, resetCalendarToken } from '@/app/actions';
import { PageHeader } from '@/components/PageHeader';
import { CopyButton } from '@/components/CopyButton';
import { SubmitButton } from '@/components/SubmitButton';
import { Icon } from '@/components/Icon';
import { departmentById } from '@/content/departments';
import { addDays, label, todayLagos } from '@/lib/dates';
import type { Blockout, Member } from '@/lib/types';
import { BlockoutForm } from './BlockoutForm';

export const metadata = { title: 'Availability' };

const range = (b: Pick<Blockout, 'start_date' | 'end_date'>) =>
  b.start_date === b.end_date ? label(b.start_date, 'long') : `${label(b.start_date)} – ${label(b.end_date)}`;

export default async function AvailabilityPage() {
  const { supabase, member } = await requireMember();
  const today = todayLagos();

  const [{ data: mine }, { data: team }, { data: members }, tokenRes] = await Promise.all([
    supabase.from('blockouts').select('*').eq('member_id', member.id).gte('end_date', today).order('start_date').returns<Blockout[]>(),
    supabase.from('blockouts').select('*').neq('member_id', member.id).gte('end_date', today).lte('start_date', addDays(today, 42)).order('start_date').returns<Blockout[]>(),
    supabase.from('members').select('id, full_name, department_id').returns<Pick<Member, 'id' | 'full_name' | 'department_id'>[]>(),
    supabase.from('calendar_tokens').select('token').eq('member_id', member.id).maybeSingle(),
  ]);

  let token = tokenRes.data?.token as string | undefined;
  if (!token) {
    const { data } = await supabase.from('calendar_tokens').insert({ member_id: member.id }).select('token').single();
    token = data?.token;
  }

  const host = headers().get('host') ?? '';
  const site = process.env.NEXT_PUBLIC_SITE_URL || `https://${host}`;
  const feed = token ? `${site}/api/calendar/${token}` : '';
  const webcal = feed.replace(/^https?:/, 'webcal:');
  const google = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`;

  const byId = new Map((members ?? []).map((m) => [m.id, m]));
  const sameDept = (team ?? []).filter((b) => byId.get(b.member_id)?.department_id === member.department_id);
  const otherDept = (team ?? []).filter((b) => byId.get(b.member_id)?.department_id !== member.department_id);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Your week" title="Availability">
        Block the days you can’t serve and the roster will skip you. Add your duties to your phone’s calendar so you never miss one.
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-6">
          <p className="eyebrow mb-1">Can’t make it?</p>
          <p className="mb-5 font-display text-2xl uppercase">Block out dates</p>
          <BlockoutForm today={today} />
        </section>

        <section className="card p-6">
          <p className="eyebrow mb-1">Coming up</p>
          <p className="mb-4 font-display text-2xl uppercase">Your blocked dates</p>
          {mine && mine.length > 0 ? (
            <ul className="space-y-2">
              {mine.map((b) => (
                <li key={b.id} className="flex items-center gap-3 rounded-2xl bg-plum-100/70 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-plum-700 text-white"><Icon name="calendarOff" className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{range(b)}</p>
                    {b.reason && <p className="truncate text-sm text-muted">{b.reason}</p>}
                  </div>
                  <form action={deleteBlockout}>
                    <input type="hidden" name="id" value={b.id} />
                    <SubmitButton className="btn-ghost px-3 py-1.5 text-xs" pendingText="…">Remove</SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-line p-5 text-muted">No blocked dates. You’re available for every service.</p>
          )}
          <p className="mt-4 text-xs text-muted">Already rostered on a date you just blocked? Ask for a swap on the Roster page so a teammate can cover you.</p>
        </section>
      </div>

      <section className="card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-magenta text-white"><Icon name="calendar" /></span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-2xl uppercase">Add duties to your calendar</p>
            <p className="mt-1 text-sm text-muted">Your roster duties and the content you own show up in Google, Apple or Outlook calendar and update by themselves. Keep this link private.</p>
            {feed ? (
              <>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a href={google} target="_blank" rel="noreferrer" className="btn-primary">Google Calendar</a>
                  <a href={webcal} className="btn-ghost">Apple / Outlook</a>
                  <CopyButton text={feed} label="Copy link" />
                </div>
                <p className="mt-3 break-all rounded-xl bg-plum-100/60 px-3 py-2 font-mono text-xs text-muted">{feed}</p>
                <form action={resetCalendarToken} className="mt-3">
                  <SubmitButton className="text-xs font-bold text-magenta underline-offset-2 hover:underline" pendingText="Resetting…">Reset link (old one stops working)</SubmitButton>
                </form>
              </>
            ) : (
              <p className="mt-3 text-sm font-semibold text-magenta">Calendar link isn’t ready. Ask an admin to run the latest database migration.</p>
            )}
          </div>
        </div>
      </section>

      <section className="card p-6">
        <p className="eyebrow mb-1">Next 6 weeks</p>
        <p className="mb-4 font-display text-2xl uppercase">Who’s away</p>
        {(team ?? []).length === 0 ? (
          <p className="text-muted">Nobody has blocked out dates yet.</p>
        ) : (
          <div className="space-y-5">
            {[{ title: 'Your department', rows: sameDept }, { title: 'Other departments', rows: otherDept }].map((g) =>
              g.rows.length === 0 ? null : (
                <div key={g.title}>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">{g.title}</p>
                  <ul className="divide-y divide-line">
                    {g.rows.map((b) => {
                      const m = byId.get(b.member_id);
                      return (
                        <li key={b.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5">
                          <span className="font-bold">{m?.full_name ?? 'Someone'}</span>
                          <span className="text-sm text-muted">{departmentById(m?.department_id)?.name ?? ''}</span>
                          <span className="ml-auto text-sm font-semibold">{range(b)}</span>
                          {b.reason && <span className="w-full text-sm text-muted">{b.reason}</span>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ),
            )}
          </div>
        )}
      </section>
    </div>
  );
}
