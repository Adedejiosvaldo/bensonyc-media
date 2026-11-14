import Link from 'next/link';
import { requireMember } from '@/lib/auth';
import { LESSONS } from '@/content/lessons';
import { departmentById } from '@/content/departments';
import { Icon } from '@/components/Icon';
import { EmptyState } from '@/components/EmptyState';
import { Ring } from '@/components/Progress';
import { StatusChip, PILLAR_STYLE } from '@/components/StatusChip';
import { addDays, label, monthStart, parse, todayLagos, weekStart } from '@/lib/dates';
import type { ContentItem, PlanMonth, RosterSlot, SwapRequest } from '@/lib/types';

export const metadata = { title: 'Home' };

export default async function Home() {
  const { supabase, member } = await requireMember();
  const today = todayLagos();
  const upcomingSunday = parse(today).getUTCDay() === 0 ? today : addDays(weekStart(today), 7);
  const thisWeek = weekStart(today);

  const [{ data: progress }, { data: pledge }, { data: week }, { data: myItems }, { data: weekItems }, { data: month }] = await Promise.all([
    supabase.from('lesson_progress').select('lesson_slug').eq('member_id', member.id),
    supabase.from('pledges').select('agreed_at').eq('member_id', member.id).maybeSingle(),
    supabase.from('roster_weeks').select('id').eq('week_start', upcomingSunday).maybeSingle(),
    supabase.from('content_items').select('*').eq('owner_id', member.id).gte('day', today).order('day').limit(6).returns<ContentItem[]>(),
    supabase.from('content_items').select('status').eq('week_start', thisWeek),
    supabase.from('plan_months').select('*').eq('month', monthStart(today)).maybeSingle<PlanMonth>(),
  ]);

  const { data: mySlots } = week
    ? await supabase.from('roster_slots').select('*').eq('week_id', week.id).eq('member_id', member.id).order('sort').returns<RosterSlot[]>()
    : { data: [] as RosterSlot[] };

  // Open swap requests from teammates in my department, for services still ahead.
  const { data: openSwaps } = await supabase.from('swap_requests').select('*').eq('status', 'open').neq('from_member', member.id).returns<SwapRequest[]>();
  const { data: swapSlots } = openSwaps && openSwaps.length
    ? await supabase.from('roster_slots').select('*').in('id', openSwaps.map((w) => w.slot_id)).eq('department_id', member.department_id ?? '').gte('service_date', today).order('service_date').returns<RosterSlot[]>()
    : { data: [] as RosterSlot[] };
  const mySwapSlots = new Set((mySlots ?? []).map((s) => s.id));
  const { data: myOpen } = mySwapSlots.size
    ? await supabase.from('swap_requests').select('slot_id').eq('status', 'open').in('slot_id', [...mySwapSlots])
    : { data: [] as { slot_id: string }[] };
  const waitingCover = new Set((myOpen ?? []).map((w) => w.slot_id));

  const done = new Set((progress ?? []).map((p) => p.lesson_slug));
  const doneCount = LESSONS.filter((l) => done.has(l.slug)).length;
  const nextLesson = LESSONS.find((l) => !done.has(l.slug));
  const posted = (weekItems ?? []).filter((i) => i.status === 'posted').length;
  const total = (weekItems ?? []).length;
  const dept = departmentById(member.department_id);
  const firstName = member.full_name.split(' ')[0];


  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-2">{label(today, 'long')}</p>
          <h1 className="font-display text-5xl uppercase leading-none sm:text-6xl">Hi, {firstName}</h1>
          <p className="mt-2 text-muted">{dept ? `${dept.name} · ` : ''}<span className="capitalize">{member.role}</span></p>
        </div>
        {/* This week at a glance: the two numbers the unit is measured on. */}
        {month && (
          <dl className="grid grid-cols-2 gap-6 sm:text-right">
            <div>
              <dt className="kicker">Posted this week</dt>
              <dd className="stat mt-1.5">{total ? <>{posted}<span className="text-2xl text-muted">/{total}</span></> : <span className="text-muted">—</span>}</dd>
            </div>
            <div>
              <dt className="kicker">Follower target</dt>
              <dd className="stat mt-1.5">{month.follower_target.toLocaleString('en-US')}</dd>
            </div>
          </dl>
        )}
      </header>

      {nextLesson && (
        <Link href={`/onboarding/${nextLesson.slug}`} className="on-dark group relative flex flex-col gap-5 overflow-hidden rounded-[24px] bg-plum-900 p-6 text-white shadow-lift transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-raise sm:flex-row sm:items-center">
          <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-magenta/35 blur-3xl" aria-hidden="true" />
          <div className="relative w-fit"><Ring value={doneCount} max={LESSONS.length} size={76} /></div>
          <div className="relative min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold">Finish onboarding · {LESSONS.length - doneCount} to go</p>
            <p className="mt-1.5 text-xl font-bold leading-snug">Next: {nextLesson.title}</p>
            <p className="mt-1 text-sm text-white/75">{nextLesson.minutes} min · {nextLesson.summary}</p>
          </div>
          <span className="btn-primary relative w-full sm:w-auto">Continue <Icon name="arrow" className="h-4 w-4" /></span>
        </Link>
      )}
      {!pledge && !nextLesson && (
        <Link href="/rules" className="flex items-center gap-4 rounded-2xl border border-magenta/25 bg-magenta/[0.07] p-5 transition-colors duration-150 hover:bg-magenta/10">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-magenta text-white"><Icon name="rules" /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold">Sign the pledge</span>
            <span className="block text-sm text-muted">Lessons done. One last step before your first duty.</span>
          </span>
          <Icon name="arrow" className="h-4 w-4 shrink-0 text-accent" />
        </Link>
      )}

      {swapSlots && swapSlots.length > 0 && (
        <Link href={`/roster?week=${weekStart(swapSlots[0].service_date)}`} className="flex items-center gap-4 rounded-2xl border border-gold/50 bg-gold/15 p-5 transition-colors duration-150 hover:bg-gold/20">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold text-plum-950"><Icon name="swap" /></span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">{swapSlots.length === 1 ? 'A teammate needs cover' : `${swapSlots.length} teammates need cover`}</p>
            <p className="text-sm text-muted">{swapSlots.slice(0, 3).map((s) => `${s.duty} · ${label(s.service_date)}`).join(' / ')}{swapSlots.length > 3 ? ` and ${swapSlots.length - 3} more` : ''}</p>
          </div>
          <span className="hidden text-sm font-bold text-warn-ink sm:inline">Take a duty</span>
          <Icon name="arrow" className="h-4 w-4 shrink-0" />
        </Link>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <section className="card p-6" aria-labelledby="duty-title">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="kicker">Your duty</p>
              <h2 id="duty-title" className="card-title mt-1">{label(upcomingSunday, 'long')}</h2>
            </div>
            <Link href={`/roster?week=${upcomingSunday}`} className="link min-h-9 shrink-0 text-sm">Full roster →</Link>
          </div>
          {mySlots && mySlots.length > 0 ? (
            <ul className="space-y-2">
              {mySlots.map((s) => (
                <li key={s.id} className="card-row flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-magenta text-white"><Icon name="roster" className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <p className="font-bold">{s.duty}</p>
                    <p className="text-sm text-muted">{s.service_label} · in by 7:30am</p>
                    {waitingCover.has(s.id) && (
                      <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-gold/25 px-2 py-0.5 text-[11px] font-bold text-warn-ink">
                        <Icon name="swap" className="h-3 w-3" /> Swap requested, waiting for cover
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact icon={week ? 'check' : 'calendar'} title={week ? 'Not on duty this Sunday' : 'Roster not out yet'}>
              {week ? 'Come ready to support your team.' : 'Your unit lead publishes it on Monday.'}
            </EmptyState>
          )}
        </section>

        <section className="card flex flex-col p-6" aria-labelledby="month-title">
          <p className="kicker">This month</p>
          <h2 id="month-title" className="mt-1 text-2xl font-extrabold leading-tight tracking-[-0.015em]">{month?.theme ?? 'No theme set yet'}</h2>
          {month ? (
            <p className="mt-2 text-sm leading-relaxed text-muted"><span className="font-semibold text-ink">Big moment:</span> {month.big_moment}</p>
          ) : (
            <p className="mt-2 text-sm text-muted">The plan for this month hasn’t been filled in.</p>
          )}
          <Link href="/plan" className="link mt-auto inline-flex min-h-9 items-center pt-4 text-sm">See the 9-month plan →</Link>
        </section>
      </div>

      <section className="card p-6" aria-labelledby="owned-title">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div>
            <p className="kicker">Coming up</p>
            <h2 id="owned-title" className="card-title mt-1">Content you own</h2>
          </div>
          <Link href="/content" className="link min-h-9 shrink-0 text-sm">This week’s board →</Link>
        </div>
        {myItems && myItems.length > 0 ? (
          <ul className="divide-y divide-line">
            {myItems.map((i) => (
              <li key={i.id} className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 py-3 sm:grid-cols-[6rem_auto_minmax(0,1fr)_auto]">
                <span className="text-sm font-bold tabular-nums">{label(i.day, 'day')} {label(i.day)}</span>
                <span className={`chip w-fit ${PILLAR_STYLE[i.pillar]} max-sm:col-start-2`}>{i.series}</span>
                <span className="min-w-0 break-words font-semibold max-sm:col-span-2">{i.title}</span>
                <span className="max-sm:col-span-2"><StatusChip status={i.status} /></span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState compact icon="content" title="Nothing assigned to you yet" action={<Link href="/content" className="btn-ghost">Open the weekly board</Link>}>
            Pick something from this week’s board, or ask your unit head.
          </EmptyState>
        )}
      </section>
    </div>
  );
}
