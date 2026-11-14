import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireMember } from '@/lib/auth';
import { LESSONS, lessonBySlug } from '@/content/lessons';
import { DEPARTMENTS, departmentById } from '@/content/departments';
import { completeLesson } from '@/app/actions';
import { BrandGuide, DepartmentView, MasterPlan, RulesView, WeeklyRhythm } from '@/components/sections';
import { PledgeForm } from '../PledgeForm';
import { SubmitButton } from '@/components/SubmitButton';
import { Icon } from '@/components/Icon';
import type { PlanMonth } from '@/lib/types';

export default async function LessonPage({ params }: { params: { slug: string } }) {
  const lesson = lessonBySlug(params.slug);
  if (!lesson) notFound();
  const { supabase, member } = await requireMember();
  const index = LESSONS.findIndex((l) => l.slug === lesson.slug);

  const [{ data: progress }, { data: pledge }, { data: months }] = await Promise.all([
    supabase.from('lesson_progress').select('lesson_slug').eq('member_id', member.id),
    supabase.from('pledges').select('agreed_at').eq('member_id', member.id).maybeSingle(),
    lesson.slug === 'plan' ? supabase.from('plan_months').select('*').order('month').returns<PlanMonth[]>() : Promise.resolve({ data: null }),
  ]);
  const done = new Set((progress ?? []).map((p) => p.lesson_slug));
  const dept = departmentById(member.department_id) ?? DEPARTMENTS[0];

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_260px]">
      <article className="min-w-0">
        <Link href="/onboarding" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-accent"><Icon name="back" className="h-4 w-4" /> All lessons</Link>
        <p className="eyebrow mb-2">Lesson {index + 1} of {LESSONS.length} · {lesson.minutes} min</p>
        <h1 className="mb-8 font-display text-4xl uppercase leading-[0.95] sm:text-6xl">{lesson.title}</h1>

        {lesson.slug === 'welcome' && <Welcome name={member.full_name.split(' ')[0]} />}
        {lesson.slug === 'brand' && <BrandGuide />}
        {lesson.slug === 'rules' && (
          <div className="space-y-6">
            <RulesView />
            <PledgeForm name={member.full_name} signedAt={pledge?.agreed_at ?? null} />
          </div>
        )}
        {lesson.slug === 'department' && (
          <div className="space-y-4">
            <p className="text-lg">You are in <b>{dept.name}</b>. {dept.tagline}</p>
            <DepartmentView dept={dept} />
            <p className="text-sm text-muted">
              Want to see the other teams? <Link href="/departments" className="link">All departments →</Link>
            </p>
          </div>
        )}
        {lesson.slug === 'workflow' && <Workflow />}
        {lesson.slug === 'plan' && <MasterPlan months={months ?? []} />}

        <div className="mt-10 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          {index > 0 ? <Link href={`/onboarding/${LESSONS[index - 1].slug}`} className="btn-ghost"><Icon name="back" className="h-4 w-4" /> Previous</Link> : <span />}
          {lesson.slug === 'rules' && !pledge ? (
            <p className="text-sm font-semibold text-muted">Sign the pledge above to complete this lesson.</p>
          ) : (
            <form action={completeLesson}>
              <input type="hidden" name="slug" value={lesson.slug} />
              <SubmitButton className="btn-primary px-7 py-3" pendingText="Saving…">
                {done.has(lesson.slug) ? 'Next lesson' : 'Mark complete & continue'} <Icon name="arrow" className="h-4 w-4" />
              </SubmitButton>
            </form>
          )}
        </div>
      </article>

      <aside className="hidden xl:block">
        <div className="card sticky top-10 p-4">
          <p className="mb-3 px-2 text-xs font-bold uppercase tracking-wider text-muted">Course</p>
          <ol className="space-y-1">
            {LESSONS.map((l, i) => (
              <li key={l.slug}>
                <Link href={`/onboarding/${l.slug}`} className={`flex items-center gap-3 rounded-xl px-2 py-2 text-sm font-semibold ${l.slug === lesson.slug ? 'bg-plum-100 text-ink' : 'text-muted hover:text-ink'}`}>
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${done.has(l.slug) ? 'bg-good text-white' : 'bg-line text-muted'}`}>
                    {done.has(l.slug) ? <Icon name="check" className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  {l.title}
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  );
}

function Welcome({ name }: { name: string }) {
  const stats = [
    { n: '774', l: 'Instagram followers when the plan began' },
    { n: '10,000', l: 'our goal by July 2027' },
    { n: '5', l: 'departments, one team' },
  ];
  return (
    <div className="prose-yc space-y-6 text-[16px]">
      <p className="text-xl leading-relaxed">Welcome, {name}. Every Sunday, hundreds of young people meet God at MFM Benson YC. Our job is to make sure thousands more see it.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.l} className="card p-5">
            <p className="font-display text-5xl text-accent">{s.n}</p>
            <p className="mt-1 text-sm text-muted">{s.l}</p>
          </div>
        ))}
      </div>
      <div className="card space-y-3 p-6">
        <h2 className="card-title">What the media unit does</h2>
        <p>We set up the screens, capture the service, design what the church sees, create content that travels, and look after our online community on WhatsApp, Instagram and Facebook.</p>
        <p>WhatsApp is where our people are. Instagram is where new people find us. Over the next nine months we will grow our Instagram from 774 to 10,000 by posting real faces, real testimonies and real teaching, consistently.</p>
      </div>
      <div className="card space-y-3 p-6">
        <h2 className="card-title">What we expect from you</h2>
        <ul className="space-y-2">
          {['Show up on time: 7:30am, grace till 8:00', 'Do your duty on the roster, or find a swap by Friday', 'Follow the brand guide on everything you make', 'Bring one idea a week'].map((t) => (
            <li key={t} className="flex gap-2"><Icon name="check" className="mt-1 h-4 w-4 shrink-0 text-accent" />{t}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Workflow() {
  const steps = [
    { day: 'Monday', t: 'Next week is planned', d: 'The content board for the coming Sunday–Saturday is generated from the 9-month plan, and the roster is shuffled. Owners pick up their items.' },
    { day: 'Tue – Fri', t: 'Make it', d: 'Shoot, edit and design what you own. Move each item from Planned → Shot → Edited on the board.' },
    { day: 'Saturday', t: 'Reminder', d: 'You get an email with your duty for Sunday, and the duty list goes out on the WhatsApp group.' },
    { day: 'Sunday', t: 'Serve', d: 'In by 7:30. Capture the service. Photos edited before service ends. Stories go out live.' },
  ];
  return (
    <div className="space-y-8">
      <div className="grid gap-3 md:grid-cols-4">
        {steps.map((s, i) => (
          <div key={s.day} className="card p-5">
            <p className="font-display text-4xl text-plum-100 dark:text-plum-700">{i + 1}</p>
            <p className="eyebrow mt-1">{s.day}</p>
            <p className="mt-1 text-lg font-extrabold">{s.t}</p>
            <p className="mt-2 text-sm leading-snug text-muted">{s.d}</p>
          </div>
        ))}
      </div>
      <div>
        <h2 className="mb-3 card-title">The weekly rhythm</h2>
        <WeeklyRhythm />
        <p className="mt-3 text-sm text-muted">Every other Friday, Friday Fire becomes the Kingdom Business Minute: a 60–90s business talk from a member. Each week also gets one “monthly hero” post on Thursday.</p>
      </div>
      <div className="card p-6">
        <h2 className="card-title">How the roster is fair</h2>
        <p className="mt-2 text-muted">The roster gives duties to whoever has served least in the last 8 weeks. The two Sunday camera halves always go to different people, so nobody gets tired. Anyone on a break is skipped until their break ends.</p>
      </div>
    </div>
  );
}
