'use client';
import { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { respondToDuty, type DutyReplyState } from '@/app/roster-actions';
import { Icon } from './Icon';

const REASONS = ['Exams or school', 'Travelling', 'Not feeling well', 'Work', 'Family'];

function Send({ children, pending, className }: { children: React.ReactNode; pending: string; className: string }) {
  const { pending: busy } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={busy}>
      {busy ? pending : children}
    </button>
  );
}

/**
 * Accept a duty, or say you can't make it with a reason. A decline opens a swap for the department.
 * Shows where things stand (waiting, confirmed, can't make it) and lets the person change their answer.
 */
export function DutyReply({ slotId, response, reason, compact = false }: { slotId: string; response: 'pending' | 'accepted' | 'declined'; reason: string | null; compact?: boolean }) {
  const [state, action] = useFormState<DutyReplyState, FormData>(respondToDuty, null);
  const [declining, setDeclining] = useState(false);
  const [text, setText] = useState('');
  const btn = compact ? 'min-h-9 px-3 py-1.5 text-xs' : 'px-4';

  // Leave the reason form only once the answer is saved.
  useEffect(() => {
    if (state?.ok) setDeclining(false);
  }, [state]);

  if (declining) {
    return (
      <form action={action} className="mt-3 space-y-2">
        <input type="hidden" name="slot" value={slotId} />
        <input type="hidden" name="response" value="declined" />
        <p className="text-sm font-semibold">What’s stopping you?</p>
        <div className="flex flex-wrap gap-1.5">
          {REASONS.map((r) => (
            <button key={r} type="button" onClick={() => setText(r)} className={`chip min-h-8 px-3 normal-case tracking-normal ${text === r ? 'bg-plum-900 text-white' : 'bg-plum-100 text-ink hover:bg-plum-100/70'}`}>
              {r}
            </button>
          ))}
        </div>
        <label htmlFor={`reason-${slotId}`} className="sr-only">Reason</label>
        <input id={`reason-${slotId}`} name="reason" value={text} onChange={(e) => setText(e.target.value)} maxLength={200} required placeholder="Or type a short reason" className="input py-2" />
        <div className="flex flex-wrap gap-2">
          <Send className={`btn-danger ${btn}`} pending="Sending…">Can’t make it</Send>
          <button type="button" onClick={() => setDeclining(false)} className={`btn-ghost ${btn}`}>Back</button>
        </div>
        {state && !state.ok && <p role="alert" className="text-xs font-semibold text-danger">{state.message}</p>}
        <p className="text-xs text-muted">Your department will see it needs cover and can take it. The admins are told.</p>
      </form>
    );
  }

  return (
    <div className="mt-3">
      {response === 'accepted' && (
        <p className="inline-flex items-center gap-1.5 rounded-full bg-good/15 px-3 py-1 text-xs font-bold text-good-ink">
          <Icon name="check" className="h-3.5 w-3.5" /> You’re confirmed
        </p>
      )}
      {response === 'declined' && (
        <p className="inline-flex items-center gap-1.5 rounded-full bg-danger/10 px-3 py-1 text-xs font-bold text-danger">
          <Icon name="x" className="h-3.5 w-3.5" /> You can’t make it{reason ? `: ${reason}` : ''}
        </p>
      )}
      {response === 'pending' && <p className="text-xs font-bold text-warn-ink">Please confirm</p>}

      <form action={action} className="mt-2 flex flex-wrap items-center gap-2">
        <input type="hidden" name="slot" value={slotId} />
        <input type="hidden" name="response" value="accepted" />
        {response !== 'accepted' && (
          <Send className={`btn-primary ${btn}`} pending="Saving…">
            <Icon name="check" className="h-4 w-4" /> {response === 'declined' ? 'I can make it after all' : 'Accept'}
          </Send>
        )}
        {response !== 'declined' && (
          <button type="button" onClick={() => setDeclining(true)} className={`btn-ghost ${btn}`}>
            Can’t make it
          </button>
        )}
      </form>
      {state && (
        <p role={state.ok ? 'status' : 'alert'} className={`mt-2 text-xs font-semibold ${state.ok ? 'text-good-ink' : 'text-danger'}`}>
          {state.message}
        </p>
      )}
    </div>
  );
}
