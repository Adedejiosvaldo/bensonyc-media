import Link from 'next/link';
import { requestSuggestions, addAllSuggestions } from '@/app/ai-actions';
import type { AiRun, AiSuggestion } from '@/lib/ai/manager';
import { tidy, unquote } from '@/lib/ai/text';
import { addDays, rangeLabel } from '@/lib/dates';
import { SubmitButton } from '../SubmitButton';
import { Icon } from '../Icon';

const host = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return u;
  }
};

/**
 * One compact strip above the board: the week's theme and the single next step (add the ideas).
 * The reasoning (numbers, findings, trends) stays folded under "Why these ideas" for anyone who wants it;
 * the ideas themselves sit inside each day of the board.
 */
export function AiPlanStrip({
  sunday,
  today,
  run,
  suggestions,
  configured,
  admin,
}: {
  sunday: string;
  today: string;
  run: AiRun | null;
  suggestions: AiSuggestion[];
  configured: boolean;
  admin: boolean;
}) {
  if (!configured) {
    return admin ? (
      <p className="mb-6 flex items-center gap-2 text-sm text-muted">
        <Icon name="spark" className="h-4 w-4 text-accent" /> AI ideas are off. Add <code className="rounded bg-plum-100 px-1">ANTHROPIC_API_KEY</code> on Vercel to turn them on.
      </p>
    ) : null;
  }

  const ask = (text: string, cls: string, week = sunday) => (
    <form action={requestSuggestions}>
      <input type="hidden" name="week" value={week} />
      <SubmitButton className={cls} pendingText="Asking…"><Icon name="spark" className="h-4 w-4" /> {text}</SubmitButton>
    </form>
  );

  const isCurrentWeek = sunday <= today && today <= addDays(sunday, 6);
  const lateInWeek = isCurrentWeek && new Date(`${today}T12:00:00Z`).getUTCDay() >= 4;
  const upcoming = suggestions.filter((s) => s.status === 'new' && s.day >= today);

  // Nothing yet. Late in the week, point at next week instead of planning days that are nearly gone.
  if (!run) {
    return (
      <section aria-label="AI ideas" className="mb-6 flex flex-col gap-3 rounded-2xl border border-dashed border-line bg-card p-4 sm:flex-row sm:items-center">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-plum-100 text-accent"><Icon name="spark" /></span>
        <p className="flex-1 text-sm text-muted">
          {lateInWeek ? (
            <><b className="text-ink">This week is nearly over.</b> Plan next week instead: ideas there come with a theme, hooks and captions.</>
          ) : (
            <><b className="text-ink">Get AI ideas for this week:</b> a theme, plus a post for each day with a hook and caption, built from your numbers.</>
          )}
        </p>
        {lateInWeek ? (
          <Link href={`/content?week=${addDays(sunday, 7)}`} className="btn-primary">Plan {rangeLabel(addDays(sunday, 7))} <Icon name="arrow" className="h-4 w-4" /></Link>
        ) : (
          ask('Get ideas', 'btn-primary')
        )}
      </section>
    );
  }

  if (run.status === 'queued') {
    return (
      <p role="status" className="mb-6 flex items-center gap-3 rounded-2xl border border-line bg-card p-4 text-sm">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-plum-100 text-accent"><Icon name="clock" /></span>
        <span><b>Working on ideas for this week.</b> Usually under an hour. Refresh this page to check.</span>
      </p>
    );
  }

  if (run.status === 'failed') {
    return (
      <div role="alert" className="mb-6 flex flex-col gap-3 rounded-2xl border border-danger/25 bg-danger/[0.06] p-4 sm:flex-row sm:items-center">
        <p className="flex flex-1 items-start gap-2 text-sm text-danger">
          <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
          <span><b>The ideas didn’t come through.</b> {run.error ?? 'Try again.'}</span>
        </p>
        {ask('Try again', 'btn-ghost')}
      </div>
    );
  }

  const theme = run.theme;
  return (
    <section aria-labelledby="ai-theme" className="on-dark mb-6 overflow-hidden rounded-[24px] bg-plum-900 text-white shadow-lift">
      <div className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-gold">
            <Icon name="spark" className="h-3.5 w-3.5" /> Theme of the week
          </p>
          <h2 id="ai-theme" className="mt-1 font-display text-3xl uppercase leading-none sm:text-4xl">{theme ? unquote(theme.title) : 'This week’s ideas'}</h2>
          {theme?.idea && <p className="mt-2 line-clamp-2 max-w-2xl text-[15px] leading-relaxed text-white/80">{tidy(theme.idea)}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {upcoming.length > 0 ? (
            <form action={addAllSuggestions}>
              <input type="hidden" name="week" value={sunday} />
              <SubmitButton className="btn-gold" pendingText="Adding…"><Icon name="check" className="h-4 w-4" /> Add all {upcoming.length} to the board</SubmitButton>
            </form>
          ) : (
            <span className="text-sm text-white/70">{suggestions.length ? 'All ideas are on the board.' : 'No ideas left for the days ahead.'}</span>
          )}
          {ask('Ask again', 'btn border border-white/25 text-white hover:bg-white/10')}
        </div>
      </div>
      {upcoming.length > 0 && <p className="border-t border-white/10 px-5 py-2.5 text-xs text-white/65 sm:px-6">Each idea also sits on its day below, marked <b className="text-white/85">AI idea</b>. Add or dismiss them one by one there.</p>}

      {(theme?.why || run.summary || run.insights?.length > 0 || run.trends?.length > 0) && (
        <details className="group border-t border-white/10">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 px-5 text-sm font-bold text-gold sm:px-6 [&::-webkit-details-marker]:hidden">
            Why these ideas <span aria-hidden="true" className="group-open:hidden">+</span><span aria-hidden="true" className="hidden group-open:inline">–</span>
          </summary>
          <div className="grid gap-5 px-5 pb-5 text-sm sm:px-6 lg:grid-cols-2">
            <div className="space-y-3">
              {theme?.why && <p className="leading-relaxed text-white/85">{tidy(theme.why)}</p>}
              {run.insights?.length > 0 && (
                <ul className="space-y-2">
                  {run.insights.slice(0, 3).map((i) => (
                    <li key={i.finding} className="rounded-xl bg-white/[0.06] p-3">
                      <p className="font-semibold">{tidy(i.finding)}</p>
                      <p className="mt-0.5 text-white/65">{tidy(i.evidence)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {run.trends?.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">Working on Instagram and TikTok</p>
                <ul className="space-y-2">
                  {run.trends.slice(0, 3).map((t) => (
                    <li key={t.what} className="rounded-xl bg-white/[0.06] p-3">
                      <p className="font-semibold">
                        <span className="mr-1.5 text-[11px] font-bold uppercase tracking-wide text-gold">{t.platform === 'tiktok' ? 'TikTok' : 'Instagram'}</span>
                        {tidy(t.what)}
                      </p>
                      <p className="mt-0.5 text-white/65">{tidy(t.how_we_use_it)}</p>
                      {t.url && (
                        <a href={t.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex min-h-8 items-center text-xs font-bold text-gold underline-offset-2 hover:underline">
                          Example on {host(t.url)}<span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>
      )}
    </section>
  );
}
