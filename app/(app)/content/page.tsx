import Link from 'next/link';
import { requireMember, isLead } from '@/lib/auth';
import { generateContentWeek, updateContentItem } from '@/app/actions';
import { PageHeader } from '@/components/PageHeader';
import { Icon } from '@/components/Icon';
import { SubmitButton } from '@/components/SubmitButton';
import { AutoSubmitSelect } from '@/components/AutoSubmitSelect';
import { PILLAR_STYLE, StatusChip } from '@/components/StatusChip';
import { monthForWeek } from '@/lib/plan';
import { addDays, isValidDate, label, rangeLabel, todayLagos, weekDays, weekOfMonth, weekStart } from '@/lib/dates';
import type { ContentItem, Member, PlanMonth } from '@/lib/types';

export const metadata = { title: 'Weekly content' };

const STATUSES = ['planned', 'shot', 'edited', 'posted', 'skipped'].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }));

export default async function ContentPage({ searchParams }: { searchParams: { week?: string } }) {
  const { supabase, member } = await requireMember();
  const today = todayLagos();
  const sunday = weekStart(isValidDate(searchParams.week) ? searchParams.week : today);
  const lead = isLead(member);

  const [{ data: items }, { data: months }, { data: members }] = await Promise.all([
    supabase.from('content_items').select('*').eq('week_start', sunday).order('sort').returns<ContentItem[]>(),
    supabase.from('plan_months').select('*').returns<PlanMonth[]>(),
    supabase.from('members').select('id, full_name, department_id').neq('status', 'inactive').order('full_name').returns<Pick<Member, 'id' | 'full_name' | 'department_id'>[]>(),
  ]);
  const month = monthForWeek(sunday, months ?? []);
  const nameOf = new Map((members ?? []).map((m) => [m.id, m.full_name]));
  const owners = [{ value: '', label: 'Unassigned' }, ...(members ?? []).filter((m) => ['content', 'design', 'social'].includes(m.department_id ?? '')).map((m) => ({ value: m.id, label: m.full_name }))];
  const list = items ?? [];
  const posted = list.filter((i) => i.status === 'posted').length;
  const isCurrent = sunday === weekStart(today);

  return (
    <div>
      <PageHeader
        eyebrow={isCurrent ? 'This week' : sunday > today ? 'Coming up' : 'Past week'}
        title={rangeLabel(sunday)}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/content?week=${addDays(sunday, -7)}`} className="btn-ghost px-3" aria-label="Previous week"><Icon name="back" className="h-4 w-4" /></Link>
            {!isCurrent && <Link href="/content" className="btn-ghost">Today</Link>}
            <Link href={`/content?week=${addDays(sunday, 7)}`} className="btn-ghost px-3" aria-label="Next week"><Icon name="arrow" className="h-4 w-4" /></Link>
          </div>
        }
      >
        Built from the 9-month plan: {month ? <>week {weekOfMonth(addDays(sunday, 3))} of <b className="text-ink">“{month.theme}”</b>.</> : 'no plan month covers this week.'}
      </PageHeader>

      {month && (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="card p-4"><p className="text-xs font-bold uppercase tracking-wider text-muted">Month theme</p><p className="mt-1 font-display text-xl uppercase">{month.theme}</p></div>
          <div className="card p-4"><p className="text-xs font-bold uppercase tracking-wider text-muted">Big moment</p><p className="mt-1 font-semibold leading-snug">{month.big_moment}</p></div>
          <div className="card p-4"><p className="text-xs font-bold uppercase tracking-wider text-muted">Posted</p><p className="mt-1 font-display text-3xl tabular-nums">{posted}<span className="text-muted">/{list.length || 0}</span></p></div>
        </div>
      )}

      {list.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 p-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-plum-100 text-magenta"><Icon name="content" className="h-7 w-7" /></span>
          <p className="font-display text-3xl uppercase">No plan for this week yet</p>
          <p className="max-w-md text-muted">{lead ? 'Generate it from the 9-month plan. You can edit titles, owners and briefs after.' : 'Your unit lead generates it on Monday, a week ahead.'}</p>
          {lead && (
            <form action={generateContentWeek}>
              <input type="hidden" name="week" value={sunday} />
              <SubmitButton pendingText="Building the week…">Generate this week from the plan</SubmitButton>
            </form>
          )}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-7">
          {weekDays(sunday).map((day) => {
            const dayItems = list.filter((i) => i.day === day);
            const isToday = day === today;
            return (
              <section key={day} className={`flex min-w-0 flex-col gap-2 rounded-2xl p-2 ${isToday ? 'bg-magenta/10 ring-1 ring-magenta/30' : 'bg-plum-100/50'}`}>
                <div className="flex items-baseline justify-between px-2 pt-1">
                  <p className={`font-display text-xl uppercase ${isToday ? 'text-magenta' : ''}`}>{label(day, 'day')}</p>
                  <p className="text-xs font-semibold text-muted">{label(day)}</p>
                </div>
                {dayItems.map((i) => (
                  <article key={i.id} className="rounded-xl border border-line bg-card p-3 shadow-sm">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`chip ${PILLAR_STYLE[i.pillar]} px-2 py-0.5 text-[10px]`}>{i.series}</span>
                      <span className="text-[11px] font-semibold text-muted">{i.format}</span>
                    </div>
                    <p className="mt-2 text-sm font-bold leading-snug">{i.title}</p>
                    <details className="group mt-1">
                      <summary className="cursor-pointer list-none text-xs font-semibold text-magenta">Brief <span className="group-open:hidden">+</span><span className="hidden group-open:inline">–</span></summary>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted">{i.brief}</p>
                    </details>
                    <div className="mt-3 space-y-1.5">
                      <form action={updateContentItem}>
                        <input type="hidden" name="id" value={i.id} />
                        <AutoSubmitSelect name="owner_id" label="Owner" defaultValue={i.owner_id ?? ''} options={owners} />
                      </form>
                      <form action={updateContentItem} className="flex items-center gap-1.5">
                        <input type="hidden" name="id" value={i.id} />
                        <AutoSubmitSelect name="status" label="Status" defaultValue={i.status} options={STATUSES} />
                      </form>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <StatusChip status={i.status} />
                      {i.owner_id && <span className="truncate text-[11px] font-semibold text-muted">{nameOf.get(i.owner_id)}</span>}
                    </div>
                  </article>
                ))}
                {dayItems.length === 0 && <p className="px-2 pb-2 text-xs text-muted">Nothing planned</p>}
              </section>
            );
          })}
        </div>
      )}

      {lead && list.length > 0 && (
        <form action={generateContentWeek} className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted">
          <input type="hidden" name="week" value={sunday} />
          <label className="flex items-center gap-2"><input type="checkbox" name="replace" required className="accent-[rgb(var(--magenta))]" /> Replace everything for this week</label>
          <SubmitButton className="btn-ghost" pendingText="Rebuilding…">Rebuild from plan</SubmitButton>
        </form>
      )}
    </div>
  );
}
