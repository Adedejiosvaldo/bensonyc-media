import Link from 'next/link';
import { requireMember, isLead } from '@/lib/auth';
import { assignSlot, generateRoster } from '@/app/actions';
import { PageHeader } from '@/components/PageHeader';
import { Icon } from '@/components/Icon';
import { SubmitButton } from '@/components/SubmitButton';
import { CopyButton } from '@/components/CopyButton';
import { AutoSubmitSelect } from '@/components/AutoSubmitSelect';
import { DEPARTMENTS } from '@/content/departments';
import { addDays, isValidDate, label, parse, rangeLabel, todayLagos, weekStart } from '@/lib/dates';
import { whatsappRoster } from '@/lib/messages';
import type { Member, RosterSlot } from '@/lib/types';

export const metadata = { title: 'Roster' };

export default async function RosterPage({ searchParams }: { searchParams: { week?: string } }) {
  const { supabase, member } = await requireMember();
  const today = todayLagos();
  const upcoming = parse(today).getUTCDay() === 0 ? today : addDays(weekStart(today), 7);
  const sunday = weekStart(isValidDate(searchParams.week) ? searchParams.week : upcoming);
  const lead = isLead(member);

  const [{ data: week }, { data: members }] = await Promise.all([
    supabase.from('roster_weeks').select('id, created_at').eq('week_start', sunday).maybeSingle(),
    supabase.from('members').select('id, full_name, department_id, status').order('full_name').returns<Pick<Member, 'id' | 'full_name' | 'department_id' | 'status'>[]>(),
  ]);
  const { data: slots } = week
    ? await supabase.from('roster_slots').select('*').eq('week_id', week.id).order('sort').returns<RosterSlot[]>()
    : { data: [] as RosterSlot[] };

  const nameOf = new Map((members ?? []).map((m) => [m.id, m.full_name]));
  const services = Array.from(new Map((slots ?? []).map((s) => [s.service_date + s.service_label, { date: s.service_date, label: s.service_label }])).values());
  const message = whatsappRoster(slots ?? [], nameOf);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Duty roster"
        title={rangeLabel(sunday)}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/roster?week=${addDays(sunday, -7)}`} className="btn-ghost px-3" aria-label="Previous week"><Icon name="back" className="h-4 w-4" /></Link>
            <Link href={`/roster?week=${addDays(sunday, 7)}`} className="btn-ghost px-3" aria-label="Next week"><Icon name="arrow" className="h-4 w-4" /></Link>
          </div>
        }
      >
        In by 7:30am, grace till 8:00. Can’t make it? Swap with someone in your department and tell your head by Friday.
      </PageHeader>

      {lead && (
        <form action={generateRoster} className="card flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
          <input type="hidden" name="week" value={sunday} />
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-magenta text-white"><Icon name="shuffle" /></span>
            <div>
              <p className="font-bold">{week ? 'Reshuffle this week' : 'Generate this week'}</p>
              <p className="text-xs text-muted">Fair rotation: fewest duties in the last 8 weeks go first.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm font-semibold lg:ml-auto">
            <label className="flex items-center gap-2"><input type="checkbox" name="special" className="h-4 w-4 accent-[rgb(var(--magenta))]" /> Special service (+ phone camera)</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="midweek" className="h-4 w-4 accent-[rgb(var(--magenta))]" /> Midweek service on</label>
            <select name="midweek_day" defaultValue="3" className="rounded-lg border border-line bg-card px-2 py-1.5" aria-label="Midweek day">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
            </select>
            <SubmitButton pendingText="Shuffling…">{week ? 'Reshuffle' : 'Generate roster'}</SubmitButton>
          </div>
        </form>
      )}

      {!week ? (
        <div className="card p-10 text-center">
          <p className="font-display text-3xl uppercase">No roster yet</p>
          <p className="mt-2 text-muted">{lead ? 'Generate it above, ideally on Monday.' : 'Your unit lead publishes it on Monday.'}</p>
        </div>
      ) : (
        <>
          {services.map((svc) => (
            <section key={svc.date + svc.label}>
              <div className="mb-3 flex items-baseline gap-3">
                <h2 className="font-display text-3xl uppercase">{svc.label}</h2>
                <p className="font-semibold text-muted">{label(svc.date, 'long')}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {DEPARTMENTS.map((d) => {
                  const rows = (slots ?? []).filter((s) => s.service_date === svc.date && s.service_label === svc.label && s.department_id === d.id);
                  if (rows.length === 0) return null;
                  const options = [{ value: '', label: '— Needs someone —' }, ...(members ?? []).filter((m) => m.department_id === d.id && m.status !== 'inactive').map((m) => ({ value: m.id, label: m.full_name }))];
                  return (
                    <div key={d.id} className="card p-5">
                      <p className="eyebrow mb-3">{d.name}</p>
                      <ul className="space-y-3">
                        {rows.map((s) => {
                          const mine = s.member_id === member.id;
                          return (
                            <li key={s.id} className={`rounded-xl p-3 ${mine ? 'bg-magenta/10 ring-1 ring-magenta/40' : 'bg-plum-100/60'}`}>
                              <p className="text-xs font-semibold text-muted">{s.duty}</p>
                              {lead ? (
                                <form action={assignSlot} className="mt-1.5">
                                  <input type="hidden" name="id" value={s.id} />
                                  <AutoSubmitSelect name="member_id" label={s.duty} defaultValue={s.member_id ?? ''} options={options} className="text-sm" />
                                </form>
                              ) : (
                                <p className={`mt-0.5 font-bold ${s.member_id ? '' : 'text-magenta'}`}>{s.member_id ? nameOf.get(s.member_id) : 'Needs someone'}{mine ? ' (you)' : ''}</p>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
              <div>
                <p className="font-display text-2xl uppercase">WhatsApp message</p>
                <p className="text-sm text-muted">Paste this into the media group on Saturday.</p>
              </div>
              <CopyButton text={message} label="Copy message" />
            </div>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap bg-plum-100/40 p-5 font-sans text-sm leading-relaxed">{message}</pre>
          </section>
        </>
      )}
    </div>
  );
}
