import Link from 'next/link';
import { requireMember } from '@/lib/auth';
import { LESSONS } from '@/content/lessons';
import { PageHeader } from '@/components/PageHeader';
import { ProgressBar } from '@/components/Progress';
import { Icon } from '@/components/Icon';

export const metadata = { title: 'Onboarding' };

export default async function Onboarding({ searchParams }: { searchParams: { done?: string } }) {
  const { supabase, member } = await requireMember();
  const [{ data: progress }, { data: pledge }] = await Promise.all([
    supabase.from('lesson_progress').select('lesson_slug').eq('member_id', member.id),
    supabase.from('pledges').select('agreed_at').eq('member_id', member.id).maybeSingle(),
  ]);
  const done = new Set((progress ?? []).map((p) => p.lesson_slug));
  const count = LESSONS.filter((l) => done.has(l.slug)).length;
  const complete = count === LESSONS.length && !!pledge;
  const next = LESSONS.find((l) => !done.has(l.slug));

  return (
    <div>
      <PageHeader eyebrow="Media unit course" title="Onboarding" actions={next && <Link href={`/onboarding/${next.slug}`} className="btn-primary">{count ? 'Continue' : 'Start'} <Icon name="arrow" className="h-4 w-4" /></Link>}>
        {LESSONS.length} short lessons. Finish all of them and sign the pledge before your first duty.
      </PageHeader>

      {(complete || searchParams.done) && (
        <div className="mb-6 flex items-center gap-4 rounded-[24px] bg-good/10 p-5 text-good-ink">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-good text-white"><Icon name="check" /></span>
          <div><h2 className="card-title">Onboarding complete</h2><p className="text-sm text-ink/70">Welcome to the team. Check Home for your next duty.</p></div>
        </div>
      )}

      <div className="card mb-6 p-5">
        <div className="mb-2 flex justify-between text-sm font-bold"><span>{count} of {LESSONS.length} lessons</span><span className="text-muted">{pledge ? 'Pledge signed' : 'Pledge not signed'}</span></div>
        <ProgressBar value={count} max={LESSONS.length} />
      </div>

      <ol className="grid gap-3 md:grid-cols-2">
        {LESSONS.map((l, i) => {
          const isDone = done.has(l.slug);
          return (
            <li key={l.slug}>
              <Link href={`/onboarding/${l.slug}`} className="card group flex h-full gap-4 p-5 transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-magenta/40">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-display text-xl ${isDone ? 'bg-good text-white' : 'bg-plum-700 text-white'}`}>
                  {isDone ? <Icon name="check" /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold leading-tight">{l.title}</p>
                  <p className="mt-1 text-sm text-muted">{l.summary}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted">{l.minutes} min</p>
                </div>
                <Icon name="arrow" className="h-5 w-5 self-center text-muted transition-transform duration-200 ease-out group-hover:translate-x-1 group-hover:text-accent" />
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
