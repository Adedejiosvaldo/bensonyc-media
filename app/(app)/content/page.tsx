import Link from 'next/link';
import { requireMember, isAdmin, canPlan, headOf } from '@/lib/auth';
import { generateContentWeek, updateContentItem } from '@/app/actions';
import { PageHeader } from '@/components/PageHeader';
import { Icon } from '@/components/Icon';
import { SubmitButton } from '@/components/SubmitButton';
import { AutoSubmitSelect } from '@/components/AutoSubmitSelect';
import { EmptyState } from '@/components/EmptyState';
import { AiPlanStrip } from '@/components/ai/AiPlanStrip';
import { AiIdeaCard } from '@/components/ai/AiIdeaCard';
import { PILLAR_STYLE, StatusChip } from '@/components/StatusChip';
import { aiConfigured, loadAiWeek } from '@/lib/ai/manager';
import { monthForWeek } from '@/lib/plan';
import { addDays, isValidDate, label, rangeLabel, todayLagos, weekDays, weekOfMonth, weekStart } from '@/lib/dates';
import type { ContentItem, Member, PlanMonth } from '@/lib/types';

export const metadata = { title: 'Weekly content' };

const STATUSES = ['planned', 'shot', 'edited', 'posted', 'skipped'].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }));

export default async function ContentPage({ searchParams }: { searchParams: { week?: string; notice?: string } }) {
  const { supabase, member } = await requireMember();
  const today = todayLagos();
  const sunday = weekStart(isValidDate(searchParams.week) ? searchParams.week : today);
  // "Plan content" builds the board and uses AI ideas; a head manages their own department's items.
  const lead = canPlan(member);
  const poster = lead;
  const myHead = headOf(member);
  const canEdit = (i: ContentItem) => lead || (!!myHead && i.department_id === myHead);

  const [{ data: items }, { data: months }, { data: members }, ai] = await Promise.all([
    supabase.from('content_items').select('*').eq('week_start', sunday).order('sort').returns<ContentItem[]>(),
    supabase.from('plan_months').select('*').returns<PlanMonth[]>(),
    supabase.from('members').select('id, full_name, department_id').neq('status', 'inactive').order('full_name').returns<Pick<Member, 'id' | 'full_name' | 'department_id'>[]>(),
    poster ? loadAiWeek(sunday) : Promise.resolve({ run: null, suggestions: [] }),
  ]);
  const month = monthForWeek(sunday, months ?? []);
  const owners = [{ value: '', label: 'Unassigned' }, ...(members ?? []).filter((m) => ['content', 'design', 'social'].includes(m.department_id ?? '')).map((m) => ({ value: m.id, label: m.full_name }))];
  const list = items ?? [];
  const ideas = ai.suggestions.filter((s) => s.status === 'new');
  const posted = list.filter((i) => i.status === 'posted').length;
  const isCurrent = sunday === weekStart(today);
  const showBoard = list.length > 0 || ideas.length > 0;

  const context = [
    month ? `Week ${weekOfMonth(addDays(sunday, 3))} of ‘${month.theme}’` : 'No plan month covers this week',
    month?.big_moment ? `Big moment: ${month.big_moment}` : null,
    list.length ? `${posted} of ${list.length} posted` : null,
  ].filter(Boolean);

  const generate = (text: string, cls = 'btn-primary') => (
    <form action={generateContentWeek}>
      <input type="hidden" name="week" value={sunday} />
      <SubmitButton className={cls} pendingText="Building the week…">{text}</SubmitButton>
    </form>
  );

  return (
    <div>
      <PageHeader
        eyebrow={isCurrent ? 'This week' : sunday > today ? 'Coming up' : 'Past week'}
        title={rangeLabel(sunday)}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/content?week=${addDays(sunday, -7)}`} className="btn-icon btn-ghost" aria-label="Previous week"><Icon name="back" className="h-4 w-4" /></Link>
            {!isCurrent && <Link href="/content" className="btn-ghost">This week</Link>}
            <Link href={`/content?week=${addDays(sunday, 7)}`} className="btn-icon btn-ghost" aria-label="Next week"><Icon name="arrow" className="h-4 w-4" /></Link>
          </div>
        }
      >
        {context.join(' · ')}
      </PageHeader>

      {searchParams.notice && <p role="status" className="alert-good mb-6">{searchParams.notice}</p>}

      {poster && <AiPlanStrip sunday={sunday} today={today} run={ai.run} suggestions={ai.suggestions} configured={aiConfigured()} admin={isAdmin(member)} />}

      {!showBoard ? (
        <div className="card">
          <EmptyState icon="content" title="No plan for this week yet" action={lead && generate('Generate this week from the plan')}>
            {lead ? 'Build it from the 9-month plan. You can edit titles, owners and briefs after.' : 'Your unit lead builds it on Monday, a week ahead. Check back then.'}
          </EmptyState>
        </div>
      ) : (
        <>
          {list.length === 0 && (
            <div className="mb-3 flex flex-col gap-3 rounded-2xl border border-line bg-card p-4 sm:flex-row sm:items-center">
              <p className="flex-1 text-sm text-muted">
                <b className="text-ink">No board yet.</b> {lead ? 'Generate the usual week from the plan, or add the AI ideas below.' : 'Your unit lead builds it from the 9-month plan.'}
              </p>
              {lead && generate('Generate from the plan', 'btn-ghost')}
            </div>
          )}

          {/* One row per day, in order: the day on the left, its posts beside it. Reads the same on a phone. */}
          <ol className="card divide-y divide-line overflow-hidden p-0" aria-label={`Posts for ${rangeLabel(sunday)}`}>
            {weekDays(sunday).map((day) => {
              const dayItems = list.filter((i) => i.day === day);
              const dayIdeas = ideas.filter((s) => s.day === day);
              const isToday = day === today;
              const past = day < today;
              const empty = dayItems.length === 0 && dayIdeas.length === 0;
              return (
                <li
                  key={day}
                  aria-label={`${label(day, 'long')}${isToday ? ', today' : ''}`}
                  className={`grid gap-3 p-4 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-5 sm:p-5 ${isToday ? 'bg-magenta/[0.06]' : ''} ${empty ? 'max-sm:py-3' : ''}`}
                >
                  <div className={`flex items-baseline gap-2 sm:block ${past && !isToday ? 'opacity-60' : ''}`}>
                    <h2 className={`font-display text-2xl uppercase leading-none ${isToday ? 'text-accent' : ''}`}>{label(day, 'day')}</h2>
                    <p className="text-sm font-semibold text-muted sm:mt-1">{label(day)}</p>
                    {isToday && <span className="chip mt-1.5 bg-magenta text-white sm:inline-flex">Today</span>}
                  </div>

                  {empty ? (
                    <p className="self-center text-sm text-muted">Nothing planned</p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                      {dayItems.map((i) => {
                        const editable = canEdit(i);
                        const mine = i.owner_id === member.id;
                        const ownerName = i.owner_id ? (mine ? 'You' : owners.find((o) => o.value === i.owner_id)?.label ?? 'Someone') : null;
                        return (
                          <article key={i.id} className={`flex flex-col rounded-xl border border-line bg-card p-3 shadow-sm ${past ? 'bg-surface' : ''}`}>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`chip ${PILLAR_STYLE[i.pillar]} px-2 py-0.5`}>{i.series}</span>
                              <span className="text-xs font-semibold text-muted">{i.format}</span>
                              {!editable && !mine && <span className="ml-auto"><StatusChip status={i.status} /></span>}
                            </div>
                            <h3 className="mt-2 break-words text-[15px] font-bold leading-snug">{i.title}</h3>
                            <details className="group mt-1">
                              <summary className="flex min-h-8 cursor-pointer list-none items-center gap-1 text-xs font-semibold text-accent [&::-webkit-details-marker]:hidden">
                                Brief <span aria-hidden="true" className="group-open:hidden">+</span><span aria-hidden="true" className="hidden group-open:inline">–</span>
                              </summary>
                              <p className="mt-1.5 whitespace-pre-line break-words text-xs leading-relaxed text-muted">{i.brief}</p>
                            </details>

                            <div className="mt-auto grid gap-1.5 pt-3">
                              {editable ? (
                                <div className="grid gap-1.5 sm:grid-cols-2">
                                  <form action={updateContentItem}>
                                    <input type="hidden" name="id" value={i.id} />
                                    <AutoSubmitSelect name="owner_id" label={`Owner of ‘${i.title}’`} defaultValue={i.owner_id ?? ''} options={owners} />
                                  </form>
                                  <form action={updateContentItem}>
                                    <input type="hidden" name="id" value={i.id} />
                                    <AutoSubmitSelect name="status" label={`Status of ‘${i.title}’`} defaultValue={i.status} options={STATUSES} />
                                  </form>
                                </div>
                              ) : mine ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-good-ink">Yours</span>
                                  <form action={updateContentItem} className="flex-1">
                                    <input type="hidden" name="id" value={i.id} />
                                    <AutoSubmitSelect name="status" label={`Status of ‘${i.title}’`} defaultValue={i.status} options={STATUSES} />
                                  </form>
                                </div>
                              ) : ownerName ? (
                                <p className="text-xs text-muted">Owner: <b className="text-ink">{ownerName}</b></p>
                              ) : past ? (
                                <p className="text-xs text-muted">Nobody took this one.</p>
                              ) : (
                                <form action={updateContentItem}>
                                  <input type="hidden" name="id" value={i.id} />
                                  <input type="hidden" name="owner_id" value={member.id} />
                                  <SubmitButton className="btn-ghost min-h-9 w-full px-3 py-1.5 text-xs" pendingText="Taking…">Take this<span className="sr-only">: {i.title}</span></SubmitButton>
                                </form>
                              )}
                            </div>
                          </article>
                        );
                      })}
                      {dayIdeas.map((s) => (
                        <AiIdeaCard key={s.id} idea={s} past={past} />
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      )}

      {lead && list.length > 0 && (
        <form action={generateContentWeek} className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted">
          <input type="hidden" name="week" value={sunday} />
          <label className="flex min-h-11 cursor-pointer items-center gap-2"><input type="checkbox" name="replace" required className="h-4 w-4 accent-[rgb(var(--magenta))]" /> Replace everything for this week, including owners and statuses</label>
          <SubmitButton className="btn-ghost" pendingText="Rebuilding…">Rebuild from plan</SubmitButton>
        </form>
      )}
    </div>
  );
}
