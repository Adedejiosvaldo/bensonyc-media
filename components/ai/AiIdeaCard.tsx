import { addSuggestionToBoard, dismissSuggestion } from '@/app/ai-actions';
import type { AiSuggestion } from '@/lib/ai/manager';
import { tidy, unquote } from '@/lib/ai/text';
import { SubmitButton } from '../SubmitButton';
import { Icon } from '../Icon';

const host = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return u;
  }
};

/** An AI idea sitting on its day in the board: dashed, so it reads as a proposal until someone adds it. */
export function AiIdeaCard({ idea, past }: { idea: AiSuggestion; past: boolean }) {
  return (
    <article className={`rounded-xl border border-dashed border-magenta/45 bg-card/70 p-3 ${past ? 'opacity-60' : ''}`}>
      <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-accent">
        <Icon name="spark" className="h-3 w-3" /> AI idea · {idea.format}
      </p>
      <h3 className="mt-1.5 break-words text-sm font-bold leading-snug">{unquote(idea.title)}</h3>
      <p className="mt-1 line-clamp-2 text-xs italic leading-relaxed text-muted">“{unquote(idea.hook)}”</p>

      <details className="group mt-1">
        <summary className="flex min-h-8 cursor-pointer list-none items-center gap-1 text-xs font-semibold text-accent [&::-webkit-details-marker]:hidden">
          Caption & details <span aria-hidden="true" className="group-open:hidden">+</span><span aria-hidden="true" className="hidden group-open:inline">–</span>
        </summary>
        <div className="mt-1.5 space-y-2 text-xs leading-relaxed">
          <p className="whitespace-pre-line break-words rounded-lg bg-plum-100/60 p-2">{tidy(idea.caption)}</p>
          {idea.shot_notes && <p><b>Shoot:</b> {tidy(idea.shot_notes)}</p>}
          <p className="text-muted"><b className="text-ink">Why:</b> {tidy(idea.why)}</p>
          {idea.refs.length > 0 && (
            <ul className="space-y-1">
              {idea.refs.map((r) => (
                <li key={r.url}>
                  <a href={r.url} target="_blank" rel="noreferrer" className="link">{host(r.url)}<span className="sr-only"> (opens in a new tab)</span></a>
                  <span className="text-muted"> · {tidy(r.note)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>

      <div className="mt-2 flex items-center gap-1.5">
        {past ? (
          <span className="text-xs text-muted">Day passed</span>
        ) : (
          <form action={addSuggestionToBoard}>
            <input type="hidden" name="id" value={idea.id} />
            <SubmitButton className="btn-primary min-h-9 px-3 py-1.5 text-xs" pendingText="Adding…">Add<span className="sr-only"> {unquote(idea.title)} to the board</span></SubmitButton>
          </form>
        )}
        <form action={dismissSuggestion} className="ml-auto">
          <input type="hidden" name="id" value={idea.id} />
          <SubmitButton className="btn-icon btn-ghost h-9 w-9 min-h-9" pendingText="…">
            <Icon name="x" className="h-4 w-4" /><span className="sr-only">Dismiss {unquote(idea.title)}</span>
          </SubmitButton>
        </form>
      </div>
    </article>
  );
}
