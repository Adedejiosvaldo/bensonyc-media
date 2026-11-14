import Link from 'next/link';
import { requireMember, isLead } from '@/lib/auth';
import { assignSlot, cancelSwap, generateRoster, requestSwap, takeSwap } from '@/app/actions';
import { PageHeader } from '@/components/PageHeader';
import { Icon } from '@/components/Icon';
import { SubmitButton } from '@/components/SubmitButton';
import { CopyButton } from '@/components/CopyButton';
import { AutoSubmitSelect } from '@/components/AutoSubmitSelect';
import { ConfirmSubmit } from '@/components/ConfirmSubmit';
import { EmptyState } from '@/components/EmptyState';
import { DEPARTMENTS } from '@/content/departments';
import { addDays, isValidDate, label, parse, rangeLabel, todayLagos, weekStart } from '@/lib/dates';
import { whatsappRoster } from '@/lib/messages';
import { isBlockedOut } from '@/lib/roster';
import type { Blockout, Member, RosterSlot, SwapRequest } from '@/lib/types';

export const metadata = { title: 'Roster' };

export default async function RosterPage({ searchParams }: { searchParams: { week?: string; notice?: string } }) {
  const { supabase, member } = await requireMember();
  const today = todayLagos();
  const upcoming = parse(today).getUTCDay() === 0 ? today : addDays(weekStart(today), 7);
  const sunday = weekStart(isValidDate(searchParams.week) ? searchParams.week : upcoming);
  const lead = isLead(member);

  const [{ data: week }, { data: members }, { data: blockouts }] = await Promise.all([
    supabase.from('roster_weeks').select('id, created_at').eq('week_start', sunday).maybeSingle(),
    supabase.from('members').select('id, full_name, department_id, status').order('full_name').returns<Pick<Member, 'id' | 'full_name' | 'department_id' | 'status'>[]>(),
    supabase.from('blockouts').select('member_id, start_date, end_date').lte('start_date', addDays(sunday, 6)).gte('end_date', sunday).returns<Pick<Blockout, 'member_id' | 'start_date' | 'end_date'>[]>(),
  ]);
  const { data: slots } = week
    ? await supabase.from('roster_slots').select('*').eq('week_id', week.id).order('sort').returns<RosterSlot[]>()
    : { data: [] as RosterSlot[] };
  const slotIds = (slots ?? []).map((s) => s.id);
  const { data: swaps } = slotIds.length
    ? await supabase.from('swap_requests').select('*').in('slot_id', slotIds).in('status', ['open', 'taken']).order('created_at', { ascending: false }).returns<SwapRequest[]>()
    : { data: [] as SwapRequest[] };
  const openSwap = new Map((swaps ?? []).filter((w) => w.status === 'open').map((w) => [w.slot_id, w]));
  const coveredSwap = new Map((swaps ?? []).filter((w) => w.status === 'taken').map((w) => [w.slot_id, w]));
  const away = blockouts ?? [];
  const openCount = (slots ?? []).filter((x) => openSwap.has(x.id)).length;

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
            <Link href={`/roster?week=${addDays(sunday, -7)}`} className="btn-icon btn-ghost" aria-label="Previous week"><Icon name="back" className="h-4 w-4" /></Link>
            <Link href={`/roster?week=${addDays(sunday, 7)}`} className="btn-icon btn-ghost" aria-label="Next week"><Icon name="arrow" className="h-4 w-4" /></Link>
          </div>
        }
      >
        In by 7:30am, grace till 8:00. Can’t make it? Tap <b>Ask for a swap</b> on your duty and anyone in your department can take it. Planning ahead? <Link href="/availability" className="link">Block out dates</Link>.
      </PageHeader>

      {searchParams.notice && (
        <p role="status" className="alert-good">{searchParams.notice}</p>
      )}
      {openCount > 0 && (
        <p className="flex items-center gap-2 rounded-2xl border border-gold/40 bg-gold/15 p-4 text-sm font-semibold text-warn-ink">
          <Icon name="swap" className="h-4 w-4 shrink-0" />
          {openCount === 1 ? '1 duty needs cover this week.' : `${openCount} duties need cover this week.`} Look for the gold cards below.
        </p>
      )}

      {lead && (
        <form action={generateRoster} className="card flex flex-col gap-4 p-5 xl:flex-row xl:items-center">
          <input type="hidden" name="week" value={sunday} />
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-magenta text-white"><Icon name="shuffle" /></span>
            <div>
              <p className="font-bold">{week ? 'Reshuffle this week' : 'Generate this week'}</p>
              <p className="text-xs text-muted">Fair rotation: fewest duties in the last 8 weeks go first.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-semibold xl:ml-auto">
            <label className="flex items-center gap-2"><input type="checkbox" name="special" className="h-4 w-4 accent-[rgb(var(--magenta))]" /> Special service (+ phone camera)</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="midweek" className="h-4 w-4 accent-[rgb(var(--magenta))]" /> Midweek service on</label>
            <select name="midweek_day" defaultValue="3" className="select-sm" aria-label="Midweek service day">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
            </select>
            {week ? (
              <ConfirmSubmit
                pendingText="Shuffling…"
                title={`Reshuffle ${rangeLabel(sunday)}?`}
                body={
                  <>
                    This replaces all {(slots ?? []).length} duties for the week with a fresh fair rotation, including names you set by hand
                    {coveredSwap.size || openCount ? ` and ${coveredSwap.size + openCount} swap${coveredSwap.size + openCount === 1 ? '' : 's'} in progress` : ''}. Everyone sees the new roster straight away.
                  </>
                }
                confirmLabel="Reshuffle the week"
              >
                Reshuffle
              </ConfirmSubmit>
            ) : (
              <SubmitButton pendingText="Building…">Generate roster</SubmitButton>
            )}
          </div>
        </form>
      )}

      {!week ? (
        <div className="card">
          <EmptyState icon="roster" title="No roster for this week yet">
            {lead ? 'Generate it above, ideally on Monday, so the team has the week to plan.' : 'Your unit lead publishes it on Monday. You’ll see your duty on Home once it’s out.'}
          </EmptyState>
        </div>
      ) : (
        <>
          {services.map((svc) => (
            <section key={svc.date + svc.label}>
              <div className="mb-3 flex items-baseline gap-3">
                <h2 className="section-title">{svc.label}</h2>
                <p className="font-semibold text-muted">{label(svc.date, 'long')}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {DEPARTMENTS.map((d) => {
                  const rows = (slots ?? []).filter((s) => s.service_date === svc.date && s.service_label === svc.label && s.department_id === d.id);
                  if (rows.length === 0) return null;
                  const options = [{ value: '', label: '— Needs someone —' }, ...(members ?? []).filter((m) => m.department_id === d.id && m.status !== 'inactive').map((m) => ({ value: m.id, label: m.full_name }))];
                  return (
                    <div key={d.id} className="card p-5">
                      <p className="kicker mb-3">{d.name}</p>
                      <ul className="space-y-3">
                        {rows.map((s) => {
                          const mine = s.member_id === member.id;
                          const swap = openSwap.get(s.id);
                          const covered = coveredSwap.get(s.id);
                          const blocked = !!s.member_id && isBlockedOut(away, s.member_id, s.service_date);
                          const canTake = !!swap && !mine && member.department_id === d.id && !isBlockedOut(away, member.id, s.service_date);
                          const upcoming = s.service_date >= today;
                          const opts = options.map((o) => (o.value && isBlockedOut(away, o.value, s.service_date) ? { ...o, label: `${o.label} (away)` } : o));
                          return (
                            <li key={s.id} className={`rounded-xl p-3 ${swap ? 'bg-gold/15 ring-1 ring-gold/60' : mine ? 'bg-magenta/10 ring-1 ring-magenta/40' : 'bg-plum-100/60'}`}>
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-semibold text-muted">{s.duty}</p>
                                {swap && <span className="chip ml-auto bg-gold text-plum-950">Needs cover</span>}
                                {!swap && blocked && <span className="chip ml-auto bg-plum-100 text-ink"><Icon name="calendarOff" className="h-3 w-3" /> Away</span>}
                              </div>
                              {lead ? (
                                <form action={assignSlot} className="mt-1.5">
                                  <input type="hidden" name="id" value={s.id} />
                                  <AutoSubmitSelect name="member_id" label={`Who’s on ${s.duty}, ${svc.label}`} defaultValue={s.member_id ?? ''} options={opts} />
                                </form>
                              ) : (
                                <p className={`mt-0.5 font-bold ${s.member_id ? '' : 'text-accent'}`}>{s.member_id ? nameOf.get(s.member_id) : 'Needs someone'}{mine ? ' (you)' : ''}</p>
                              )}
                              {swap?.note && <p className="mt-1 text-sm italic text-muted">“{swap.note}”</p>}
                              {covered && !swap && covered.to_member === s.member_id && (
                                <p className="mt-1 text-xs text-muted">Covering for {nameOf.get(covered.from_member) ?? 'a teammate'}</p>
                              )}
                              {upcoming && swap && canTake && (
                                <form action={takeSwap} className="mt-2">
                                  <input type="hidden" name="swap_id" value={swap.id} />
                                  <input type="hidden" name="week" value={sunday} />
                                  <SubmitButton className="btn-gold w-full py-2" pendingText="Taking…">Take this duty</SubmitButton>
                                </form>
                              )}
                              {upcoming && swap && (mine || lead) && (
                                <form action={cancelSwap} className="mt-2">
                                  <input type="hidden" name="swap_id" value={swap.id} />
                                  <SubmitButton className="link min-h-9 text-xs" pendingText="Cancelling…">{mine ? 'I can make it after all' : 'Cancel swap request'}</SubmitButton>
                                </form>
                              )}
                              {upcoming && mine && !swap && (
                                <details className="mt-2 group">
                                  <summary className="flex min-h-9 cursor-pointer list-none items-center gap-1.5 text-xs font-bold text-accent [&::-webkit-details-marker]:hidden">
                                    <Icon name="swap" className="h-3.5 w-3.5" /> Ask for a swap
                                  </summary>
                                  <form action={requestSwap} className="mt-2 space-y-2">
                                    <input type="hidden" name="slot_id" value={s.id} />
                                    <input type="hidden" name="week" value={sunday} />
                                    <input name="note" maxLength={200} placeholder="Why? (optional)" className="input py-2 text-sm" aria-label="Reason for the swap" />
                                    <SubmitButton className="btn-primary w-full py-2" pendingText="Sending…">Ask my department</SubmitButton>
                                  </form>
                                </details>
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
                <h2 className="card-title">WhatsApp message</h2>
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
