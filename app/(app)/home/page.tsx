import Link from 'next/link';
import { requireMember } from '@/lib/auth';
import { LESSONS } from '@/content/lessons';
import { departmentById } from '@/content/departments';
import { Icon } from '@/components/Icon';
import { Ring } from '@/components/Progress';
import { StatusChip, PILLAR_STYLE } from '@/components/StatusChip';
import { addDays, label, monthStart, parse, todayLagos, weekStart } from '@/lib/dates';
import type { ContentItem, PlanMonth, RosterSlot } from '@/lib/types';

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

  const done = new Set((progress ?? []).map((p) => p.lesson_slug));
  const doneCount = LESSONS.filter((l) => done.has(l.slug)).length;
  const nextLesson = LESSONS.find((l) => !done.has(l.slug));
  const posted = (weekItems ?? []).filter((i) => i.status === 'posted').length;
  const total = (weekItems ?? []).length;
  const dept = departmentById(member.department_id);
  const firstName = member.full_name.split(' ')[0];

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">{label(today, 'long')}</p>
        <h1 className="font-display text-5xl uppercase leading-none sm:text-6xl">Hi, {firstName}</h1>
        <p className="mt-2 text-muted">{dept ? `${dept.name} · ` : ''}<span className="capitalize">{member.role}</span></p>
      </div>

      {nextLesson && (
        <Link href={`/onboarding/${nextLesson.slug}`} className="group relative flex flex-col gap-5 overflow-hidden rounded-[24px] bg-plum-700 p-6 text-white sm:flex-row sm:items-center">
          <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-magenta/40 blur-3xl" />
          <div className="relative rounded-full bg-white p-1"><Ring value={doneCount} max={LESSONS.length} size={76} /></div>
          <div className="relative flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">Finish onboarding</p>
            <p className="mt-1 font-display text-3xl uppercase leading-tight">Next: {nextLesson.title}</p>
            <p className="mt-1 text-sm text-white/70">{nextLesson.minutes} min · {nextLesson.summary}</p>
          </div>
          <span className="btn-primary relative">Continue <Icon name="arrow" className="h-4 w-4" /></span>
        </Link>
      )}
      {!pledge && !nextLesson && (
        <Link href="/rules" className="block rounded-2xl bg-magenta/10 p-5 font-semibold text-magenta">You have not signed the pledge yet. Sign it on the Rules page →</Link>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <section className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="eyebrow">Your duty</p>
              <p className="font-display text-2xl uppercase">{label(upcomingSunday, 'long')}</p>
            </div>
            <Link href={`/roster?week=${upcomingSunday}`} className="text-sm font-bold text-magenta">Full roster →</Link>
          </div>
          {mySlots && mySlots.length > 0 ? (
            <ul className="space-y-2">
              {mySlots.map((s) => (
                <li key={s.id} className="flex items-center gap-3 rounded-2xl bg-plum-100/70 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-magenta text-white"><Icon name="roster" className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <p className="font-bold">{s.duty}</p>
                    <p className="text-sm text-muted">{s.service_label} · {label(s.service_date, 'long')} · be in by 7:30</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-line p-5 text-muted">{week ? 'You are not on duty this Sunday. Come ready to support your team.' : 'The roster for this Sunday has not been generated yet.'}</p>
          )}
        </section>

        <section className="card p-6">
          <p className="eyebrow">This month</p>
          <p className="font-display text-3xl uppercase leading-tight">{month?.theme ?? 'No theme set'}</p>
          {month && (
            <>
              <p className="mt-2 text-sm text-muted">Big moment: {month.big_moment}</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-plum-100/70 p-4">
                  <p className="font-display text-3xl tabular-nums">{month.follower_target.toLocaleString('en-US')}</p>
                  <p className="text-xs uppercase tracking-wider text-muted">follower target</p>
                </div>
                <div className="rounded-2xl bg-plum-100/70 p-4">
                  <p className="font-display text-3xl tabular-nums">{posted}/{total || '–'}</p>
                  <p className="text-xs uppercase tracking-wider text-muted">posted this week</p>
                </div>
              </div>
            </>
          )}
          <Link href="/plan" className="mt-4 inline-block text-sm font-bold text-magenta">See the 9-month plan →</Link>
        </section>
      </div>

      <section className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-display text-2xl uppercase">Content you own</p>
          <Link href="/content" className="text-sm font-bold text-magenta">This week’s board →</Link>
        </div>
        {myItems && myItems.length > 0 ? (
          <ul className="divide-y divide-line">
            {myItems.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="w-24 shrink-0 text-sm font-bold">{label(i.day, 'day')} {label(i.day)}</span>
                <span className={`chip ${PILLAR_STYLE[i.pillar]}`}>{i.series}</span>
                <span className="min-w-0 flex-1 font-semibold">{i.title}</span>
                <StatusChip status={i.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">Nothing assigned to you yet. Pick something from the weekly board.</p>
        )}
      </section>
    </div>
  );
}
