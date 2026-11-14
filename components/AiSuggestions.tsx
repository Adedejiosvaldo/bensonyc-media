import { createAdminClient } from '@/lib/supabase/admin';
import { aiConfigured, collectRuns, type AiInsight, type AiRef } from '@/lib/ai/manager';
import { requestSuggestions, addSuggestionToBoard, dismissSuggestion } from '@/app/ai-actions';
import { SubmitButton } from './SubmitButton';
import { Icon } from './Icon';
import { PILLAR_STYLE } from './StatusChip';
import { label } from '@/lib/dates';

type Suggestion = {
  id: string;
  day: string;
  series: string;
  pillar: string;
  format: string;
  title: string;
  hook: string;
  caption: string;
  shot_notes: string;
  why: string;
  refs: AiRef[];
  status: 'new' | 'added' | 'dismissed';
};
type Run = { id: string; status: 'queued' | 'done' | 'failed'; summary: string | null; insights: AiInsight[]; error: string | null; created_at: string; finished_at: string | null };

const host = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return u;
  }
};

/** The AI manager's ideas for one week, shown above the board to heads, admins and the Social team. */
export async function AiSuggestions({ sunday, admin }: { sunday: string; admin: boolean }) {
  if (!aiConfigured()) {
    return admin ? (
      <section className="card mb-6 flex items-start gap-3 p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-plum-100 text-accent"><Icon name="spark" /></span>
        <p className="text-sm text-muted">
          <b className="text-ink">AI suggestions are off.</b> Add <code className="rounded bg-plum-100 px-1">ANTHROPIC_API_KEY</code> on Vercel and run migration <code className="rounded bg-plum-100 px-1">0005_ai_manager.sql</code> to get weekly post ideas here.
        </p>
      </section>
    ) : null;
  }

  // If a run for this week is waiting, check whether it has finished (one quick API call).
  await collectRuns(sunday);
  const db = createAdminClient();
  const [{ data: runs }, { data: suggestions }] = await Promise.all([
    db.from('ai_runs').select('id, status, summary, insights, error, created_at, finished_at').eq('week_start', sunday).order('created_at', { ascending: false }).limit(1).returns<Run[]>(),
    db.from('ai_suggestions').select('*').eq('week_start', sunday).neq('status', 'dismissed').order('day').returns<Suggestion[]>(),
  ]);
  const run = runs?.[0];
  const list = suggestions ?? [];
  const working = run?.status === 'queued';

  const ask = (text: string, cls = 'btn-primary') => (
    <form action={requestSuggestions}>
      <input type="hidden" name="week" value={sunday} />
      <SubmitButton className={cls} pendingText="Asking…"><Icon name="spark" className="h-4 w-4" /> {text}</SubmitButton>
    </form>
  );

  return (
    <section className="mb-8 space-y-4" aria-labelledby="ai-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1 flex items-center gap-1.5"><Icon name="spark" className="h-3.5 w-3.5" /> AI social media manager</p>
          <h2 id="ai-title" className="section-title">Ideas for this week</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Built from your own post numbers, the month’s theme and strong posts from other church and youth accounts. Nothing is posted for you: add the ones you like to the board.
          </p>
        </div>
        {!working && ask(list.length ? 'Ask again' : 'Get ideas', list.length ? 'btn-ghost' : 'btn-primary')}
      </div>

      {working && (
        <p role="status" className="flex items-start gap-2 rounded-xl border border-line bg-plum-100/50 p-4 text-sm">
          <Icon name="clock" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <span>
            <b>Working on it.</b> The AI is reading your numbers and searching for references. This usually takes under an hour; refresh this page to check.
          </span>
        </p>
      )}
      {run?.status === 'failed' && !working && (
        <p role="alert" className="alert-danger">
          <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>The last request didn’t finish: {run.error ?? 'unknown error'}</span>
        </p>
      )}

      {run?.status === 'done' && (run.summary || run.insights?.length > 0) && (
        <div className="card p-5">
          {run.summary && <p className="text-[15px] leading-relaxed">{run.summary}</p>}
          {run.insights?.length > 0 && (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {run.insights.map((i) => (
                <li key={i.finding} className="card-row text-sm">
                  <p className="font-semibold">{i.finding}</p>
                  <p className="mt-0.5 text-muted">{i.evidence}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {list.length > 0 ? (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((s) => (
            <li key={s.id} className={`card flex flex-col p-5 ${s.status === 'added' ? 'opacity-70' : ''}`}>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold tabular-nums">{label(s.day, 'day')} {label(s.day)}</span>
                <span className={`chip ${PILLAR_STYLE[s.pillar] ?? 'bg-plum-100 text-ink'}`}>{s.series}</span>
                <span className="text-xs font-semibold text-muted">{s.format}</span>
              </div>
              <h3 className="card-title mt-2">{s.title}</h3>
              <p className="mt-2 border-l-2 border-magenta/50 pl-3 text-sm font-semibold italic">“{s.hook}”</p>
              <p className="mt-2 text-sm text-muted">{s.why}</p>

              <details className="group mt-3">
                <summary className="flex min-h-9 cursor-pointer list-none items-center gap-1 text-sm font-bold text-accent [&::-webkit-details-marker]:hidden">
                  Caption & shot notes <span aria-hidden="true" className="group-open:hidden">+</span><span aria-hidden="true" className="hidden group-open:inline">–</span>
                </summary>
                <p className="mt-1 whitespace-pre-line rounded-xl bg-plum-100/50 p-3 text-sm leading-relaxed">{s.caption}</p>
                {s.shot_notes && <p className="mt-2 text-sm"><b>Shoot:</b> {s.shot_notes}</p>}
              </details>

              {s.refs.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {s.refs.map((r) => (
                    <li key={r.url} className="text-sm">
                      <a href={r.url} target="_blank" rel="noreferrer" className="link inline-flex items-center gap-1">
                        <Icon name={r.platform === 'instagram' ? 'instagram' : 'share'} className="h-3.5 w-3.5" /> {host(r.url)}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                      <span className="text-muted"> · {r.note}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-auto flex items-center gap-2 pt-4">
                {s.status === 'added' ? (
                  <span className="chip bg-good/15 text-good-ink"><Icon name="check" className="h-3 w-3" /> On the board</span>
                ) : (
                  <>
                    <form action={addSuggestionToBoard}>
                      <input type="hidden" name="id" value={s.id} />
                      <SubmitButton className="btn-primary min-h-9 px-4 py-2 text-xs" pendingText="Adding…">Add to board</SubmitButton>
                    </form>
                    <form action={dismissSuggestion}>
                      <input type="hidden" name="id" value={s.id} />
                      <SubmitButton className="btn-ghost min-h-9 px-4 py-2 text-xs" pendingText="…">Dismiss<span className="sr-only"> {s.title}</span></SubmitButton>
                    </form>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        !working &&
        run?.status !== 'failed' && (
          <p className="rounded-2xl border border-dashed border-line p-5 text-sm text-muted">
            No ideas for this week yet. They arrive on their own every Saturday for the coming week, or tap <b>Get ideas</b> now.
          </p>
        )
      )}
    </section>
  );
}
